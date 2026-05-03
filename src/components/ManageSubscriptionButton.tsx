"use client";

import { useState } from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
};

/** Opens the Stripe Customer Portal for the signed-in user. */
export function ManageSubscriptionButton({ className, children }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't open billing portal.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portal failed.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className={className}
      >
        {loading ? "Opening…" : children}
      </button>
      {error && (
        <p className="text-xs text-ladder-red font-mono mt-2">{error}</p>
      )}
    </>
  );
}
