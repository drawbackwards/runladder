"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";

type Membership = {
  userId: string;
  role: "admin" | "member";
  status: "active" | "paused" | "archived";
  joinedAt: number;
  invitedBy?: string;
};

type MemberWithUser = Membership & {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type Invite = {
  token: string;
  teamId: string;
  email: string;
  role: "admin" | "member";
  invitedBy: string;
  createdAt: number;
  expiresAt: number;
};

type BillingSummary = {
  active: number;
  paused: number;
  archived: number;
  included: number;
  overageSeats: number;
  overagePrice: number;
};

type ActivityEvent = {
  type: "score";
  timestamp: number;
  userId: string;
  scoreId: string;
  score: number;
  label: string;
  screenName?: string;
  source: string;
  thumbnail?: string;
  scorerName: string | null;
};

type TeamData = {
  team: {
    id: string;
    name: string;
    status: "active" | "paused" | "archived";
    seatCap: number;
    perOverageSeatPrice: number;
    queryPool: number;
    createdAt: number;
  };
  membership: Membership;
  members: MemberWithUser[];
  invites: Invite[];
  billing: BillingSummary;
  usage: number;
  activity: ActivityEvent[];
};

function fmtDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

function StatusChip({ status }: { status: Membership["status"] }) {
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

function RoleChip({ role }: { role: Membership["role"] }) {
  const cls =
    role === "admin"
      ? "text-ladder-green border-ladder-green/40 bg-ladder-green/5"
      : "text-muted border-[#333] bg-[#1a1a1a]";
  return (
    <span
      className={`inline-block text-[9px] uppercase tracking-widest border px-2 py-0.5 ${cls}`}
    >
      {role}
    </span>
  );
}

function displayName(m: MemberWithUser): string {
  const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return full || m.email || m.userId;
}

export default function TeamDashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  // Per-member busy state
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team");
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to load team (${res.status})`);
      }
      const json = (await res.json()) as TeamData;
      setData(json);
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

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Invite failed (${res.status})`);
      setInviteEmail("");
      setInviteRole("member");
      setInviteMsg(`Invite sent to ${json.invite.email}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function patchMember(
    userId: string,
    patch: { status?: Membership["status"]; role?: Membership["role"] },
  ) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Update failed (${res.status})`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the team? Their score history stays in their personal dashboard.")) {
      return;
    }
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Remove failed (${res.status})`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(token: string) {
    if (!confirm("Revoke this invite? The link will stop working.")) return;
    setBusyId(token);
    setError(null);
    try {
      const res = await fetch(`/api/team/invites/${token}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Revoke failed (${res.status})`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (notFound) {
    return (
      <div className="pt-32 max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">No team yet</h1>
        <p className="text-sm text-body font-sans mb-8">
          You aren&rsquo;t a member of a Ladder Teams account. If your organization
          should have one, contact us so we can set it up.
        </p>
        <Link
          href="/teams"
          className="inline-block bg-ladder-green text-background font-semibold px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors text-sm"
        >
          Learn about Teams
        </Link>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="pt-32 max-w-6xl mx-auto px-6 py-20 text-center text-muted font-sans text-sm">
        Loading…
      </div>
    );
  }

  const isAdmin = data.membership.role === "admin";
  const billing = data.billing;
  const usagePercent = data.team.queryPool
    ? Math.min(100, Math.round((data.usage / data.team.queryPool) * 100))
    : 0;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-8 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">
              Team
            </p>
            <h1 className="text-2xl text-foreground font-sans">{data.team.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              ← My dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {error}
          </div>
        )}

        {/* ── Stat tiles ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-12">
          <div className="border border-[#333] bg-[#1e1e1e] p-4">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Active seats
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {billing.active}
              <span className="text-muted text-base"> / {billing.included}</span>
            </p>
            {billing.paused > 0 && (
              <p className="text-[10px] text-muted mt-1">
                {billing.paused} paused
              </p>
            )}
          </div>
          <div className="border border-[#333] bg-[#1e1e1e] p-4">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Overage
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{
                color: billing.overageSeats > 0 ? "#f97316" : "#444",
              }}
            >
              {billing.overageSeats > 0
                ? `$${billing.overagePrice.toLocaleString()}`
                : "$0"}
            </p>
            <p className="text-[10px] text-muted mt-1">
              {billing.overageSeats > 0
                ? `+${billing.overageSeats} seat${billing.overageSeats === 1 ? "" : "s"} / mo`
                : "Within plan"}
            </p>
          </div>
          <div className="border border-[#333] bg-[#1e1e1e] p-4">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Pool used
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {data.usage.toLocaleString()}
              <span className="text-muted text-base">
                {" "}
                / {data.team.queryPool.toLocaleString()}
              </span>
            </p>
            <p className="text-[10px] text-muted mt-1">
              {usagePercent}% this month
            </p>
          </div>
          <div className="border border-[#333] bg-[#1e1e1e] p-4">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Members
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {data.members.length}
            </p>
            <p className="text-[10px] text-muted mt-1">
              {data.invites.length > 0
                ? `${data.invites.length} pending invite${data.invites.length === 1 ? "" : "s"}`
                : "All accepted"}
            </p>
          </div>
        </div>

        {/* ── Activity feed ──────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Activity
            </span>
            <Link
              href="/score"
              className="text-[10px] uppercase tracking-widest text-ladder-green hover:text-ladder-green/80 transition-colors"
            >
              Score a screen →
            </Link>
          </div>
          <div className="border border-[#333] bg-[#1e1e1e]">
            {data.activity.length === 0 ? (
              <div className="p-8 text-center text-muted font-sans text-sm">
                Score activity will appear here as your team scores screens.
              </div>
            ) : (
              data.activity.map((ev) => (
                <Link
                  key={ev.scoreId}
                  href={`/dashboard/scores/${ev.scoreId}`}
                  className="border-b border-[#222] last:border-0 p-4 flex items-center gap-4 hover:bg-[#222] transition-colors"
                >
                  {ev.thumbnail ? (
                    <div className="flex-shrink-0 w-16 h-16 border border-[#333] bg-[#111] overflow-hidden">
                      <img
                        src={ev.thumbnail}
                        alt=""
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-16 border border-[#333] bg-[#111] flex items-center justify-center">
                      <span className="text-[#333] text-xs">—</span>
                    </div>
                  )}
                  <div className="flex-shrink-0 w-14 text-center">
                    <span
                      className="text-xl font-bold tabular-nums"
                      style={{ color: getScoreColor(ev.score) }}
                    >
                      {ev.score.toFixed(1)}
                    </span>
                    <span
                      className="block text-[9px] uppercase tracking-widest mt-0.5"
                      style={{ color: getScoreColor(ev.score) }}
                    >
                      {ev.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-sans truncate">
                      {ev.screenName || ev.source}
                    </p>
                    <p className="text-[10px] text-muted mt-1">
                      {ev.scorerName || "Team member"} · {ev.source} ·{" "}
                      {timeAgo(ev.timestamp)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* ── Invite (admin only) ────────────────────────────────── */}
        {isAdmin && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted uppercase tracking-widest">
                Invite a designer
              </span>
            </div>
            <form
              onSubmit={sendInvite}
              className="border border-[#333] bg-[#1e1e1e] p-4 grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3"
            >
              <input
                type="email"
                required
                placeholder="designer@yourcompany.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="text-xs font-semibold bg-ladder-green text-background px-6 py-2 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
              >
                {inviting ? "Sending…" : "Send invite"}
              </button>
            </form>
            {inviteMsg && (
              <p className="text-[11px] text-ladder-green mt-2 font-sans">{inviteMsg}</p>
            )}
          </section>
        )}

        {/* ── Pending invites (admin only) ───────────────────────── */}
        {isAdmin && data.invites.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted uppercase tracking-widest">
                Pending invites
              </span>
              <span className="text-[10px] text-muted">{data.invites.length}</span>
            </div>
            <div className="border border-[#333] bg-[#1e1e1e]">
              {data.invites.map((inv) => (
                <div
                  key={inv.token}
                  className="border-b border-[#222] last:border-0 p-4 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-sans truncate">
                      {inv.email}
                    </p>
                    <p className="text-[10px] text-muted mt-1">
                      <RoleChip role={inv.role} /> · sent {fmtDate(inv.createdAt)} · expires {fmtDate(inv.expiresAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeInvite(inv.token)}
                    disabled={busyId === inv.token}
                    className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Members ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Members
            </span>
            <span className="text-[10px] text-muted">
              {data.members.length} member{data.members.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="border border-[#333] bg-[#1e1e1e]">
            {data.members.length === 0 ? (
              <div className="p-6 text-center text-muted font-sans text-sm">
                No members yet.
              </div>
            ) : (
              data.members.map((m) => {
                const isMe = m.userId === data.membership.userId;
                return (
                  <div
                    key={m.userId}
                    className="border-b border-[#222] last:border-0 p-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-sans truncate">
                        {displayName(m)}
                        {isMe && (
                          <span className="text-[10px] text-muted ml-2">(you)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <RoleChip role={m.role} />
                        <StatusChip status={m.status} />
                        {m.email && (
                          <span className="text-[10px] text-muted">{m.email}</span>
                        )}
                        <span className="text-[10px] text-muted">
                          · joined {fmtDate(m.joinedAt)}
                        </span>
                      </div>
                    </div>

                    {isAdmin && !isMe && (
                      <div className="flex items-center gap-3">
                        {m.status === "active" && (
                          <>
                            <button
                              onClick={() =>
                                patchMember(m.userId, { status: "paused" })
                              }
                              disabled={busyId === m.userId}
                              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                            >
                              Pause
                            </button>
                            {m.role === "member" ? (
                              <button
                                onClick={() => patchMember(m.userId, { role: "admin" })}
                                disabled={busyId === m.userId}
                                className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                              >
                                Make admin
                              </button>
                            ) : (
                              <button
                                onClick={() => patchMember(m.userId, { role: "member" })}
                                disabled={busyId === m.userId}
                                className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                              >
                                Demote
                              </button>
                            )}
                          </>
                        )}
                        {m.status === "paused" && (
                          <button
                            onClick={() => patchMember(m.userId, { status: "active" })}
                            disabled={busyId === m.userId}
                            className="text-[10px] uppercase tracking-widest text-ladder-green hover:text-ladder-green/80 transition-colors disabled:opacity-40"
                          >
                            Reactivate
                          </button>
                        )}
                        {m.status !== "archived" && (
                          <button
                            onClick={() =>
                              patchMember(m.userId, { status: "archived" })
                            }
                            disabled={busyId === m.userId}
                            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => removeMember(m.userId)}
                          disabled={busyId === m.userId}
                          className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
