import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import sharp from "sharp";
import { redis } from "@/lib/redis";
import { SCORE_THUMB_KEY } from "@/lib/scores";
import { resolveScoreOwner } from "@/lib/score-access";

/**
 * Auth-gated proxy for a score's externalized thumbnail (#442). The bytes live
 * in a *private* Vercel Blob; we resolve the `user:{id}:thumb:{scoreId}`
 * pointer key to the blob URL and stream the bytes through here so the blob is
 * never fetchable by URL. A score's thumbnail is reachable by exactly the same
 * people as the score itself (owner, or a Team Lead via `?member=`), enforced
 * by the shared `resolveScoreOwner`.
 */
export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = await resolveScoreOwner(req, { userId, orgId, orgRole });
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const { id } = await params;
  const blobUrl = await redis.get<string>(SCORE_THUMB_KEY(owner.ownerId, id));
  if (!blobUrl) {
    return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
  }

  // Private store: fetch the bytes via the SDK (reads BLOB_READ_WRITE_TOKEN),
  // since the blob URL isn't publicly fetchable.
  const result = await get(blobUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Thumbnail unavailable" }, { status: 502 });
  }

  // A given score id's thumbnail never changes, so it's safe to cache hard
  // per-user. `private` keeps it out of shared caches (Team-Lead views). The
  // `?size` variant caches as a distinct URL, so the resize below runs at most
  // once per viewer per score.
  const cache = "private, max-age=86400, immutable";

  // #448: list rows render at ~48px but the stored blob is up to 1400px. When
  // the caller asks for the small variant, resize on read (backfill-free) so
  // the dashboard list doesn't download full-size images. Detail views omit
  // `size` and keep the full-resolution blob.
  const size = new URL(req.url).searchParams.get("size");
  // sm = list rows (~48px), md = grid cards (#471). Both resize on read and
  // cache per variant; detail views omit `size` and keep the full blob.
  const box = size === "sm" ? 96 : size === "md" ? 640 : null;
  if (box) {
    try {
      const input = Buffer.from(await new Response(result.stream).arrayBuffer());
      const small = await sharp(input)
        .rotate()
        .resize({ width: box, height: box, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: size === "sm" ? 72 : 80, mozjpeg: true })
        .toBuffer();
      return new NextResponse(new Uint8Array(small), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": cache },
      });
    } catch {
      // Resize failed — fall back to a fresh full-size fetch so the row still
      // shows an image rather than a broken one.
      const full = await get(blobUrl, { access: "private" });
      if (full && full.statusCode === 200) {
        return new NextResponse(full.stream, {
          headers: {
            "Content-Type": full.headers.get("content-type") || "image/jpeg",
            "Cache-Control": cache,
          },
        });
      }
      return NextResponse.json({ error: "Thumbnail unavailable" }, { status: 502 });
    }
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.headers.get("content-type") || "image/jpeg",
      "Cache-Control": cache,
    },
  });
}
