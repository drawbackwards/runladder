import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  ANON_COOKIE,
  readAnonId,
  claimPendingAnonScore,
} from "@/lib/anon-score";

/**
 * POST /api/score/claim
 *
 * Called by the /score page right after an anonymous visitor signs up.
 * Attaches the score they ran while signed out (stashed under the
 * ladder_anon_id cookie) to their new account, then clears the cookie.
 * Safe no-op when there's nothing pending. (#187)
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anonId = readAnonId(req);
  if (!anonId) {
    return NextResponse.json({ ok: true, claimed: false });
  }

  const scoreId = await claimPendingAnonScore(anonId, userId).catch(() => null);

  const res = NextResponse.json({ ok: true, claimed: !!scoreId, scoreId });
  // The pending score is consumed (or absent) — drop the cookie either way.
  res.cookies.set(ANON_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
