"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { USAGE_SURFACES, USAGE_SURFACE_LABEL, type UsageSurface } from "@/lib/surface";

/**
 * Team Detail (#397) — admin drill-in for one Team workspace. Shows the
 * member roster and month-by-month pooled usage so we can review overage at
 * month end (manual billing check; enforcement is post-MVP). Data comes from
 * GET /api/admin/clients/:orgId. Lives outside the (tabbed) route group, so
 * it renders its own chrome (back link + heading) like /admin/clients/new.
 */

type OrgInfo = {
  id: string;
  name: string;
  internal: boolean;
  status: "pending" | "active" | "suspended";
  createdAt: number;
  teamLead: { firstName?: string; lastName?: string; email?: string } | null;
};

type Member = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  scoresThisMonth: number;
};

type MonthUsage = {
  month: string;
  scores: number;
  scoresBySurface: Record<UsageSurface, number>;
  distinctActiveMembers: number;
  costMicroUsd: number;
  costByCategory: Record<string, number>;
  costEstimated: boolean;
};

/** Human labels for the cost-breakdown popover (keys from token-cost.ts). */
const COST_CATEGORY_LABELS: Record<string, string> = {
  score: "Score",
  overhead: "Scoring overhead",
  copy: "Improve Copy",
  a11y: "Accessibility",
  "style-guide": "Style Guide",
  annotation: "Annotation",
  chat: "Chat",
  feedback: "Feedback",
};

/** Micro-USD → "$1.23" (or "$0.0043" when small). Inlined to keep server-only
 * token-cost.ts (which imports redis) out of this client bundle. */
