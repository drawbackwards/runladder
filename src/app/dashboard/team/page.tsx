"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  useAuth,
  useOrganization,
  useOrganizationList,
  RedirectToSignIn,
} from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";
import {
  ActivityHeatmap,
  type DailyActivity,
} from "@/components/ActivityHeatmap";
import { Avatar } from "@/components/Avatar";
import { ReviewRequestsPanel } from "@/components/reviews/ReviewRequestsPanel";
import {
  ReviewsIntro,
  ReviewsStats,
  ActiveReviewsList,
} from "@/components/reviews/ReviewsOverview";
import { TabButton } from "@/components/Tabs";
import { SHOW_EVALUATIONS_AND_REVIEWS } from "@/lib/feature-flags";
import { SectionLabel } from "@/components/SectionLabel";
import { Skeleton } from "@/components/Skeleton";
import { useEnsureActiveOrg } from "@/hooks/use-ensure-active-org";
import { useViewAs } from "@/lib/dev/view-as";
import { viewAsTeamData } from "@/lib/dev/dashboard-fixtures";

type MemberStats = {
  totalScans: number;
  avgScore: number | null;
  bestScore: number | null;
  lastScoreAt: number | null;
};

type TeamMember = {
  membershipId: string;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  hasImage: boolean;
  role: string;
  joinedAt: number;
  stats: MemberStats | null;
  recentScans: number;
  /** Scores this calendar month. Powers the Usage column + team pool bar. */
  monthlyScans: number;
  activity: DailyActivity[];
  evaluationsInWindow: number;
};

type ArchivedMember = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  hasImage: boolean;
  stats: MemberStats | null;
  recentScans: number;
  activity: DailyActivity[];
  evaluationsInWindow: number;
};

type RungAverage = {
  rung: string;
  avg: number | null;
  count: number;
};

type Insights = {
  windowDays: number;
  totalScores: number;
  teamAvg: number | null;
  rungAverages: RungAverage[];
  weakestRung: { rung: string; avg: number; count: number } | null;
  strongestRung: { rung: string; avg: number; count: number } | null;
};

/** Team-wide monthly pool usage. Sum of every visible member's
 *  monthlyScans, plus the soft cap from /lib/plans. */
type TeamPool = {
  used: number;
  limit: number;
  /** Hard ceiling (soft × multiplier) — scoring stops past this. */
  hardCap: number;
  /** Days until the monthly pool resets, for the "Resets in Nd" copy. */
  daysUntilReset: number;
};

export type TeamData = {
  isManager: boolean;
  members: TeamMember[];
  archived: ArchivedMember[];
  insights: Insights | null;
  activityWindowDays: number;
  pool: TeamPool;
};

