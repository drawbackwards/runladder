"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";

/**
 * Skeleton rows that mirror the real table: one shimmer bar per column, in the
 * same `<td>`s the data lands in, sized to match a one-line row. The table head
 * and section chrome stay rendered, so real rows replace these in place with no
 * layout shift (only the row count differs).
 */
function TableSkeleton({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-[#222] last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="p-3">
              {/* First column a touch wider (email), rest narrower. */}
              <Skeleton className={`h-3.5 ${c === 0 ? "w-4/5" : "w-1/2"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

type TeamClient = {
  id: string;
  name: string;
  membersCount: number;
  status: "pending" | "active" | "suspended";
  internal: boolean;
  teamLead: { firstName?: string; lastName?: string; email?: string } | null;
  createdAt: number;
  usage: { used: number; pool: number };
};

type ProClient = {
  id: string;
  email: string;
  name: string | null;
  comp: boolean;
  since: number;
};

type FreeUser = {
  id: string;
  email: string;
  name: string | null;
  since: number;
  lastActiveAt: number | null;
};

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

export default function ManageClientsPage() {
  const { isSignedIn } = useAuth();
  const [teamClients, setTeamClients] = useState<TeamClient[]>([]);
  const [proClients, setProClients] = useState<ProClient[]>([]);
  const [freeUsers, setFreeUsers] = useState<FreeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrg, setBusyOrg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients");
      if (res.status === 403) {
        // Should not happen: layout gates access before this page mounts.
        return;
      }
      if (!res.ok) throw new Error(`Clients fetch ${res.status}`);
      const j = await res.json();
      setTeamClients(j.teamClients || []);
      setProClients(j.proClients || []);
      setFreeUsers(j.freeUsers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSignedIn) return;
    refresh();
  }, [isSignedIn]);

  async function patch(orgId: string, action: string) {
    setBusyOrg(orgId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Action failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyOrg(null);
    }
  }

  // Clients are never hard-deleted (#295) — Archive (the suspend mechanism)
  // turns off access while preserving all data. No delete path exists.

  // Auth + access gating live in the admin layout (#231).

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <p className="text-xs text-muted font-sans">
          Team orgs (provisioned), Pro subscribers, and Free users
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={refresh}
            disabled={loading}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <Link
            href="/admin/clients/new"
            className="text-xs font-semibold bg-ladder-green text-[#1a1a1a] uppercase tracking-widest px-5 py-2.5 hover:bg-ladder-green-light transition-colors"
          >
            Add Team Client
          </Link>
        </div>
      </div>

        {error && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {error}
          </div>
        )}

        {/* ── Team clients ──────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Team clients
            </span>
            {loading ? (
              <Skeleton className="h-3 w-12" />
            ) : (
              <span className="text-[10px] text-muted">
                {teamClients.length} total
              </span>
            )}
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3 w-1/4">Org</th>
                  <th className="text-left p-3">Team Lead</th>
                  <th className="text-left p-3 w-20 whitespace-nowrap">Members</th>
                  <th className="text-left p-3">Usage</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton cols={6} />
                ) : teamClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted font-sans">
                      No Team clients yet.
                    </td>
                  </tr>
                ) : (
                  teamClients.map((c) => {
                    const lead = c.teamLead;
                    // Team Lead column shows the name; falls back to email only
                    // when no first/last name is set.
                    const leadLabel = lead
                      ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
                        lead.email ||
                        "—"
                      : "—";
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-[#222] last:border-0 hover:bg-[#222]"
                      >
                        <td className="p-3 text-foreground">
                          {c.name}
                          {c.internal && (
                            <span className="ml-2 text-[9px] uppercase tracking-widest text-ladder-green border border-ladder-green/40 bg-ladder-green/5 px-1.5 py-0.5">
                              Internal
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted">{leadLabel}</td>
                        <td className="p-3 text-left tabular-nums text-muted">
                          {c.membersCount}
                        </td>
                        <td className="p-3 text-left tabular-nums whitespace-nowrap">
                          <span
                            className={
                              c.usage.used >= c.usage.pool
                                ? "text-ladder-orange"
                                : "text-muted"
                            }
                          >
                            {c.usage.used.toLocaleString()}
                          </span>
                          <span className="text-[#444]">
                            {" "}
                            / {c.usage.pool.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3">
                          {c.status === "suspended" ? (
                            <span className="text-ladder-orange">Archived</span>
                          ) : c.status === "pending" ? (
                            <span className="text-ladder-yellow">Pending</span>
                          ) : (
                            <span className="text-ladder-green">Active</span>
                          )}
                        </td>
                        <td className="p-3 text-muted">{fmtDate(c.createdAt)}</td>
                        <td className="p-3 text-left whitespace-nowrap">
                          {c.internal ? (
                            <span className="text-[10px] text-muted">Protected</span>
                          ) : (
                            <button
                              onClick={() =>
                                patch(
                                  c.id,
                                  c.status === "suspended"
                                    ? "reactivate"
                                    : "suspend",
                                )
                              }
                              disabled={busyOrg === c.id}
                              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                            >
                              {c.status === "suspended" ? "Restore" : "Archive"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Pro clients (read-only) ───────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Pro clients
            </span>
            {loading ? (
              <Skeleton className="h-3 w-12" />
            ) : (
              <span className="text-[10px] text-muted">
                {proClients.length} total
              </span>
            )}
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3 w-1/4">Email</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Payment</th>
                  <th className="text-left p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton cols={4} />
                ) : proClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted font-sans">
                      No Pro clients yet.
                    </td>
                  </tr>
                ) : (
                  proClients.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[#222] last:border-0 hover:bg-[#222]"
                    >
                      <td className="p-3 text-foreground">{p.email}</td>
                      <td className="p-3 text-muted">{p.name || "—"}</td>
                      <td className="p-3 text-muted uppercase tracking-widest text-[10px]">
                        {p.comp ? "Comp" : "Stripe"}
                      </td>
                      <td className="p-3 text-muted">{fmtDate(p.since)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Free users (read-only) ────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Free users
            </span>
            {loading ? (
              <Skeleton className="h-3 w-12" />
            ) : (
              <span className="text-[10px] text-muted">
                {freeUsers.length} total
              </span>
            )}
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3 w-1/4">Email</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Last active</th>
                  <th className="text-left p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton cols={4} />
                ) : freeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted font-sans">
                      No free users yet.
                    </td>
                  </tr>
                ) : (
                  freeUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[#222] last:border-0 hover:bg-[#222]"
                    >
                      <td className="p-3 text-foreground truncate">{u.email}</td>
                      <td className="p-3 text-muted">{u.name || "—"}</td>
                      <td className="p-3 text-muted">{fmtDate(u.lastActiveAt)}</td>
                      <td className="p-3 text-muted">{fmtDate(u.since)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

    </>
  );
}
