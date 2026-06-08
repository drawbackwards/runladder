"use client";

import { useState } from "react";
import { useAuth, SignUpButton } from "@clerk/nextjs";

type Props = {
  plan: "pro";
  className?: string;
  children: React.ReactNode;
};

/**
 * Triggers Stripe Checkout for a given plan.
 * Signed-out users get Clerk's modal **sign-up** overlaid on the page (most
 * people clicking Subscribe are new customers; the sign-up modal still offers
 * "Sign in" + Google for returning users). They don't lose their place — after
 * auth they're back on /pricing and the next click goes to Stripe Checkout.
 * (Auto-resuming into checkout after auth is tracked in #316.)
 */
export function SubscribeButton({ plan, className, children }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout. Try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <button type="button" className={className} disabled>
        {children}
      </button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignUpButton
        mode="modal"
        forceRedirectUrl="/pricing"
        signInForceRedirectUrl="/pricing"
      >
        <button type="button" className={className}>
          {children}
        </button>
      </SignUpButton>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className={className}
      >
        {loading ? "Starting checkout…" : children}
      </button>
      {error && (
        <p className="text-xs text-ladder-red font-mono mt-2 text-center">{error}</p>
      )}
    </>
  );
}
