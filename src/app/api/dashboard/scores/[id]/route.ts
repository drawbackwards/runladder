import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const scores = await redis.zrange(`user:${userId}:scores`, 0, -1, { rev: true });

  for (const entry of scores as string[]) {
    try {
      const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
      if (parsed.id === id) {
        return NextResponse.json(parsed);
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Score not found" }, { status: 404 });
}
