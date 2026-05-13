import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserSubscription } from "@/lib/tier";
import {
  FREE_LIFETIME_LIMIT,
  monthlyScoreCapForTier,
} from "@/lib/plans";
import {
  getMonthlyScans,
  getLifetimeScans,
  daysUntilMonthEnd,
} from "@/lib/usage";

/**
 * GET /api/usage/me — current user's score usage for the dashboard meter.
 *
 * Response shape lets the client render the right meter variant
 * without re-encoding tier rules:
 *
 *   {
 *     tier: "free" | "pro" | "team" | "pulse",
 *     monthlyUsed:   number       // count for current UTC month
 *     monthlyLimit:  number|null  // soft cap (null = no monthly cap)
 *     lifetimeUsed:  number       // lifetime counter (for free-tier display)
 *     lifetimeLimit: number|null  // hard free-tier ceiling
 *     daysUntilReset: number      // for the "resets in N days" copy
 *   }
 *
 * Free users see lifetime numbers; paid users see monthly. The UI
 * picks which to surface based on `tier`.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getUserSubscription(userId);
  const tier = sub.tier;

  const [monthlyUsed, lifetimeUsed] = await Promise.all([
    getMonthlyScans(userId),
    getLifetimeScans(userId),
  ]);

  return NextResponse.json({
    tier,
    monthlyUsed,
    monthlyLimit: monthlyScoreCapForTier(tier),
    lifetimeUsed,
    lifetimeLimit: tier === "free" ? FREE_LIFETIME_LIMIT : null,
    daysUntilReset: daysUntilMonthEnd(),
  });
}
