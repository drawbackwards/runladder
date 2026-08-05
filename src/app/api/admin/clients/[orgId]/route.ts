import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import { isInternalOrg, orgMeta, orgStatus, provisioningUserId } from "@/lib/orgs";
import { purgeOrgContent } from "@/lib/data-lifecycle";
import { isValidIndustry } from "@/lib/industry-registry";
import { redis, currentYearMonth, zrangeAllChunked } from "@/lib/redis";
import { TEAM_MONTHLY_POOL } from "@/lib/plans";
import { getMonthlyCost, estimateScoreCostMicroUsd } from "@/lib/token-cost";
import { surfaceFromSource, USAGE_SURFACES, type UsageSurface } from "@/lib/surface";

/**
 * Org lifecycle management (#190) + Team Detail read (#397).
 *
 *   GET    /api/admin/clients/:orgId   — Team Detail: org info, member roster,
 *                                        and usage-by-month for the workspace.
 *   PATCH  /api/admin/clients/:orgId   body { action }
 *     - "suspend" | "reactivate"      → toggle publicMetadata.status
 *       (reactivate also clears a termination, cancelling the purge clock)
 *     - "terminate"                   → status "terminated" + terminatedAt;
 *       starts the 30-day #398 purge clock (see /api/cron/data-lifecycle)
 *     - "setIndustry" body { industry } → publicMetadata.industry (#422)
 *     - "markInternal" | "unmarkInternal" → toggle publicMetadata.internal
 *   DELETE /api/admin/clients/:orgId   body { confirmName }
 *     - hard-deletes the org; confirmName must match the org name exactly.
 *       Cascades: purges all member content first (#398) unless the org was
 *       already purged.
 *
 * The internal (Drawbackwards) org can never be suspended or deleted.
 * Gated by getAdminEmail().
 */

function unauthorized() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

/** One persisted score entry from a member's history zset. */
type RawScore = { score?: number; timestamp?: number; source?: string };

/** Empty per-surface tally (#401), all canonical surfaces at zero. */
function emptyBySurface(): Record<UsageSurface, number> {
  return USAGE_SURFACES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<UsageSurface, number>,
  );
}

/** UTC "YYYY-MM" bucket for a score timestamp — same boundary as the counters. */
function yearMonthOf(ts: number): string {
  return currentYearMonth(new Date(ts));
}

type DetailMember = {
  userId: string;
  name: string | null;
  email: string | null;
  /** Clerk role, e.g. "org:admin" (Team Lead) or "org:member". */
  role: string;
  scoresThisMonth: number;
};

type MonthUsage = {
  /** "YYYY-MM". */
  month: string;
  /** Pooled scoring calls across the workspace that month (all surfaces). */
  scores: number;
  /**
   * Surface split of `scores` (#401) — web / figma / skill counts. Reconstructed
   * from each entry's persisted `source`, so it always sums to `scores`.
   */
  scoresBySurface: Record<UsageSurface, number>;
  /** Members with at least one scoring call that month. */
  distinctActiveMembers: number;
  /** Internal COGS: Anthropic token cost this month, in micro-USD (#406). */
  costMicroUsd: number;
  /** Per-category cost breakdown for the popover, micro-USD. */
  costByCategory: Record<string, number>;
  /**
   * True when costMicroUsd is an estimate (score-count × per-score rate) rather
   * than recorded token usage — i.e. a month before cost instrumentation
   * shipped. Estimated months cover the score category only; the UI tags them.
   */
  costEstimated: boolean;
};

