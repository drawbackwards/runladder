import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import { redis } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";

/**
 * Admin feedback aggregation — surfaces every analysis-quality rating users
 * have submitted via /api/feedback/score, enriched with the user's email
 * and the underlying score (so QA can quickly see what was rated).
 *
 * GET /api/admin/feedback?limit=50
 *   → { feedback: EnrichedFeedback[] } most-recent-first
 *
 * Gated by the runladder admin-email allowlist (getAdminEmail).
 */

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };
const FEEDBACK_INDEX_KEY = "score-feedback:index";

type StoredFeedback = {
  scoreId: string;
  userId: string;
  orgId: string | null;
  rating: "up" | "down";
  note: string;
  ts: number;
};

type EnrichedFeedback = StoredFeedback & {
  userEmail: string | null;
  userName: string | null;
  orgName: string | null;
  score: number | null;
  scoreLabel: string | null;
  screenName: string | null;
};

type ScoreSnapshot = {
  id?: string;
  score?: number;
  label?: string;
  screenName?: string;
};

function recordKey(scoreId: string, userId: string): string {
  return `score-feedback:${scoreId}:${userId}`;
}

export async function GET(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);

  const indexEntries = (await redis.zrange(
    FEEDBACK_INDEX_KEY,
    0,
    limit - 1,
    { rev: true },
  )) as string[];

  const records: StoredFeedback[] = (
    await Promise.all(
      indexEntries.map(async (member) => {
        const sep = member.indexOf(":");
        if (sep === -1) return null;
        const scoreId = member.slice(0, sep);
        const userId = member.slice(sep + 1);
        if (!scoreId || !userId) return null;
        const raw = await redis.get<string | StoredFeedback>(
          recordKey(scoreId, userId),
        );
        if (!raw) return null;
        if (typeof raw === "string") {
          try {
            return JSON.parse(raw) as StoredFeedback;
          } catch {
            return null;
          }
        }
        return raw;
      }),
    )
  ).filter((r): r is StoredFeedback => r !== null);

  const client = await clerkClient();

  const enriched: EnrichedFeedback[] = await Promise.all(
    records.map(async (fb): Promise<EnrichedFeedback> => {
      const base: EnrichedFeedback = {
        ...fb,
        userEmail: null,
        userName: null,
        orgName: null,
        score: null,
        scoreLabel: null,
        screenName: null,
      };

      try {
        const user = await client.users.getUser(fb.userId);
        base.userEmail = user.primaryEmailAddress?.emailAddress ?? null;
        base.userName =
          [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
      } catch {
        // user may have been deleted
      }

      if (fb.orgId) {
        try {
          const org = await client.organizations.getOrganization({
            organizationId: fb.orgId,
          });
          base.orgName = org.name ?? null;
        } catch {
          // org may have been deleted
        }
      }

      try {
        const scores = (await redis.zrange(
          `user:${fb.userId}:scores`,
          0,
          -1,
          { rev: true },
        )) as Array<string | ScoreSnapshot>;
        for (const entry of scores) {
          let parsed: ScoreSnapshot | null = null;
          if (typeof entry === "string") {
            try {
              parsed = JSON.parse(entry) as ScoreSnapshot;
            } catch {
              continue;
            }
          } else {
            parsed = entry;
          }
          if (parsed && parsed.id === fb.scoreId) {
            base.score = typeof parsed.score === "number" ? parsed.score : null;
            base.scoreLabel =
              typeof parsed.label === "string" ? parsed.label : null;
            base.screenName =
              typeof parsed.screenName === "string" ? parsed.screenName : null;
            break;
          }
        }
      } catch {
        // score history unreadable
      }

      return base;
    }),
  );

  return NextResponse.json(
    { feedback: enriched },
    { headers: API_VERSION_HEADERS },
  );
}
