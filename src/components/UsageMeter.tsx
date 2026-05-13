"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Score usage meter for /dashboard/settings (and anywhere else we
 * want to surface "where am I against the cap").
 *
 * Fetches `/api/usage/me` and renders a tier-appropriate view:
 *   - Free: lifetime "X of 5" with an upgrade nudge.
 *   - Pro / Team: monthly "X of 2,000 (or 25,000) this month" with a
 *     bar that turns amber at 80% and green-on-dark otherwise.
 *   - Pulse: hidden (Pulse meters queries elsewhere).
 *
 * The bar is informational — there's no hard wall today. Past 100%
 * the bar saturates and the copy shifts to "Need more? Talk to us"
 * with a mailto. We surface, we don't block.
 */

type UsageData = {
  tier: "free" | "pro" | "team" | "pulse";
  monthlyUsed: number;
  monthlyLimit: number | null;
  lifetimeUsed: number;
  lifetimeLimit: number | null;
  daysUntilReset: number;
};

export function UsageMeter() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5 shimmer h-28" />;
  }
  if (!data) return null;

  // Free tier: show lifetime, push upgrade
  if (data.tier === "free" && data.lifetimeLimit !== null) {
    const pct = Math.min(100, (data.lifetimeUsed / data.lifetimeLimit) * 100);
    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h3 className="text-sm text-foreground font-sans font-semibold">Usage</h3>
          <span className="text-[10px] text-muted uppercase tracking-widest">Free</span>
        </div>
        <p className="text-xs text-muted font-sans mb-4">
          {data.lifetimeUsed} of {data.lifetimeLimit} lifetime scores
        </p>
        <div className="h-1.5 bg-[#0e0e0e]">
          <div
            className="h-full bg-ladder-green transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {data.lifetimeUsed >= data.lifetimeLimit && (
          <p className="text-[11px] text-muted mt-3">
            You&apos;ve used all your free scores.{" "}
            <Link href="/pricing" className="text-ladder-green hover:underline">
              Upgrade for more
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  // Pulse skips this meter (queries are tracked separately).
  if (data.tier === "pulse") return null;

  // Pro / Team: monthly view
  if (data.monthlyLimit === null) return null;
  const used = data.monthlyUsed;
  const limit = data.monthlyLimit;
  const pct = Math.min(100, (used / limit) * 100);
  const over = used > limit;
  const warn = !over && pct >= 80;
  const tierLabel = data.tier === "pro" ? "Pro" : "Team pool";

  // Bar color shifts at 80% (amber) and ≥100% (red).
  const barClass = over
    ? "bg-red-400"
    : warn
      ? "bg-amber-400"
      : "bg-ladder-green";

  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm text-foreground font-sans font-semibold">Usage</h3>
        <span className="text-[10px] text-muted uppercase tracking-widest">
          {tierLabel}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="text-xs text-muted font-sans">
          <span className="text-foreground font-semibold">
            {used.toLocaleString()}
          </span>{" "}
          of {limit.toLocaleString()} scores this month
        </p>
        <span className="text-[10px] text-muted font-mono">
          Resets in {data.daysUntilReset}d
        </span>
      </div>
      <div className="h-1.5 bg-[#0e0e0e]">
        <div className={`h-full ${barClass} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {over ? (
        <p className="text-[11px] text-muted mt-3">
          You&apos;ve passed your monthly cap. We won&apos;t block you —{" "}
          <a
            href="mailto:hello@drawbackwards.com?subject=Ladder%20higher%20volume%20inquiry"
            className="text-ladder-green hover:underline"
          >
            talk to us about higher volume
          </a>
          .
        </p>
      ) : warn ? (
        <p className="text-[11px] text-muted mt-3">
          Approaching your monthly cap. If you regularly hit this,{" "}
          <a
            href="mailto:hello@drawbackwards.com?subject=Ladder%20higher%20volume%20inquiry"
            className="text-ladder-green hover:underline"
          >
            we&apos;ll size you up
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
