import sharp from "sharp";
import { put, del } from "@vercel/blob";

/**
 * Generate a JPEG thumbnail data URL from a raw image buffer.
 *
 * Sized for the enlarged score-detail view as well as list rows: fits within
 * 1400px (longest side) at quality 82. This is a balance — large enough that
 * the detail screenshot stays crisp without upscaling, but still a bounded
 * base64 string. `withoutEnlargement` means we never blow up a small source.
 * Only affects scores created from here on; existing thumbnails keep their
 * previously-saved resolution.
 *
 * The returned data URL is a *transport* format: `persistScoreEntry` decodes
 * it and offloads the bytes to Vercel Blob (see `uploadScoreThumbnail` / #442)
 * so the thumbnail never lands inline in the score-history zset.
 */
export async function makeThumbnail(
  bytes: Buffer,
  mime: string,
): Promise<string | undefined> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(mime)) return undefined;
  try {
    const out = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}

/** Prefix for score-thumbnail objects in Vercel Blob. Per-user folder so a
 * termination purge (#398) can reason about a user's objects, then
 * `addRandomSuffix` makes the final key non-guessable. */
const SCORE_THUMB_PREFIX = "score-thumbs";

/**
 * Offload a score thumbnail (a `data:image/...;base64,...` URL produced by
 * `makeThumbnail`, or supplied by the plugin) to Vercel Blob and return the
 * private blob URL. Returns null if the input isn't a decodable image data URL
 * or the upload fails — callers treat a null as "no thumbnail" and carry on,
 * since a thumbnail is advisory and must never fail a score persist.
 *
 * Private access mirrors the style-guide pattern (`api/org/style-guide`): the
 * URL is never handed to a browser directly; the bytes are proxied through an
 * auth-gated route (`/api/dashboard/scores/[id]/thumbnail`).
 */
export async function uploadScoreThumbnail(
  userId: string,
  scoreId: string,
  dataUrl: string,
): Promise<string | null> {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) return null;
  try {
    const blob = await put(`${SCORE_THUMB_PREFIX}/${userId}/${scoreId}`, bytes, {
      access: "private",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  } catch (err) {
    console.error("[LADDER:THUMB] blob upload failed:", err);
    return null;
  }
}

/** Best-effort delete of an externalized thumbnail blob. Used by the
 * termination purge (#398) and any future hard-delete path. Never throws —
 * an orphaned blob is a cost nuisance, not a correctness problem. */
export async function deleteScoreThumbnail(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
  } catch (err) {
    console.error("[LADDER:THUMB] blob delete failed:", err);
  }
}
