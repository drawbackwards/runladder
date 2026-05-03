"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";

type CompUser = {
  userId: string;
  email: string;
  name: string | null;
  tier: "free" | "pro" | "team" | "pulse";
  reason: string;
  grantedAt: number;
  expiresAt?: number;
  expired: boolean;
};

const TIERS = ["pro", "team", "pulse"] as const;

function fmtDate(ms: number | undefined | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(ms: number | undefined): string {
  if (!ms) return "never";
  const diff = ms - Date.now();
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return "<1d";
  if (days < 30) return `in ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `in ${months}mo`;
  return `in ${Math.floor(months / 12)}y`;
}

export default function CompsAdminPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [comps, setComps] = useState<CompUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("pro");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>(""); // YYYY-MM-DD or empty
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const [busyUser, setBusyUser] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/comps");
      if (res.status === 403) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const json = (await res.json()) as { comps: CompUser[] };
      setComps(json.comps || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSignedIn) return;
    refresh();
  }, [isSignedIn]);

  async function submitGrant() {
    setSubmitting(true);
    setFormMsg(null);
    try {
      const expiresMs = expiresAt
        ? new Date(expiresAt + "T23:59:59").getTime()
        : undefined;
      const res = await fetch("/api/admin/comps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier, reason, expiresAt: expiresMs }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Failed (${res.status})`);
      setFormMsg(`Comped ${email} → ${tier.toUpperCase()}.`);
      setEmail("");
      setReason("");
      setExpiresAt("");
      await refresh();
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : "Grant failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(userId: string, email: string) {
    if (!confirm(`Revoke complimentary access for ${email}?`)) return;
    setBusyUser(userId);
    try {
      const res = await fetch("/api/admin/comps", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Revoke failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusyUser(null);
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

  const formValid = email.trim() && reason.trim();

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl text-foreground font-sans">Complimentary access</h1>
            <p className="text-xs text-muted font-sans mt-1">
              Grant Pro, Team, or Pulse without a Stripe charge — partners,
              friends, customers in flight.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              ← Admin
            </Link>
            <button
              onClick={refresh}
              disabled={loading}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {err}
          </div>
        )}

        {/* ── Grant form ─────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Grant a comp
            </span>
            <span className="text-[10px] text-muted">
              User must already have a Ladder account
            </span>
          </div>

          <div className="border border-[#333] bg-[#1e1e1e] p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="someone@example.com"
                  className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">
                  Tier
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])}
                  className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted"
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">
                  Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder='e.g. "Lumin partner", "Friend of Drawbackwards"'
                  className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
                />
                <p className="text-[10px] text-muted font-sans mt-1.5">
                  Shown to the user on their dashboard. Capture context — future-you will
                  want to know why this comp exists.
                </p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">
                  Expires (optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted font-sans"
                />
                <p className="text-[10px] text-muted font-sans mt-1.5">
                  Leave blank for indefinite. After this date, the user is treated
                  as Free across every Ladder surface.
                </p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={submitGrant}
                  disabled={submitting || !formValid}
                  className="w-full text-xs font-semibold uppercase tracking-widest bg-ladder-green text-background px-4 py-3 hover:bg-ladder-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Granting…" : "Grant comp"}
                </button>
              </div>
            </div>
            {formMsg && (
              <p
                className={`text-xs font-sans mt-4 ${
                  formMsg.startsWith("Comped") ? "text-ladder-green" : "text-ladder-red"
                }`}
              >
                {formMsg}
              </p>
            )}
          </div>
        </section>

        {/* ── Active comps ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Active comps
            </span>
            <span className="text-[10px] text-muted">
              {comps.length} total
              {comps.some((c) => c.expired) &&
                ` · ${comps.filter((c) => c.expired).length} expired`}
            </span>
          </div>

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">Granted</th>
                  <th className="text-left p-3">Expires</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {comps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted font-sans">
                      No comps yet.
                    </td>
                  </tr>
                ) : (
                  comps.map((c) => {
                    const expRel = fmtRelative(c.expiresAt);
                    const expClass = c.expired
                      ? "text-ladder-red"
                      : c.expiresAt
                        ? "text-ladder-orange"
                        : "text-muted";
                    return (
                      <tr
                        key={c.userId}
                        className={`border-b border-[#222] last:border-0 hover:bg-[#222] ${
                          c.expired ? "opacity-60" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="text-foreground">{c.email}</div>
                          {c.name && (
                            <div className="text-[10px] text-muted font-sans">
                              {c.name}
                            </div>
                          )}
                        </td>
                        <td className="p-3 uppercase tracking-widest text-[10px] text-ladder-green">
                          {c.tier}
                        </td>
                        <td className="p-3 text-muted font-sans max-w-xs truncate" title={c.reason}>
                          {c.reason || "—"}
                        </td>
                        <td className="p-3 text-muted">{fmtDate(c.grantedAt)}</td>
                        <td className={`p-3 tabular-nums ${expClass}`}>
                          {c.expiresAt ? (
                            <>
                              {fmtDate(c.expiresAt)}
                              <span className="text-[10px] block">{expRel}</span>
                            </>
                          ) : (
                            <span className="text-muted">indefinite</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => revoke(c.userId, c.email)}
                            disabled={busyUser === c.userId}
                            className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors disabled:opacity-40"
                          >
                            Revoke
                          </button>
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
