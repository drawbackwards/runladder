"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useUser, RedirectToSignIn } from "@clerk/nextjs";
import { useEnsureActiveOrg } from "@/hooks/use-ensure-active-org";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";
import { privateScopeLabel, isTeamScope } from "@/lib/score-scope";
import { surfaceParts } from "@/lib/surface";
import { FigmaPromoCard } from "@/components/promos/FigmaPromoCard";
import { ClaudePromoCard } from "@/components/promos/ClaudePromoCard";
import { UsageMeter } from "@/components/UsageMeter";
import { TeamCard, TeamCardSkeleton } from "@/components/TeamCard";
import { TeamSetupBanner } from "@/components/TeamSetupBanner";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { ActivityHeatmap, type DailyActivity } from "@/components/ActivityHeatmap";
import { FREE_LIFETIME_LIMIT } from "@/lib/plans";
import { SectionLabel } from "@/components/SectionLabel";
import { Skeleton } from "@/components/Skeleton";
import { useViewAs } from "@/lib/dev/view-as";
import {
  viewAsDashboardData,
  viewAsUserMeta,
} from "@/lib/dev/dashboard-fixtures";

type ScoreEntry = {
  id: string;
  score: number;
  label: string;
  screenName?: string;
  summary: string;
  source: string;
  thumbnail?: string;
  isPublic?: boolean;
  timestamp: number;
  // Uplift tracking — present when this isn't the first scan of the screen.
  screenKey?: string;
  previousScore?: number | null;
  uplift?: number | null;
  /** Set when the score was logged in an evaluation/audit session. */
  sessionType?: "design" | "evaluation";
};

const RHYTHM_WINDOW_DAYS = 91;

/**
 * Bucket scores into daily counts for the design-rhythm heatmap.
 * Pre-fills every day in the window so the grid is continuous even on
 * days with no activity.
 */
function bucketActivity(
  scores: ScoreEntry[],
  windowDays: number,
): DailyActivity[] {
  // Bucket by the viewer's LOCAL calendar day, not UTC. With UTC bucketing,
  // scores logged late one evening and the next morning can land in the same
  // UTC day and collapse into a single "active day" (#327). This runs in the
  // browser, so local Date getters reflect the user's timezone. Day math
  // decrements the date field (not a fixed 24h offset) so DST transitions
  // don't shift bucket boundaries.
  const localKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  const now = new Date();
  const buckets = new Map<string, { count: number; total: number }>();
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.set(localKey(day), { count: 0, total: 0 });
  }

  for (const s of scores) {
    if (typeof s.timestamp !== "number") continue;
    const bucket = buckets.get(localKey(new Date(s.timestamp)));
    if (!bucket) continue;
    bucket.count += 1;
    if (typeof s.score === "number" && Number.isFinite(s.score)) {
      bucket.total += s.score;
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, b]) => ({
      date,
      count: b.count,
      avgScore: b.count > 0 ? Math.round((b.total / b.count) * 10) / 10 : null,
    }));
}

function effectiveSessionType(s: ScoreEntry): "design" | "evaluation" {
  return s.sessionType === "evaluation" ? "evaluation" : "design";
}

type UserStats = {
  totalScans: number;
  avgScore: number | null;
  bestScore: number | null;
  lastScoreAt: number | null;
};

type UsageInfo = {
  used: number;
  limit: number;
  lifetime?: boolean;
};

type CompMeta = {
  reason: string;
  expiresAt: number | null;
};

export type DashboardData = {
  scores: ScoreEntry[];
  stats: UserStats;
  usage: UsageInfo;
  tier: "free" | "pro" | "team" | "pulse";
  paid: boolean;
  /** Member of the internal Drawbackwards org — suppresses the comp strip. */
  internal?: boolean;
  /** Team Lead with an empty team — show the "Set up your team" prompt. */
  needsTeamSetup?: boolean;
  comp: CompMeta | null;
};

