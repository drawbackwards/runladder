import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { getUserStats, type UserStats } from "@/lib/scores";
import { RUNG_NAMES, type RungName } from "@/lib/ladder";
import { listArchivedMembers } from "@/lib/team-archives";
import { getMonthlyScans } from "@/lib/usage";
import { TEAM_MONTHLY_POOL } from "@/lib/plans";

/**
 * Team dashboard data — manager view.
 *
 * GET /api/dashboard/team
 * Returns the active org's roster with per-member stats and a 91-day
 * daily-activity heatmap, plus team-wide insights (rung-level averages,
 * weakest/strongest rung).
 *
 * Auth:
 *   - Requires signed-in user with an active org (orgId from auth()).
 *   - Manager-only data (stats, activity, insights) is gated on
 *     orgRole === "org:admin".
 *   - Non-admin members get the roster only.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_WINDOW_DAYS = 91; // ~13 weeks of activity for the heatmap.
const INSIGHTS_WINDOW_DAYS = 30; // Tighter window for "what's the team's weakest rung right now".

type RawScore = {
  id?: string;
  score?: number;
  timestamp?: number;
  rungs?: unknown;
  sessionType?: "design" | "evaluation";
  /**
   * Soft-delete tombstone. Set by /api/dashboard/scores DELETE. Read
   * by team aggregations to exclude from manager stats (so a deleted
   * 1.4 doesn't drag the team average) while still surfacing the
   * entry in the audit feed via the member-detail endpoint.
   */
  deletedAt?: number;
};

/**
 * Resolve sessionType for a stored score. Old entries written before the
 * intent-bucket schema land here without the field — grandfather them as
 * "design" so historical Drawbackwards/Lumin data lands in the right
 * bucket (per Ward's instruction).
 */
function effectiveSessionType(
  s: { sessionType?: "design" | "evaluation" },
): "design" | "evaluation" {
  return s.sessionType === "evaluation" ? "evaluation" : "design";
}

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
    .filter((s): s is RawScore => s !== null)
    // Team-level aggregations (avg, weakest rung, design rhythm,
    // heatmap) read this. Excluding soft-deleted entries here keeps
    // the numbers honest. The full audit trail (including deleted)
    // is exposed via the member-detail endpoint, not the team rollup.
    .filter((s) => !s.deletedAt);
}

/**
 * Bucket scores into daily activity counts spanning the last `windowDays`
 * days (UTC). Each bucket carries its date (YYYY-MM-DD), score count,
 * and average score for that day. Result is ordered oldest -> newest.
 */
function bucketActivity(
  scores: RawScore[],
  windowDays: number,
): Array<{ date: string; count: number; avgScore: number | null }> {
  const todayMidnight = (() => {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  })();

  // Pre-fill all days in the window so the UI gets a continuous strip.
  const buckets = new Map<number, { count: number; total: number }>();
  for (let i = windowDays - 1; i >= 0; i--) {
    buckets.set(todayMidnight - i * DAY_MS, { count: 0, total: 0 });
  }

  for (const s of scores) {
    if (typeof s.timestamp !== "number") continue;
    const d = new Date(s.timestamp);
    const dayMidnight = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    );
    const bucket = buckets.get(dayMidnight);
    if (!bucket) continue;
    bucket.count += 1;
    if (typeof s.score === "number" && Number.isFinite(s.score)) {
      bucket.total += s.score;
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, b]) => ({
      date: new Date(ts).toISOString().slice(0, 10),
      count: b.count,
      avgScore:
        b.count > 0 ? Math.round((b.total / b.count) * 10) / 10 : null,
    }));
}

type DailyActivity = {
  date: string;
  count: number;
  avgScore: number | null;
};

type MemberSummary = {
  membershipId: string;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  /** True only when the member uploaded a real photo (Clerk `hasImage`). */
  hasImage: boolean;
  role: string;
  joinedAt: number;
  stats: UserStats | null;
  /** Design-session scans inside the insights window (last 30 days). */
  recentScans: number;
  /**
   * Scores this calendar month — drives the manager's "Usage" column
   * and rolls up into the team-pool meter at the top of the page.
   * Reads from user:{id}:scans:{yyyy-mm} which is also the source of
   * the per-user UsageMeter on /dashboard.
   */
  monthlyScans: number;
  /** Daily activity bucket for design sessions only — fuels the row heatmap. */
  activity: DailyActivity[];
  /**
   * Tertiary signal for the manager: how many evaluation/audit scores this
   * member has logged in the activity window. Surfaced on the member row
   * as "+ N evaluations" so audit work is visible without polluting the
   * performance metrics.
   */
  evaluationsInWindow: number;
};

type ArchivedSummary = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  hasImage: boolean;
  stats: UserStats | null;
  recentScans: number;
  activity: DailyActivity[];
  evaluationsInWindow: number;
};

type RungAverage = {
  rung: RungName;
  avg: number | null;
  count: number;
};

