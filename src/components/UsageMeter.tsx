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

  // Pro / Team: monthly view
  if (data.monthlyLimit === null) return null;
  const used = data.monthlyUsed;
  const limit = data.monthlyLimit;
  const hardCap = data.monthlyHardCap ?? limit * 2;
  // The bar's full width represents the hard cap (the wall), with a
  // tick marker at the soft cap. That way the user can SEE the gap
  // between "we should talk" (soft) and "we have to stop" (hard).
  const pct = Math.min(100, (used / hardCap) * 100);
  const softTickPct = (limit / hardCap) * 100; // typically 50% with 2x multiplier
  const blocked = used >= hardCap;
  const over = used > limit;
  const warn = !over && used / limit >= 0.8;
  const tierLabel = data.tier === "pro" ? "Pro" : "Team pool";

  // Bar color shifts at 80% of soft (amber) and ≥100% of soft (red).
  const barClass = blocked
    ? "bg-red-500"
    : over
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
          <span className="tabular-nums">{used.toLocaleString()}</span> of{" "}
          {limit.toLocaleString()} scores this month
        </p>
        <span className="text-[10px] text-muted font-mono">
          Resets in {data.daysUntilReset}d
        </span>
      </div>
      {/* Bar normalized to the hard cap; the tick at softTickPct marks
          the soft cap so the user can see where "talk to us" begins
          and where "scoring stops" lives. */}
      <div className="relative h-1.5 bg-[#0e0e0e]">
        <div
          className={`h-full ${barClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-[-2px] bottom-[-2px] w-px bg-[#555]"
          style={{ left: `${softTickPct}%` }}
          title={`Soft cap: ${limit.toLocaleString()}`}
        />
      </div>
      <p className="text-[10px] text-muted mt-1 font-mono">
        Hard cap at {hardCap.toLocaleString()}
      </p>
      {blocked ? (
        <p className="text-[11px] text-red-400 mt-3">
          Scoring paused — you&apos;re past 2x your monthly cap.{" "}
          <a
            href="mailto:hello@drawbackwards.com?subject=Ladder%20hard-cap%20reached"
            className="underline"
          >
            Email us to lift the ceiling
          </a>
          .
        </p>
      ) : over ? (
        <p className="text-[11px] text-muted mt-3">
          You&apos;ve passed your monthly cap. Still scoring through to {hardCap.toLocaleString()} —{" "}
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
