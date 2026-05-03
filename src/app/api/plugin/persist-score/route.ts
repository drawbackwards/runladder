import { NextRequest, NextResponse } from "next/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import { parseImageDataUrl } from "@/lib/scoring";
import { makeThumbnail } from "@/lib/thumbnail";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

type ScoreEntry = {
  id: string;
  score: number;
  label: string;
  screenName?: string;
  summary?: string;
  next?: string;
  findings?: unknown[];
  rungs?: unknown;
  source: string;
  thumbnail?: string;
  isPublic?: boolean;
  timestamp: number;
};

/**
 * Persist a Ladder score to a user's runladder.com history.
 * Called server-to-server by ai-design-assistant after a Figma plugin scan,
 * so Figma scores show up alongside web/Skill scores in the user's dashboard.
 *
 * Auth model: shared service secret (X-Ladder-Service-Token header).
 *
 * Body: { userId: string, score: ScoreEntry }
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

  try {
    const body = (await req.json()) as {
      userId?: string;
      score?: ScoreEntry;
      image?: string;
    };
    const { userId, score, image } = body;

    if (!userId || !score?.id || typeof score.score !== "number") {
      return NextResponse.json(
        { error: "Body must include userId and a valid score entry." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }

    /* ── Optional thumbnail: caller passes the raw image data URL, we resize ── */
    let thumbnail: string | undefined = score.thumbnail;
    if (!thumbnail && image) {
      const parsed = parseImageDataUrl(image);
      if (parsed) {
        thumbnail = await makeThumbnail(
          Buffer.from(parsed.base64Data, "base64"),
          parsed.mediaType,
        );
      }
    }

    const entry: ScoreEntry = {
      id: score.id,
      score: score.score,
      label: score.label,
      screenName: score.screenName,
      summary: score.summary,
      next: score.next,
      findings: score.findings,
      rungs: score.rungs,
      source: score.source || "figma",
      thumbnail,
      isPublic: !!score.isPublic,
      timestamp: score.timestamp || Date.now(),
    };

    await Promise.all([
      redis.zadd(`user:${userId}:scores`, {
        score: entry.timestamp,
        member: JSON.stringify(entry),
      }),
      redis.incr(lifetimeScansKey(userId)),
    ]);

    // Diagnostic log: keep the last 50 persist attempts for 24h so we can
    // verify cross-repo calls land without trawling Vercel logs by hand.
    try {
      await redis.lpush(
        "debug:plugin-persist-log",
        JSON.stringify({
          ts: Date.now(),
          userId,
          scoreId: entry.id,
          score: entry.score,
          screenName: entry.screenName,
          source: entry.source,
          ok: true,
        }),
      );
      await redis.ltrim("debug:plugin-persist-log", 0, 49);
      await redis.expire("debug:plugin-persist-log", 60 * 60 * 24);
    } catch {
      // Logging is best-effort.
    }

    return NextResponse.json(
      { ok: true },
      { headers: API_VERSION_HEADERS },
    );
  } catch (err) {
    console.error("[LADDER:ERROR] Plugin persist-score:", err);
    return NextResponse.json(
      { error: "Persist failed." },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
