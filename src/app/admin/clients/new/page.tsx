"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Add Client — provisions a Team org and invites the Team Lead as org:admin.
 * Lives on its own page (linked from the "Add Client" button on
 * /admin/clients). On success we return to the clients list so the new org
 * shows up. The POST is admin-gated server-side; we also gate the page via
 * /api/admin/status so non-admins never see the form.
 */
export default function AddClientPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [orgName, setOrgName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let active = true;
    fetch("/api/admin/status")
      .then((r) => (r.ok ? r.json() : { admin: false }))
      .then((d) => {
        if (active) setAuthorized(d.admin === true);
      })
      .catch(() => {
        if (active) setAuthorized(false);
      });
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
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
      router.push("/admin/clients");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Provision failed");
      setBusy(false);
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
        <div className="mb-8">
          <h1 className="text-xl text-foreground font-sans">Add Client</h1>
          <p className="text-xs text-muted font-sans mt-1">
            Create a Team org and invite the Team Lead
          </p>
        </div>

        <form
          onSubmit={submit}
          className="border border-[#333] bg-[#1e1e1e] p-4"
        >
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
          {err && <p className="mt-3 text-xs text-ladder-red font-sans">{err}</p>}
          <div className="mt-4 flex items-center justify-end gap-4">
            <Link
              href="/admin/clients"
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="text-xs font-semibold bg-ladder-green text-background px-4 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
            >
              {busy ? "Provisioning…" : "Create org + invite Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