function fmtUsd(micro: number): string {
  const usd = micro / 1_000_000;
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Detail = {
  org: OrgInfo;
  pool: number;
  members: Member[];
  usageByMonth: MonthUsage[];
};

/**
 * Skeleton rows that mirror the real table: one shimmer bar per column, in the
 * same `<td>`s the data lands in. Matches the /admin/clients pattern.
 */
function TableSkeleton({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-[#222] last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="p-3">
              <Skeleton className={`h-3.5 ${c === 0 ? "w-4/5" : "w-1/2"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function fmtDate(ms: number | null | undefined) {
  if (!ms) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2026-07" → "July 2026". Parsed as UTC to match the bucket boundary. */
function fmtMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-").map(Number);
  if (!y || !m) return yyyymm;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function TeamDetailPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { isSignedIn } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth + access gating live in the parent /admin layout (#231).
  useEffect(() => {
    if (!isSignedIn || !orgId) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/clients/${orgId}`);
        if (!res.ok) throw new Error(`Detail fetch ${res.status}`);
        const j = await res.json();
        if (active) setDetail(j as Detail);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isSignedIn, orgId]);

  const org = detail?.org;
  const pool = detail?.pool ?? 0;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/admin/clients"
          className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors inline-block mb-4"
        >
          ← Clients
        </Link>

        <div className="mb-8">
          {loading ? (
            <Skeleton className="h-6 w-56" />
          ) : (
            <h1 className="text-xl text-foreground font-sans flex items-center">
              {org?.name ?? "Team"}
              {org?.internal && (
                <span className="ml-2 text-[9px] uppercase tracking-widest text-ladder-green border border-ladder-green/40 bg-ladder-green/5 px-1.5 py-0.5">
                  Internal
                </span>
              )}
            </h1>
          )}
          {!loading && org && (
            <p className="text-xs text-muted font-sans mt-1">
              {org.status === "suspended"
                ? "Archived"
                : org.status === "pending"
                  ? "Pending"
                  : "Active"}{" "}
              · Joined {fmtDate(org.createdAt)}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {error}
          </div>
        )}

        {/* ── Members ───────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Members
            </span>
            {loading ? (
              <Skeleton className="h-3 w-12" />
            ) : (
              <span className="text-[10px] text-muted">
                {detail?.members.length ?? 0} total
              </span>
            )}
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3 w-1/4">Name</th>
                  <th className="text-left p-3 w-1/4">Email</th>
                  <th className="text-left p-3 w-1/4">Role</th>
                  <th className="text-left p-3 w-1/4 whitespace-nowrap">
                    Scores this month
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton cols={4} />
                ) : (detail?.members.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted font-sans">
                      No members yet.
                    </td>
                  </tr>
                ) : (
                  detail!.members.map((m) => (
                    <tr
                      key={m.userId}
                      className="border-b border-[#222] last:border-0 hover:bg-[#222]"
                    >
                      <td className="p-3 text-foreground truncate">
                        {m.name ?? "—"}
                      </td>
                      <td className="p-3 text-muted truncate">{m.email ?? "—"}</td>
                      <td className="p-3">
                        {m.role === "org:admin" ? (
                          <span className="text-[9px] text-ladder-green uppercase tracking-widest">
                            Team Lead
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted uppercase tracking-widest">
                            Member
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-left tabular-nums text-muted">
                        {m.scoresThisMonth.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Usage by month ────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Usage
            </span>
            {!loading && (
              <span className="text-[10px] text-muted">
                Pool {pool.toLocaleString()} / mo
              </span>
            )}
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  {/* Four equal columns, matching the Members table's grid so
                      the two tables line up. Cost is internal COGS (#406). */}
                  <th className="text-left p-3 w-1/4">Month</th>
                  <th className="text-left p-3 w-1/4">Scores used</th>
                  <th className="text-left p-3 w-1/4 whitespace-nowrap">
                    Active members
                  </th>
                  <th className="text-left p-3 w-1/4">Cost</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton cols={4} />
                ) : (detail?.usageByMonth.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted font-sans">
                      No usage yet.
                    </td>
                  </tr>
                ) : (
                  detail!.usageByMonth.map((u) => {
                    const over = u.scores >= pool;
                    return (
                      <tr
                        key={u.month}
                        className="border-b border-[#222] last:border-0 hover:bg-[#222]"
                      >
                        <td className="p-3 text-foreground">
                          {fmtMonth(u.month)}
                          {over && (
                            <span className="ml-2 text-[9px] uppercase tracking-widest text-ladder-orange border border-ladder-orange/40 bg-ladder-orange/5 px-1.5 py-0.5 whitespace-nowrap">
                              Overage
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-left tabular-nums whitespace-nowrap">
                          {/* Combined total is the pool number (unchanged). On
                              hover, break it down by surface (#401) — same
                              popover affordance as the Cost cell. */}
                          <span className="group relative inline-flex items-center cursor-help">
                            <span className={over ? "text-ladder-orange" : "text-muted"}>
                              {u.scores.toLocaleString()}
                            </span>
                            <span className="text-[#444]">
                              {" "}
                              / {pool.toLocaleString()}
                            </span>
                            {u.scores > 0 && (
                              <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-10 min-w-[190px] border border-[#333] bg-[#1a1a1a] p-3 text-left normal-case tracking-normal shadow-lg">
                                {USAGE_SURFACES.filter((s) => (u.scoresBySurface[s] ?? 0) > 0)
                                  .sort((a, b) => (u.scoresBySurface[b] ?? 0) - (u.scoresBySurface[a] ?? 0))
                                  .map((s) => (
                                    <div
                                      key={s}
                                      className="flex items-center justify-between gap-4 py-1"
                                    >
                                      <span className="text-muted font-sans">
                                        {USAGE_SURFACE_LABEL[s]}
                                      </span>
                                      <span className="text-foreground tabular-nums">
                                        {(u.scoresBySurface[s] ?? 0).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-left tabular-nums text-muted">
                          {u.distinctActiveMembers.toLocaleString()}
                        </td>
                        <td className="p-3 text-left tabular-nums">
                          <span className="group relative inline-flex items-center gap-2 cursor-help">
                            <span className="text-foreground">
                              {fmtUsd(u.costMicroUsd)}
                            </span>
                            {u.costEstimated && (
                              <span className="text-[9px] uppercase tracking-widest text-muted border border-[#333] bg-[#111] px-1.5 py-0.5">
                                Estimated
                              </span>
                            )}
                            {Object.keys(u.costByCategory).length > 0 && (
                              <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-10 min-w-[190px] border border-[#333] bg-[#1a1a1a] p-3 text-left normal-case tracking-normal shadow-lg">
                                {(() => {
                                  // Score first (it's the default action), then
                                  // the rest by cost desc, split by a divider.
                                  const entries = Object.entries(u.costByCategory);
                                  const score = entries.filter(([c]) => c === "score");
                                  const rest = entries
                                    .filter(([c]) => c !== "score")
                                    .sort((a, b) => b[1] - a[1]);
                                  return [...score, ...rest].map(([cat, v], i) => (
                                    <div
                                      key={cat}
                                      className={`flex items-center justify-between gap-4 py-1 ${
                                        score.length > 0 && i === score.length
                                          ? "mt-1 border-t border-[#333] pt-2"
                                          : ""
                                      }`}
                                    >
                                      <span className="text-muted font-sans">
                                        {COST_CATEGORY_LABELS[cat] ?? cat}
                                      </span>
                                      <span className="text-foreground tabular-nums">
                                        {fmtUsd(v)}
                                      </span>
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
