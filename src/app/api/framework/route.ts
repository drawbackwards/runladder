import { NextRequest, NextResponse } from "next/server";
import {
  LEVELS,
  EVALUATION_DIMENSIONS,
  SCORING_PRINCIPLES,
  DESIGN_TYPES,
  AI_EXPERIENCE_LENS,
  SURVEY_DOMAINS,
  SENTIMENT_TO_VALUE,
  RUNG_NAMES,
  ladderFullPrompt,
  ladderCompactPrompt,
  ladderPerRungPrompt,
  ladderFeedbackPrompt,
  aiLensPrompt,
  designTypeClassifierPrompt,
} from "@/lib/ladder-framework";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Framework content endpoint — served to trusted service consumers so the
 * Ladder framework data lives in exactly one repo (this one).
 *
 * Auth: shared service secret (X-Ladder-Service-Token). Not public.
 *
 * The plugin backend (ai-design-assistant) fetches from here at cold start
 * and caches. That lets us delete the 663-line _ladder.js from that repo
 * and prevents framework IP from ever being checked into it again.
 */
export async function GET(req: NextRequest) {
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

  // Pre-render domain-specific feedback prompts for common defaults so
  // the plugin backend can cache them without also needing the builder.
  const feedbackPromptsByDomain = {
    b2b: ladderFeedbackPrompt("{{name}}", "b2b"),
    b2c: ladderFeedbackPrompt("{{name}}", "b2c"),
    process: ladderFeedbackPrompt("{{name}}", "process"),
    service: ladderFeedbackPrompt("{{name}}", "service"),
  };

  return NextResponse.json(
    {
      /* Raw framework objects — used by code that needs structured data
         (e.g., DESIGN_TYPES lists, SURVEY_DOMAINS statements). */
      LEVELS,
      EVALUATION_DIMENSIONS,
      SCORING_PRINCIPLES,
      DESIGN_TYPES,
      AI_EXPERIENCE_LENS,
      SURVEY_DOMAINS,
      SENTIMENT_TO_VALUE,
      RUNG_NAMES,

      /* Pre-rendered prompt strings — the big reason this endpoint exists.
         Callers don't need the builders locally; they get the output. */
      prompts: {
        ladderFullPrompt: ladderFullPrompt(),
        ladderCompactPrompt: ladderCompactPrompt(),
        ladderPerRungPrompt: ladderPerRungPrompt(),
        aiLensPrompt: aiLensPrompt(),
        designTypeClassifierPrompt: designTypeClassifierPrompt(),
        feedbackPromptsByDomain,
      },

      /* Fetch metadata — lets consumers know when framework last changed. */
      meta: {
        apiVersion: CURRENT_API_VERSION,
        gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
        fetchedAt: new Date().toISOString(),
      },
    },
    { headers: API_VERSION_HEADERS },
  );
}
