import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

/**
 * Soft-delete a score the signed-in user owns.
 *
 * Why soft instead of hard delete: team leads need an audit trail —
 * "this member's screen was scored at 2.4, then deleted three days
 * later" is information a manager should be able to see. Hard delete
 * threw away that signal.
 *
 * Mechanism:
 *   - Find the entry by id in the user's sorted set.
 *   - zrem the original member string, then zadd a copy that adds
 *     deletedAt = Date.now() while preserving the original timestamp
 *     score (so the entry's chronological position stays put).
 *   - Already-deleted entries return 400. Missing entries return 404.
 *
 * Visibility rules (enforced elsewhere — this endpoint just marks):
 *   - Member views (/api/dashboard, score detail) filter deletedAt out.
 *   - Team-admin views (/api/dashboard/team, member detail) pass it
 *     through so the manager can see the entry tagged as deleted.
 *   - Aggregations (avg, weakest rung, etc.) exclude deleted.
 */
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scoreId } = await req.json();
  if (!scoreId) {
    return NextResponse.json({ error: "scoreId required" }, { status: 400 });
  }

  const key = `user:${userId}:scores`;
  const entries = (await redis.zrange(key, 0, -1)) as Array<string | object>;

  for (const entry of entries) {
    const str = typeof entry === "string" ? entry : JSON.stringify(entry);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(str);
    } catch {
      continue;
    }
    if (parsed.id !== scoreId) continue;

    if (parsed.deletedAt) {
      return NextResponse.json(
        { error: "Score already deleted" },
        { status: 400 },
      );
    }

    const updated = { ...parsed, deletedAt: Date.now(), deletedBy: userId };
    const updatedStr = JSON.stringify(updated);
    const timestamp = Number(parsed.timestamp) || Date.now();

    await redis.zrem(key, str);
    await redis.zadd(key, {
      score: timestamp,
      member: updatedStr,
    });

    return NextResponse.json({ success: true, deletedAt: updated.deletedAt });
  }

  return NextResponse.json({ error: "Score not found" }, { status: 404 });
}
