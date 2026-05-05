/**
 * Admin teams — list and create.
 *
 * GET   → list every team plus its billing summary
 * POST  → provision a new team (name, ownerEmail, optional caps)
 *
 * Gated by the runladder admin email allowlist (getAdminEmail). Drawbackwards
 * uses this to turn on Teams accounts after an MSA closes — Stripe is only
 * involved for self-serve Pro, never for Teams.
 */
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import {
  createTeam,
  getBillingSummary,
  getUserTeamId,
  listTeams,
  type BillingSummary,
  type Team,
} from "@/lib/teams";
import { setUserSubscription } from "@/lib/tier";

export const runtime = "nodejs";

type TeamWithSummary = Team & {
  billing: BillingSummary;
  ownerEmail: string | null;
};

async function emailForUser(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return null;
  }
}

async function userIdForEmail(email: string): Promise<string | null> {
  const client = await clerkClient();
  const list = await client.users.getUserList({
    emailAddress: [email.toLowerCase()],
    limit: 1,
  });
  return list.data[0]?.id ?? null;
}

export async function GET() {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const teams = await listTeams();
  const enriched: TeamWithSummary[] = await Promise.all(
    teams.map(async (t) => ({
      ...t,
      billing: await getBillingSummary(t.id),
      ownerEmail: await emailForUser(t.ownerUserId),
    })),
  );

  // Most recently created first.
  enriched.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ teams: enriched });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  let body: {
    name?: string;
    ownerEmail?: string;
    seatCap?: number;
    perOverageSeatPrice?: number;
    queryPool?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const ownerEmail = (body.ownerEmail || "").trim().toLowerCase();
  if (!name || name.length > 200) {
    return NextResponse.json(
      { error: "Team name is required (max 200 chars)" },
      { status: 400 },
    );
  }
  if (!ownerEmail || !ownerEmail.includes("@")) {
    return NextResponse.json(
      { error: "Valid owner email is required" },
      { status: 400 },
    );
  }

  const ownerUserId = await userIdForEmail(ownerEmail);
  if (!ownerUserId) {
    return NextResponse.json(
      {
        error: `No Ladder account found for ${ownerEmail}. Have them sign up first, then create the team.`,
      },
      { status: 400 },
    );
  }

  const existingTeam = await getUserTeamId(ownerUserId);
  if (existingTeam) {
    return NextResponse.json(
      {
        error: `${ownerEmail} is already on team ${existingTeam}. Remove them first or pick a different owner.`,
      },
      { status: 409 },
    );
  }

  const team = await createTeam({
    name,
    ownerUserId,
    seatCap: typeof body.seatCap === "number" ? body.seatCap : undefined,
    perOverageSeatPrice:
      typeof body.perOverageSeatPrice === "number"
        ? body.perOverageSeatPrice
        : undefined,
    queryPool: typeof body.queryPool === "number" ? body.queryPool : undefined,
  });

  // Stamp the team tier on the owner so paid-tier checks pass everywhere.
  // We deliberately do not touch their Stripe IDs — if they had a Pro sub,
  // it stays in privateMetadata until the admin/owner cancels it manually.
  await setUserSubscription(ownerUserId, { tier: "team" });

  return NextResponse.json({
    team: {
      ...team,
      billing: await getBillingSummary(team.id),
      ownerEmail,
    },
  });
}
