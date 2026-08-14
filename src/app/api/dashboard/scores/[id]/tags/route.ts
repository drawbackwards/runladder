import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis, zrangeAllChunked } from "@/lib/redis";
import { isValidIndustry } from "@/lib/industry-registry";
import { captureLearningForScore } from "@/lib/learning";
import type { StoredScoreEntry } from "@/lib/scores";

/**
 * Per-score tagging (#429).
 *
 *   PATCH /api/dashboard/scores/:id/tags
 *     body: { industry?: string | null, tags?: string[] }
 *       - industry: a controlled-taxonomy slug to set, or null/"" to clear.
 *         Omit the key to leave it unchanged.
 *       - tags: the full free-form tag list (replace semantics). Omit to leave
 *         unchanged. Normalized: trimmed, de-duped, capped.
 *     -> { success: true, industry: string | null, tags: string[] }
 *
 * Owner-scoped: writes are keyed to the caller's own userId, so a team lead
 * viewing a member's score cannot tag it (matches the delete/annotations write
 * model). The stored entry is rewritten in place via zrem-then-zadd, preserving
 * its timestamp score so its chronological position is unchanged.
 *
 * The industry here is the ONLY tag that (in a later phase) feeds the
 * de-identified learning store, so it is validated against the controlled
 * taxonomy; free-form tags are the account's own and never leave it.
 */

const MAX_TAGS = 25;
const MAX_TAG_LEN = 50;

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().slice(0, MAX_TAG_LEN);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const setIndustry = "industry" in body;
  const setTags = "tags" in body;
  const setName = "screenName" in body;
  if (!setIndustry && !setTags && !setName) {
    return NextResponse.json(
      { error: "Provide industry, tags, or screenName" },
      { status: 400 },
    );
  }

  let nameValue: string | undefined;
  if (setName) {
    const v = body.screenName;
    if (typeof v !== "string" || !v.trim()) {
      return NextResponse.json(
        { error: "Invalid screen name" },
        { status: 400 },
      );
    }
    nameValue = v.trim().slice(0, 200);
  }

  let industryValue: string | null | undefined;
  if (setIndustry) {
    const v = body.industry;
    if (v === null || v === "") {
      industryValue = null;
    } else if (typeof v === "string" && (await isValidIndustry(v))) {
      industryValue = v;
    } else {
      return NextResponse.json({ error: "Unknown industry" }, { status: 400 });
    }
  }

  const tagsValue = setTags ? normalizeTags(body.tags) : undefined;

  const key = `user:${userId}:scores`;
  const entries = (await zrangeAllChunked(key)) as Array<string | object>;

  for (const entry of entries) {
    const str = typeof entry === "string" ? entry : JSON.stringify(entry);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(str);
    } catch {
      continue;
    }
    if (parsed.id !== id) continue;
    if (parsed.deletedAt) {
      return NextResponse.json(
        { error: "Score has been deleted" },
        { status: 400 },
      );
    }

    const updated: Record<string, unknown> = { ...parsed };
    if (setIndustry) {
      if (industryValue === null) delete updated.industry;
      else updated.industry = industryValue;
    }
    if (setTags) {
      if (tagsValue && tagsValue.length > 0) updated.tags = tagsValue;
      else delete updated.tags;
    }
    if (setName && nameValue) updated.screenName = nameValue;

    const timestamp = Number(parsed.timestamp) || Date.now();
    await redis.zrem(key, str);
    await redis.zadd(key, { score: timestamp, member: JSON.stringify(updated) });

    // Tagging an industry is what lets a multi-industry account's score reach
    // the learning store (its live capture was deferred at score time). Awaited
    // so it completes before the response; idempotent, so re-tagging an
    // already-captured score is a no-op (records can't be re-bucketed). #429.
    if (setIndustry && industryValue) {
      try {
        await captureLearningForScore(
          userId,
          updated as unknown as StoredScoreEntry,
        );
      } catch {
        // learning capture is best-effort; the tag is already saved
      }
    }

    return NextResponse.json({
      success: true,
      industry: (updated.industry as string) ?? null,
      tags: (updated.tags as string[]) ?? [],
      screenName: (updated.screenName as string) ?? null,
    });
  }

  return NextResponse.json({ error: "Score not found" }, { status: 404 });
}
