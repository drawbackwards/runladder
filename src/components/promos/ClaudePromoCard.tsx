"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";

type Meta = {
  hasToken?: boolean;
  lastUsedAt?: number;
  installedVersion?: string;
  currentVersion?: string;
};

/**
 * Sidebar promo for Ladder for Claude. Status-aware, but install + management
 * (which is more involved) lives on /dashboard/claude.
 *  - Not connected → "Get started"
 *  - Connected     → "Connected" pill + "Manage"
 *
 * "Connected" means the Skill has actually run (lastUsedAt) — not merely that
 * a credential exists — so we never imply the user did something they didn't.
 */
export function ClaudePromoCard() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skill/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMeta(d))
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    // Mirror the loaded card's structure so its height matches and the card
    // below isn't shoved when real content arrives.
    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2.5 w-10" />
        </div>
        <Skeleton className="h-3 w-full mb-1.5" />
        <Skeleton className="h-3 w-3/4 mb-3" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    );
  }

  const connected = !!meta?.hasToken && !!meta?.lastUsedAt;
  const updateAvailable =
    !!meta?.installedVersion &&
    !!meta?.currentVersion &&
    meta.installedVersion !== meta.currentVersion;

  return (
    <Link
      href="/dashboard/claude"
      className="block border border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a] hover:bg-[#1f1f1f] transition-colors p-5 group"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm text-foreground font-sans font-semibold">
          Ladder for Claude
        </h3>
        <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
          {connected ? "Connected" : "New"}
        </span>
      </div>
      <p className="text-xs text-muted font-sans leading-relaxed mb-3">
        Score any screenshot against the Ladder framework, right inside Claude.
      </p>
      {updateAvailable && (
        <p className="text-[11px] text-ladder-green font-sans mb-3">
          Update available — v{meta!.installedVersion} → v{meta!.currentVersion}
        </p>
      )}
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-ladder-green group-hover:gap-2 transition-all">
        {connected ? "Manage" : "Get started"} →
      </span>
    </Link>
  );
}
