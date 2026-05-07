import { NextRequest, NextResponse } from "next/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import {
  parseImageDataUrl,
  scoreImage,
  isScoringError,
} from "@/lib/scoring";
import { makeThumbnail } from "@/lib/thumbnail";
import { userIdFromBearer, touchSkillToken } from "@/lib/skill-auth";
import { FREE_LIFETIME_LIMIT, isPaidTier } from "@/lib/plans";
import { getUserTier } from "@/lib/tier";
import { persistScoreEntry } from "@/lib/scores";

export const maxDuration = 60;

/**
 * Skill scoring endpoint — called by the Ladder Claude Skill and other
 * token-authenticated thin clients. Shares the scoring engine and
 * lifetime usage pool with /api/score.
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
    const installedVersion =
      req.headers.get("x-ladder-skill-version")?.slice(0, 32) || undefined;

    /* ── Rate limiting (shared lifetime pool with /api/score) ── */
    const tier = await getUserTier(userId);
    const usedKey = lifetimeScansKey(userId);
    if (!isPaidTier(tier)) {
      const used = (await redis.get<number>(usedKey)) ?? 0;
      if (used >= FREE_LIFETIME_LIMIT) {
        return NextResponse.json(
          {
            error: `You've used all ${FREE_LIFETIME_LIMIT} free Ladder scores. Upgrade at https://runladder.com/pricing for unlimited scoring.`,
            upgrade: true,
          },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const { image, source, sessionType: rawSessionType } = body;
    // The Skill defaults to "evaluation" when no flag is given (people
    // running ad-hoc checks in Claude are usually critiquing, not designing).
    // Caller can pass "design" explicitly when they're working on their own.
    const sessionType: "design" | "evaluation" =
      rawSessionType === "design" ? "design" : "evaluation";

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
    const thumbnail = await makeThumbnail(
      Buffer.from(parsed.base64Data, "base64"),
      parsed.mediaType,
    );

    const scoreEntry = await persistScoreEntry(userId, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      score: result.score,
      label: result.label,
      screenName: result.screenName || source || "Skill",
      summary: result.summary,
      next: result.next,
      findings: result.findings,
      rungs: result.rungs,
      source: source || "claude-skill",
      thumbnail,
      isPublic: false,
      timestamp: Date.now(),
      sessionType,
    });
    await touchSkillToken(userId, installedVersion);

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