type Insights = {
  windowDays: number;
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

  // Suspended orgs (contract paused/ended) are blocked at the API too, so a
  // suspended team can't read data by hitting this endpoint directly. Status
  // is managed by admins via /admin/clients (#190).
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  if (
    (org.publicMetadata as { status?: string } | null)?.status === "suspended"
  ) {
    return NextResponse.json({ error: "Team suspended" }, { status: 403 });
  }

  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });

  const activityWindowStart = Date.now() - ACTIVITY_WINDOW_DAYS * DAY_MS;
  const insightsWindowStart = Date.now() - INSIGHTS_WINDOW_DAYS * DAY_MS;

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
        imageUrl: m.publicUserData?.imageUrl ?? null,
        hasImage: m.publicUserData?.hasImage ?? false,
        role: m.role,
        joinedAt: m.createdAt,
      };

      if (!memberUserId || !isManager) {
        return {
          ...base,
          stats: null,
          recentScans: 0,
          monthlyScans: 0,
          activity: [],
          evaluationsInWindow: 0,
        };
      }

      const [stats, recent, monthlyScans] = await Promise.all([
        getUserStats(memberUserId),
        readRecentScores(memberUserId, activityWindowStart),
        getMonthlyScans(memberUserId),
      ]);

      // Performance metrics (recentScans, team avg, rung insights) and the
      // row heatmap reflect *design* sessions only, by Ward's product call.
      // Evaluations are tracked separately so audit/research work is visible
      // without diluting craft signals.
      const designRecent = recent.filter(
        (s) => effectiveSessionType(s) === "design",
      );
      const evaluationsInWindow = recent.filter(
        (s) =>
          effectiveSessionType(s) === "evaluation" &&
          typeof s.timestamp === "number" &&
          s.timestamp >= activityWindowStart,
      ).length;

      let memberRecentCount = 0;
      for (const s of designRecent) {
        if (typeof s.score !== "number" || !Number.isFinite(s.score)) continue;
        if (typeof s.timestamp !== "number") continue;
        if (s.timestamp < insightsWindowStart) continue;
        memberRecentCount += 1;
        totalScores += 1;
        totalScoreSum += s.score;
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
        recentScans: memberRecentCount,
        monthlyScans,
        activity: bucketActivity(designRecent, ACTIVITY_WINDOW_DAYS),
        evaluationsInWindow,
      };
    }),
  );

  // Archived members — historical, no longer in the org but their work still
  // counts toward team insights. Manager-only.
  let archived: ArchivedSummary[] = [];
  if (isManager) {
    const archivedIds = await listArchivedMembers(orgId);
    archived = await Promise.all(
      archivedIds.map(async (memberUserId): Promise<ArchivedSummary> => {
        const base: ArchivedSummary = {
          userId: memberUserId,
          email: null,
          firstName: null,
          lastName: null,
          imageUrl: null,
          hasImage: false,
          stats: null,
          recentScans: 0,
          activity: [],
          evaluationsInWindow: 0,
        };

        try {
          const user = await client.users.getUser(memberUserId);
          base.email = user.primaryEmailAddress?.emailAddress ?? null;
          base.firstName = user.firstName ?? null;
          base.lastName = user.lastName ?? null;
          base.imageUrl = user.imageUrl ?? null;
          base.hasImage = user.hasImage ?? false;
        } catch {
          // user account may have been deleted entirely; we still keep their
          // history under the userId, so let the row render with the unknown name.
        }

        const [stats, recent] = await Promise.all([
          getUserStats(memberUserId),
          readRecentScores(memberUserId, activityWindowStart),
        ]);

        const designRecent = recent.filter(
          (s) => effectiveSessionType(s) === "design",
        );
        const evaluationsInWindow = recent.filter(
          (s) =>
            effectiveSessionType(s) === "evaluation" &&
            typeof s.timestamp === "number" &&
            s.timestamp >= activityWindowStart,
        ).length;

        let recentScans = 0;
        for (const s of designRecent) {
          if (typeof s.score !== "number" || !Number.isFinite(s.score)) continue;
          if (typeof s.timestamp !== "number") continue;
          if (s.timestamp < insightsWindowStart) continue;
          recentScans += 1;
          totalScores += 1;
          totalScoreSum += s.score;
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
          recentScans,
          activity: bucketActivity(designRecent, ACTIVITY_WINDOW_DAYS),
          evaluationsInWindow,
        };
      }),
    );
  }

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
      windowDays: INSIGHTS_WINDOW_DAYS,
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

  // Team pool meter — sum every visible member's this-month scans
  // and compare to the standard pool ceiling. Surfaced on the team
  // page so the manager can see how close they are before overage
  // conversations come up.
  const poolUsed = members.reduce((sum, m) => sum + (m.monthlyScans ?? 0), 0);

  return NextResponse.json({
    isManager,
    members,
    archived,
    insights,
    activityWindowDays: ACTIVITY_WINDOW_DAYS,
    pool: {
      used: poolUsed,
      limit: TEAM_MONTHLY_POOL,
    },
  });
}
