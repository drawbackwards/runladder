"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IndustrySelect } from "@/components/admin/IndustrySelect";
import { MULTIPLE_INDUSTRY_VALUE } from "@/lib/industries";
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
  status: "pending" | "active" | "suspended" | "terminated";
  createdAt: number;
  teamLead: { firstName?: string; lastName?: string; email?: string } | null;
  industry: string | null;
  industryMode?: "single" | "multiple";
  terminatedAt: number | null;
  purgedAt: number | null;
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
  "style-guide": "Writing Style Guide",
  "design-system": "Design System",
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

  const [industryDraft, setIndustryDraft] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [industrySaved, setIndustrySaved] = useState(false);
  const industryValue =
    industryDraft ??
    (org?.industryMode === "multiple"
      ? MULTIPLE_INDUSTRY_VALUE
      : (org?.industry ?? ""));

  async function patchOrg(body: Record<string, unknown>): Promise<boolean> {
    setActionBusy(true);
    setActionErr(null);
    try {
      const res = await fetch(`/api/admin/clients/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Action failed (${res.status})`);
      const refreshed = await fetch(`/api/admin/clients/${orgId}`);
      if (refreshed.ok) setDetail((await refreshed.json()) as Detail);
      return true;
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  // Auto-save on selection (no Save button): picking a value IS the intent,
  // and it also means "Add new industry" persists in one motion instead of
  // silently needing a second click.
  async function saveIndustry(value: string) {
    setIndustryDraft(value);
    if (!value || value === (org?.industry ?? "")) return;
    setIndustrySaved(false);
    const ok = await patchOrg({ action: "setIndustry", industry: value });
    if (ok) {
      setIndustrySaved(true);
      setTimeout(() => setIndustrySaved(false), 2500);
    }
  }

  async function confirmTerminate() {
    await patchOrg({ action: "terminate" });
    setTerminateOpen(false);
  }

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
                ? "Paused"
                : org.status === "terminated"
                  ? org.purgedAt
                    ? `Terminated · content purged ${fmtDate(org.purgedAt)}`
                    : `Terminated · content purges ${fmtDate(
                        (org.terminatedAt ?? 0) + 30 * 24 * 60 * 60 * 1000,
                      )}`
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

        {/* ── Scoring Data (#422) + Termination (#398) ──────────── */}
        {!loading && org && !org.internal && (
          <section className="mt-12">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Scoring Data
            </span>
            {actionErr && (
              <div className="mt-3 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
                {actionErr}
              </div>
            )}
            <div className="mt-4 border border-[#333] bg-[#1e1e1e] p-4">
              {/* Industry: the only client-linked dimension the de-identified
                  learning store keeps (#422). Label on top — the control is
                  two rows tall when "add new" is open, so a side label and a
                  vertically-centered row don't hold up. Save sits beside the
                  select with matching vertical padding so their text aligns. */}
              <label
                htmlFor="org-industry"
                className="block text-[10px] text-muted uppercase tracking-widest mb-1.5"
              >
                Industry
                {/* Inline with the label so its appearance never shifts the
                    row layout below. */}
                {industrySaved && (
                  <span className="ml-2 text-ladder-green">Saved</span>
                )}
              </label>
              <div className="flex items-start gap-4">
                {/* Fixed half-width container (the Profile-form field width):
                    the add-new row expands INSIDE it, so Save never moves. */}
                <div className="w-full sm:w-1/2">
                  <IndustrySelect
                    id="org-industry"
                    value={industryValue}
                    onChange={saveIndustry}
                    wrapperClassName="w-full"
                    selectClassName={`w-full bg-[#111] border border-[#333] text-sm px-2.5 py-2 focus:outline-none focus:border-ladder-green font-sans ${
                      industryValue ? "text-foreground" : "text-[#555]"
                    }`}
                    chevronClassName="right-2.5"
                    inputClassName="flex-1 min-w-0 bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-2 focus:outline-none focus:border-ladder-green placeholder:text-[#555] font-sans"
                  />
                </div>
                {/* Help text fills the right column, flush with the input's
                    top edge. */}
                <p className="flex-1 min-w-0 text-xs text-muted font-sans">
                  Industry is used to label this team&apos;s de-identified
                  scoring data in the learning aggregate. It is not visible to
                  the client.
                </p>
              </div>
            </div>
            <span className="block mt-12 text-[10px] text-muted uppercase tracking-widest">
              Termination
            </span>
            <div className="mt-4 border border-ladder-red/40 bg-ladder-red/5 p-4">
              {org.status === "terminated" ? (
                <p className="text-xs text-ladder-red font-sans">
                  {org.purgedAt
                    ? `Contract terminated. All Customer Content was de-identified and purged ${fmtDate(org.purgedAt)}.`
                    : `Contract terminated ${fmtDate(org.terminatedAt)}. Content purges ${fmtDate(
                        (org.terminatedAt ?? 0) + 30 * 24 * 60 * 60 * 1000,
                      )} — Restore from the Clients list to cancel.`}
                </p>
              ) : (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-xs text-ladder-red font-sans max-w-lg">
                    Terminate starts the 30-day contract-end clock: score
                    data, thumbnails, uploads, and the style guide are
                    de-identified into the learning aggregate, then deleted.
                  </p>
                  <button
                    onClick={() => setTerminateOpen(true)}
                    disabled={actionBusy}
                    className="text-[10px] uppercase tracking-widest text-ladder-red border border-ladder-red/40 px-3 py-2 hover:bg-ladder-red/10 transition-colors disabled:opacity-40"
                  >
                    Terminate contract
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <ConfirmDialog
          open={terminateOpen}
          title={`Terminate ${org?.name ?? "this team"}?`}
          body="This starts the 30-day contract-termination clock. After 30 days, ALL of this team's score data, thumbnails, uploads, and style guide are de-identified into the learning aggregate and permanently deleted (#398). Restore before then to cancel."
          confirmLabel="Terminate"
          destructive
          busy={actionBusy}
          onConfirm={confirmTerminate}
          onCancel={() => {
            if (!actionBusy) setTerminateOpen(false);
          }}
        />
      </div>
    </div>
  );
}