/**
 * GET — Team Detail (#397).
 *
 * Usage is reconstructed from each current member's durable score history
 * (`user:{id}:scores`, no TTL), bucketed into UTC months. This is the same
 * event a scoring call increments the monthly counter on, so the numbers line
 * up with the pool meter on the clients list — but unlike the 40-day counter,
 * the history retains full month-by-month totals for billing review.
 *
 * Attribution follows CURRENT membership (same limitation as the pool meter):
 * a departed member's past scores are not counted toward the workspace.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  if (!(await getAdminEmail())) return unauthorized();

  const { orgId } = await params;
  const client = await clerkClient();

  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  const provisioner = provisioningUserId();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });

  // Real members only — the hidden provisioning service account owns the org
  // but is never a real teammate, so it's excluded from the roster and usage.
  const members = memberships.data.filter(
    (m) => m.publicUserData?.userId && m.publicUserData.userId !== provisioner,
  );

  const thisMonth = currentYearMonth();

  // Pull every member's full score history once, in parallel.
  const histories = await Promise.all(
    members.map(async (m) => {
      const userId = m.publicUserData!.userId!;
      let entries: RawScore[] = [];
      try {
        const raw = await zrangeAllChunked<unknown>(
          `user:${userId}:scores`,
        );
        entries = raw.map((e) =>
          typeof e === "string" ? (JSON.parse(e) as RawScore) : (e as RawScore),
        );
      } catch {
        entries = [];
      }
      return { userId, entries };
    }),
  );

  // Roster (member row) + per-month rollup, in one pass over the histories.
  const monthTotals = new Map<
    string,
    { scores: number; active: Set<string>; bySurface: Record<UsageSurface, number> }
  >();
  const roster: DetailMember[] = members.map((m, i) => {
    const userId = m.publicUserData!.userId!;
    const { entries } = histories[i];
    let scoresThisMonth = 0;

    for (const e of entries) {
      if (typeof e.timestamp !== "number") continue;
      const ym = yearMonthOf(e.timestamp);
      const bucket =
        monthTotals.get(ym) ?? { scores: 0, active: new Set(), bySurface: emptyBySurface() };
      bucket.scores += 1;
      bucket.active.add(userId);
      bucket.bySurface[surfaceFromSource(e.source)] += 1;
      monthTotals.set(ym, bucket);
      if (ym === thisMonth) scoresThisMonth += 1;
    }

    const pd = m.publicUserData;
    const name =
      [pd?.firstName, pd?.lastName].filter(Boolean).join(" ") || null;
    return {
      userId,
      name,
      email: pd?.identifier ?? null,
      role: m.role,
      scoresThisMonth,
    };
  });

  // Always surface the current month (even at zero) so it anchors the top.
  if (!monthTotals.has(thisMonth)) {
    monthTotals.set(thisMonth, { scores: 0, active: new Set(), bySurface: emptyBySurface() });
  }

  const months = Array.from(monthTotals.keys());

  // Actual recorded token cost per month = sum of every current member's cost
  // hash for that month (#406). One read per (member, month); fine at team
  // scale. A month with no recorded cost falls back to an estimate below.
  const memberIds = members.map((m) => m.publicUserData!.userId!);
  const costByMonth = new Map<string, { total: number; byCategory: Record<string, number> }>(
    months.map((mo) => [mo, { total: 0, byCategory: {} }]),
  );
  await Promise.all(
    memberIds.flatMap((userId) =>
      months.map(async (mo) => {
        const { total, byCategory } = await getMonthlyCost(userId, mo);
        if (total <= 0) return;
        const agg = costByMonth.get(mo)!;
        agg.total += total;
        for (const [cat, v] of Object.entries(byCategory)) {
          agg.byCategory[cat] = (agg.byCategory[cat] ?? 0) + v;
        }
      }),
    ),
  );

  const usageByMonth: MonthUsage[] = months
    .map((month) => {
      const b = monthTotals.get(month)!;
      const actual = costByMonth.get(month)!;
      // Recorded cost wins; otherwise estimate from the month's score count
      // (score category only — see costEstimated).
      if (actual.total > 0) {
        return {
          month,
          scores: b.scores,
          scoresBySurface: b.bySurface,
          distinctActiveMembers: b.active.size,
          costMicroUsd: actual.total,
          costByCategory: actual.byCategory,
          costEstimated: false,
        };
      }
      const estimate = estimateScoreCostMicroUsd(b.scores);
      return {
        month,
        scores: b.scores,
        scoresBySurface: b.bySurface,
        distinctActiveMembers: b.active.size,
        costMicroUsd: estimate,
        costByCategory: estimate > 0 ? { score: estimate } : {},
        costEstimated: estimate > 0,
      };
    })
    // "YYYY-MM" sorts correctly as a string; newest first.
    .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));

  // Team Lead first, then members, then by name — mirrors the roster order
  // used elsewhere in the team UI.
  roster.sort((a, b) => {
    const lead = (r: DetailMember) => (r.role === "org:admin" ? 0 : 1);
    if (lead(a) !== lead(b)) return lead(a) - lead(b);
    return (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "");
  });

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      internal: isInternalOrg(org),
      status: orgStatus(org),
      createdAt: org.createdAt,
      teamLead: orgMeta(org).teamLead ?? null,
      industry: orgMeta(org).industry ?? null,
      terminatedAt: orgMeta(org).terminatedAt ?? null,
      purgedAt: orgMeta(org).purgedAt ?? null,
    },
    pool: TEAM_MONTHLY_POOL,
    members: roster,
    usageByMonth,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) return unauthorized();

  const { orgId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const internal = isInternalOrg(org);
  const existing = orgMeta(org);

  if (action === "suspend" || action === "reactivate") {
    if (internal) {
      return NextResponse.json(
        { error: "The internal Drawbackwards org cannot be suspended." },
        { status: 403 },
      );
    }
    const suspend = action === "suspend";
    const updated = await client.organizations.updateOrganization(orgId, {
      publicMetadata: {
        ...existing,
        status: suspend ? "suspended" : "active",
        suspendedAt: suspend ? Date.now() : undefined,
        suspendedBy: suspend ? adminEmail : undefined,
        // Reactivating cancels a pending termination purge clock (#398).
        terminatedAt: suspend ? existing.terminatedAt : undefined,
        terminatedBy: suspend ? existing.terminatedBy : undefined,
      },
    });
    return NextResponse.json({
      ok: true,
      status: (updated.publicMetadata as { status?: string })?.status ?? "active",
    });
  }

  if (action === "terminate") {
    if (internal) {
      return NextResponse.json(
        { error: "The internal Drawbackwards org cannot be terminated." },
        { status: 403 },
      );
    }
    if (existing.purgedAt) {
      return NextResponse.json(
        { error: "This org's content was already purged." },
        { status: 400 },
      );
    }
    // Idempotent: re-terminating keeps the original clock start.
    const terminatedAt = existing.terminatedAt ?? Date.now();
    await client.organizations.updateOrganization(orgId, {
      publicMetadata: {
        ...existing,
        status: "terminated",
        terminatedAt,
        terminatedBy: existing.terminatedBy ?? adminEmail,
      },
    });
    return NextResponse.json({ ok: true, status: "terminated", terminatedAt });
  }

  if (action === "setIndustry") {
    const industry = body.industry;
    if (typeof industry !== "string" || !(await isValidIndustry(industry))) {
      return NextResponse.json(
        { error: "Select an industry from the list." },
        { status: 400 },
      );
    }
    await client.organizations.updateOrganization(orgId, {
      publicMetadata: { ...existing, industry },
    });
    // Bust each member's 24h industry-lookup cache so new scores pick up the
    // change immediately instead of after the cache expires (#422).
    try {
      const memberships =
        await client.organizations.getOrganizationMembershipList({
          organizationId: orgId,
          limit: 100,
        });
      const ctxKeys = memberships.data
        .map((m) => m.publicUserData?.userId)
        .filter((id): id is string => !!id)
        .map((id) => `learn:ctx:${id}`);
      if (ctxKeys.length) await redis.del(...ctxKeys);
    } catch (e) {
      console.error("[setIndustry] ctx-cache bust failed:", e);
    }
    return NextResponse.json({ ok: true, industry });
  }

  if (action === "markInternal" || action === "unmarkInternal") {
    const updated = await client.organizations.updateOrganization(orgId, {
      publicMetadata: { ...existing, internal: action === "markInternal" },
    });
    return NextResponse.json({
      ok: true,
      internal: (updated.publicMetadata as { internal?: boolean })?.internal === true,
    });
  }

  return NextResponse.json(
    {
      error:
        "Unknown action. Expected suspend, reactivate, markInternal, or unmarkInternal.",
    },
    { status: 400 },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  if (!(await getAdminEmail())) return unauthorized();
  // Confirm a signed-in admin (kept for parity / future per-actor auditing).
  await auth();

  const { orgId } = await params;
  const body = await req.json().catch(() => ({}));
  const confirmName = typeof body.confirmName === "string" ? body.confirmName : "";

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  if (isInternalOrg(org)) {
    return NextResponse.json(
      { error: "The internal Drawbackwards org cannot be deleted." },
      { status: 403 },
    );
  }

  if (confirmName.trim() !== org.name) {
    return NextResponse.json(
      { error: "Confirmation name does not match the organization name." },
      { status: 400 },
    );
  }

  // Cascade (#398): de-identify + delete all member/org Customer Content
  // BEFORE the org record goes away, so deletion can no longer strand
  // per-user score data. Skipped when a termination purge already ran.
  if (!orgMeta(org).purgedAt) {
    await purgeOrgContent(orgId);
  }

  // Deleting the org cascades organizationMembership.deleted webhooks, which
  // revoke each member's team comp (when they have no other org).
  await client.organizations.deleteOrganization(orgId);
  return NextResponse.json({ ok: true });
}