function timeAgo(ts: number): string {
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

function UpgradeStrip({
  usage,
  paid,
  tier,
  comp,
  internal,
}: {
  usage: UsageInfo;
  paid: boolean;
  tier: "free" | "pro" | "team" | "pulse";
  comp: CompMeta | null;
  internal?: boolean;
}) {
  const tierLabel = tier === "pro" ? "Pro" : tier === "team" ? "Team" : tier === "pulse" ? "Pulse" : "Free";

  // Internal Drawbackwards members don't see any plan/comp strip — we built
  // Ladder; the "Complimentary Team" framing doesn't apply to us.
  if (internal) return null;

  // Pro users get no top strip — their tier badge and the Subscription link
  // live in the account menu now, so the dashboard stays clean.
  if (tier === "pro") return null;

  // Team members also get no top strip (removed the green "Team — Member of …"
  // banner). Tier shows in the account menu and the sidebar Team card; comp
  // expiry surfacing is tracked separately in #196.
  if (tier === "team") return null;

  if (paid && comp) {
    const expiry =
      comp.expiresAt && comp.expiresAt > Date.now()
        ? new Date(comp.expiresAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
    return (
      <div className="border-b border-ladder-green/20 bg-ladder-green/5">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-center gap-4 flex-wrap">
          <span className="text-[11px] text-muted font-sans">
            <span className="text-ladder-green font-semibold uppercase tracking-widest text-[10px]">
              {tierLabel}
            </span>
            {comp.reason && <> — {comp.reason}.</>}
            {expiry && (
              <span className="text-muted"> Through {expiry}.</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="border-b border-ladder-green/20 bg-ladder-green/5">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-center gap-4 flex-wrap">
          <span className="text-[11px] text-muted font-sans">
            <span className="text-ladder-green font-semibold uppercase tracking-widest text-[10px]">
              {tierLabel}
            </span>{" "}
            — high-volume scoring across every Ladder surface. See your monthly meter in the side panel.
          </span>
          <ManageSubscriptionButton className="text-[10px] uppercase tracking-widest font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors">
            Manage subscription →
          </ManageSubscriptionButton>
        </div>
      </div>
    );
  }
  // Free tier: the score count + upgrade CTA now live in the sidebar "Usage"
  // meter, so there's no top strip for free users.
  return null;
}

function StatsSummaryCard({ stats }: { stats: UserStats }) {
  if (!stats || stats.totalScans === 0) return null;
  const avg = stats.avgScore;
  const best = stats.bestScore;

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      <div className="border border-[#333] bg-[#1e1e1e] p-4">
        <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
          Total scans
        </p>
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {stats.totalScans}
        </p>
      </div>
      <div className="border border-[#333] bg-[#1e1e1e] p-4">
        <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
          Average
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: avg !== null ? getScoreColor(avg) : "#444" }}
        >
          {avg !== null ? avg.toFixed(1) : "—"}
        </p>
      </div>
      <div className="border border-[#333] bg-[#1e1e1e] p-4">
        <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
          Best
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: best !== null ? getScoreColor(best) : "#444" }}
        >
          {best !== null ? best.toFixed(1) : "—"}
        </p>
      </div>
    </div>
  );
}

const META_BADGE =
  "text-[8px] text-[#888] uppercase tracking-widest border border-[#3a3a3a] px-1.5 py-0.5 flex-shrink-0";

/** Score row title: cleaned name + optional surface badge (Figma/Skill/…) + scope badge. */
function ScoreRowTitle({
  label,
  isPublic,
  isTeam,
}: {
  label: string;
  isPublic?: boolean;
  isTeam: boolean;
}) {
  const { name, surface } = surfaceParts(label);
  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-foreground font-sans truncate">{name}</p>
      {surface && <span className={META_BADGE}>{surface}</span>}
      {isPublic === false && (
        <span className={META_BADGE}>{privateScopeLabel(isTeam)}</span>
      )}
    </div>
  );
}

