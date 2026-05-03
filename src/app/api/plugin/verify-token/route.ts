import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { userIdFromBearer } from "@/lib/skill-auth";
import { FREE_LIFETIME_LIMIT, isPaidTier, type Tier } from "@/lib/plans";
import { redis, lifetimeScansKey } from "@/lib/redis";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Plugin token verification — server-to-server, called by the
 * ai-design-assistant backend to resolve a user's Ladder personal token
 * (the same token used by the Claude Skill) into a Clerk userId + tier.
 *
 * Auth model: shared service secret (X-Ladder-Service-Token header).
 *
 * Body: { token: "ladder_skl_..." }
 * Returns: { userId, tier, paid } on 200, 401 if the token is unknown.
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

    const [clerk, used] = await Promise.all([
      clerkClient(),
      redis.get<number>(lifetimeScansKey(userId)),
    ]);
    const user = await clerk.users.getUser(userId);
    const rawTier = user.publicMetadata?.tier;
    const tier: Tier =
      rawTier === "pro" || rawTier === "team" || rawTier === "pulse"
        ? rawTier
        : "free";
    const paid = isPaidTier(tier);
    return NextResponse.json(
      {
        userId,
        tier,
        paid,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        firstName: user.firstName ?? null,
        usage: {
          used: used ?? 0,
          limit: paid ? null : FREE_LIFETIME_LIMIT,
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
