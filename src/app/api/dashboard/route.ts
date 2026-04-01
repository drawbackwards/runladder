import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const countKey = `user:${userId}:usage:${monthKey}`;

  const [scores, usage] = await Promise.all([
    // Get all scores, newest first (reverse sorted set by timestamp)
    redis.zrange(`user:${userId}:scores`, 0, -1, { rev: true }),
    // Get current month usage
    redis.get<number>(countKey),
  ]);

  // Parse score entries (stored as JSON strings in sorted set)
  const parsedScores = (scores as string[]).map((entry) => {
    if (typeof entry === "string") {
      try {
        return JSON.parse(entry);
      } catch {
        return null;
      }
    }
    return entry;
  }).filter(Boolean);

  return NextResponse.json({
    scores: parsedScores,
    usage: {
      used: usage ?? 0,
      limit: 5,
      month: monthKey,
    },
  });
}
