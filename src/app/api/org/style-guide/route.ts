import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { put, del } from "@vercel/blob";
import { getUserSubscription } from "@/lib/tier";
import { orgMeta, type OrgPublicMetadata } from "@/lib/orgs";
import {
  distillStyleGuide,
  setOrgStyleGuide,
  clearOrgStyleGuide,
} from "@/lib/style-guide";

/**
 * Team style-guide management (Team plan, team lead only for writes).
 *
 *   POST   multipart { file: PDF }  → upload, distill ruleset, store
 *   GET                             → status for the Settings UI (any member)
 *   DELETE                          → remove guide + ruleset (team lead)
 *
 * The distilled ruleset (what scoring reads) lives in Redis; the original PDF
 * lives in Vercel Blob with a pointer on the org's publicMetadata. Findings
 * produced from this guide are advisory and never affect the Ladder score.
 */

export const runtime = "nodejs";
export const maxDuration = 60; // distilling a multi-page PDF can exceed the default.

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB (within Anthropic PDF limits).

type Gate =
  | { ok: true; userId: string; orgId: string }
  | { ok: false; res: NextResponse };

/** Require a signed-in Team-plan team lead with an active org. */
async function gateTeamLead(): Promise<Gate> {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return { ok: false, res: NextResponse.json({ error: "No active team" }, { status: 400 }) };
  }
  const { tier } = await getUserSubscription(userId);
  if (tier !== "team") {
    return { ok: false, res: NextResponse.json({ error: "Team plan required" }, { status: 403 }) };
  }
  if (orgRole !== "org:admin") {
    return { ok: false, res: NextResponse.json({ error: "Team Lead access required" }, { status: 403 }) };
  }
  return { ok: true, userId, orgId };
}

export async function POST(req: NextRequest) {
  const gate = await gateTeamLead();
  if (!gate.ok) return gate.res;
  const { userId, orgId } = gate;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Style guide must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF too large. Max 10MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Distill FIRST — if the guide has no usable writing rules, store nothing.
  let ruleset: string | null;
  try {
    ruleset = await distillStyleGuide(bytes.toString("base64"));
  } catch (e) {
    console.error("[style-guide] distill failed:", e);
    return NextResponse.json(
      { error: "Couldn't process that PDF. Please try another file." },
      { status: 502 },
    );
  }
  if (!ruleset) {
    return NextResponse.json(
      {
        error:
          "We couldn't find any writing rules in that PDF. Upload a copy/writing style guide.",
      },
      { status: 422 },
    );
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const existing = orgMeta(org);

  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "style-guide.pdf";
  const blob = await put(`style-guides/${orgId}/${safeName}`, bytes, {
    access: "private",
    contentType: "application/pdf",
    addRandomSuffix: true,
  });

  // Replacing: best-effort cleanup of the prior blob.
  if (existing.styleGuide?.blobUrl) {
    await del(existing.styleGuide.blobUrl).catch(() => {});
  }

  await setOrgStyleGuide(orgId, { ruleset, teamName: org.name ?? null });

  const styleGuide = {
    blobUrl: blob.url,
    fileName: file.name.slice(0, 200),
    uploadedAt: Date.now(),
    uploadedBy: userId,
  };
  await client.organizations.updateOrganization(orgId, {
    publicMetadata: { ...existing, styleGuide } satisfies OrgPublicMetadata,
  });

  return NextResponse.json({
    ok: true,
    styleGuide: { fileName: styleGuide.fileName, uploadedAt: styleGuide.uploadedAt },
  });
}

export async function GET() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ present: false, tier: "free", canManage: false });
  }
  const { tier } = await getUserSubscription(userId);
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const sg = orgMeta(org).styleGuide;
  return NextResponse.json({
    present: !!sg,
    fileName: sg?.fileName ?? null,
    uploadedAt: sg?.uploadedAt ?? null,
    tier,
    canManage: tier === "team" && orgRole === "org:admin",
  });
}

export async function DELETE() {
  const gate = await gateTeamLead();
  if (!gate.ok) return gate.res;
  const { orgId } = gate;

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const existing = orgMeta(org);

  if (existing.styleGuide?.blobUrl) {
    await del(existing.styleGuide.blobUrl).catch(() => {});
  }
  await clearOrgStyleGuide(orgId);

  const next: OrgPublicMetadata = { ...existing };
  delete next.styleGuide;
  await client.organizations.updateOrganization(orgId, { publicMetadata: next });

  return NextResponse.json({ ok: true });
}
