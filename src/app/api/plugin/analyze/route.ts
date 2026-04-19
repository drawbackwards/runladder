import { NextRequest, NextResponse } from "next/server";
import {
  parseImageDataUrl,
  scoreImage,
  isScoringError,
} from "@/lib/scoring";
import { DESIGN_TYPES } from "@/lib/ladder-framework";
import { CURRENT_API_VERSION } from "@/lib/app-version";

export const maxDuration = 60;

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Plugin scoring endpoint — called server-to-server by the Figma plugin
 * backend (ai-design-assistant) after it has authenticated the end user.
 *
 * Auth model: shared service secret (X-Ladder-Service-Token header).
 * Rate limiting, usage tracking, and end-user auth remain on the caller's
 * side. This endpoint is a pure scoring proxy — the framework + prompts
 * never leave runladder.
 *
 * Response mirrors the plugin's expected "improve mode" shape so the plugin
 * UI doesn't need to change.
 */
export async function POST(req: NextRequest) {
  /* ── Shared-secret auth ── */
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected) {
    console.error(
      "[LADDER:ERROR] LADDER_SERVICE_TOKEN env var is not configured.",
    );
    return NextResponse.json(
      { error: "Service not configured." },
      { status: 503, headers: API_VERSION_HEADERS },
    );
  }
  if (!serviceToken || serviceToken !== expected) {
    return NextResponse.json(
      { error: "Invalid service token" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  try {
    const body = await req.json();
    const { image, designType, mode = "improve" } = body;

    if (mode !== "improve") {
      return NextResponse.json(
        { error: "Only improve mode is supported by this endpoint." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }

    const parsed = parseImageDataUrl(image);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid image format. Use a base64 data URL." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }

    /* ── Apply AI-experience lens when design type is AI-powered ── */
    const applyAiLens = !!DESIGN_TYPES.find(
      (t) => t.type === designType && t.aiLens,
    );

    const result = await scoreImage(parsed, { applyAiLens });
    if (isScoringError(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: API_VERSION_HEADERS },
      );
    }

    /* ── Map runladder shape → plugin "improve" shape ── */
    const findings = (result.findings ?? []).map((f) => ({
      title: f.title,
      impact: f.impact,
      fix: f.fix,
      category: f.category,
      rung: f.rung,
      severity:
        f.uplift >= 0.3 ? "high" : f.uplift >= 0.2 ? "medium" : "low",
    }));

    const top = result.findings?.[0];
    const oneThing = top
      ? {
          title: top.title,
          impact: top.impact,
          fix: top.fix,
          category: top.category,
          scoreGain:
            typeof top.uplift === "number"
              ? `+${top.uplift.toFixed(1)}`
              : undefined,
        }
      : undefined;

    const designTypeInfo = designType
      ? DESIGN_TYPES.find((t) => t.type === designType)
      : undefined;

    return NextResponse.json(
      {
        mode: "improve",
        designType: designType ?? undefined,
        designTypeLabel: designTypeInfo?.label,
        ladder: {
          score: result.score,
          label: result.label,
          summary: result.summary,
          next: result.next ?? "",
        },
        rungs: result.rungs,
        findings,
        oneThing,
        screenName: result.screenName,
        apiVersion: CURRENT_API_VERSION,
      },
      { headers: API_VERSION_HEADERS },
    );
  } catch (err) {
    console.error("[LADDER:ERROR] Plugin analyze endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
