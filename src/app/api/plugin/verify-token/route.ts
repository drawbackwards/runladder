import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { userIdFromBearer } from "@/lib/skill-auth";
import { FREE_LIFETIME_LIMIT, isPaidTier } from "@/lib/plans";
import { getUserSubscription } from "@/lib/tier";
import { getOrgStyleGuide } from "@/lib/style-guide";
import { redis, lifetimeScansKey } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";
import { CURRENT_PLUGIN_VERSION } from "@/lib/plugin-version";
import { touchPluginMeta } from "@/lib/plugin-meta";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Plugin token verification — server-to-server, called by the
 * ai-design-assistant backend to resolve a user's Ladder personal token
 * (the same token used by the Claude Skill) into a Clerk userId + tier.
 *
 * Auth model: shared service secret (X-Ladder-Service-Token header).
 *
 * Body: { token: "ladder_skl_..." }
 * Returns: { userId, tier, paid, comp? } on 200, 401 if the token is unknown.
 *
 * Tier is read via getUserSubscription, which auto-claims any pending comp
 * issued for the user's email by an admin and treats expired comps as free.
 * So a user comped before they signed up gets activated to Pro/Team/Pulse on
 * their very first plugin call after creating their Ladder account.
 */
export async function POST(req: NextRequest) {
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Service not configured." },
      { status: 503, headers: API_VERSION_HEADERS },
    );
  }
  if (serviceToken !== expected) {
    return NextResponse.json(
      { error: "Invalid service token" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  try {
    const body = (await req.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Missing token in body." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }

    const userId = await userIdFromBearer(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Token not recognized." },
        { status: 401, headers: API_VERSION_HEADERS },
      );
    }

    const [sub, used, clerk] = await Promise.all([
      getUserSubscription(userId),
      redis.get<number>(lifetimeScansKey(userId)),
      clerkClient(),
    ]);
    const user = await clerk.users.getUser(userId);
    const paid = isPaidTier(sub.tier);

    // Team style guide (Phase 2): surface the team's ruleset so the plugin's
    // Improve Copy can check copy against it. Gated to Team tier + an active
    // org that has uploaded a guide. Best-effort — never blocks verification.
    let styleGuide: { ruleset: string; teamName: string | null } | null = null;
    if (sub.tier === "team") {
      try {
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId,
        });
        const orgId = memberships.data[0]?.organization?.id ?? null;
        if (orgId) {
          const sg = await getOrgStyleGuide(orgId);
          if (sg) styleGuide = { ruleset: sg.ruleset, teamName: sg.teamName };
        }
      } catch {
        // best-effort: a failure just means no guide reaches the plugin
      }
    }

    // Record the plugin version the user is running. The plugin's
    // ai-design-assistant backend forwards X-Ladder-Plugin-Version from
    // the plugin's fetch to here. Fire-and-forget so a failed write
    // never blocks the verify response.
    const installedPluginVersion =
      req.headers.get("x-ladder-plugin-version")?.slice(0, 32) || undefined;
    if (installedPluginVersion) {
      touchPluginMeta(userId, installedPluginVersion).catch(() => {
        // best-effort
      });
    }

    // Diagnostic: log every successful verify so we can correlate with persist
    try {
      await redis.lpush(
        "debug:plugin-persist-log",
        JSON.stringify({
          ts: Date.now(),
          kind: "verify-token",
          userId,
          tier: sub.tier,
          email: user.primaryEmailAddress?.emailAddress ?? null,
        }),
      );
      await redis.ltrim("debug:plugin-persist-log", 0, 49);
      await redis.expire("debug:plugin-persist-log", 60 * 60 * 24);
    } catch {
      // best-effort
    }

    return NextResponse.json(
      {
        userId,
        tier: sub.tier,
        paid,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        firstName: user.firstName ?? null,
        usage: {
          used: used ?? 0,
          limit: paid ? null : FREE_LIFETIME_LIMIT,
        },
        // Team style guide for the plugin's Improve Copy (null unless the
        // user's Team org has uploaded one). See #team-style-guide Phase 2.
        styleGuide,
        comp: sub.comp
          ? {
              reason: sub.comp.reason,
              expiresAt: sub.comp.expiresAt ?? null,
            }
          : null,
        /**
         * Plugin version state. The plugin compares its own embedded
         * LADDER_PLUGIN_VERSION against `currentPluginVersion` to
         * decide whether to render an in-canvas "Update available"
         * banner. Returning it on every verify means the plugin gets
         * fresh data on its first call per session — no extra request.
         */
        pluginVersion: {
          current: CURRENT_PLUGIN_VERSION,
          installed: installedPluginVersion ?? null,
        },
      },
      { headers: API_VERSION_HEADERS },
    );
  } catch (err) {
    console.error("[LADDER:ERROR] Plugin verify-token:", err);
    return NextResponse.json(
      { error: "Verification failed." },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
