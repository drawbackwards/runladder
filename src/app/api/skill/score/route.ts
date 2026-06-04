import { NextRequest, NextResponse } from "next/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import {
  parseImageDataUrl,
  scoreImage,
  isScoringError,
} from "@/lib/scoring";
import { makeThumbnail } from "@/lib/thumbnail";
import { userIdFromBearer, touchSkillToken } from "@/lib/skill-auth";
import {
  FREE_LIFETIME_LIMIT,
  PRO_MONTHLY_LIMIT,
  isPaidTier,
  monthlyScoreCapForTier,
  monthlyHardCapForTier,
} from "@/lib/plans";
import { getUserTier } from "@/lib/tier";
import { persistScoreEntry } from "@/lib/scores";
import { getMonthlyScans, daysUntilMonthEnd } from "@/lib/usage";

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
            error: `You've used all ${FREE_LIFETIME_LIMIT} free Ladder scores. Upgrade at https://runladder.com/pricing for ${PRO_MONTHLY_LIMIT.toLocaleString()} scores per month.`,
            upgrade: true,
          },
          { status: 429 }
        );
      }
    } else {
      // Paid-tier hard ceiling at 2x the soft cap. Same enforcement as
      // /api/score and /api/score/stream so Skill users hit the wall
      // at the same point as web users. The SKILL.md prompt handles
      // the 429 — see step 5 of the script for the user-facing copy.
      const hardCap = monthlyHardCapForTier(tier);
      if (hardCap !== null) {
        const monthly = await getMonthlyScans(userId);
        if (monthly >= hardCap) {
          return NextResponse.json(
            {
              error: `Monthly scoring paused — you're at ${monthly.toLocaleString()} scores, past 2x your tier's cap. Email hello@drawbackwards.com to lift the ceiling.`,
              hardCapped: true,
              contact: "hello@drawbackwards.com",
            },
            { status: 429 }
          );
        }
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
    await touchSkillToken(userId, installedVersion, source === "claude-ai" ? "claude-ai" : "claude-code");

    /* ── Usage block ──
     * The Skill user lives in a Claude conversation; they never see
     * the dashboard meter. So the score response carries everything
     * Claude needs to surface their usage state inline — what tier
     * they're on, where they sit against the cap, and a status flag
     * (ok / approaching / over) so the SKILL.md prompt can branch
     * cleanly without making Claude do percentage math.
     *
     * Convention for status:
     *   ok          – under 80% of cap. Skill doesn't need to mention it.
     *   approaching – ≥ 80% of cap. Skill surfaces a soft heads-up.
     *   over        – past cap. Skill surfaces "no hard block, talk to us" copy.
     */
    const monthlyLimit = monthlyScoreCapForTier(tier);
    const lifetimeUsed = (await redis.get<number>(usedKey)) ?? 0;
    const monthlyUsed = monthlyLimit !== null ? await getMonthlyScans(userId) : 0;
    const usageStatus = ((): "ok" | "approaching" | "over" => {
      // Free tier reads against lifetime, paid tiers against monthly.
      if (tier === "free") {
        if (lifetimeUsed >= FREE_LIFETIME_LIMIT) return "over";
        if (lifetimeUsed >= FREE_LIFETIME_LIMIT - 1) return "approaching";
        return "ok";
      }
      if (monthlyLimit === null) return "ok";
      if (monthlyUsed > monthlyLimit) return "over";
      if (monthlyUsed / monthlyLimit >= 0.8) return "approaching";
      return "ok";
    })();

    return NextResponse.json({
      score: result.score,
      label: result.label,
      screenName: result.screenName || source || "Screen",
      summary: result.summary,
      next: result.next,
      rungs: result.rungs,
      findings: result.findings,
      dashboardUrl: `https://runladder.com/dashboard/scores/${scoreEntry.id}`,
      usage: {
        tier,
        status: usageStatus,
        monthlyUsed: monthlyLimit !== null ? monthlyUsed : null,
        monthlyLimit,
        lifetimeUsed: tier === "free" ? lifetimeUsed : null,
        lifetimeLimit: tier === "free" ? FREE_LIFETIME_LIMIT : null,
        daysUntilReset: monthlyLimit !== null ? daysUntilMonthEnd() : null,
      },
    });
  } catch (err) {
    console.error("[LADDER:ERROR] Skill score endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500 }
    );
  }
}
