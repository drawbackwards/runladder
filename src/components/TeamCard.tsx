"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useViewAs } from "@/lib/dev/view-as";
import { viewAsTeamData } from "@/lib/dev/dashboard-fixtures";
import { Skeleton } from "@/components/Skeleton";

/**
 * Loading placeholder for TeamCard — same box, eyebrow, and row layout so the
 * card fills into place without shifting the sidebar. Shown while the dashboard
 * data loads for team-tier users.
 */
export function TeamCardSkeleton() {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-5">
      <span className="block text-[9px] text-ladder-green uppercase tracking-widest font-semibold leading-none mb-3">
        Team
      </span>
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-3 w-40 mb-5" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

/**
 * Dashboard sidebar entry point for the team view. Hidden when the user has no
 * active org so non-team users don't see it.
 *
 * Member count comes from /api/dashboard/team (which hides the provisioning
 * service account) rather than Clerk's raw `organization.membersCount`, so
 * the hidden owner is never counted in the client's view.
 *
 * View-as aware: in Dev Mode (Team plan) it renders the previewed role's
 * fixture instead of the real Clerk membership, so the manager-vs-designer
 * label ("Manage team" vs "View team") matches the role being previewed.
 */
export function TeamCard() {
  const { organization, membership, isLoaded } = useOrganization();
  const [memberCount, setMemberCount] = useState<number | null>(null);

  // Dev "view as" override (no-op in production builds).
  const viewAs = useViewAs();
  const fxTeam = viewAs?.plan === "team" ? viewAsTeamData(viewAs) : null;

  const orgId = organization?.id;
  useEffect(() => {
    // Skip the real fetch when previewing a fixture role.
    if (!orgId || fxTeam) return;
    let active = true;
    fetch("/api/dashboard/team")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && Array.isArray(d?.members)) setMemberCount(d.members.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [orgId, fxTeam]);

  // Real users need a loaded org; fixture previews render regardless.
  if (!fxTeam && (!isLoaded || !organization)) return null;

  const isManager = fxTeam
    ? fxTeam.teamData.isManager
    : membership?.role === "org:admin";
  const name = fxTeam ? fxTeam.orgName : organization?.name ?? "";
  const count = fxTeam ? fxTeam.teamData.members.length : memberCount;

  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-5">
      <span className="block text-[9px] text-ladder-green uppercase tracking-widest font-semibold leading-none mb-3">
        Team
      </span>
      <h3 className="text-sm text-foreground font-sans font-semibold mb-1">
        {name}
      </h3>
      <p className="text-xs text-muted font-sans mb-5">
        {count !== null && (
          <>
            {count} member{count !== 1 ? "s" : ""}
            {isManager && " · "}
          </>
        )}
        {isManager && "you manage this team"}
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
