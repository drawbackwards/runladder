"use client";

import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";

/**
 * Dashboard sidebar entry point for the team manager view. Hidden when
 * the user has no active org so non-team users don't see it.
 */
export function TeamCard() {
  const { organization, membership, isLoaded } = useOrganization();

  if (!isLoaded || !organization) return null;

  const memberCount = organization.membersCount ?? 0;
  const isManager = membership?.role === "org:admin";

  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-6">
      <div className="mb-3">
        <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
          Team
        </span>
      </div>
      <h3 className="text-sm text-foreground font-sans font-semibold mb-1">
        {organization.name}
      </h3>
      <p className="text-xs text-muted font-sans mb-5">
        {memberCount} member{memberCount !== 1 ? "s" : ""}
        {isManager && " · you manage this team"}
      </p>
      <Link
        href="/dashboard/team"
        className="inline-block text-[11px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold"
      >
        {isManager ? "Manage team →" : "View team →"}
      </Link>
    </div>
  );
}
