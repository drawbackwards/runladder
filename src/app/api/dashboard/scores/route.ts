import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scoreId } = await req.json();
  if (!scoreId) {
    return NextResponse.json({ error: "scoreId required" }, { status: 400 });
  }

  // Find and remove the score entry from the sorted set
  const scores = await redis.zrange(`user:${userId}:scores`, 0, -1);

  for (const entry of scores) {
    const str = typeof entry === "string" ? entry : JSON.stringify(entry);
    try {
      const parsed = JSON.parse(str);
      if (parsed.id === scoreId) {
        await redis.zrem(`user:${userId}:scores`, str);
        return NextResponse.json({ success: true });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Score not found" }, { status: 404 });
}
