import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import {
  parseImageDataUrl,
  scoreImage,
  isScoringError,
} from "@/lib/scoring";
import { makeThumbnail } from "@/lib/thumbnail";
import { FREE_MONTHLY_LIMIT, ANON_LIMIT } from "@/lib/plans";

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

    /* ── Rate limiting via Redis ── */
    const monthKey = new Date().toISOString().slice(0, 7); // "2026-04"

    if (userId) {
      const countKey = `user:${userId}:usage:${monthKey}`;
      const count = (await redis.get<number>(countKey)) ?? 0;
      if (count >= FREE_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Free tier limit reached (${FREE_MONTHLY_LIMIT} scores/month). Upgrade for unlimited scoring.`,
            upgrade: true,
          },
          { status: 429 }
        );
      }
    } else {
      const anonKey = `rate:anon:${ip}`;
      const count = (await redis.get<number>(anonKey)) ?? 0;
      if (count >= ANON_LIMIT) {
        return NextResponse.json(
          {
            error: `Sign up for free to get ${FREE_MONTHLY_LIMIT} scores per month.`,
            signup: true,
          },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const { image, source, isPublic } = body;

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
    if (userId) {
      const thumbnail = await makeThumbnail(
        Buffer.from(parsed.base64Data, "base64"),
        parsed.mediaType,
      );

      const scoreEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      };

      const countKey = `user:${userId}:usage:${monthKey}`;

      await Promise.all([
        redis.zadd(`user:${userId}:scores`, {
          score: Date.now(),
          member: JSON.stringify(scoreEntry),
        }),
        redis.incr(countKey),
      ]);

      const ttl = await redis.ttl(countKey);
      if (ttl < 0) {
        await redis.expire(countKey, 60 * 60 * 24 * 35);
      }
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
    });
  } catch (err) {
    console.error("[LADDER:ERROR] Score endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500 }
    );
  }
}
