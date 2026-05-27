"use client";

import { useEffect, useRef } from "react";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";

/**
 * Activate the user's organization when they're a member of one but no org is
 * the session's *active* org.
 *
 * Before #190, a Team Lead got their org via self-serve `CreateOrganization`,
 * which sets the new org active in the session. #190 switched to admin
 * provisioning via invitation; accepting an invite makes you a member but does
 * NOT set the org active, so `useOrganization()` returns null and the team
 * surfaces can't resolve which team to show. This restores activation for the
 * invite-based flow so the dashboard and team page render the user's team.
 *
 * Activates the first membership — clients only ever belong to one org. (Only
 * internal Drawbackwards staff belong to several; a switcher is a later add.)
 */
export function useEnsureActiveOrg() {
  const { organization } = useOrganization();
  const {
    isLoaded: listLoaded,
    userMemberships,
    setActive,
  } = useOrganizationList({ userMemberships: { infinite: true } });

  const activating = useRef(false);

  useEffect(() => {
    if (!listLoaded || !setActive) return;
    if (organization) return;
    const first = userMemberships?.data?.[0];
    if (!first || activating.current) return;
    activating.current = true;
    setActive({ organization: first.organization.id }).catch(() => {
      // Best-effort; allow a retry on a later render if activation failed.
      activating.current = false;
    });
  }, [listLoaded, setActive, organization, userMemberships?.data]);
}
