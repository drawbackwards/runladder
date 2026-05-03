import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Returns the last 50 plugin persist-score attempts for diagnostic use.
 * Read-only; gated by the same shared service secret as the persist endpoint
 * itself so nothing else can hit it.
 */
export async function GET(req: NextRequest) {
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected || serviceToken !== expected) {
    return NextResponse.json(
      { error: "Invalid service token" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  const raw = await redis.lrange("debug:plugin-persist-log", 0, 49);
  const entries = (raw as string[])
    .map((s) => {
      if (typeof s !== "string") return s;
      try {
        return JSON.parse(s);
      } catch {
        return { raw: s };
      }
    })
    .filter(Boolean);

  return NextResponse.json(
    { count: entries.length, entries },
    { headers: API_VERSION_HEADERS },
  );
}
