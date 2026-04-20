"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";

type InviteRecord = {
  code: string;
  tier: string;
  email: string | null;
  claimed: boolean;
  claimedBy: string | null;
  claimedAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
};

type UserRecord = {
  userId: string;
  email: string;
  tier: string;
  joinedAt: string | null;
  lastLoginAt: string | null;
  inviteCode: string | null;
  xp: number;
  usageThisMonth: number;
};

const TIERS = ["beta", "free", "paid"] as const;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Human relative time until the given ISO date.
 * Returns "—" if missing, "expired" if past, "in 5 days" / "in 3 hours" etc otherwise.
 */
function fmtExpires(iso: string | null | undefined): {
  label: string;
  tone: "none" | "ok" | "soon" | "past";
} {
  if (!iso) return { label: "never", tone: "none" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { label: "—", tone: "none" };
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return { label: "expired", tone: "past" };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { label: `in ${mins}m`, tone: "soon" };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { label: `in ${hours}h`, tone: "soon" };
  const days = Math.floor(hours / 24);
  const tone: "ok" | "soon" = days < 3 ? "soon" : "ok";
  return { label: `in ${days}d`, tone };
}

export default function AdminPage() {
  const { isSignedIn, isLoaded } = useAuth();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [genCount, setGenCount] = useState(1);
  const [genTier, setGenTier] = useState<(typeof TIERS)[number]>("beta");
  const [generating, setGenerating] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);

  const [busyUser, setBusyUser] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [invRes, usrRes] = await Promise.all([
        fetch("/api/admin/invites"),
        fetch("/api/admin/users"),
      ]);
      if (invRes.status === 403 || usrRes.status === 403) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      if (!invRes.ok) throw new Error(`Invites fetch ${invRes.status}`);
      if (!usrRes.ok) throw new Error(`Users fetch ${usrRes.status}`);
      const invJson = await invRes.json();
      const usrJson = await usrRes.json();
      setInvites(invJson.codes || []);
      setUsers(usrJson.users || []);
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

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: genCount, tier: genTier }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Generate failed (${res.status})`);
      setNewCodes(json.codes || []);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function resetUser(userId: string) {
    if (!confirm("Reset this user's access? Their invite code becomes reusable.")) return;
    setBusyUser(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reset" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Reset failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusyUser(null);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setBusyUser(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyUser(null);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // noop — user can select manually
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (authorized === false) {
    return (
      <div className="pt-20 max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-xl font-bold font-sans mb-3">Admin access required</h1>
        <p className="text-sm text-muted font-sans">
          Your Clerk account is signed in but not on the admin allowlist. If this is a
          mistake, check <code className="text-foreground">ADMIN_EMAILS</code> in runladder&apos;s
          Vercel env vars.
        </p>
      </div>
    );
  }

  const unclaimedInvites = invites.filter((i) => !i.claimed);
  const claimedInvites = invites.filter((i) => i.claimed);

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl text-foreground font-sans">Admin</h1>
            <p className="text-xs text-muted font-sans mt-1">
              Plugin beta — invite codes and users
            </p>
          </div>
          <button
            onClick={refresh}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {error}
          </div>
        )}

        {/* ── Invite codes ───────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Invite codes
            </span>
            <span className="text-[10px] text-muted">
              {unclaimedInvites.length} unclaimed · {claimedInvites.length} claimed
            </span>
          </div>

          <div className="border border-[#333] bg-[#1e1e1e] p-4 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-muted font-sans">Count</label>
              <input
                type="number"
                min={1}
                max={50}
                value={genCount}
                onChange={(e) => setGenCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                className="bg-[#111] border border-[#333] text-sm w-20 px-2 py-1 text-foreground focus:outline-none focus:border-muted"
              />
              <label className="text-xs text-muted font-sans ml-2">Tier</label>
              <select
                value={genTier}
                onChange={(e) => setGenTier(e.target.value as (typeof TIERS)[number])}
                className="bg-[#111] border border-[#333] text-sm px-2 py-1 text-foreground focus:outline-none focus:border-muted"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                onClick={generate}
                disabled={generating}
                className="ml-auto text-xs font-semibold bg-ladder-green text-background px-4 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
              >
                {generating ? "Generating…" : "Generate"}
              </button>
            </div>
            {newCodes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
                  Just generated
                </p>
                <div className="flex flex-wrap gap-2">
                  {newCodes.map((c) => (
                    <button
                      key={c}
                      onClick={() => copyCode(c)}
                      className="text-xs bg-[#111] border border-ladder-green/40 text-ladder-green px-2 py-1 tabular-nums hover:bg-ladder-green/10 transition-colors"
                      title="Click to copy"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Claimed by</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted font-sans">
                      No codes yet.
                    </td>
                  </tr>
                ) : (
                  invites.map((inv) => {
                    const expires = inv.claimed
                      ? { label: "claimed", tone: "none" as const }
                      : fmtExpires(inv.expiresAt);
                    const expiresClass =
                      expires.tone === "past"
                        ? "text-ladder-red"
                        : expires.tone === "soon"
                          ? "text-ladder-orange"
                          : "text-muted";
                    return (
                      <tr key={inv.code} className="border-b border-[#222] last:border-0 hover:bg-[#222]">
                        <td className="p-3">
                          <button
                            onClick={() => copyCode(inv.code)}
                            className="tabular-nums text-foreground hover:text-ladder-green transition-colors"
                            title="Click to copy"
                          >
                            {inv.code}
                          </button>
                        </td>
                        <td className="p-3 text-muted uppercase tracking-widest text-[10px]">{inv.tier}</td>
                        <td className="p-3">
                          {inv.claimed ? (
                            <span className="text-muted">Claimed</span>
                          ) : (
                            <span className="text-ladder-green">Open</span>
                          )}
                        </td>
                        <td className="p-3 text-muted">{inv.claimedBy ?? "—"}</td>
                        <td className="p-3 text-muted">{fmtDate(inv.createdAt)}</td>
                        <td className={`p-3 tabular-nums ${expiresClass}`}>{expires.label}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Users ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">Users</span>
            <span className="text-[10px] text-muted">{users.length} total</span>
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="text-left p-3">Last login</th>
                  <th className="text-right p-3">Usage (month)</th>
                  <th className="text-left p-3">Invite</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted font-sans">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.userId} className="border-b border-[#222] last:border-0 hover:bg-[#222]">
                      <td className="p-3 text-foreground">{u.email}</td>
                      <td className="p-3 text-muted uppercase tracking-widest text-[10px]">{u.tier}</td>
                      <td className="p-3 text-muted">{fmtDate(u.joinedAt)}</td>
                      <td className="p-3 text-muted">{fmtDate(u.lastLoginAt)}</td>
                      <td className="p-3 text-right tabular-nums text-muted">{u.usageThisMonth}</td>
                      <td className="p-3 tabular-nums text-muted">{u.inviteCode ?? "—"}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => resetUser(u.userId)}
                          disabled={busyUser === u.userId}
                          className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors mr-3 disabled:opacity-40"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => deleteUser(u.userId)}
                          disabled={busyUser === u.userId}
                          className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
