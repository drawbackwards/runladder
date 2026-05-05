"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";

type BillingSummary = {
  active: number;
  paused: number;
  archived: number;
  included: number;
  overageSeats: number;
  overagePrice: number;
};

type TeamSummary = {
  id: string;
  name: string;
  ownerUserId: string;
  ownerEmail: string | null;
  status: "active" | "paused" | "archived";
  seatCap: number;
  perOverageSeatPrice: number;
  queryPool: number;
  createdAt: number;
  updatedAt: number;
  billing: BillingSummary;
};

function fmtDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMoney(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

function StatusChip({ status }: { status: TeamSummary["status"] }) {
  const cls =
    status === "active"
      ? "text-ladder-green border-ladder-green/40 bg-ladder-green/5"
      : status === "paused"
        ? "text-ladder-orange border-ladder-orange/40 bg-ladder-orange/5"
        : "text-muted border-[#333] bg-[#1a1a1a]";
  return (
    <span
      className={`inline-block text-[9px] uppercase tracking-widest border px-2 py-0.5 ${cls}`}
    >
      {status}
    </span>
  );
}

export default function AdminTeamsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [seatCap, setSeatCap] = useState("10");
  const [queryPool, setQueryPool] = useState("25000");
  const [overagePrice, setOveragePrice] = useState("250");
  const [creating, setCreating] = useState(false);

  // Inline edit state (one row at a time)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    name: string;
    status: TeamSummary["status"];
    seatCap: string;
    queryPool: string;
    overagePrice: string;
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teams");
      if (res.status === 403) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      if (!res.ok) throw new Error(`Teams fetch ${res.status}`);
      const json = await res.json();
      setTeams(json.teams || []);
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

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ownerEmail: ownerEmail.trim(),
          seatCap: Number(seatCap) || undefined,
          queryPool: Number(queryPool) || undefined,
          perOverageSeatPrice: Number(overagePrice) || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Create failed (${res.status})`);
      setName("");
      setOwnerEmail("");
      setSeatCap("10");
      setQueryPool("25000");
      setOveragePrice("250");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(team: TeamSummary) {
    setEditingId(team.id);
    setEditFields({
      name: team.name,
      status: team.status,
      seatCap: String(team.seatCap),
      queryPool: String(team.queryPool),
      overagePrice: String(team.perOverageSeatPrice),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFields(null);
  }

  async function saveEdit(teamId: string) {
    if (!editFields) return;
    setSavingId(teamId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFields.name,
          status: editFields.status,
          seatCap: Number(editFields.seatCap) || 0,
          queryPool: Number(editFields.queryPool) || 0,
          perOverageSeatPrice: Number(editFields.overagePrice) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`);
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (authorized === false) {
    return (
      <div className="pt-20 max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-xl font-bold font-sans mb-3">Admin access required</h1>
        <p className="text-sm text-muted font-sans">
          Your Clerk account is signed in but not on the admin allowlist.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl text-foreground font-sans">Teams</h1>
            <p className="text-xs text-muted font-sans mt-1">
              Provision and manage Ladder for Teams accounts
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs font-semibold border border-[#333] text-muted hover:text-foreground hover:border-muted px-4 py-1.5 rounded-sm transition-colors"
            >
              ← Admin home
            </Link>
            <button
              onClick={refresh}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {error}
          </div>
        )}

        {/* ── Create team ────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Create new team
            </span>
          </div>
          <form
            onSubmit={createTeam}
            className="border border-[#333] bg-[#1e1e1e] p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                Team name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Drawbackwards"
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                Owner email (must already have a Ladder account)
              </label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="ward@drawbackwards.com"
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                Included seats <span className="text-[#555]">(admin counts as 1)</span>
              </label>
              <input
                type="number"
                min={1}
                value={seatCap}
                onChange={(e) => setSeatCap(e.target.value)}
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                Overage price per seat / mo
              </label>
              <input
                type="number"
                min={0}
                value={overagePrice}
                onChange={(e) => setOveragePrice(e.target.value)}
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                Pooled queries / mo
              </label>
              <input
                type="number"
                min={0}
                value={queryPool}
                onChange={(e) => setQueryPool(e.target.value)}
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted font-sans"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="text-xs font-semibold bg-ladder-green text-background px-6 py-2 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
              >
                {creating ? "Creating…" : "Provision team"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Teams list ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Teams
            </span>
            <span className="text-[10px] text-muted">{teams.length} total</span>
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3">Team</th>
                  <th className="text-left p-3">Owner</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Seats</th>
                  <th className="text-right p-3">Overage</th>
                  <th className="text-right p-3">Pool</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted font-sans">
                      {loading ? "Loading…" : "No teams yet."}
                    </td>
                  </tr>
                ) : (
                  teams.map((t) => {
                    const editing = editingId === t.id;
                    return (
                      <Fragment key={t.id}>
                        <tr className="border-b border-[#222] hover:bg-[#222]">
                          <td className="p-3">
                            <div className="text-foreground">{t.name}</div>
                            <div className="text-[10px] text-muted tabular-nums">{t.id}</div>
                          </td>
                          <td className="p-3 text-muted">
                            {t.ownerEmail || <span className="text-[#555]">—</span>}
                          </td>
                          <td className="p-3">
                            <StatusChip status={t.status} />
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            <span className="text-foreground">
                              {t.billing.active}
                            </span>
                            <span className="text-muted"> / {t.seatCap}</span>
                            {t.billing.paused > 0 && (
                              <div className="text-[9px] text-muted">
                                {t.billing.paused} paused
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {t.billing.overageSeats > 0 ? (
                              <span className="text-ladder-orange">
                                +{t.billing.overageSeats} = {fmtMoney(t.billing.overagePrice)}/mo
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right tabular-nums text-muted">
                            {t.queryPool.toLocaleString()}
                          </td>
                          <td className="p-3 text-muted">{fmtDate(t.createdAt)}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => (editing ? cancelEdit() : startEdit(t))}
                              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                            >
                              {editing ? "Cancel" : "Edit"}
                            </button>
                          </td>
                        </tr>
                        {editing && editFields && (
                          <tr className="border-b border-[#222] bg-[#161616]">
                            <td colSpan={8} className="p-5">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                                    Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editFields.name}
                                    onChange={(e) =>
                                      setEditFields({
                                        ...editFields,
                                        name: e.target.value,
                                      })
                                    }
                                    className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted font-sans"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={editFields.status}
                                    onChange={(e) =>
                                      setEditFields({
                                        ...editFields,
                                        status: e.target.value as TeamSummary["status"],
                                      })
                                    }
                                    className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted"
                                  >
                                    <option value="active">active</option>
                                    <option value="paused">paused</option>
                                    <option value="archived">archived</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                                    Included seats
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={editFields.seatCap}
                                    onChange={(e) =>
                                      setEditFields({
                                        ...editFields,
                                        seatCap: e.target.value,
                                      })
                                    }
                                    className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted font-sans"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                                    Overage / seat / mo
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={editFields.overagePrice}
                                    onChange={(e) =>
                                      setEditFields({
                                        ...editFields,
                                        overagePrice: e.target.value,
                                      })
                                    }
                                    className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted font-sans"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
                                    Pooled queries / mo
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={editFields.queryPool}
                                    onChange={(e) =>
                                      setEditFields({
                                        ...editFields,
                                        queryPool: e.target.value,
                                      })
                                    }
                                    className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted font-sans"
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <button
                                    onClick={() => saveEdit(t.id)}
                                    disabled={savingId === t.id}
                                    className="text-xs font-semibold bg-ladder-green text-background px-4 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
                                  >
                                    {savingId === t.id ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
