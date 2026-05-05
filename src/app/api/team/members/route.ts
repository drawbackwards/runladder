/**
 * Team member ops — invite (POST).
 *
 * Listing members happens via GET /api/team. Invitations are admin-only.
 *
 * POST { email, role? } → creates an invite, emails the recipient a magic
 * accept link. Role defaults to "member".
 */
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireTeamAdmin } from "@/lib/team-auth";
import { createInvite, getUserTeamId, type TeamRole } from "@/lib/teams";

export const runtime = "nodejs";

const RESEND_FROM = "Ladder <invites@runladder.com>";

async function sendInviteEmail(args: {
  to: string;
  teamName: string;
  inviterName: string;
  acceptUrl: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[LADDER:TEAMS] RESEND_API_KEY missing — invite email skipped.");
    return;
  }
  const subject = `${args.inviterName} invited you to ${args.teamName} on Ladder`;
  const text = [
    `${args.inviterName} invited you to join ${args.teamName} on Ladder.`,
    "",
    "Ladder is the quality score for every product experience. Your team uses it to score screens, share standards, and track quality together.",
    "",
    `Accept the invite: ${args.acceptUrl}`,
    "",
    "This link expires in 14 days.",
  ].join("\n");
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111;">
      <p style="font-size: 15px; line-height: 1.6;">
        <strong>${args.inviterName}</strong> invited you to join <strong>${args.teamName}</strong> on Ladder.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #444;">
        Ladder is the quality score for every product experience. Your team uses it to score screens, share standards, and track quality together.
      </p>
      <p style="margin: 32px 0;">
        <a href="${args.acceptUrl}"
           style="display: inline-block; background: #6AC89B; color: #0a0a0a; font-weight: 600; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-size: 14px;">
          Accept invite
        </a>
      </p>
      <p style="font-size: 12px; color: #666;">
        This link expires in 14 days. If the button doesn't work, paste this URL into your browser:<br>
        <span style="word-break: break-all;">${args.acceptUrl}</span>
      </p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [args.to],
      subject,
      text,
      html,
    }),
  });
}

function siteOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "https://runladder.com";
}

export async function POST(req: NextRequest) {
  const auth = await requireTeamAdmin();
  if (!auth.ok) return auth.response;

  let body: { email?: string; role?: TeamRole } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 },
    );
  }
  const role: TeamRole = body.role === "admin" ? "admin" : "member";

  // If the email already belongs to a Ladder user on another team, surface
  // that early so the inviter knows before the invite goes out.
  const client = await clerkClient();
  const existingList = await client.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const existingUser = existingList.data[0];
  if (existingUser) {
    const otherTeam = await getUserTeamId(existingUser.id);
    if (otherTeam && otherTeam !== auth.team.id) {
      return NextResponse.json(
        {
          error: `${email} is already a member of another team. They must leave that team before they can accept this invite.`,
        },
        { status: 409 },
      );
    }
    if (otherTeam === auth.team.id) {
      return NextResponse.json(
        { error: `${email} is already a member of this team.` },
        { status: 409 },
      );
    }
  }

  const invite = await createInvite({
    teamId: auth.team.id,
    email,
    role,
    invitedBy: auth.userId,
  });

  const inviterClerk = await client.users.getUser(auth.userId);
  const inviterName =
    [inviterClerk.firstName, inviterClerk.lastName].filter(Boolean).join(" ") ||
    inviterClerk.primaryEmailAddress?.emailAddress ||
    "A teammate";

  const acceptUrl = `${siteOrigin(req)}/team/join/${invite.token}`;
  try {
    await sendInviteEmail({
      to: email,
      teamName: auth.team.name,
      inviterName,
      acceptUrl,
    });
  } catch (err) {
    // Don't fail the request — the invite exists, we just couldn't email yet.
    console.error("[LADDER:TEAMS] Invite email send failed:", err);
  }

  return NextResponse.json({ invite, acceptUrl });
}
