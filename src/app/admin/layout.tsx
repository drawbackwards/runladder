"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { TabButton } from "@/components/Tabs";

/**
 * Shared shell for every /admin/* route (#231). Owns the page header, the
 * platform-admin gate (via `/api/admin/status`), and the tab bar that replaces
 * the old top-of-page button nav. Sub-pages render only their section content;
 * the wrapper, auth panel, and tabs all live here.
 */

const TABS = [
  { label: "Clients", href: "/admin/clients" },
  { label: "Evaluations", href: "/admin/evaluations" },
  { label: "Feedback", href: "/admin/feedback" },
  { label: "Comps", href: "/admin/comps" },
  { label: "Beta Codes", href: "/admin/beta-codes" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname() ?? "";
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
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
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (authorized === false) {
    return (
      <div className="pt-20 max-w-2xl mx-auto px-6 py-20 font-mono">
        <h1 className="text-xl font-bold font-sans mb-3">
          Admin access required
        </h1>
        <p className="text-sm text-muted font-sans">
          Your Clerk account is signed in but not on the admin allowlist. If
          this is a mistake, check{" "}
          <code className="text-foreground">ADMIN_EMAILS</code> in
          runladder&apos;s Vercel env vars.
        </p>
      </div>
    );
  }

  // While auth is still resolving, render the shell with no content so the
  // page doesn't flash either state.
  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-xl text-foreground font-sans">Admin</h1>
        </div>
        <div className="border-b border-[#2a2a2a] flex items-center gap-2 mb-8 overflow-x-auto">
          {TABS.map((t) => (
            <TabButton
              key={t.href}
              label={t.label}
              href={t.href}
              active={pathname.startsWith(t.href)}
            />
          ))}
        </div>
        {authorized === null ? null : children}
      </div>
    </div>
  );
}
