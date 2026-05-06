"use client";

import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import type { Tier } from "@/lib/plans";

/**
 * First-time team setup prompt on the main dashboard. Shown when a user
 * is on the team or pulse tier but hasn't created or joined a Clerk Org
 * yet — i.e. they were comped or otherwise marked as a team customer
 * but never built the actual team. Hidden once they have an active org
 * (the dashboard's TeamCard takes over from there).
 */
export function TeamSetupBanner({ tier }: { tier: Tier }) {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) return null;
  if (organization) return null;
  if (tier !== "team" && tier !== "pulse") return null;

  return (
    <div className="border border-ladder-green/40 bg-ladder-green/5 p-6 mb-6">
      <div className="flex items-start gap-5 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <p className="text-[10px] text-ladder-green uppercase tracking-widest font-semibold mb-2">
            Team leader
          </p>
          <h3 className="text-base text-foreground font-sans font-semibold mb-2">
            Set up your team
          </h3>
          <p className="text-sm text-muted font-sans leading-relaxed">
            You&apos;re set up to lead a team on Ladder. Create your team to invite
            your designers, see their scores and letter grades, and unlock manager
            insights. Designers you invite get team-tier access automatically.
          </p>
        </div>
        <Link
          href="/dashboard/team"
          className="text-xs font-semibold bg-ladder-green text-background px-5 py-2.5 rounded-sm hover:bg-ladder-green/90 transition-colors flex-shrink-0"
        >
          Create your team →
        </Link>
      </div>
    </div>
  );
}