function fmtDate(input: number | string | Date | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(ts: number | null | undefined): string {
  if (!ts) return "no activity";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function InviteForm({
  onInvite,
}: {
  onInvite: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onInvite(email.trim());
      setEmail("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="flex-1 min-w-[240px] bg-[#111] border border-[#2a2a2a] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-ladder-green placeholder:text-[#555] font-sans"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="text-[11px] uppercase tracking-widest font-semibold text-[#1a1a1a] bg-ladder-green px-4 py-2 hover:bg-ladder-green-light transition-colors disabled:opacity-40"
        >
          {busy ? "Sending…" : "Invite"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-ladder-red font-sans">{err}</p>}
      <p className="mt-2 text-[10px] text-muted font-sans">
        They&apos;ll get an email with a sign-in link. On accept, they&apos;re comped to team tier automatically.
      </p>
    </form>
  );
}

function NoOrgPanel() {
  // Self-serve org creation was removed in #190 — Team orgs are now
  // provisioned by Drawbackwards (an admin creates the org and invites the
  // Team Lead). A user with no org should reach out, not spin one up.
  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-8">
      <h2 className="text-base font-sans text-foreground mb-2">
        Team isn&apos;t part of your plan
      </h2>
      <p className="text-sm text-muted font-sans">
        Ladder Team is a separate tier, set up by Drawbackwards as part of an
        engagement — it isn&apos;t included on the Free or Pro plans. If you
        expected a team workspace here, contact your Drawbackwards account
        manager and they&apos;ll get you added.
      </p>
    </div>
  );
}

function SuspendedPanel() {
  return (
    <div className="border border-ladder-orange/40 bg-ladder-orange/5 p-8">
      <h2 className="text-base font-sans text-foreground mb-2">
        Team access paused
      </h2>
      <p className="text-sm text-muted font-sans">
        This team&apos;s Ladder access is currently paused. Please contact your
        Drawbackwards account manager to reactivate.
      </p>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: color ?? "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}

function InsightsPanel({ insights }: { insights: Insights }) {
  const { totalScores, teamAvg, weakestRung, strongestRung, windowDays } =
    insights;

  if (totalScores === 0) {
    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-6 mb-6">
        <p className="text-sm text-muted font-sans">
          No design-session scores from your team in the last {windowDays} days.
          Once members score their own work in Figma (or pick the Design Session
          option on /score), performance insights show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <SectionLabel>Team performance</SectionLabel>
        <span className="text-[10px] text-muted">
          Design sessions, last {windowDays} days
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatPill label="Team scans" value={String(totalScores)} />
        <StatPill
          label="Team avg"
          value={teamAvg !== null ? teamAvg.toFixed(1) : "—"}
          color={teamAvg !== null ? getScoreColor(teamAvg) : undefined}
        />
        <StatPill
          label="Strongest rung"
          value={
            strongestRung
              ? `${capitalize(strongestRung.rung)} ${strongestRung.avg.toFixed(1)}`
              : "—"
          }
          color={
            strongestRung ? getScoreColor(strongestRung.avg) : undefined
          }
        />
        <StatPill
          label="Weakest rung"
          value={
            weakestRung
              ? `${capitalize(weakestRung.rung)} ${weakestRung.avg.toFixed(1)}`
              : "—"
          }
          color={weakestRung ? getScoreColor(weakestRung.avg) : undefined}
        />
      </div>
      {weakestRung && (
        <p className="mt-3 text-xs text-muted font-sans">
          Your team&apos;s weakest rung is{" "}
          <span className="text-foreground">
            {capitalize(weakestRung.rung)}
          </span>
          . Designers typically miss this — coach toward it first.
        </p>
      )}
    </div>
  );
}

/**
 * Team pool meter. Mirrors the dashboard Usage box: monthly scoring volume
 * against the pool the customer bought (soft cap), plus the "resets in N days"
 * copy. The 2x hard cap is a silent server-side grace backstop — never shown as
 * a number (#227). Section label above the box. Visible to the Team Lead only.
 */
function TeamPoolMeter({ pool }: { pool: TeamPool }) {
  const { used, limit, daysUntilReset } = pool;
  const pct = Math.min(100, (used / limit) * 100);
  const atCap = used >= limit;
  const showGraceNote = used / limit >= 0.5;
  const barClass = atCap ? "bg-amber-400" : "bg-ladder-green";

  return (
    <section>
      <SectionLabel className="mb-3">Team pool</SectionLabel>
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="text-xs text-muted font-sans">
            <span className="tabular-nums">{used.toLocaleString()}</span> of{" "}
            {limit.toLocaleString()} scores this month
          </p>
          <span className="text-[10px] text-muted font-mono">
            Resets in {daysUntilReset}d
          </span>
        </div>
        <div className="h-1.5 bg-[#0e0e0e]">
          <div
            className={`h-full ${barClass} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {atCap ? (
          <p className="text-[11px] text-muted mt-3">
            Pool limit reached — you&apos;re in a grace period.{" "}
            <a
              href="mailto:hello@drawbackwards.com?subject=Ladder%20Team%20more%20capacity"
              className="text-ladder-green hover:underline"
            >
              Reach out to add capacity
            </a>
            .
          </p>
        ) : showGraceNote ? (
          <p className="text-[10px] text-muted mt-2 font-mono">
            Includes a short grace period past your pool.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MemberRow({
  member,
  isAdmin,
  isSelf,
  windowDays,
  onArchive,
  onDelete,
}: {
  member: TeamMember;
  isAdmin: boolean;
  isSelf: boolean;
  windowDays: number;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const name =
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    member.email ||
    "—";
  const stats = member.stats;
  const avg = stats?.avgScore ?? null;
  const totalScans = stats?.totalScans ?? 0;
  const lastAt = stats?.lastScoreAt ?? null;
  // Only Team Leads (org:admin) can open member detail. Gate the row link on
  // the viewer's role so designers don't click through to a 403 (#263) — the
  // row renders as plain, non-clickable content for them.
  const drillHref =
    isAdmin && member.userId
      ? `/dashboard/team/members/${member.userId}`
      : null;

  // Team Leads get Archive/Delete actions on every row but their own. Those
  // fade in on hover; the score stats + drill arrow fade out in lockstep so
  // the actions never overlap the numbers (#303). Rows without actions keep
  // their stats visible on hover.
  const showActions = isAdmin && !isSelf && !!member.userId;
  const fadeOnHover = showActions
    ? "group-hover:opacity-0 transition-opacity"
    : "";

  const Body = (
    <div className="px-4 py-4 flex items-center gap-5">
      <Avatar
        imageUrl={member.imageUrl}
        hasImage={member.hasImage}
        name={[member.firstName, member.lastName]
          .filter(Boolean)
          .join(" ")}
        email={member.email}
        size={40}
        ring={member.role === "org:admin" ? "manager" : "none"}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm text-foreground font-sans truncate">
            {name}
            {isSelf && (
              <span className="text-[10px] text-muted ml-2">(you)</span>
            )}
          </p>
          {member.role === "org:admin" && !isSelf && (
            <span className="text-[9px] text-ladder-green uppercase tracking-widest">
              Team Lead
            </span>
          )}
        </div>
        <p className="text-xs text-muted font-sans truncate">
          {member.email ?? "—"}
        </p>
        <p className="text-[10px] text-muted font-sans mt-1">
          Joined {fmtDate(member.joinedAt)}
          {lastAt && (
            <>
              <span className="text-[#444] mx-1.5">·</span>
              Last scored {fmtRelative(lastAt)}
            </>
          )}
        </p>
        {member.evaluationsInWindow > 0 && (
          <p className="text-[10px] text-muted/70 font-sans mt-1">
            + {member.evaluationsInWindow} evaluation
            {member.evaluationsInWindow === 1 ? "" : "s"} in window
          </p>
        )}
        {member.monthlyScans > 0 && (
          <p className="text-[10px] text-muted/70 font-sans mt-1">
            {member.monthlyScans.toLocaleString()} score
            {member.monthlyScans === 1 ? "" : "s"} this month
          </p>
        )}
      </div>

      {member.activity.length > 0 && (
        <div className="hidden md:block flex-shrink-0" title={`Design sessions, last ${windowDays} days`}>
          <ActivityHeatmap
            activity={member.activity}
            cellWidth={12}
            cellHeight={4}
            cellGap={1}
            emptyClassName="bg-[#222]"
          />
        </div>
      )}

      <div className={`flex items-start gap-5 flex-shrink-0 ${fadeOnHover}`}>
        <div className="text-right min-w-[48px]">
          <p
            className="text-xl font-bold tabular-nums leading-none"
            style={{ color: avg !== null ? getScoreColor(avg) : "#444" }}
          >
            {avg !== null ? avg.toFixed(1) : "—"}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest mt-1.5">
            Avg
          </p>
        </div>
        <div className="text-right min-w-[48px]">
          <p className="text-xl font-bold tabular-nums text-foreground leading-none">
            {totalScans}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest mt-1.5">
            Scans
          </p>
        </div>
      </div>

      {drillHref && (
        <span className={`text-muted group-hover:text-foreground transition-colors text-base flex-shrink-0 ${fadeOnHover}`}>
          →
        </span>
      )}
    </div>
  );

  return (
    <li className="border-b border-[#222] last:border-0 group relative">
      {drillHref ? (
        <Link
          href={drillHref}
          className="block hover:bg-[#1f1f1f] transition-colors"
        >
          {Body}
        </Link>
      ) : (
        Body
      )}
      {isAdmin && !isSelf && member.userId && (
        <div className="absolute top-4 right-12 z-10 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onArchive();
            }}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            title="Soft remove. Their work stays in team metrics."
          >
            Archive
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors"
            title="Hard remove. Their work is dropped from team metrics."
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Row for an archived ex-member. Same shape as MemberRow but compressed
 * (no role, no manager indicator, no drill-in for now) and with a
 * single "Delete" action that scrubs them from team metrics entirely.
 */
function ArchivedMemberRow({
  member,
  windowDays,
  onDelete,
}: {
  member: ArchivedMember;
  windowDays: number;
  onDelete: () => void;
}) {
  const name =
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    member.email ||
    "—";
  const stats = member.stats;
  const avg = stats?.avgScore ?? null;
  const totalScans = stats?.totalScans ?? 0;

  return (
    <li className="border-b border-[#222] last:border-0 group relative">
      <div className="px-4 py-4 flex items-center gap-5">
        <Avatar
          imageUrl={member.imageUrl}
          hasImage={member.hasImage}
          name={name}
          email={member.email}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground/70 font-sans truncate">
            {name}
            <span className="text-[9px] text-muted uppercase tracking-widest ml-2">
              Archived
            </span>
          </p>
          <p className="text-xs text-muted font-sans truncate">
            {member.email ?? "—"}
          </p>
          {member.evaluationsInWindow > 0 && (
            <p className="text-[10px] text-muted/70 font-sans mt-1">
              + {member.evaluationsInWindow} evaluation
              {member.evaluationsInWindow === 1 ? "" : "s"} in window
            </p>
          )}
        </div>
        {member.activity.length > 0 && (
          <div
            className="hidden md:block flex-shrink-0"
            title={`Design sessions, last ${windowDays} days`}
          >
            <ActivityHeatmap
              activity={member.activity}
              cellWidth={12}
              cellHeight={4}
              cellGap={1}
              emptyClassName="bg-[#222]"
            />
          </div>
        )}
        <div className="flex items-start gap-5 flex-shrink-0">
          <div className="text-right min-w-[48px]">
            <p
              className="text-xl font-bold tabular-nums leading-none opacity-70"
              style={{ color: avg !== null ? getScoreColor(avg) : "#444" }}
            >
              {avg !== null ? avg.toFixed(1) : "—"}
            </p>
            <p className="text-[9px] text-muted uppercase tracking-widest mt-1.5">
              Avg
            </p>
          </div>
          <div className="text-right min-w-[48px]">
            <p className="text-xl font-bold tabular-nums text-foreground/70 leading-none">
              {totalScans}
            </p>
            <p className="text-[9px] text-muted uppercase tracking-widest mt-1.5">
              Scans
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors opacity-0 group-hover:opacity-100"
        title="Permanently scrub from team metrics. Cannot be undone."
      >
        Delete
      </button>
    </li>
  );
}

/**
 * Structure-matching loading state for the members tab. Mirrors the real
 * layout (Lead: stat row + pool/invite + members; designer: just members) so
 * content fills into place when the team data arrives, with no reflow. The
 * page header and tab bar stay rendered above this — only the data-shaped
 * region is skeletoned.
 */
function TeamSkeleton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      {isAdmin && (
        <>
          <section className="mb-6">
            <SectionLabel className="mb-3">Team performance</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-[#2a2a2a] bg-[#1a1a1a] p-4"
                >
                  <Skeleton className="h-2 w-16 mb-3" />
                  <Skeleton className="h-7 w-12" />
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 items-start">
            <section>
              <SectionLabel className="mb-3">Team pool</SectionLabel>
              <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full" />
                <Skeleton className="h-2 w-24 mt-2" />
              </div>
            </section>
            <section>
              <SectionLabel className="mb-3">Invite a designer</SectionLabel>
              <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                <Skeleton className="h-9 w-full" />
              </div>
            </section>
          </div>
        </>
      )}

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <SectionLabel>Members</SectionLabel>
          <Skeleton className="h-3 w-44" />
        </div>
        <div className="border border-[#2a2a2a] bg-[#1a1a1a]">
          <ul aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="border-b border-[#222] last:border-0 p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-10" />
                <Skeleton className="h-8 w-10" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

export default function TeamPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isLoaded: orgListLoaded, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  // Activate the user's org if none is active (invite-based provisioning
  // doesn't auto-activate the way self-serve creation did — see the hook).
  useEnsureActiveOrg();
  const {
    organization,
    membership,
    memberships,
    invitations,
  } = useOrganization({
    memberships: { infinite: true },
    invitations: { infinite: true, status: ["pending"] },
  });

  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [teamErr, setTeamErr] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamTab, setTeamTab] = useState<"members" | "reviews">("members");

  // Dev "view as" override (no-op in production builds). Team fixtures apply
  // only on the Team plan; Free/Pro previews show the no-team state.
  const viewAs = useViewAs();
  const teamViewAs = viewAs?.plan === "team" ? viewAs : null;
  const fxTeam = teamViewAs ? viewAsTeamData(teamViewAs) : null;

  const refreshTeamData = useCallback(async () => {
    setTeamLoading(true);
    setTeamErr(null);
    try {
      const res = await fetch("/api/dashboard/team");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Team fetch failed (${res.status})`);
      }
      const json = (await res.json()) as TeamData;
      setTeamData(json);
    } catch (e) {
      setTeamErr(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organization?.id) {
      refreshTeamData();
    }
  }, [organization?.id, refreshTeamData]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  // Dev view-as: Free/Pro previews aren't on a team — show the no-team state.
  if (viewAs && !teamViewAs) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-xl text-foreground font-sans">Team</h1>
          </div>
          <NoOrgPanel />
        </div>
      </div>
    );
  }

  const hasAnyOrg =
    !!organization || (orgListLoaded && (userMemberships?.count ?? 0) > 0);

  if (!teamViewAs && !hasAnyOrg) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-xl text-foreground font-sans">Team</h1>
          </div>
          <NoOrgPanel />
        </div>
      </div>
    );
  }

  if (!teamViewAs && !organization) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="text-sm text-muted font-sans">Loading your team…</p>
        </div>
      </div>
    );
  }

  // Suspended orgs (contract paused/ended) show a notice instead of the
  // dashboard. Lifecycle status is set by admins via /admin/clients (#190).
  // Members keep their tier for now — comp-revocation on suspend is deferred.
  if (
    !teamViewAs &&
    (organization?.publicMetadata as { status?: string } | undefined)?.status ===
      "suspended"
  ) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-xl text-foreground font-sans">
              {organization?.name}
            </h1>
          </div>
          <SuspendedPanel />
        </div>
      </div>
    );
  }

  const teamDataEff = fxTeam ? fxTeam.teamData : teamData;
  const isAdmin = fxTeam
    ? fxTeam.teamData.isManager
    : membership?.role === "org:admin";
  const orgName = fxTeam ? fxTeam.orgName : organization?.name ?? "Team";
  const inviteList = fxTeam ? [] : invitations?.data ?? [];
  const memberList = teamDataEff?.members ?? [];
  const archivedList = teamDataEff?.archived ?? [];
  const selfUserId = fxTeam
    ? fxTeam.selfUserId
    : membership?.publicUserData?.userId;
  // Row order:
  //  - Team Lead (org:admin) is always first.
  //  - If the viewer IS the lead, the remaining members are alphabetical by
  //    first name.
  //  - If the viewer is a member (not the lead), they appear directly below the
  //    lead, then everyone else keeps API order.
  // (Array.sort is stable, so equal-rank rows keep their original order.)
  const orderedMembers = [...memberList].sort((a, b) => {
    const isLead = (m: TeamMember) => (m.role === "org:admin" ? 0 : 1);
    if (isLead(a) !== isLead(b)) return isLead(a) - isLead(b);
    if (isLead(a) === 0) return 0; // both leads — leave as-is
    if (isAdmin) {
      const firstName = (m: TeamMember) =>
        (m.firstName ?? m.email ?? "").toLowerCase();
      return firstName(a).localeCompare(firstName(b));
    }
    const isSelf = (m: TeamMember) => (m.userId && m.userId === selfUserId ? 0 : 1);
    return isSelf(a) - isSelf(b);
  });
  const activityWindowDays = teamDataEff?.activityWindowDays ?? 91;
  const teamLoadingEff = fxTeam ? false : teamLoading;
  const teamErrEff = fxTeam ? null : teamErr;

  async function handleInvite(email: string) {
    if (teamViewAs) return; // fixtures — no real mutations in preview
    if (!organization) throw new Error("No active team");
    await organization.inviteMember({
      emailAddress: email,
      role: "org:member",
    });
    await invitations?.revalidate?.();
  }

  async function handleRevoke(invitationId: string) {
    if (!organization) return;
    const inv = inviteList.find((i) => i.id === invitationId);
    if (!inv) return;
    try {
      await inv.revoke();
      await invitations?.revalidate?.();
    } catch {
      // noop
    }
  }

  async function handleReinvite(invitationId: string) {
    try {
      const res = await fetch(
        `/api/dashboard/team/invitations/${invitationId}/reinvite`,
        { method: "POST" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Reinvite failed (${res.status})`);
      }
      await invitations?.revalidate?.();
    } catch (e) {
      console.error("[reinvite]", e);
    }
  }

  async function handleArchive(member: TeamMember) {
    if (teamViewAs) return; // fixtures — no real mutations in preview
    if (!member.userId) return;
    const name =
      [member.firstName, member.lastName].filter(Boolean).join(" ") ||
      member.email ||
      "this member";
    if (
      !confirm(
        `Archive ${name}?\n\nThey'll lose access to the team, but their work stays counted in team metrics. You can fully delete them later if needed.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/dashboard/team/members/${member.userId}/archive`,
        { method: "POST" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Archive failed (${res.status})`);
      }
      await Promise.all([memberships?.revalidate?.(), refreshTeamData()]);
    } catch (e) {
      console.error("[archive]", e);
    }
  }

  async function handleDelete(args: {
    userId: string;
    displayName: string;
    fromArchived: boolean;
  }) {
    if (teamViewAs) return; // fixtures — no real mutations in preview
    const verb = args.fromArchived ? "scrub" : "delete";
    if (
      !confirm(
        `${verb === "scrub" ? "Permanently scrub" : "Delete"} ${args.displayName} from this team?\n\nTheir work will be removed from team metrics. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/dashboard/team/members/${args.userId}/delete`,
        { method: "POST" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      await Promise.all([memberships?.revalidate?.(), refreshTeamData()]);
    } catch (e) {
      console.error("[delete]", e);
    }
  }

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl text-foreground font-sans">
              {orgName}
            </h1>
            <p className="text-xs text-muted font-sans mt-1">
              {teamLoadingEff && memberList.length === 0 ? (
                <Skeleton className="h-3 w-32 inline-block align-middle" />
              ) : (
                <>
                  {memberList.length} member{memberList.length !== 1 ? "s" : ""}
                  {inviteList.length > 0 &&
                    ` · ${inviteList.length} pending invite${inviteList.length !== 1 ? "s" : ""}`}
                </>
              )}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            Personal dashboard
          </Link>
        </div>

        {teamErrEff && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {teamErrEff}
          </div>
        )}

        <div className="border-b border-[#2a2a2a] flex items-center gap-2 mb-8 overflow-x-auto">
          <TabButton
            label="Team"
            active={teamTab === "members"}
            onClick={() => setTeamTab("members")}
          />
          {/* Reviews hidden for launch (#302). */}
          {SHOW_EVALUATIONS_AND_REVIEWS && (
            <TabButton
              label="Reviews"
              badge="Beta"
              active={teamTab === "reviews"}
              onClick={() => setTeamTab("reviews")}
            />
          )}
        </div>

        {/* Reviews tab. Team Lead sees the live panels; designers get a
            coming-soon placeholder for now (empty state to be designed later). */}
        {teamTab === "reviews" &&
          (isAdmin ? (
            <>
              <ReviewsIntro />
              <ReviewsStats />
              <ReviewRequestsPanel />
              <ActiveReviewsList showViewAll />
            </>
          ) : (
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-10 text-center">
              <p className="text-sm text-foreground font-sans mb-1">
                Reviews are coming soon
              </p>
              <p className="text-xs text-muted font-sans max-w-sm mx-auto leading-relaxed">
                Soon you&apos;ll be able to send a screen to your team for human
                crit and track active reviews right here.
              </p>
            </div>
          ))}

        {/* Members tab — default view for everyone. */}
        {teamTab === "members" &&
          (teamLoadingEff && memberList.length === 0 ? (
            <TeamSkeleton isAdmin={isAdmin} />
          ) : (
            <>
        {isAdmin && teamDataEff?.insights && (
          <InsightsPanel insights={teamDataEff.insights} />
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 items-start">
            {teamDataEff?.pool && <TeamPoolMeter pool={teamDataEff.pool} />}
            <section>
              <SectionLabel className="mb-3">Invite a designer</SectionLabel>
              <InviteForm onInvite={handleInvite} />
            </section>
          </div>
        )}

        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <SectionLabel>Members</SectionLabel>
            {teamDataEff && (
              <span className="text-[10px] text-muted">
                Design-session activity, last {activityWindowDays} days
              </span>
            )}
          </div>
          <div className="border border-[#2a2a2a] bg-[#1a1a1a]">
            {teamLoadingEff && memberList.length === 0 ? (
              <div className="p-8 text-center text-muted font-sans text-sm">
                Loading members…
              </div>
            ) : memberList.length === 0 ? (
              <div className="p-8 text-center text-muted font-sans text-sm">
                No members yet.
              </div>
            ) : (
              <ul>
                {orderedMembers.map((m) => (
                  <MemberRow
                    key={m.membershipId}
                    member={m}
                    isAdmin={isAdmin}
                    isSelf={!!m.userId && m.userId === selfUserId}
                    windowDays={activityWindowDays}
                    onArchive={() => handleArchive(m)}
                    onDelete={() =>
                      m.userId &&
                      handleDelete({
                        userId: m.userId,
                        displayName:
                          [m.firstName, m.lastName].filter(Boolean).join(" ") ||
                          m.email ||
                          "this member",
                        fromArchived: false,
                      })
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {inviteList.length > 0 && (
          <section className="mb-10">
            <SectionLabel className="mb-3">Pending invitations</SectionLabel>
            <div className="border border-[#2a2a2a] bg-[#1a1a1a]">
              <ul>
                {inviteList.map((inv) => (
                  <li
                    key={inv.id}
                    className="border-b border-[#222] last:border-0 p-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-sans truncate">
                        {inv.emailAddress}
                      </p>
                      <p className="text-[10px] text-muted font-sans mt-1">
                        Invited {fmtDate(inv.createdAt)}
                      </p>
                    </div>
                    <span className="text-[10px] text-ladder-green uppercase tracking-widest">
                      Pending
                    </span>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleReinvite(inv.id)}
                          className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                          title="Revoke this invite and send a fresh one to the same email."
                        >
                          Reinvite
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {isAdmin && archivedList.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <SectionLabel>Archived members</SectionLabel>
              <span className="text-[10px] text-muted">
                {archivedList.length} archived · still counted in team metrics
              </span>
            </div>
            <div className="border border-[#2a2a2a] bg-[#1a1a1a]">
              <ul>
                {archivedList.map((m) => (
                  <ArchivedMemberRow
                    key={m.userId}
                    member={m}
                    windowDays={activityWindowDays}
                    onDelete={() =>
                      handleDelete({
                        userId: m.userId,
                        displayName:
                          [m.firstName, m.lastName].filter(Boolean).join(" ") ||
                          m.email ||
                          "this member",
                        fromArchived: true,
                      })
                    }
                  />
                ))}
              </ul>
            </div>
          </section>
        )}
            </>
          ))}
      </div>
    </div>
  );
}
