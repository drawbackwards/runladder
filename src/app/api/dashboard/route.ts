import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import { FREE_LIFETIME_LIMIT, isPaidTier } from "@/lib/plans";
import { getUserSubscription, grantComp } from "@/lib/tier";
import { getUserStats } from "@/lib/scores";
import { isInternalOrg } from "@/lib/orgs";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read the user's org memberships once, then derive two dashboard signals
  // server-side so the client can gate on a single fetch (no client-hook
  // timing flashes):
  //   - `internal`: member of the internal Drawbackwards org (hides the
  //     "Complimentary Team" strip — we built the product).
  //   - `needsTeamSetup`: the user is a Team Lead (org:admin) whose team is
  //     still empty (no pending invites, no joined designer), so they should
  //     see the "Set up your team" prompt. The hidden provisioning service
  //     account and the Lead are both org:admin, so neither counts as an
  //     invited designer.
  let internal = false;
  let needsTeamSetup = false;
  try {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
    });
    internal = memberships.data.some((m) =>
      m.organization ? isInternalOrg(m.organization) : false,
    );

    // For each org the user administers, the team is "set up" once a designer
    // has been invited (pending invite) or joined (org:member). If any admin
    // org is still empty, the Lead needs the setup prompt.
    const adminOrgIds = memberships.data
      .filter((m) => m.role === "org:admin" && m.organization?.id)
      .map((m) => m.organization!.id);
    for (const orgId of adminOrgIds) {
      const [invs, mems] = await Promise.all([
        client.organizations.getOrganizationInvitationList({
          organizationId: orgId,
        }),
        client.organizations.getOrganizationMembershipList({
          organizationId: orgId,
          limit: 100,
        }),
      ]);
      const hasPendingInvite = invs.data.some((i) => i.status === "pending");
      const hasDesigner = mems.data.some((m) => m.role === "org:member");
      if (!hasPendingInvite && !hasDesigner) {
        needsTeamSetup = true;
        break;
      }
    }

    // Self-healing fallback: if the user belongs to any Clerk organization
    // but doesn't yet have a team-tier comp (the webhook missed, the user
    // pre-dates the webhook, or the secret is unconfigured), grant the comp
    // here so the dashboard banner doesn't lie to them. Idempotent.
    const sub = await getUserSubscription(userId);
    if (sub.tier === "free" || (sub.tier !== "team" && !sub.comp)) {
      const firstOrg = memberships.data[0];
      if (firstOrg) {
        await grantComp(userId, {
          tier: "team",
          reason: firstOrg.organization?.name
            ? `Member of ${firstOrg.organization.name}`
            : "Team member",
        });
      }
    }
  } catch {
    // Fallback is best-effort. If Clerk read fails, fall through to the
    // normal subscription read below — the user still gets correct data
    // if their tier was already set.
  }

  const [scores, used, sub, stats] = await Promise.all([
    redis.zrange(`user:${userId}:scores`, 0, -1, { rev: true }),
    redis.get<number>(lifetimeScansKey(userId)),
    getUserSubscription(userId),
    getUserStats(userId),
  ]);

  const parsedScores = (scores as string[]).map((entry) => {
    if (typeof entry === "string") {
      try {
        return JSON.parse(entry);
      } catch {
        return null;
      }
    }
    return entry;
  })
    .filter(Boolean)
    // Soft-deleted scores stay in Redis so team admins keep the audit
    // trail, but the score's owner should never see them on their own
    // dashboard. /api/dashboard/scores DELETE flips deletedAt; this is
    // the read-side filter.
    .filter((s: { deletedAt?: number } | null) => s && !s.deletedAt);

  return NextResponse.json({
    scores: parsedScores,
    stats,
    tier: sub.tier,
    paid: isPaidTier(sub.tier),
    internal,
    needsTeamSetup,
    comp: sub.comp
      ? {
          reason: sub.comp.reason,
          expiresAt: sub.comp.expiresAt ?? null,
        }
      : null,
    usage: {
      used: used ?? 0,
      limit: FREE_LIFETIME_LIMIT,
      lifetime: true,
    },
  });
}
