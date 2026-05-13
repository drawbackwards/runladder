"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Clerk's <SignIn> uses hash routing, so the form swaps to its
 * create-account view at /login#/create without a full page nav.
 * The AuthShell footer below the form needs to swap copy to match,
 * otherwise we tell the user "New here? Create an account" while
 * they're already on the create-account view.
 *
 * We watch window.location.hash and flip the footer to point at
 * /login (sign-in view) when Clerk is in create mode.
 */
export function LoginFooter() {
  const [isCreateMode, setIsCreateMode] = useState(false);

  useEffect(() => {
    function check() {
      const hash = window.location.hash || "";
      setIsCreateMode(
        hash.startsWith("#/create") || hash.startsWith("#/sign-up"),
      );
    }
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  if (isCreateMode) {
    return (
      <p>
        Already have an account?{" "}
        <Link
          href="/login"
          replace
          className="text-ladder-green hover:text-ladder-green/80 font-medium"
        >
          Log in
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p>
        New here?{" "}
        <Link
          href="/sign-up"
          className="text-ladder-green hover:text-ladder-green/80 font-medium"
        >
          Create an account
        </Link>
      </p>
      <p className="text-muted text-xs">
        Got an invite from your team? Check your email for the join link.
      </p>
    </div>
  );
}
