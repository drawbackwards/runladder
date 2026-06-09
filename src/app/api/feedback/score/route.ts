import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";
import {
  recordKey,
  writeScoreFeedback,
  type StoredFeedback,
} from "@/lib/score-feedback";

/**
 * Score-analysis feedback — per-score thumbs from authenticated web users.
 * Shares the score-feedback store (see @/lib/score-feedback) with the Figma
 * plugin path (/api/plugin/feedback), so all of it surfaces in the admin.
 *
 * GET  ?scoreId=X        → current user's existing feedback for that score
 * POST { scoreId, rating, note? }  → upsert this user's feedback
 *
 * Anonymous viewers get 401 and the client hides the widget.
 */

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  const url = new URL(req.url);
  const scoreId = url.searchParams.get("scoreId");
  if (!scoreId) {
    return NextResponse.json(
      { error: "scoreId required" },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  const raw = await redis.get<string | StoredFeedback>(
    recordKey(scoreId, userId),
  );
  let feedback: StoredFeedback | null = null;
  if (raw) {
    if (typeof raw === "string") {
      try {
        feedback = JSON.parse(raw) as StoredFeedback;
      } catch {
        feedback = null;
      }
    } else {
      feedback = raw;
    }
  }

  return NextResponse.json(
    { feedback },
    { headers: API_VERSION_HEADERS },
  );
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  let body: { scoreId?: string; rating?: string; note?: string } = {};
  try {
    body = await req.json();
  } catch {}

  if (!body.scoreId) {
    return NextResponse.json(
      { error: "scoreId required" },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }
  if (body.rating !== "up" && body.rating !== "down") {
    return NextResponse.json(
      { error: "rating must be 'up' or 'down'" },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  const feedback = await writeScoreFeedback(redis, {
    scoreId: body.scoreId,
    userId,
    orgId: orgId ?? null,
    rating: body.rating,
    note: body.note,
  });

  return NextResponse.json(
    { ok: true, feedback },
    { headers: API_VERSION_HEADERS },
  );
}
