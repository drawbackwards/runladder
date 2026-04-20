"use client";

import { Fragment, useEffect, useState } from "react";
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
  company?: string | null;
  role?: string | null;
};

type UserDetailFields = {
  company: string;
  role: string;
  notes: string;
  instagram: string;
  x: string;
  linkedin: string;
  youtube: string;
};

type ActivityEvent = {
  type: "joined" | "score";
  timestamp: string;
  mode?: string;
  score?: number | null;
  label?: string | null;
  frameName?: string | null;
  hasImage?: boolean;
  via?: string;
  tier?: string;
};

type ErrorEvent = {
  timestamp: string;
  mode?: string;
  message: string;
  statusCode?: number | null;
};

type UserDetail = {
  user: UserRecord & Partial<UserDetailFields>;
  activity: ActivityEvent[];
  errors: ErrorEvent[];
};

const TIERS = ["beta", "free", "paid"] as const;

const EMPTY_FIELDS: UserDetailFields = {
  company: "",
  role: "",
  notes: "",
  instagram: "",
  x: "",
  linkedin: "",
  youtube: "",
};

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
      />
    </div>
  );
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

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

  // User detail drawer state
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [fields, setFields] = useState<UserDetailFields>(EMPTY_FIELDS);
  const [saving, setSaving] = useState(false);

  async function toggleUser(userId: string) {
    if (openUserId === userId) {
      setOpenUserId(null);
      setDetail(null);
      setFields(EMPTY_FIELDS);
      setDetailErr(null);
      return;
    }
    setOpenUserId(userId);
    setDetail(null);
    setDetailLoading(true);
    setDetailErr(null);
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Detail fetch failed (${res.status})`);
      }
      const json = (await res.json()) as UserDetail;
      setDetail(json);
      setFields({
        company: json.user.company ?? "",
        role: json.user.role ?? "",
        notes: (json.user as Partial<UserDetailFields>).notes ?? "",
        instagram: (json.user as Partial<UserDetailFields>).instagram ?? "",
        x: (json.user as Partial<UserDetailFields>).x ?? "",
        linkedin: (json.user as Partial<UserDetailFields>).linkedin ?? "",
        youtube: (json.user as Partial<UserDetailFields>).youtube ?? "",
      });
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveDetail() {
    if (!openUserId) return;
    setSaving(true);
    setDetailErr(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: openUserId, fields }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

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
                  <th className="text-left p-3 w-6"></th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Company</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="text-right p-3">Usage</th>
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
                  users.map((u) => {
                    const open = openUserId === u.userId;
                    return (
                      <Fragment key={u.userId}>
                        <tr
                          className={`border-b border-[#222] hover:bg-[#222] cursor-pointer ${open ? "bg-[#222]" : ""}`}
                          onClick={() => toggleUser(u.userId)}
                        >
                          <td className="p-3 text-muted tabular-nums">{open ? "▾" : "▸"}</td>
                          <td className="p-3 text-foreground">{u.email}</td>
                          <td className="p-3 text-muted">{u.company || "—"}</td>
                          <td className="p-3 text-muted uppercase tracking-widest text-[10px]">{u.tier}</td>
                          <td className="p-3 text-muted">{fmtDate(u.joinedAt)}</td>
                          <td className="p-3 text-right tabular-nums text-muted">{u.usageThisMonth}</td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
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
                        {open && (
                          <tr className="border-b border-[#222] bg-[#161616]">
                            <td colSpan={7} className="p-0">
                              {detailLoading ? (
                                <div className="p-6 text-center text-muted font-sans">Loading…</div>
                              ) : detailErr ? (
                                <div className="p-4 text-ladder-red font-sans">{detailErr}</div>
                              ) : detail ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
                                  {/* ── Contact + notes ── */}
                                  <div className="space-y-3">
                                    <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Contact &amp; notes</div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <LabeledInput label="Company" value={fields.company} onChange={(v) => setFields({ ...fields, company: v })} />
                                      <LabeledInput label="Role" value={fields.role} onChange={(v) => setFields({ ...fields, role: v })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <LabeledInput label="Instagram" value={fields.instagram} onChange={(v) => setFields({ ...fields, instagram: v })} />
                                      <LabeledInput label="X (Twitter)" value={fields.x} onChange={(v) => setFields({ ...fields, x: v })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <LabeledInput label="LinkedIn" value={fields.linkedin} onChange={(v) => setFields({ ...fields, linkedin: v })} />
                                      <LabeledInput label="YouTube" value={fields.youtube} onChange={(v) => setFields({ ...fields, youtube: v })} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">Notes</label>
                                      <textarea
                                        value={fields.notes}
                                        onChange={(e) => setFields({ ...fields, notes: e.target.value })}
                                        rows={6}
                                        placeholder="Sales context, call summaries, anything worth remembering…"
                                        className="w-full bg-[#111] border border-[#333] text-sm text-foreground p-2.5 focus:outline-none focus:border-muted placeholder:text-[#555] resize-y font-sans"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3 pt-2">
                                      <button
                                        onClick={saveDetail}
                                        disabled={saving}
                                        className="text-xs font-semibold bg-ladder-green text-background px-4 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
                                      >
                                        {saving ? "Saving…" : "Save"}
                                      </button>
                                      <button
                                        onClick={() => toggleUser(u.userId)}
                                        className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>

                                  {/* ── Activity + errors ── */}
                                  <div className="space-y-5">
                                    <div>
                                      <div className="text-[10px] uppercase tracking-widest text-muted mb-2">
                                        Activity <span className="text-[#555]">({detail.activity.length})</span>
                                      </div>
                                      <ul className="divide-y divide-[#222] border border-[#222]">
                                        {detail.activity.length === 0 ? (
                                          <li className="p-3 text-muted font-sans">No activity yet.</li>
                                        ) : (
                                          detail.activity.map((ev, i) => (
                                            <li key={i} className="p-2.5 flex items-center gap-3 font-sans">
                                              {ev.type === "joined" ? (
                                                <span className="text-[9px] uppercase tracking-widest text-ladder-green flex-shrink-0">Joined</span>
                                              ) : (
                                                <span className="text-[9px] uppercase tracking-widest text-muted flex-shrink-0 w-14">{ev.mode}</span>
                                              )}
                                              {ev.type === "score" && typeof ev.score === "number" && (
                                                <span className="text-xs tabular-nums text-foreground font-semibold">
                                                  {ev.score.toFixed(1)}
                                                </span>
                                              )}
                                              {ev.type === "score" && ev.frameName && (
                                                <span className="text-xs text-muted truncate flex-1">{ev.frameName}</span>
                                              )}
                                              {ev.type === "joined" && (
                                                <span className="text-xs text-muted flex-1">via {ev.via ?? "invite"}</span>
                                              )}
                                              <span className="text-[10px] text-muted flex-shrink-0">{fmtTime(ev.timestamp)}</span>
                                            </li>
                                          ))
                                        )}
                                      </ul>
                                    </div>

                                    <div>
                                      <div className="text-[10px] uppercase tracking-widest text-muted mb-2">
                                        Errors <span className="text-[#555]">({detail.errors.length})</span>
                                      </div>
                                      <ul className="divide-y divide-[#222] border border-[#222]">
                                        {detail.errors.length === 0 ? (
                                          <li className="p-3 text-muted font-sans">No errors recorded.</li>
                                        ) : (
                                          detail.errors.map((ev, i) => (
                                            <li key={i} className="p-2.5 font-sans">
                                              <div className="flex items-center gap-3">
                                                <span className="text-[9px] uppercase tracking-widest text-ladder-red flex-shrink-0">
                                                  {ev.statusCode ?? "err"}
                                                </span>
                                                {ev.mode && (
                                                  <span className="text-[9px] uppercase tracking-widest text-muted flex-shrink-0">{ev.mode}</span>
                                                )}
                                                <span className="text-[10px] text-muted flex-shrink-0 ml-auto">{fmtTime(ev.timestamp)}</span>
                                              </div>
                                              <div className="text-xs text-muted mt-1 break-words">{ev.message}</div>
                                            </li>
                                          ))
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
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
