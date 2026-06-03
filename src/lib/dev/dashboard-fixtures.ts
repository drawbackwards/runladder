import type { DashboardData } from "@/app/dashboard/page";
import type { TeamData } from "@/app/dashboard/team/page";
import type { UsageData } from "@/components/UsageMeter";
import type { Tier } from "@/lib/plans";
import type { ViewAsState } from "@/lib/dev/view-as";

/**
 * Lean fixtures for the dev "view as" switcher — enough data to render each
 * Plan/Role's Personal Dashboard layout. Numbers are representative, not
 * realistic; we'll enrich them when we tune the layouts. Keyed on the
 * Plan→Role model: Free / Pro are individuals; Team carries a role
 * (designer / lead·empty / lead·active). `admin` flips the platform-admin
 * (Drawbackwards member) bits. The plan strip / banner logic stays role-driven
 * and is left at its current behavior here (internal=false) — to be refined.
 */

const DAY = 24 * 60 * 60 * 1000;

function score(
  id: string,
  value: number,
  label: string,
  screenName: string,
  daysAgo: number,
  uplift?: number,
) {
  return {
    id,
    score: value,
    label,
    screenName,
    summary: `Fixture score for ${screenName}.`,
    source: "upload",
    isPublic: true,
    timestamp: Date.now() - daysAgo * DAY,
    uplift: uplift ?? null,
    sessionType: "design" as const,
  };
}

const SAMPLE_SCORES = [
  score("fx-1", 3.4, "Comfortable", "Checkout step 2", 1, 0.3),
  score("fx-2", 2.8, "Usable", "Onboarding welcome", 3, -0.2),
  score("fx-3", 4.1, "Delightful", "Empty state", 6, 0.6),
  score("fx-4", 3.0, "Comfortable", "Settings panel", 9),
];

function labelFor(v: number): string {
  if (v < 2) return "Functional";
  if (v < 3) return "Usable";
  if (v < 4) return "Comfortable";
  if (v < 5) return "Delightful";
  return "Meaningful";
}

// A semi-active user: ~40 design sessions across the last ~12 weeks, with a
// handful of multi-session days, trending gently upward. Gives the design
// rhythm heatmap a believable mix of light and darker green cells instead of
// the four lonely squares the lean SAMPLE_SCORES produced. Used for the paid
// tiers (Pro / Team); Free stays sparse since it caps at 5 lifetime scores.
const SEMI_ACTIVE_DAYS = [
  2, 4, 5, 5, 9, 11, 12, 12, 16, 18, 19, 19, 23, 25, 26, 30, 32, 33, 33, 37,
  39, 44, 46, 47, 47, 51, 53, 58, 60, 61, 61, 65, 67, 72, 74, 74, 79, 81, 86,
  88,
];

const SEMI_ACTIVE_SCORES = SEMI_ACTIVE_DAYS.map((d, i) => {
  // Recent sessions trend a little higher; deterministic jitter from the index
  // varies the spread without reaching for Math.random().
  const base = 4.3 - (d / 91) * 1.4;
  const jitter = ((i % 5) - 2) * 0.12;
  const v = Math.max(1.9, Math.min(4.8, Math.round((base + jitter) * 10) / 10));
  return score(`fx-r${i}`, v, labelFor(v), `Screen ${i + 1}`, d);
});

/** Account-menu + plan-strip overrides the dashboard derives from Clerk/data. */
export type ViewAsUserMeta = {
  firstName: string | null;
  tier: Tier;
  comp: { reason: string; expiresAt: number | null } | null;
  internal: boolean;
  isAdmin: boolean;
  orgName: string | null;
  hasOrg: boolean;
};

const CLIENT_ORG = "Acme Co.";

export function viewAsUserMeta(s: ViewAsState): ViewAsUserMeta {
  if (s.plan === "free") {
    return {
      firstName: "Sam",
      tier: "free",
      comp: null,
      internal: false,
      isAdmin: false,
      orgName: null,
      hasOrg: false,
    };
  }
  if (s.plan === "pro") {
    return {
      firstName: "Riley",
      tier: "pro",
      comp: null,
      internal: false,
      isAdmin: false,
      orgName: null,
      hasOrg: false,
    };
  }
  // Team plan — a client team member. Admin is a My-Account dev override, not a
  // previewed fixture, so fixtures are never admins.
  const orgName = CLIENT_ORG;
  return {
    firstName: s.role === "designer" ? "Jordan" : "Chester",
    tier: "team",
    comp: { reason: `Member of ${orgName}`, expiresAt: null },
    internal: false, // banner logic is role-driven; refined later
    isAdmin: false,
    orgName,
    hasOrg: true,
  };
}

