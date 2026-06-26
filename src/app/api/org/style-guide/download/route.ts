import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { orgMeta } from "@/lib/orgs";

/**
 * Authenticated download of a team's style-guide PDF. We proxy the Blob
 * bytes through this route (checking org membership) rather than handing out
 * the raw Blob URL, so the org-confidential guide isn't shareable by URL.
 */
export const runtime = "nodejs";

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "No active team" }, { status: 400 });
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const sg = orgMeta(org).styleGuide;
  if (!sg?.blobUrl) {
    return NextResponse.json({ error: "No style guide" }, { status: 404 });
  }

  // Private store: fetch the bytes via the SDK (reads BLOB_READ_WRITE_TOKEN),
  // since the Blob URL isn't publicly fetchable.
  const result = await get(sg.blobUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Style guide unavailable" }, { status: 502 });
  }

  const fileName = (sg.fileName || "style-guide.pdf").replace(/"/g, "");
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
