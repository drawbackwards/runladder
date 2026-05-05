/**
 * Accept a team invite.
 *
 * POST { token } →
 *   - validates the token
 *   - checks the signed-in Clerk user has an email matching the invite
 *   - rejects if the user is already on another team
 *   - adds the user as a member with the role set on the invite
 *   - stamps `tier: "team"` on Clerk publicMetadata
 *   - deletes the invite
 *
 * Returns the team summary the client can navigate into.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  addMember,
  deleteInvite,
  getInviteByToken,
  getTeam,
  getUserTeamId,
} from "@/lib/teams";
import { setUserSubscription } from "@/lib/tier";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = (body.token || "").trim();
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json(
      { error: "Invite is invalid or expired" },
      { status: 404 },
    );
  }

  const team = await getTeam(invite.teamId);
  if (!team) {
    return NextResponse.json({ error: "Team no longer exists" }, { status: 404 });
  }

  // Email match — Clerk users may have multiple email addresses; accept any.
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const userEmails = user.emailAddresses
    .map((e) => e.emailAddress?.toLowerCase())
    .filter((e): e is string => Boolean(e));
  if (!userEmails.includes(invite.email.toLowerCase())) {
    return NextResponse.json(
      {
        error: `This invite was sent to ${invite.email}. Sign in with that email to accept.`,
      },
      { status: 403 },
    );
  }

  const existingTeam = await getUserTeamId(userId);
  if (existingTeam && existingTeam !== team.id) {
    return NextResponse.json(
      {
        error:
          "You're already on another team. Leave that team first, then accept this invite.",
      },
      { status: 409 },
    );
  }

  await addMember(team.id, userId, invite.role, invite.invitedBy);
  await setUserSubscription(userId, { tier: "team" });
  await deleteInvite(team.id, token);

  return NextResponse.json({
    team: { id: team.id, name: team.name },
    role: invite.role,
  });
}
