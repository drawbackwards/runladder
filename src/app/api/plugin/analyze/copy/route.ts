import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { parseImageDataUrl } from "@/lib/scoring";
import {
  getOrgStyleGuide,
  analyzeStyleComplianceCached,
  hasFrameText,
  type FrameText,
  type StyleGuideResult,
} from "@/lib/style-guide";
import { auditCopy } from "@/lib/copy-audit";
import { CURRENT_API_VERSION } from "@/lib/app-version";

// Runs two Sonnet passes (style compliance + general copy), so give it room.
export const maxDuration = 60;

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Backs the Figma plugin's "Improve Copy" action. Returns TWO independent
 * sections so the plugin can show them separately (#362):
 *
 *   - `styleGuide`: team style-guide compliance from `analyzeStyleCompliance`
 *     — the SAME engine the web score uses, so the findings are byte-identical
 *     across plugin and web (this is the whole point of #362). Null when the
 *     user's org has no guide.
 *   - `general`: a general UX copy audit (`auditCopy`) that deliberately skips
 *     style-guide matters, so it never duplicates or contradicts the section above.
 *
 * Auth: shared service secret (X-Ladder-Service-Token).
 * Body: { userId, image?, frameText? } — `frameText` is the frame's ground-truth
 *   text (preferred); the ruleset is resolved server-side from the user's org.
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
    if (!parsed && !hasFrameText(frameText)) {
      return NextResponse.json(
        { error: "Body must include an image and/or frameText." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }
    const imageInput = parsed
      ? { mediaType: parsed.mediaType, base64Data: parsed.base64Data }
      : null;

    // Resolve the team's style ruleset from the user's org (best-effort).
    let ruleset: string | null = null;
    let teamName: string | null = null;
    let orgId: string | null = null;
    if (userId) {
      try {
        const clerk = await clerkClient();
        const memberships = await clerk.users.getOrganizationMembershipList({ userId });
        orgId = memberships.data[0]?.organization?.id ?? null;
        const orgGuide = orgId ? await getOrgStyleGuide(orgId) : null;
        if (orgGuide) {
          ruleset = orgGuide.ruleset;
          teamName = orgGuide.teamName;
        }
      } catch (e) {
        console.warn("[LADDER:WARN] plugin copy style-guide lookup failed:", e);
      }
    }

    // Run both passes in parallel. The style pass is the SAME call the web score
    // makes — identical findings. The general pass is independent and skips
    // style matters. Each degrades on its own without failing the other.
    const [styleGuide, general] = await Promise.all([
      ruleset
        ? analyzeStyleComplianceCached({ image: imageInput, frameText }, ruleset, orgId)
            .then(
              (outcome): StyleGuideResult => ({
                status: outcome.findings.length > 0 ? "issues" : "compliant",
                teamName,
                findings: outcome.findings,
                textSource: outcome.textSource,
              }),
            )
            .catch((e): StyleGuideResult => {
              console.warn("[LADDER:WARN] plugin copy style pass failed:", e);
              return {
                status: "unavailable",
                teamName,
                findings: [],
                textSource: hasFrameText(frameText) ? "exact" : "inferred",
              };
            })
        : Promise.resolve(null),
      auditCopy({ image: imageInput, frameText }).catch((e) => {
        console.warn("[LADDER:WARN] plugin general copy pass failed:", e);
        return { summary: "", rewrites: [] };
      }),
    ]);

    return NextResponse.json(
      { mode: "copy", styleGuide, general },
      { headers: API_VERSION_HEADERS },
    );
  } catch (err) {
    console.error("[LADDER:ERROR] Plugin analyze/copy:", err);
    return NextResponse.json(
      { error: "Copy audit failed." },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
