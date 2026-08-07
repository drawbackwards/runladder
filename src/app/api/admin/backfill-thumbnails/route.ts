import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { backfillScoreThumbnails } from "@/lib/thumbnail-backfill";

/**
 * One-time #442 follow-up (#451): migrate existing inline score thumbnails into
 * Vercel Blob, in production, where the Sensitive Redis/Blob env exists. Runs
 * server-side because prod creds can't be pulled to a laptop.
 *
 *   GET /api/admin/backfill-thumbnails                 -> DRY RUN (reports scope, writes nothing)
 *   GET /api/admin/backfill-thumbnails?confirm=migrate -> runs the migration
 *   &user=<id>                                         -> limit to one user (optional)
 *
 * Admin-gated. Idempotent + safe to re-run. Dry run is the default so an
 * accidental visit (or a link prefetch) never mutates data.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const confirm = url.searchParams.get("confirm") === "migrate";
  const onlyUser = url.searchParams.get("user") || undefined;

  const summary = await backfillScoreThumbnails({ dryRun: !confirm, onlyUser });

  return NextResponse.json({
    ...summary,
    admin,
    ...(confirm
      ? {}
      : { note: "Dry run only. Add ?confirm=migrate to the URL to run it for real." }),
  });
}
