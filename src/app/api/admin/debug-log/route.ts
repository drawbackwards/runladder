import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Generic diagnostic logger. POST a JSON body and we shove it onto the
 * shared debug log so it shows up alongside verify-token and persist-score
 * entries. Used by ai-design-assistant to surface what its analyze.js
 * is doing without us needing to read Vercel runtime logs by hand.
 */
export async function POST(req: NextRequest) {
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected || serviceToken !== expected) {
    return NextResponse.json(
      { error: "Invalid service token" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    await redis.lpush(
      "debug:plugin-persist-log",
      JSON.stringify({ ts: Date.now(), kind: "client", ...body }),
    );
    await redis.ltrim("debug:plugin-persist-log", 0, 49);
    await redis.expire("debug:plugin-persist-log", 60 * 60 * 24);
    return NextResponse.json({ ok: true }, { headers: API_VERSION_HEADERS });
  } catch (err) {
    console.error("[LADDER:ERROR] debug-log:", err);
    return NextResponse.json(
      { error: "Log failed" },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
