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
    <div className="bg-ladder-green p-8 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-[#0a1a14]/70 font-semibold mb-3">
            Team leader
          </p>
          <h3 className="text-2xl text-[#0a1a14] font-sans font-semibold mb-3 tracking-tight">
            Set up your team
          </h3>
          <p className="text-sm text-[#0a1a14]/80 font-sans leading-relaxed max-w-2xl">
            You&apos;re set up to lead a team on Ladder. Create your team to invite
            your designers, see their scores and letter grades, and unlock manager
            insights. Designers you invite get team-tier access automatically.
          </p>
        </div>
        <Link
          href="/dashboard/team"
          className="text-sm font-semibold bg-white text-[#0a1a14] px-6 py-3.5 hover:bg-white/90 transition-colors flex-shrink-0 whitespace-nowrap justify-self-start md:justify-self-end"
        >
          Create your team →
        </Link>
      </div>
    </div>
  );
}
