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
  ANON_LIMIT,
  PRO_MONTHLY_LIMIT,
  isPaidTier,
} from "@/lib/plans";
import { getUserTier } from "@/lib/tier";
import { persistScoreEntry } from "@/lib/scores";

export const maxDuration = 60;

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

    /* ── Auth (optional — anonymous users allowed with lower limit) ── */
    const { userId } = await auth();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    /* ── Rate limiting ── */
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
      }
    } else {
      const anonKey = `rate:anon:${ip}`;
      const count = (await redis.get<number>(anonKey)) ?? 0;
      if (count >= ANON_LIMIT) {
        return NextResponse.json(
          {
            error: `Sign up for free to get ${FREE_LIFETIME_LIMIT} Ladder scores.`,
            signup: true,
          },
          { status: 429 }
        );
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
    let persistedScoreId: string | null = null;
    if (userId) {
      const thumbnail = await makeThumbnail(
        Buffer.from(parsed.base64Data, "base64"),
        parsed.mediaType,
      );

      const scoreId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await persistScoreEntry(userId, {
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
        isPublic: !!isPublic,
        timestamp: Date.now(),
        sessionType,
      });
      persistedScoreId = scoreId;
    } else {
      const anonKey = `rate:anon:${ip}`;
      await redis.incr(anonKey);
      const ttl = await redis.ttl(anonKey);
      if (ttl < 0) {
        await redis.expire(anonKey, 60 * 60 * 24);
      }
    }

    return NextResponse.json({
      ...result,
      screenName: result.screenName || source || "Screen",
      // Echo the persisted score's id so the client can route the user
      // straight to /dashboard/scores/[id] after analysis. Null for anon.
      scoreId: persistedScoreId,
    });
  } catch (err) {
    console.error("[LADDER:ERROR] Score endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500 }
    );
  }
}
