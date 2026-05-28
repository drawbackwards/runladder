"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

type TeamClient = {
  id: string;
  name: string;
  membersCount: number;
  status: "pending" | "active" | "suspended";
  internal: boolean;
  teamLead: { firstName?: string; lastName?: string; email?: string } | null;
  createdAt: number;
};

type ProClient = {
  id: string;
  email: string;
  name: string | null;
  comp: boolean;
  since: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrg, setBusyOrg] = useState<string | null>(null);
  // Branded delete-confirmation modal state.
  const [deleteTarget, setDeleteTarget] = useState<TeamClient | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  function openDelete(client: TeamClient) {
    setDeleteTarget(client);
    setConfirmText("");
    setDeleteError(null);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setConfirmText("");
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyOrg(deleteTarget.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/clients/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: confirmText }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      closeDelete();
      await refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyOrg(null);
    }
  }

  // Auth + access gating live in the admin layout (#231).

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <p className="text-xs text-muted font-sans">
          Team orgs (provisioned) and Pro subscribers
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
            className="text-xs font-semibold bg-ladder-green text-[#1a1a1a] uppercase tracking-widest px-5 py-2.5 hover:bg-ladder-green/90 transition-colors"
          >
            Add Client
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
            <span className="text-[10px] text-muted">{teamClients.length} total</span>
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3 w-1/4">Org</th>
                  <th className="text-left p-3">Team Lead</th>
                  <th className="text-left p-3">Members</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted font-sans">
                      No Team clients yet.
                    </td>
                  </tr>
                ) : (
                  teamClients.map((c) => {
                    const lead = c.teamLead;
                    const leadLabel = lead
                      ? `${[lead.firstName, lead.lastName].filter(Boolean).join(" ")}${lead.email ? ` · ${lead.email}` : ""}`
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
                        <td className="p-3 text-muted truncate">{leadLabel}</td>
                        <td className="p-3 text-left tabular-nums text-muted">
                          {c.membersCount}
                        </td>
                        <td className="p-3">
                          {c.status === "suspended" ? (
                            <span className="text-ladder-orange">Suspended</span>
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
                            <>
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
                                className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors mr-3 disabled:opacity-40"
                              >
                                {c.status === "suspended" ? "Reactivate" : "Suspend"}
                              </button>
                              <button
                                onClick={() => openDelete(c)}
                                disabled={busyOrg === c.id}
                                className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors disabled:opacity-40"
                              >
                                Delete
                              </button>
                            </>
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
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Pro clients
            </span>
            <span className="text-[10px] text-muted">{proClients.length} total</span>
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
                {proClients.length === 0 ? (
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

      {/* Branded delete-confirmation modal (placeholder until a shared
          Dialog component exists). Type-the-name to confirm; destructive
          action gets a red button. */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
          onClick={closeDelete}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md border border-[#2a2a2a] bg-[#161616] p-5 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-sans font-semibold text-foreground mb-2">
              Delete Organization
            </h2>
            <p className="text-xs text-muted font-sans mb-4 leading-relaxed">
              This permanently deletes{" "}
              <span className="text-foreground">{deleteTarget.name}</span> and
              removes all members. This cannot be undone. Type the org name to
              confirm.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={deleteTarget.name}
              autoFocus
              className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
            />
            {deleteError && (
              <p className="mt-3 text-xs text-ladder-red font-sans">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-4">
              <button
                onClick={closeDelete}
                className="text-xs font-semibold text-muted hover:text-foreground transition-colors px-4 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={
                  busyOrg === deleteTarget.id ||
                  confirmText.trim() !== deleteTarget.name
                }
                className="text-xs font-semibold bg-ladder-red text-white px-4 py-1.5 rounded-sm hover:bg-ladder-red/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busyOrg === deleteTarget.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
