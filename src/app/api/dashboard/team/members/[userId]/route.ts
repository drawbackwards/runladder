import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { getUserStats } from "@/lib/scores";

/**
 * Team member detail — manager-only drill-in for a single team member.
 *
 * GET /api/dashboard/team/members/:userId
 *
 * Auth + scope:
 *   - Requires signed-in user with active org and org:admin role.
 *   - Target userId must be a current member of the manager's active org;
 *     otherwise 404 (don't disclose membership of other orgs).
 *
 * Returns the member's profile basics, aggregate stats, full score
 * history (newest first), and a 91-day daily activity rollup for the
 * member-detail heatmap.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_WINDOW_DAYS = 91;

type RawScore = {
  id?: string;
  score?: number;
  label?: string;
  screenName?: string;
  summary?: string;
  source?: string;
  thumbnail?: string;
  isPublic?: boolean;
  timestamp?: number;
  uplift?: number | null;
  previousScore?: number | null;
  sessionType?: "design" | "evaluation";
};

/** Grandfather pre-bucket scores as design (per Ward's call). */
function effectiveSessionType(
  s: { sessionType?: "design" | "evaluation" },
): "design" | "evaluation" {
  return s.sessionType === "evaluation" ? "evaluation" : "design";
}

function statsFromScores(arr: RawScore[]): {
  totalScans: number;
  avgScore: number | null;
  bestScore: number | null;
  lastScoreAt: number | null;
} {
  const valid = arr.filter(
    (s): s is RawScore & { score: number; timestamp: number } =>
      typeof s.score === "number" &&
      Number.isFinite(s.score) &&
      typeof s.timestamp === "number",
  );
  if (valid.length === 0) {
    return {
      totalScans: 0,
      avgScore: null,
      bestScore: null,
      lastScoreAt: null,
    };
  }
  const totalScans = valid.length;
  const sum = valid.reduce((acc, s) => acc + s.score, 0);
  const best = valid.reduce((acc, s) => (s.score > acc ? s.score : acc), 0);
  const last = valid.reduce(
    (acc, s) => (s.timestamp > acc ? s.timestamp : acc),
    0,
  );
  return {
    totalScans,
    avgScore: Math.round((sum / totalScans) * 10) / 10,
    bestScore: Math.round(best * 10) / 10,
    lastScoreAt: last,
  };
}

function bucketActivity(
  scores: RawScore[],
  windowDays: number,
): Array<{ date: string; count: number; avgScore: number | null }> {
  const todayMidnight = (() => {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  })();

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requesterId, orgId, orgRole } = await auth();
  if (!requesterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "No active team" }, { status: 404 });
  }
  if (orgRole !== "org:admin") {
    return NextResponse.json(
      { error: "Manager access required" },
      { status: 403 },
    );
  }

  const { userId: targetUserId } = await params;

  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });
  const target = memberships.data.find(
    (m) => m.publicUserData?.userId === targetUserId,
  );
  if (!target) {
    return NextResponse.json(
      { error: "Member not found in this team" },
      { status: 404 },
    );
  }

  const [stats, raw] = await Promise.all([
    getUserStats(targetUserId),
    redis.zrange(`user:${targetUserId}:scores`, 0, -1, { rev: true }),
  ]);

  const scores: RawScore[] = (raw as Array<string | RawScore>)
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

  const activityWindowStart = Date.now() - ACTIVITY_WINDOW_DAYS * DAY_MS;
  const designScores = scores.filter(
    (s) => effectiveSessionType(s) === "design",
  );
  const evaluationScores = scores.filter(
    (s) => effectiveSessionType(s) === "evaluation",
  );

  const designInWindow = designScores.filter(
    (s) =>
      typeof s.timestamp === "number" && s.timestamp >= activityWindowStart,
  );
  const evaluationInWindow = evaluationScores.filter(
    (s) =>
      typeof s.timestamp === "number" && s.timestamp >= activityWindowStart,
  );

  return NextResponse.json({
    member: {
      userId: targetUserId,
      email: target.publicUserData?.identifier ?? null,
      firstName: target.publicUserData?.firstName ?? null,
      lastName: target.publicUserData?.lastName ?? null,
      imageUrl: target.publicUserData?.imageUrl ?? null,
      role: target.role,
      joinedAt: target.createdAt,
    },
    /** All-up stats from getUserStats. UI prefers the bucketed versions below. */
    stats,
    /**
     * Design-session scores. Drives the manager's "performance" section
     * (craft trends, design rhythm, personal records).
     */
    design: {
      stats: statsFromScores(designScores),
      scores: designScores,
      activity: bucketActivity(designInWindow, ACTIVITY_WINDOW_DAYS),
    },
    /**
     * Evaluation/audit scores. Drives the manager's "audit" section
     * (research, competitor work, deliverables).
     */
    evaluation: {
      stats: statsFromScores(evaluationScores),
      scores: evaluationScores,
      activity: bucketActivity(evaluationInWindow, ACTIVITY_WINDOW_DAYS),
    },
    activityWindowDays: ACTIVITY_WINDOW_DAYS,
  });
}
