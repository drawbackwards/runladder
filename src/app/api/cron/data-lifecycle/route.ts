import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isInternalOrg, orgMeta } from "@/lib/orgs";
import { purgeOrgContent } from "@/lib/data-lifecycle";

/**
 * Contract-termination purge cron (#398).
 *
 *   GET /api/cron/data-lifecycle
 *
 * Runs daily (vercel.json crons). Finds orgs marked terminated more than 30
 * days ago that haven't been purged, de-identifies their score history into
 * the learning store, deletes all Customer Content, and stamps purgedAt.
 * Design: docs/data-lifecycle-and-learning.md.
 *
 * Auth: Vercel invokes crons with `Authorization: Bearer ${CRON_SECRET}`.
 * Fails closed when the secret is unset.
 */

export const maxDuration = 300;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const purged: unknown[] = [];
  const errors: { orgId: string; error: string }[] = [];

  let offset = 0;
  const limit = 100;
  for (;;) {
    const page = await client.organizations.getOrganizationList({
      limit,
      offset,
      includeMembersCount: false,
    });
    for (const org of page.data) {
      const meta = orgMeta(org);
      if (
        isInternalOrg(org) ||
        meta.status !== "terminated" ||
        meta.purgedAt ||
        !meta.terminatedAt ||
        Date.now() - meta.terminatedAt < THIRTY_DAYS_MS
      ) {
        continue;
      }
      try {
        const result = await purgeOrgContent(org.id);
        // Stamp purgedAt and drop the style-guide pointer (its blob + Redis
        // entry are gone). Keeping the org record itself is the audit trail.
        await client.organizations.updateOrganization(org.id, {
          publicMetadata: {
            ...meta,
            styleGuide: undefined,
            purgedAt: Date.now(),
          },
        });
        purged.push(result);
        console.log(`[LIFECYCLE] purged org ${org.id} (${org.name})`, result);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push({ orgId: org.id, error: message });
        console.error(`[LIFECYCLE] purge failed for ${org.id}:`, e);
      }
    }
    if (page.data.length < limit) break;
    offset += limit;
  }

  return NextResponse.json({ ok: errors.length === 0, purged, errors });
}
