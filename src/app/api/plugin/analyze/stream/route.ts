import { NextRequest, NextResponse } from "next/server";
import {
  parseImageDataUrl,
  scoreImageStream,
  type ScoreResult,
} from "@/lib/scoring";
import { DESIGN_TYPES } from "@/lib/ladder-framework";
import { CURRENT_API_VERSION } from "@/lib/app-version";

export const maxDuration = 60;

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Streaming plugin scoring endpoint — the streaming sibling of
 * `/api/plugin/analyze`. Called server-to-server by the Figma plugin backend
 * (ai-design-assistant) after it has authenticated the end user.
 *
 * Why this exists: the Figma plugin used to score in its OWN backend, calling
 * Anthropic directly at the API default temperature with no cache, so the same
 * screen drifted (measured ~0.18 avg vs ~0.005 on this engine) and never
 * matched web/Skill. This endpoint runs the ONE canonical engine
 * (`scoreImageStream`: temperature 0, content-addressed cache) so every surface
 * scores identically (#343). It streams so the plugin keeps its fast in-canvas
 * score reveal.
 *
 * Auth: shared service secret (X-Ladder-Service-Token), same as
 * `/api/plugin/analyze`. Usage counting, end-user auth, and persistence stay on
 * the plugin's side (the plugin is the single writer of Figma scores) — this
 * endpoint only scores. The SSE event shape (score / label / screenName /
 * complete / error) matches what the plugin UI already consumes; the `complete`
 * payload is mapped to the plugin's "improve" shape so the UI needs no change.
 */
export async function POST(req: NextRequest) {
  /* ── Shared-secret auth (mirrors /api/plugin/analyze) ── */
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected) {
    console.error("[LADDER:ERROR] LADDER_SERVICE_TOKEN env var is not configured.");
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

  const body = await req.json();
  const { image, designType } = body;
  const parsed = parseImageDataUrl(image);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid image format. Use a base64 data URL." },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  const designTypeInfo = designType
    ? DESIGN_TYPES.find((t) => t.type === designType)
    : undefined;
  const applyAiLens = !!designTypeInfo?.aiLens;

  /* ── Map the canonical ScoreResult to the plugin's "improve" shape ──
   * Identical mapping to the non-streaming /api/plugin/analyze, so the plugin
   * UI and its persist path read the same fields regardless of which endpoint
   * produced the score. */
  const toPluginShape = (result: ScoreResult) => {
    const findings = (result.findings ?? []).map((f) => ({
      title: f.title,
      impact: f.impact,
      fix: f.fix,
      category: f.category,
      rung: f.rung,
      severity: f.uplift >= 0.3 ? "high" : f.uplift >= 0.2 ? "medium" : "low",
    }));
    const top = result.findings?.[0];
    const oneThing = top
      ? {
          title: top.title,
          impact: top.impact,
          fix: top.fix,
          category: top.category,
          scoreGain:
            typeof top.uplift === "number" ? `+${top.uplift.toFixed(1)}` : undefined,
        }
      : undefined;
    return {
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
    };
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        for await (const ev of scoreImageStream(parsed, { applyAiLens })) {
          if (ev.kind === "error") {
            send("error", { message: ev.value, status: ev.status });
            controller.close();
            return;
          }
          if (ev.kind === "score") send("score", { value: ev.value });
          if (ev.kind === "label") send("label", { value: ev.value });
          if (ev.kind === "screenName") send("screenName", { value: ev.value });
          if (ev.kind === "complete") send("complete", { value: toPluginShape(ev.value) });
        }
        controller.close();
      } catch (err) {
        console.error("[LADDER:ERROR] Plugin analyze stream:", err);
        send("error", { message: "Scoring failed. Please try again.", status: 500 });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...API_VERSION_HEADERS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
