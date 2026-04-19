import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  rotateSkillToken,
  revokeSkillToken,
  getSkillTokenMeta,
} from "@/lib/skill-auth";
import { CURRENT_SKILL_VERSION } from "@/lib/skill-version";

/** GET — return current token metadata (no raw token) + version state. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const meta = await getSkillTokenMeta(userId);
  return NextResponse.json({
    hasToken: !!meta,
    prefix: meta?.prefix,
    createdAt: meta?.createdAt,
    lastUsedAt: meta?.lastUsedAt,
    installedVersion: meta?.installedVersion,
    currentVersion: CURRENT_SKILL_VERSION,
  });
}

/** POST — generate or rotate the user's skill token. Returns raw token ONCE. */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await rotateSkillToken(userId);
  return NextResponse.json({ token: raw });
}

/** DELETE — revoke the user's skill token. */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await revokeSkillToken(userId);
  return NextResponse.json({ ok: true });
}
