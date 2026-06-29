import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { parseImageDataUrl } from "@/lib/scoring";
import { getOrgStyleGuide, type FrameText } from "@/lib/style-guide";
import { auditCopy } from "@/lib/copy-audit";
import { CURRENT_API_VERSION } from "@/lib/app-version";

// Runs a Sonnet copy audit (+ optional style-guide pass), so give it room.
export const maxDuration = 60;

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Canonical UX copy audit for the Figma plugin's "Improve Copy" action.
 * Server-to-server, called by the ai-design-assistant backend instead of it
 * building the copy prompt and calling Anthropic itself — which is what made
 * style-guide findings diverge from the web's score-time pass (#362).
 *
 * Auth: shared service secret (X-Ladder-Service-Token).
 * Body: { userId, image?, frameText?, mode?: "copy" }
 *   - `frameText` is the screen's GROUND-TRUTH text (Figma layers). When
 *     present the audit judges those exact strings; the image is a fallback.
 *   - the team's style ruleset is resolved HERE from the user's org, so the
 *     ruleset never has to travel to the plugin (keeps the IP server-side).
 * Returns: CopyAuditResult ({ mode:"copy", ladder, copy:{summary,rewrites}, textSource }).
 */
export async function POST(req: NextRequest) {
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Service not configured." },
      { status: 503, headers: API_VERSION_HEADERS },
    );
  }
  if (serviceToken !== expected) {
    return NextResponse.json(
      { error: "Invalid service token" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  try {
    const body = (await req.json()) as {
      userId?: string;
      image?: string;
      frameText?: FrameText;
    };
    const { userId, image, frameText } = body;

    const parsed = image ? parseImageDataUrl(image) : null;
    const hasText = !!frameText?.textContent && frameText.textContent.length > 0;
    if (!parsed && !hasText) {
      return NextResponse.json(
        { error: "Body must include an image and/or frameText." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }

    // Resolve the team's style ruleset from the user's org (best-effort). A
    // missing/failed lookup just means a general copy audit with no style pass.
    let ruleset: string | null = null;
    let teamName: string | null = null;
    if (userId) {
      try {
        const clerk = await clerkClient();
        const memberships = await clerk.users.getOrganizationMembershipList({ userId });
        const orgId = memberships.data[0]?.organization?.id ?? null;
        const orgGuide = orgId ? await getOrgStyleGuide(orgId) : null;
        if (orgGuide) {
          ruleset = orgGuide.ruleset;
          teamName = orgGuide.teamName;
        }
      } catch (e) {
        console.warn("[LADDER:WARN] plugin copy style-guide lookup failed:", e);
      }
    }

    const result = await auditCopy(
      {
        image: parsed
          ? { mediaType: parsed.mediaType, base64Data: parsed.base64Data }
          : null,
        frameText,
      },
      { ruleset, teamName },
    );

    return NextResponse.json(result, { headers: API_VERSION_HEADERS });
  } catch (err) {
    console.error("[LADDER:ERROR] Plugin analyze/copy:", err);
    return NextResponse.json(
      { error: "Copy audit failed." },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
