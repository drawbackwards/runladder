import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import {
  parseImageDataUrl,
  scoreImage,
  isScoringError,
} from "@/lib/scoring";
import { userIdFromBearer, touchSkillToken } from "@/lib/skill-auth";

export const maxDuration = 60;

const FREE_MONTHLY_LIMIT = 5;

/**
 * Skill scoring endpoint — called by the Ladder Claude Skill and other
 * token-authenticated thin clients. Shares the scoring engine and
 * monthly usage pool with /api/score.
 *
 * Response shape intentionally mirrors /api/score but strips anything
 * that could expose internal scoring logic.
 */
export async function POST(req: NextRequest) {
  try {
    /* ── Bearer token auth ── */
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return NextResponse.json(
        { error: "Missing Authorization: Bearer token." },
        { status: 401 }
      );
    }
    const raw = match[1].trim();
    const userId = await userIdFromBearer(raw);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or revoked token." },
        { status: 401 }
      );
    }

    /* ── Rate limiting (shared pool with /api/score) ── */
    const monthKey = new Date().toISOString().slice(0, 7);
    const countKey = `user:${userId}:usage:${monthKey}`;
    const count = (await redis.get<number>(countKey)) ?? 0;
    if (count >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: `Free tier limit reached (${FREE_MONTHLY_LIMIT} scores/month). Upgrade at https://runladder.com/pricing for unlimited scoring.`,
          upgrade: true,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { image, source } = body;

    const parsed = parseImageDataUrl(image);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid image format. Send a data URL like 'data:image/png;base64,...'.",
        },
        { status: 400 }
      );
    }

    const result = await scoreImage(parsed);
    if (isScoringError(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    /* ── Persist + increment ── */
    const scoreEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      score: result.score,
      label: result.label,
      screenName: result.screenName || source || "Skill",
      summary: result.summary,
      next: result.next,
      findings: result.findings,
      rungs: result.rungs,
      source: source || "claude-skill",
      isPublic: false,
      timestamp: Date.now(),
    };

    await Promise.all([
      redis.zadd(`user:${userId}:scores`, {
        score: Date.now(),
        member: JSON.stringify(scoreEntry),
      }),
      redis.incr(countKey),
      touchSkillToken(userId),
    ]);

    const ttl = await redis.ttl(countKey);
    if (ttl < 0) {
      await redis.expire(countKey, 60 * 60 * 24 * 35);
    }

    return NextResponse.json({
      score: result.score,
      label: result.label,
      screenName: result.screenName || source || "Screen",
      summary: result.summary,
      next: result.next,
      rungs: result.rungs,
      findings: result.findings,
      dashboardUrl: `https://runladder.com/dashboard/scores/${scoreEntry.id}`,
    });
  } catch (err) {
    console.error("[LADDER:ERROR] Skill score endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500 }
    );
  }
}