export function viewAsDashboardData(s: ViewAsState): DashboardData {
  const meta = viewAsUserMeta(s);
  const stats = {
    totalScans: 24,
    avgScore: 3.3,
    bestScore: 4.1,
    lastScoreAt: Date.now() - DAY,
  };
  const emptyStats = {
    totalScans: 0,
    avgScore: null,
    bestScore: null,
    lastScoreAt: null,
  };

  if (s.plan === "free") {
    return {
      scores: SAMPLE_SCORES.slice(0, 2),
      stats: { ...stats, totalScans: 2, avgScore: 3.1, bestScore: 3.4 },
      usage: { used: 2, limit: 5, lifetime: true },
      tier: "free",
      paid: false,
      internal: false,
      needsTeamSetup: false,
      comp: null,
    };
  }
  if (s.plan === "pro") {
    return {
      scores: SEMI_ACTIVE_SCORES,
      stats: { ...stats, totalScans: SEMI_ACTIVE_SCORES.length, bestScore: 4.8 },
      usage: { used: 340, limit: 2000 },
      tier: "pro",
      paid: true,
      internal: false,
      needsTeamSetup: false,
      comp: null,
    };
  }
  // Team plan — role drives empty vs populated.
  const isLeadEmpty = s.role === "lead-empty";
  return {
    scores: isLeadEmpty ? [] : SEMI_ACTIVE_SCORES,
    stats: isLeadEmpty
      ? emptyStats
      : { ...stats, totalScans: SEMI_ACTIVE_SCORES.length, bestScore: 4.8 },
    usage: { used: isLeadEmpty ? 0 : 1280, limit: 25000 },
    tier: "team",
    paid: true,
    internal: meta.internal,
    needsTeamSetup: isLeadEmpty,
    comp: meta.comp,
  };
}

/* ── Team Dashboard fixtures ─────────────────────────────────────────────── */

function teamMember(
  id: string,
  first: string,
  last: string,
  role: "org:admin" | "org:member",
  avg: number,
  scans: number,
) {
  return {
    membershipId: `mb-${id}`,
    userId: `usr-${id}`,
    email: `${first.toLowerCase()}@acme.co`,
    firstName: first,
    lastName: last,
    imageUrl: null,
    hasImage: false,
    role,
    joinedAt: Date.now() - 30 * DAY,
    stats: {
      totalScans: scans,
      avgScore: avg,
      bestScore: Math.min(5, avg + 0.6),
      lastScoreAt: Date.now() - DAY,
    },
    recentScans: Math.max(1, Math.round(scans / 3)),
    monthlyScans: scans,
    activity: [],
    evaluationsInWindow: 2,
  };
}

const TEAM_INSIGHTS = {
  windowDays: 91,
  totalScores: 142,
  teamAvg: 3.3,
  rungAverages: [
    { rung: "Functional", avg: 1.6, count: 8 },
    { rung: "Usable", avg: 2.5, count: 22 },
    { rung: "Comfortable", avg: 3.3, count: 70 },
    { rung: "Delightful", avg: 4.2, count: 38 },
    { rung: "Meaningful", avg: 5.0, count: 4 },
  ],
  weakestRung: { rung: "Usable", avg: 2.5, count: 22 },
  strongestRung: { rung: "Delightful", avg: 4.2, count: 38 },
};

export type ViewAsTeam = {
  teamData: TeamData;
  orgName: string;
  selfUserId: string;
};

/** Team Dashboard fixtures keyed on the Team-plan role. */
export function viewAsTeamData(s: ViewAsState): ViewAsTeam {
  const lead = teamMember("lead", "Chester", "Schendel", "org:admin", 3.6, 40);
  const orgName = "Acme Co.";

  if (s.role === "lead-empty") {
    return {
      teamData: {
        isManager: true,
        members: [lead],
        archived: [],
        insights: null,
        activityWindowDays: 91,
        pool: { used: 0, limit: 25000 },
      },
      orgName,
      selfUserId: "usr-lead",
    };
  }

  const designers = [
    teamMember("d1", "Jordan", "Lee", "org:member", 3.2, 28),
    teamMember("d2", "Sam", "Rivera", "org:member", 2.9, 19),
    teamMember("d3", "Avery", "Chen", "org:member", 3.8, 33),
  ];
  const isManager = s.role !== "designer";
  return {
    teamData: {
      isManager,
      members: [lead, ...designers],
      archived: [],
      // Insights are manager-only; a designer's API response omits them.
      insights: isManager ? TEAM_INSIGHTS : null,
      activityWindowDays: 91,
      pool: { used: 1280, limit: 25000 },
    },
    orgName,
    selfUserId: isManager ? "usr-lead" : "usr-d1",
  };
}

/* ── Usage meter fixtures ────────────────────────────────────────────────── */

/** Usage-meter data per previewed plan (the sidebar "Usage" box). */
export function viewAsUsageData(s: ViewAsState): UsageData {
  if (s.plan === "free") {
    return {
      tier: "free",
      monthlyUsed: 0,
      monthlyLimit: null,
      monthlyHardCap: null,
      lifetimeUsed: 2,
      lifetimeLimit: 5,
      daysUntilReset: 0,
    };
  }
  if (s.plan === "pro") {
    return {
      tier: "pro",
      monthlyUsed: 340,
      monthlyLimit: 2000,
      monthlyHardCap: 4000,
      lifetimeUsed: 0,
      lifetimeLimit: null,
      daysUntilReset: 12,
    };
  }
  return {
    tier: "team",
    monthlyUsed: 1280,
    monthlyLimit: 25000,
    monthlyHardCap: 50000,
    lifetimeUsed: 0,
    lifetimeLimit: null,
    daysUntilReset: 18,
  };
}
