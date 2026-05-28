"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";

/**
 * Top-level /admin auth gate. Applies to every admin route (tabbed pages in
 * `(tabbed)/...` AND drill-in sub-pages like `/admin/clients/new` or
 * `/admin/evaluations/new` that live outside the route group). The tab bar
 * and "Admin" header live in `(tabbed)/layout.tsx`, so sub-pages get a clean
 * full-page surface they can compose with their own back link + heading.
 */
export default function AdminAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
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

  // Hold rendering while we resolve admin status so neither a non-admin nor
  // an unauthorized flash appears.
  if (authorized === null) return null;

  return <>{children}</>;
}
