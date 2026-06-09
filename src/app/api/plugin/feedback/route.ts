import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";
import { writeScoreFeedback } from "@/lib/score-feedback";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Per-score feedback from the Figma plugin's in-canvas widget (#330).
 *
 * Called server-to-server by ai-design-assistant after a user taps Helpful /
 * Off-base, so plugin feedback lands in the SAME score-feedback store the web
 * widget uses and shows up in the Admin → Feedback tab. The plugin backend
 * already holds the runladder scoreId (it persisted the score via
 * /api/plugin/persist-score) and the runladder userId.
 *
 * Auth model: shared service secret (X-Ladder-Service-Token header), same as
 * /api/plugin/persist-score.
 *
 * Body: { userId, scoreId, rating: "up"|"down", note? }
 * Returns: { ok: true }
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

  let body: {
    userId?: string;
    scoreId?: string;
    rating?: string;
    note?: string;
  } = {};
  try {
    body = await req.json();
  } catch {}

  if (!body.userId || !body.scoreId) {
    return NextResponse.json(
      { error: "userId and scoreId are required." },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }
  if (body.rating !== "up" && body.rating !== "down") {
    return NextResponse.json(
      { error: "rating must be 'up' or 'down'" },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  await writeScoreFeedback(redis, {
    userId: body.userId,
    scoreId: body.scoreId,
    rating: body.rating,
    note: body.note,
  });

  return NextResponse.json({ ok: true }, { headers: API_VERSION_HEADERS });
}
