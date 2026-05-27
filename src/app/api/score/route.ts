import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import {
  parseImageDataUrl,
  scoreImage,
  isScoringError,
} from "@/lib/scoring";
import { makeThumbnail } from "@/lib/thumbnail";
import {
  FREE_LIFETIME_LIMIT,
  PRO_MONTHLY_LIMIT,
  isPaidTier,
  monthlyHardCapForTier,
} from "@/lib/plans";
import { getMonthlyScans } from "@/lib/usage";
import { getUserTier } from "@/lib/tier";
import { persistScoreEntry, type ScoreEntryInput } from "@/lib/scores";
import {
  ANON_COOKIE,
  readAnonId,
  mintAnonId,
  clientIp,
  assertAnonAllowed,
  recordAnonScore,
} from "@/lib/anon-score";

export const maxDuration = 60;

const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  try {
    /* ── Bot detection ── */
    const ua = req.headers.get("user-agent") || "";
    if (/curl|wget|python-requests|httpie|postman|scrapy|phantomjs/i.test(ua)) {
      return NextResponse.json(
        { error: "Automated requests are not allowed." },
        { status: 403 }
      );
    }

    /* ── Auth / anonymous gate ── Signed-in users score per their tier.
     * Signed-out visitors get ONE free score (#187): cookie-capped with a
     * per-IP daily backstop. Other surfaces still gate at the door. */
    const { userId } = await auth();

    let anonId: string | null = null;
    let anonIsNew = false;
    let anonIp = "";
    if (!userId) {
      anonIp = clientIp(req);
      anonId = readAnonId(req);
      if (!anonId) {
        anonId = mintAnonId();
        anonIsNew = true;
      }
      const gate = await assertAnonAllowed(anonId, anonIp);
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: `Sign up for free to get ${FREE_LIFETIME_LIMIT} Ladder scores.`,
            signup: true,
          },
          { status: 401 }
        );
      }
    }

    /* ── Rate limiting (signed-in tiers) ── */
    if (userId) {
      const tier = await getUserTier(userId);
      if (!isPaidTier(tier)) {
        const usedKey = lifetimeScansKey(userId);
        const used = (await redis.get<number>(usedKey)) ?? 0;
        if (used >= FREE_LIFETIME_LIMIT) {
          return NextResponse.json(
            {
              error: `You've used all ${FREE_LIFETIME_LIMIT} free Ladder scores. Upgrade to Pro for ${PRO_MONTHLY_LIMIT.toLocaleString()} scores per month.`,
              upgrade: true,
            },
            { status: 429 }
          );
        }
      } else {
        // Paid-tier hard ceiling — 2x the soft cap. Above this we stop
        // scoring entirely and direct the user to start a higher-volume
        // conversation. The soft-cap zone between the soft cap and this
        // hard ceiling is intentionally wide so the meter, email alert,
        // and "talk to us" outreach can all land before the wall.
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
    }

    const body = await req.json();
    const { image, source, isPublic, sessionType: rawSessionType } = body;
    // Default to "design" when caller doesn't specify, but accept "evaluation"
    // when the user has explicitly picked an audit/research session.
    const sessionType: "design" | "evaluation" =
      rawSessionType === "evaluation" ? "evaluation" : "design";

    const parsed = parseImageDataUrl(image);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid image format. Use a data URL (base64)." },
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

    /* ── Persist score + increment usage ── */
    const thumbnail = await makeThumbnail(
      Buffer.from(parsed.base64Data, "base64"),
      parsed.mediaType,
    );

    const scoreId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: ScoreEntryInput = {
      id: scoreId,
      score: result.score,
      label: result.label,
      screenName: result.screenName || source || "upload",
      summary: result.summary,
      next: result.next,
      findings: result.findings,
      rungs: result.rungs,
      source: source || "upload",
      thumbnail,
      // Anonymous scores are always private; only signed-in users opt in.
      isPublic: userId ? !!isPublic : false,
      timestamp: Date.now(),
      sessionType,
    };

    if (userId) {
      await persistScoreEntry(userId, entry);
    } else if (anonId) {
      // Stash for claim-on-signup + bump the anon counters.
      await recordAnonScore(anonId, anonIp, entry);
    }

    const res = NextResponse.json({
      ...result,
      screenName: result.screenName || source || "Screen",
      // Anon scores have no dashboard detail page; they're claimed by cookie.
      scoreId: userId ? scoreId : null,
    });
    if (anonId && anonIsNew) {
      res.cookies.set(ANON_COOKIE, anonId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: ANON_COOKIE_MAX_AGE,
      });
    }
    return res;
  } catch (err) {
    console.error("[LADDER:ERROR] Score endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500 }
    );
  }
}
