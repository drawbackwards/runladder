"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";

type TeamClient = {
  id: string;
  name: string;
  membersCount: number;
  status: "active" | "suspended";
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

function ProvisionForm({ onDone }: { onDone: () => void }) {
  const [orgName, setOrgName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: orgName.trim(),
          leadFirstName: firstName.trim(),
          leadLastName: lastName.trim(),
          leadEmail: email.trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Provision failed (${res.status})`);
      setOk(`Created “${orgName.trim()}” and invited ${email.trim()} as Team Lead.`);
      setOrgName("");
      setFirstName("");
      setLastName("");
      setEmail("");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Provision failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-[#333] bg-[#1e1e1e] p-4 mb-3">
      <div className="text-[10px] uppercase tracking-widest text-muted mb-3">
        Provision a Team client
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
            Organization name
          </label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Inc."
            className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
            Team Lead email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lead@acme.com"
            className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
            Team Lead first name
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">
            Team Lead last name
          </label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
          />
        </div>
      </div>
      {err && (
        <p className="mt-3 text-xs text-ladder-red font-sans">{err}</p>
      )}
      {ok && (
        <p className="mt-3 text-xs text-ladder-green font-sans">{ok}</p>
      )}
      <div className="mt-3">
        <button
          type="submit"
          disabled={busy}
          className="text-xs font-semibold bg-ladder-green text-background px-4 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
        >
          {busy ? "Provisioning…" : "Create org + invite Lead"}
        </button>
      </div>
    </form>
  );
}

export default function ManageClientsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [teamClients, setTeamClients] = useState<TeamClient[]>([]);
  const [proClients, setProClients] = useState<ProClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrg, setBusyOrg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients");
      if (res.status === 403) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
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

  async function deleteOrg(orgId: string, name: string) {
    const typed = window.prompt(
      `This permanently deletes “${name}” and removes all members. Type the org name to confirm:`,
    );
    if (typed === null) return;
    setBusyOrg(orgId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${orgId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: typed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyOrg(null);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (authorized === false) {
    return (
      <div className="pt-20 max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-xl font-bold font-sans mb-3">Admin access required</h1>
        <p className="text-sm text-muted font-sans">
          Your Clerk account is signed in but not on the admin allowlist. If this
          is a mistake, check <code className="text-foreground">ADMIN_EMAILS</code>{" "}
          in runladder&apos;s Vercel env vars.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl text-foreground font-sans">Manage Clients</h1>
            <p className="text-xs text-muted font-sans mt-1">
              Team orgs (provisioned) and Pro subscribers
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs font-semibold border border-ladder-green text-ladder-green px-4 py-1.5 rounded-sm hover:bg-ladder-green/10 transition-colors"
            >
              Admin
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

          <ProvisionForm onDone={refresh} />

          <div className="border border-[#333] bg-[#1e1e1e]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3">Org</th>
                  <th className="text-left p-3">Team Lead</th>
                  <th className="text-right p-3">Members</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-right p-3">Actions</th>
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
                        <td className="p-3 text-muted">{leadLabel}</td>
                        <td className="p-3 text-right tabular-nums text-muted">
                          {c.membersCount}
                        </td>
                        <td className="p-3">
                          {c.status === "suspended" ? (
                            <span className="text-ladder-orange">Suspended</span>
                          ) : (
                            <span className="text-ladder-green">Active</span>
                          )}
                        </td>
                        <td className="p-3 text-muted">{fmtDate(c.createdAt)}</td>
                        <td className="p-3 text-right whitespace-nowrap">
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
                                onClick={() => deleteOrg(c.id, c.name)}
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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-left p-3">Since</th>
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
      </div>
    </div>
  );
}
