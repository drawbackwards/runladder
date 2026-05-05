import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { getUserStats, type UserStats } from "@/lib/scores";
import {
  computeLetterGrade,
  LETTER_GRADE_THRESHOLD,
  LETTER_GRADE_WINDOW_DAYS,
  type LetterGrade,
} from "@/lib/letter-grade";
import { RUNG_NAMES, type RungName } from "@/lib/ladder";

/**
 * Team dashboard data — manager view.
 *
 * GET /api/dashboard/team
 * Returns the active org's roster with per-member stats and a letter grade,
 * plus team-wide insights (rung-level averages, weakest/strongest rung).
 *
 * Auth:
 *   - Requires signed-in user with an active org (orgId from auth()).
 *   - Manager-only data (stats, grades, insights) is gated on orgRole === "org:admin".
 *   - Non-admin members get the roster only — no per-person stats.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

type RawScore = {
  id?: string;
  score?: number;
  timestamp?: number;
  rungs?: unknown;
};

type RungOnly = Record<RungName, { score: number }>;

function parseRungScores(raw: unknown): RungOnly | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const out = {} as RungOnly;
  for (const name of RUNG_NAMES) {
    const r = obj[name];
    if (!r || typeof r !== "object") return null;
    const score = (r as { score?: unknown }).score;
    if (typeof score !== "number" || !Number.isFinite(score)) return null;
    out[name] = { score };
  }
  return out;
}

async function readRecentScores(
  userId: string,
  sinceTs: number,
): Promise<RawScore[]> {
  const raw = await redis.zrange(
    `user:${userId}:scores`,
    sinceTs,
    "+inf",
    { byScore: true },
  );
  return (raw as Array<string | RawScore>)
    .map((entry) => {
      if (typeof entry === "string") {
        try {
          return JSON.parse(entry) as RawScore;
        } catch {
          return null;
        }
      }
      return entry;
    })
    .filter((s): s is RawScore => s !== null);
}

type MemberSummary = {
  membershipId: string;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  joinedAt: number;
  stats: UserStats | null;
  recentScans: number;
  letterGrade: LetterGrade | null;
};

type RungAverage = {
  rung: RungName;
  avg: number | null;
  count: number;
};

type Insights = {
  windowDays: number;
  threshold: number;
  totalScores: number;
  teamAvg: number | null;
  rungAverages: RungAverage[];
  weakestRung: { rung: RungName; avg: number; count: number } | null;
  strongestRung: { rung: RungName; avg: number; count: number } | null;
};

export async function GET() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "No active team" }, { status: 404 });
  }

  const isManager = orgRole === "org:admin";

  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });

  const windowStart = Date.now() - LETTER_GRADE_WINDOW_DAYS * DAY_MS;

  const rungSums: Record<RungName, number> = {
    functional: 0,
    usable: 0,
    comfortable: 0,
    delightful: 0,
    meaningful: 0,
  };
  const rungCounts: Record<RungName, number> = {
    functional: 0,
    usable: 0,
    comfortable: 0,
    delightful: 0,
    meaningful: 0,
  };
  let totalScores = 0;
  let totalScoreSum = 0;

  const members: MemberSummary[] = await Promise.all(
    memberships.data.map(async (m): Promise<MemberSummary> => {
      const memberUserId = m.publicUserData?.userId ?? null;
      const base = {
        membershipId: m.id,
        userId: memberUserId,
        email: m.publicUserData?.identifier ?? null,
        firstName: m.publicUserData?.firstName ?? null,
        lastName: m.publicUserData?.lastName ?? null,
        role: m.role,
        joinedAt: m.createdAt,
      };

      if (!memberUserId || !isManager) {
        return {
          ...base,
          stats: null,
          recentScans: 0,
          letterGrade: null,
        };
      }

      const [stats, recent] = await Promise.all([
        getUserStats(memberUserId),
        readRecentScores(memberUserId, windowStart),
      ]);

      const recentScoreNums: number[] = [];
      for (const s of recent) {
        if (typeof s.score === "number" && Number.isFinite(s.score)) {
          recentScoreNums.push(s.score);
          totalScores += 1;
          totalScoreSum += s.score;
        }
        const rs = parseRungScores(s.rungs);
        if (rs) {
          for (const name of RUNG_NAMES) {
            rungSums[name] += rs[name].score;
            rungCounts[name] += 1;
          }
        }
      }

      return {
        ...base,
        stats,
        recentScans: recentScoreNums.length,
        letterGrade: computeLetterGrade(recentScoreNums),
      };
    }),
  );

  let insights: Insights | null = null;
  if (isManager) {
    const rungAverages: RungAverage[] = RUNG_NAMES.map((name) => ({
      rung: name,
      avg:
        rungCounts[name] > 0
          ? Math.round((rungSums[name] / rungCounts[name]) * 10) / 10
          : null,
      count: rungCounts[name],
    }));
    const ranked = rungAverages
      .filter(
        (r): r is { rung: RungName; avg: number; count: number } =>
          r.avg !== null,
      )
      .sort((a, b) => a.avg - b.avg);

    insights = {
      windowDays: LETTER_GRADE_WINDOW_DAYS,
      threshold: LETTER_GRADE_THRESHOLD,
      totalScores,
      teamAvg:
        totalScores > 0
          ? Math.round((totalScoreSum / totalScores) * 10) / 10
          : null,
      rungAverages,
      weakestRung: ranked[0] ?? null,
      strongestRung: ranked[ranked.length - 1] ?? null,
    };
  }

  return NextResponse.json({
    isManager,
    members,
    insights,
  });
}
