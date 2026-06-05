"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewAs } from "@/lib/dev/view-as";
import { viewAsUsageData } from "@/lib/dev/dashboard-fixtures";
import { Skeleton } from "@/components/Skeleton";

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

export type UsageData = {
  tier: "free" | "pro" | "team" | "pulse";
  monthlyUsed: number;
  monthlyLimit: number | null;
  /** Hard ceiling (2x soft) — past this scoring is blocked. */
  monthlyHardCap: number | null;
  lifetimeUsed: number;
  lifetimeLimit: number | null;
  daysUntilReset: number;
};

export function UsageMeter() {
  const viewAs = useViewAs();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dev "view as" override: render fixture usage for the previewed role.
    if (viewAs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(viewAsUsageData(viewAs));
      setLoading(false);
      return;
    }
    fetch("/api/usage/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [viewAs]);

  if (loading) {
    // Mirror the loaded box (header + usage line + bar + footer line) so its
    // height matches and the sidebar doesn't shift when data arrives. The
    // "Usage" heading is the same across tiers, so keep it real.
    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h3 className="text-sm text-foreground font-sans font-semibold">
            Usage
          </h3>
          <Skeleton className="h-2.5 w-12" />
        </div>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2.5 w-14" />
        </div>
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-2.5 w-24 mt-2" />
      </div>
    );
  }
  if (!data) return null;

  // Free tier: free-score count + a persistent upgrade CTA (moved here from
  // the old top strip).
  if (data.tier === "free" && data.lifetimeLimit !== null) {
    const remaining = Math.max(0, data.lifetimeLimit - data.lifetimeUsed);
    const pct = Math.min(100, (data.lifetimeUsed / data.lifetimeLimit) * 100);
    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h3 className="text-sm text-foreground font-sans font-semibold">Usage</h3>
          <span className="text-[10px] text-muted uppercase tracking-widest">Free</span>
        </div>
        <p className="text-xs text-muted font-sans mb-4">
          <span className="tabular-nums">{remaining}</span> of{" "}
          {data.lifetimeLimit} free scores left
        </p>
        <div className="h-1.5 bg-[#0e0e0e]">
          <div
            className="h-full bg-ladder-green transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Link
          href="/pricing"
          className="inline-block mt-3 text-[10px] uppercase tracking-widest font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
        >
          Upgrade to Pro →
        </Link>
      </div>
    );
  }

  // Pulse skips this meter (queries are tracked separately).
  if (data.tier === "pulse") return null;

  // Pro / Team: monthly view. We surface only the pool the customer bought
  // (the soft cap). The 2x hard cap stays a silent server-side grace backstop
  // and is never shown as a number — putting it on screen made the pool look
  // fake and killed the upgrade trigger (#227).
  if (data.monthlyLimit === null) return null;
  const used = data.monthlyUsed;
  const limit = data.monthlyLimit;
  const pct = Math.min(100, (used / limit) * 100);
  const atCap = used >= limit;
  // Disclose the grace period from the halfway mark — a quiet footnote, no
  // numbers — so customers know going over won't hard-stop them mid-work.
  const showGraceNote = used / limit >= 0.5;
  const tierLabel = data.tier === "pro" ? "Pro" : "Team pool";
  const barClass = atCap ? "bg-amber-400" : "bg-ladder-green";

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
          <span className="tabular-nums">{used.toLocaleString()}</span> of{" "}
          {limit.toLocaleString()} scores this month
        </p>
        <span className="text-[10px] text-muted font-mono">
          Resets in {data.daysUntilReset}d
        </span>
      </div>
      <div className="h-1.5 bg-[#0e0e0e]">
        <div
          className={`h-full ${barClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atCap ? (
        <p className="text-[11px] text-muted mt-3">
          Pool limit reached — you&apos;re in a grace period.{" "}
          <a
            href="mailto:hello@drawbackwards.com?subject=Ladder%20Team%20more%20capacity"
            className="text-ladder-green hover:underline"
          >
            Reach out to add capacity
          </a>
          .
        </p>
      ) : showGraceNote ? (
        <p className="text-[10px] text-muted mt-2 font-mono">
          Includes a short grace period past your pool.
        </p>
      ) : null}
    </div>
  );
}