function UpliftBadge({ uplift }: { uplift: number }) {
  if (uplift === 0) {
    return (
      <span
        className="text-[10px] font-mono font-semibold text-muted tabular-nums"
        title="Same score as last scan of this screen"
      >
        ±0.0
      </span>
    );
  }
  const positive = uplift > 0;
  const sign = positive ? "↑" : "↓";
  const display = `${sign}${Math.abs(uplift).toFixed(1)}`;
  return (
    <span
      className={`text-[10px] font-mono font-semibold tabular-nums ${
        positive ? "text-ladder-green" : "text-ladder-red"
      }`}
      title={`Change from previous scan of this screen`}
    >
      {display}
    </span>
  );
}

function ScoreCTACard() {
  return (
    <Link
      href="/score"
      className="flex items-center gap-4 border border-ladder-green/40 bg-ladder-green/[0.04] hover:bg-ladder-green/[0.08] hover:border-ladder-green/60 transition-colors p-4 group"
    >
      <div className="flex-shrink-0 w-12 h-12 bg-ladder-green/10 border border-ladder-green/30 flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6AC89B"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground font-sans">
          Score a new screen
        </p>
        <p className="text-[11px] text-muted font-sans mt-0.5">
          Upload or paste, get a Ladder score back in seconds.
        </p>
      </div>
      <span className="text-ladder-green text-base flex-shrink-0 pr-2 group-hover:translate-x-0.5 transition-transform">
        →
      </span>
    </Link>
  );
}

function EmptyHero() {
  return (
    <Link
      href="/score"
      className="block border border-[#2a2a2a] bg-[#1a1a1a] hover:border-ladder-green/40 hover:bg-ladder-green/[0.03] transition-colors p-12 text-center group"
    >
      <div className="mx-auto mb-6 w-16 h-16 border border-ladder-green/40 bg-ladder-green/5 flex items-center justify-center group-hover:bg-ladder-green/10 transition-colors">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6AC89B"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <h2 className="text-lg text-foreground font-sans mb-2">
        Score your first screen
      </h2>
      <p className="text-sm text-muted font-sans max-w-sm mx-auto leading-relaxed mb-6">
        Upload an image or paste a URL. You&apos;ll get a Ladder score and
        ranked findings back in seconds.
      </p>
      <span className="inline-block text-[11px] font-semibold uppercase tracking-widest bg-ladder-green text-[#1a1a1a] px-5 py-2.5 group-hover:bg-ladder-green/90 transition-colors">
        Score a screen →
      </span>
    </Link>
  );
}

/**
 * "Design rhythm" calendar — fills a square for every day the user logs
 * a design session. Quiet visual reinforcement of cadence (no streaks,
 * no break-the-streak anxiety). Hidden until the user has at least one
 * design-session score in the window.
 */
