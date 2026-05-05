import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";

/**
 * Score-analysis feedback — per-score thumbs from authenticated users.
 *
 * GET  ?scoreId=X        → current user's existing feedback for that score
 * POST { scoreId, rating, note? }  → upsert this user's feedback
 *
 * Storage:
 *   score-feedback:{scoreId}:{userId} → JSON record
 *   score-feedback:index              → zset (ts → "{scoreId}:{userId}")
 *
 * Anonymous viewers get 401 and the client hides the widget.
 */

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

const FEEDBACK_INDEX_KEY = "score-feedback:index";

function recordKey(scoreId: string, userId: string): string {
  return `score-feedback:${scoreId}:${userId}`;
}

function indexMember(scoreId: string, userId: string): string {
  return `${scoreId}:${userId}`;
}

type StoredFeedback = {
  scoreId: string;
  userId: string;
  orgId: string | null;
  rating: "up" | "down";
  note: string;
  ts: number;
};

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

  const note =
    typeof body.note === "string" ? body.note.slice(0, 1000) : "";
  const ts = Date.now();
  const feedback: StoredFeedback = {
    scoreId: body.scoreId,
    userId,
    orgId: orgId ?? null,
    rating: body.rating,
    note,
    ts,
  };

  await Promise.all([
    redis.set(recordKey(body.scoreId, userId), JSON.stringify(feedback)),
    redis.zadd(FEEDBACK_INDEX_KEY, {
      score: ts,
      member: indexMember(body.scoreId, userId),
    }),
  ]);

  return NextResponse.json(
    { ok: true, feedback },
    { headers: API_VERSION_HEADERS },
  );
}