function DesignRhythmCard({ scores }: { scores: ScoreEntry[] }) {
  const designScores = scores.filter(
    (s) => effectiveSessionType(s) === "design",
  );
  const activity = bucketActivity(designScores, RHYTHM_WINDOW_DAYS);
  const totalInWindow = activity.reduce((sum, day) => sum + day.count, 0);
  const activeDays = activity.filter((day) => day.count > 0).length;

  if (totalInWindow === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <SectionLabel>Design rhythm</SectionLabel>
        <span className="text-[10px] text-muted">
          Design sessions, last {RHYTHM_WINDOW_DAYS} days
        </span>
      </div>
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="grid grid-cols-[1fr_1fr_8fr] gap-4 items-center">
          <div>
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Active days
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {activeDays}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Sessions
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {totalInWindow}
            </p>
          </div>
          <div className="min-w-0">
            <ActivityHeatmap
              activity={activity}
              cellHeight={10}
              cellGap={3}
              emptyClassName="bg-[#222]"
              fill
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading placeholder for the Design rhythm card. Same eyebrow + box + 3-column
 * layout (Active days / Sessions / chart) and the same chart height (7 rows ×
 * 10px + 6 gaps × 3px = 88px) so the real card fills in without a jump.
 */
function DesignRhythmSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <SectionLabel>Design rhythm</SectionLabel>
        <span className="text-[10px] text-muted">
          Design sessions, last {RHYTHM_WINDOW_DAYS} days
        </span>
      </div>
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="grid grid-cols-[1fr_1fr_8fr] gap-4 items-center">
          <div>
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Active days
            </p>
            <Skeleton className="h-7 w-10" />
          </div>
          <div>
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Sessions
            </p>
            <Skeleton className="h-7 w-10" />
          </div>
          <div className="min-w-0">
            <Skeleton className="h-[88px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const viewAs = useViewAs();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [upgradedToPro, setUpgradedToPro] = useState(false);

  // Make sure the user's org is the session's active org (invite-based
  // provisioning doesn't auto-activate the way self-serve creation did) so the
  // team card and team page render. The "Set up your team" decision itself is
  // computed server-side (`needsTeamSetup` from /api/dashboard) and gated on
  // the dashboard fetch below, so it never flashes on the staged resolution of
  // client org hooks.
  useEnsureActiveOrg();

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    loadDashboard();
  }, [isSignedIn, loadDashboard]);

  // Stripe checkout returns to /dashboard?upgraded=pro. Confirm the upgrade and
  // re-fetch shortly after — the tier flips via the Stripe webhook (async), so
  // the first load can still read "Free". Read from window (not useSearchParams)
  // to avoid a Suspense boundary requirement. (#213)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "pro") return;
    setUpgradedToPro(true);
    window.history.replaceState({}, "", "/dashboard");
    const t = setTimeout(() => loadDashboard(), 2500);
    return () => clearTimeout(t);
  }, [loadDashboard]);

  async function deleteScore(scoreId: string) {
    setDeleting(scoreId);
    try {
      const res = await fetch("/api/dashboard/scores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreId }),
      });
      if (res.ok && data) {
        setData({
          ...data,
          scores: data.scores.filter((s) => s.id !== scoreId),
        });
      }
    } catch {
      // Silently fail
    } finally {
      setDeleting(null);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  // Dev "view as" override (no-op in production builds): when set, render the
  // selected role's fixtures instead of the fetched data.
  const effectiveData = viewAs ? viewAsDashboardData(viewAs) : data;
  const showLoading = viewAs ? false : loading;
  const scores = effectiveData?.scores ?? [];
  const stats = effectiveData?.stats ?? {
    totalScans: 0,
    avgScore: null,
    bestScore: null,
    lastScoreAt: null,
  };
  const usage = effectiveData?.usage ?? { used: 0, limit: FREE_LIFETIME_LIMIT };
  const paid = effectiveData?.paid ?? false;
  const tier = effectiveData?.tier ?? "free";
  const comp = effectiveData?.comp ?? null;
  const internal = effectiveData?.internal ?? false;
  const needsTeamSetup = effectiveData?.needsTeamSetup ?? false;
  const firstName = viewAs
    ? viewAsUserMeta(viewAs).firstName
    : user?.firstName || null;

  return (
    <div className="pt-20 font-mono">
      {/* Post-checkout confirmation (#213). Dismissible; the tier catches up via
          the Stripe webhook + the delayed re-fetch above. */}
      {upgradedToPro && (
        <div className="border-b border-ladder-green/30 bg-ladder-green/5">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-center gap-4 flex-wrap">
            <span className="text-[11px] text-muted font-sans">
              <span className="text-ladder-green font-semibold uppercase tracking-widest text-[10px]">
                Welcome to Pro
              </span>{" "}
              — 2,000 scores/month across every surface.
            </span>
            <button
              onClick={() => setUpgradedToPro(false)}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Both the plan strip and the team-setup banner are gated on the
          dashboard fetch (`data`) so they never flash a wrong default
          (e.g. the free strip for an internal/team user) on first paint. */}
      {effectiveData && (
        <UpgradeStrip usage={usage} paid={paid} tier={tier} comp={comp} internal={internal} />
      )}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl text-foreground font-sans">
            {firstName ? `Hi, ${firstName}` : "Welcome"}
          </h1>
        </div>

        {effectiveData && needsTeamSetup && <TeamSetupBanner />}

        {/* Reviews is incomplete, so the designer-side "Ask your team for a
            review" CTA is hidden for now. Restore by re-adding
            <RequestReviewCTA /> here (gated on tier team/pulse) once Reviews
            ships. */}

        {/* Design rhythm + activity heatmap are a paid feature — hidden for
            free users (#289). Paid tiers (pro/team/pulse) keep both. */}
        {paid &&
          (showLoading ? (
            <DesignRhythmSkeleton />
          ) : (
            <DesignRhythmCard scores={scores} />
          ))}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <main>
            {showLoading ? (
              // Mirror the loaded layout (CTA + Score history rows) so content
              // fills into place without a jump. The score-a-screen CTA is a
              // static link, so it renders for real.
              <>
                <ScoreCTACard />
                <div className="mt-6 mb-3 flex items-center justify-between">
                  <SectionLabel>Score history</SectionLabel>
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="space-y-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 flex items-center gap-4"
                    >
                      <Skeleton className="w-12 h-12 flex-shrink-0" />
                      <Skeleton className="w-10 h-6 flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : scores.length === 0 ? (
              <EmptyHero />
            ) : (
              <>
                <ScoreCTACard />
                <div className="mt-6 mb-3 flex items-center justify-between">
                  <SectionLabel>Score history</SectionLabel>
                  <span className="text-[10px] text-muted">
                    {scores.length} score{scores.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {scores.map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#1f1f1f] hover:border-[#3a3a3a] transition-colors group relative flex items-stretch"
                    >
                      {/*
                        Card click target is everything EXCEPT the delete
                        button. Previously the delete button lived inside the
                        Link and used preventDefault; that's the dangerous
                        overlap Ward flagged. Now the click areas are mutually
                        exclusive: row Link → detail page, button → delete.
                      */}
                      <Link
                        href={`/dashboard/scores/${entry.id}`}
                        className="block flex-1 min-w-0 px-4 py-3"
                      >
                        <div className="flex items-center gap-4">
                          {entry.thumbnail ? (
                            <div className="flex-shrink-0 w-12 h-12 border border-[#2a2a2a] bg-[#111] overflow-hidden">
                              <img
                                src={entry.thumbnail}
                                alt=""
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-12 h-12 border border-[#2a2a2a] bg-[#111]" />
                          )}

                          <div className="flex-shrink-0 w-12 text-center">
                            <span
                              className="text-xl font-bold tabular-nums"
                              style={{ color: getScoreColor(entry.score) }}
                            >
                              {entry.score.toFixed(1)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <ScoreRowTitle
                              label={entry.screenName || entry.source}
                              isPublic={entry.isPublic}
                              isTeam={isTeamScope(tier)}
                            />
                            <p className="text-[10px] text-muted font-sans truncate mt-0.5">
                              <span style={{ color: getScoreColor(entry.score) }}>
                                {entry.label}
                              </span>
                              <span className="text-[#444] mx-1.5">·</span>
                              {timeAgo(entry.timestamp)}
                            </p>
                          </div>

                          {typeof entry.uplift === "number" && (
                            <div className="flex-shrink-0 hidden sm:block">
                              <UpliftBadge uplift={entry.uplift} />
                            </div>
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={() => deleteScore(entry.id)}
                        disabled={deleting === entry.id}
                        className="flex-shrink-0 text-[#3a3a3a] hover:text-ladder-red transition-all disabled:opacity-30 opacity-0 group-hover:opacity-100 px-4 flex items-center"
                        title="Delete score"
                        aria-label="Delete score"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>

          <aside className="space-y-4">
            <UsageMeter />
            {/* While the empty-team setup banner is showing, don't also show
                the team card — they'd be redundant for a Lead with no team.
                Gated on `data` so it doesn't flash before team state is known. */}
            {/* While the dashboard data loads, reserve the Team card's space
                for team-tier users (read from Clerk metadata, which is known
                before the /api/dashboard fetch) so the promos below don't get
                shoved when it appears. */}
            {showLoading
              ? (user?.publicMetadata as { tier?: string } | undefined)?.tier ===
                  "team" && <TeamCardSkeleton />
              : effectiveData &&
                tier === "team" &&
                !needsTeamSetup && <TeamCard />}
            <FigmaPromoCard />
            <ClaudePromoCard />
          </aside>
        </div>
      </div>
    </div>
  );
}
