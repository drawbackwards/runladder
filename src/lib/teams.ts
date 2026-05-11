/**
 * Ladder for Teams — data model and helpers.
 *
 * One team per user. Teams are provisioned by Ladder admins (Drawbackwards)
 * via /admin/teams; members are invited by team admins through their own
 * /dashboard/team UI. Tier "team" gets stamped on every member's Clerk
 * publicMetadata so paid-tier checks across the codebase keep working
 * unchanged.
 *
 * Pricing model:
 *   - 10 active seats included (the team admin/owner counts as one of the 10)
 *   - Each active member beyond 10 = $250/mo overage (invoiced via MSA)
 *   - Paused or archived members do NOT count as active
 *   - Pooled queries: 25,000/mo across the whole team
 *
 * Redis key schema:
 *   teams:all                            Set of team IDs
 *   team:{teamId}                        Hash, team metadata (see Team type)
 *   team:{teamId}:members                Hash, userId -> JSON Membership
 *   team:{teamId}:activity               Sorted set, timestamp -> JSON event
 *   team:{teamId}:usage:{YYYY-MM}        Counter, monthly pooled query count
 *   team:{teamId}:invites                Hash, token -> JSON Invite
 *   invite:{token}                       String, teamId (TTL'd lookup helper)
 *   team-invite-by-email:{email}         String, JSON {teamId, token} (auto-claim index)
 *   user:{userId}:team                   String, teamId (one team per user)
 */
import { randomBytes } from "crypto";
import { redis } from "@/lib/redis";
import { setUserSubscription } from "@/lib/tier";

/* ── Types ──────────────────────────────────────────────────────── */

export type TeamRole = "admin" | "member";
export type MemberStatus = "active" | "paused" | "archived";
export type TeamStatus = "active" | "paused" | "archived";

export type Team = {
  id: string;
  name: string;
  ownerUserId: string;
  status: TeamStatus;
  /** Included active seats. Active members beyond this cap incur overage. */
  seatCap: number;
  /** Dollars per month per overage seat. */
  perOverageSeatPrice: number;
  /** Pooled scoring queries per calendar month across all members. */
  queryPool: number;
  createdAt: number;
  updatedAt: number;
};

export type Membership = {
  userId: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: number;
  invitedBy?: string;
};

export type TeamActivityEvent = {
  type: "score";
  timestamp: number;
  userId: string;
  scoreId: string;
  score: number;
  label: string;
  screenName?: string;
  source: string;
  thumbnail?: string;
};

export type Invite = {
  token: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  createdAt: number;
  expiresAt: number;
};

export type BillingSummary = {
  active: number;
  paused: number;
  archived: number;
  included: number;
  overageSeats: number;
  overagePrice: number;
};

/* ── Defaults ───────────────────────────────────────────────────── */

export const DEFAULT_SEAT_CAP = 10;
export const DEFAULT_OVERAGE_PRICE = 250;
export const DEFAULT_QUERY_POOL = 25_000;
const INVITE_TTL_DAYS = 14;
const USAGE_KEY_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days, post-month buffer

/* ── Keys ───────────────────────────────────────────────────────── */

const teamsAllKey = () => "teams:all";
const teamKey = (teamId: string) => `team:${teamId}`;
const teamMembersKey = (teamId: string) => `team:${teamId}:members`;
const teamActivityKey = (teamId: string) => `team:${teamId}:activity`;
const teamUsageKey = (teamId: string, yearMonth: string) =>
  `team:${teamId}:usage:${yearMonth}`;
const teamInvitesKey = (teamId: string) => `team:${teamId}:invites`;
const inviteLookupKey = (token: string) => `invite:${token}`;
const inviteByEmailKey = (email: string) =>
  `team-invite-by-email:${email.toLowerCase().trim()}`;
const userTeamKey = (userId: string) => `user:${userId}:team`;

/* ── Internal helpers ───────────────────────────────────────────── */

function newId(prefix: string, bytes = 8): string {
  return `${prefix}_${randomBytes(bytes).toString("hex")}`;
}

function newToken(): string {
  return randomBytes(24).toString("hex");
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Upstash returns hash values either as parsed JSON objects or as JSON
 * strings, depending on the value's shape. Normalize both.
 */
function parseMaybeJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

function teamFromHash(data: Record<string, unknown> | null): Team | null {
  if (!data || !data.id) return null;
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    ownerUserId: String(data.ownerUserId ?? ""),
    status: (data.status as TeamStatus) || "active",
    seatCap: Number(data.seatCap) || DEFAULT_SEAT_CAP,
    perOverageSeatPrice:
      Number(data.perOverageSeatPrice) || DEFAULT_OVERAGE_PRICE,
    queryPool: Number(data.queryPool) || DEFAULT_QUERY_POOL,
    createdAt: Number(data.createdAt) || 0,
    updatedAt: Number(data.updatedAt) || 0,
  };
}

/* ── Teams ──────────────────────────────────────────────────────── */

export async function createTeam(args: {
  name: string;
  ownerUserId: string;
  seatCap?: number;
  perOverageSeatPrice?: number;
  queryPool?: number;
}): Promise<Team> {
  const id = newId("team");
  const now = Date.now();
  const team: Team = {
    id,
    name: args.name.trim(),
    ownerUserId: args.ownerUserId,
    status: "active",
    seatCap: args.seatCap ?? DEFAULT_SEAT_CAP,
    perOverageSeatPrice: args.perOverageSeatPrice ?? DEFAULT_OVERAGE_PRICE,
    queryPool: args.queryPool ?? DEFAULT_QUERY_POOL,
    createdAt: now,
    updatedAt: now,
  };
  await redis.hset(teamKey(id), team as unknown as Record<string, unknown>);
  await redis.sadd(teamsAllKey(), id);
  await addMember(id, args.ownerUserId, "admin");
  return team;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const data = await redis.hgetall<Record<string, unknown>>(teamKey(teamId));
  return teamFromHash(data);
}

export async function listTeams(): Promise<Team[]> {
  const ids = (await redis.smembers(teamsAllKey())) as string[];
  if (!ids || ids.length === 0) return [];
  const teams = await Promise.all(ids.map((id) => getTeam(id)));
  return teams.filter((t): t is Team => t !== null);
}

export async function updateTeam(
  teamId: string,
  patch: Partial<
    Pick<
      Team,
      "name" | "status" | "seatCap" | "perOverageSeatPrice" | "queryPool"
    >
  >,
): Promise<Team | null> {
  const existing = await getTeam(teamId);
  if (!existing) return null;
  const next: Team = { ...existing, ...patch, updatedAt: Date.now() };
  await redis.hset(teamKey(teamId), next as unknown as Record<string, unknown>);
  return next;
}

/* ── Members ────────────────────────────────────────────────────── */

export async function addMember(
  teamId: string,
  userId: string,
  role: TeamRole,
  invitedBy?: string,
): Promise<Membership> {
  const membership: Membership = {
    userId,
    role,
    status: "active",
    joinedAt: Date.now(),
    invitedBy,
  };
  await redis.hset(teamMembersKey(teamId), {
    [userId]: JSON.stringify(membership),
  });
  await redis.set(userTeamKey(userId), teamId);
  return membership;
}

export async function getMember(
  teamId: string,
  userId: string,
): Promise<Membership | null> {
  const raw = await redis.hget(teamMembersKey(teamId), userId);
  return parseMaybeJson<Membership>(raw);
}

export async function listMembers(teamId: string): Promise<Membership[]> {
  const all = (await redis.hgetall(teamMembersKey(teamId))) as Record<
    string,
    unknown
  > | null;
  if (!all) return [];
  return Object.values(all)
    .map((raw) => parseMaybeJson<Membership>(raw))
    .filter((m): m is Membership => m !== null);
}

export async function setMemberStatus(
  teamId: string,
  userId: string,
  status: MemberStatus,
): Promise<Membership | null> {
  const m = await getMember(teamId, userId);
  if (!m) return null;
  const next: Membership = { ...m, status };
  await redis.hset(teamMembersKey(teamId), {
    [userId]: JSON.stringify(next),
  });
  return next;
}

export async function setMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole,
): Promise<Membership | null> {
  const m = await getMember(teamId, userId);
  if (!m) return null;
  const next: Membership = { ...m, role };
  await redis.hset(teamMembersKey(teamId), {
    [userId]: JSON.stringify(next),
  });
  return next;
}

export async function removeMember(
  teamId: string,
  userId: string,
): Promise<void> {
  await redis.hdel(teamMembersKey(teamId), userId);
  const current = await redis.get<string>(userTeamKey(userId));
  if (current === teamId) {
    await redis.del(userTeamKey(userId));
  }
}

export async function getUserTeamId(userId: string): Promise<string | null> {
  const id = await redis.get<string>(userTeamKey(userId));
  return id ?? null;
}

/* ── Seat math ──────────────────────────────────────────────────── */

export async function getBillingSummary(
  teamId: string,
): Promise<BillingSummary> {
  const team = await getTeam(teamId);
  if (!team) {
    return {
      active: 0,
      paused: 0,
      archived: 0,
      included: 0,
      overageSeats: 0,
      overagePrice: 0,
    };
  }
  const members = await listMembers(teamId);
  const active = members.filter((m) => m.status === "active").length;
  const paused = members.filter((m) => m.status === "paused").length;
  const archived = members.filter((m) => m.status === "archived").length;
  const overageSeats = Math.max(0, active - team.seatCap);
  return {
    active,
    paused,
    archived,
    included: team.seatCap,
    overageSeats,
    overagePrice: overageSeats * team.perOverageSeatPrice,
  };
}

/* ── Activity ───────────────────────────────────────────────────── */

export async function recordTeamActivity(
  teamId: string,
  event: TeamActivityEvent,
): Promise<void> {
  await redis.zadd(teamActivityKey(teamId), {
    score: event.timestamp,
    member: JSON.stringify(event),
  });
}

export async function getTeamActivity(
  teamId: string,
  limit = 50,
): Promise<TeamActivityEvent[]> {
  const items = (await redis.zrange(teamActivityKey(teamId), 0, limit - 1, {
    rev: true,
  })) as unknown[];
  if (!items) return [];
  return items
    .map((raw) => parseMaybeJson<TeamActivityEvent>(raw))
    .filter((e): e is TeamActivityEvent => e !== null);
}

/* ── Pooled usage ───────────────────────────────────────────────── */

export async function incrementTeamUsage(teamId: string): Promise<number> {
  const ym = currentYearMonth();
  const key = teamUsageKey(teamId, ym);
  const next = await redis.incr(key);
  if (next === 1) {
    await redis.expire(key, USAGE_KEY_TTL_SECONDS);
  }
  return next;
}

export async function getTeamUsage(teamId: string): Promise<number> {
  const ym = currentYearMonth();
  return (await redis.get<number>(teamUsageKey(teamId, ym))) ?? 0;
}

/**
 * Resolve a user's team pool status — used by score routes before they hit
 * the scoring engine, so we can enforce the monthly pooled query cap.
 *
 * Returns `null` if the user is not on a team. Otherwise returns the
 * monthly usage and pool with a derived `exceeded` flag.
 */
export async function getTeamPoolStatus(userId: string): Promise<{
  teamId: string;
  used: number;
  pool: number;
  exceeded: boolean;
} | null> {
  const teamId = await getUserTeamId(userId);
  if (!teamId) return null;
  const team = await getTeam(teamId);
  if (!team) return null;
  const used = await getTeamUsage(teamId);
  return {
    teamId,
    used,
    pool: team.queryPool,
    exceeded: used >= team.queryPool,
  };
}

/**
 * Record a successful score against a user's team — appends to the team's
 * activity feed and increments the monthly pool usage counter. No-op if
 * the user is not on a team. Best-effort: callers should not gate on this.
 */
export async function recordScoreForTeam(
  userId: string,
  event: Omit<TeamActivityEvent, "type" | "userId">,
): Promise<void> {
  const teamId = await getUserTeamId(userId);
  if (!teamId) return;
  await Promise.all([
    recordTeamActivity(teamId, {
      type: "score",
      userId,
      ...event,
    }),
    incrementTeamUsage(teamId),
  ]);
}

/* ── Invites ────────────────────────────────────────────────────── */

export async function createInvite(args: {
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
}): Promise<Invite> {
  const token = newToken();
  const now = Date.now();
  const invite: Invite = {
    token,
    teamId: args.teamId,
    email: args.email.toLowerCase().trim(),
    role: args.role,
    invitedBy: args.invitedBy,
    createdAt: now,
    expiresAt: now + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  await redis.hset(teamInvitesKey(args.teamId), {
    [token]: JSON.stringify(invite),
  });
  await redis.set(inviteLookupKey(token), args.teamId, {
    ex: INVITE_TTL_DAYS * 24 * 60 * 60,
  });
  // By-email index so the invitee gets auto-claimed on first sign-in
  // even if they never clicked the magic link.
  await redis.set(
    inviteByEmailKey(invite.email),
    JSON.stringify({ teamId: args.teamId, token }),
    { ex: INVITE_TTL_DAYS * 24 * 60 * 60 },
  );
  return invite;
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const teamId = await redis.get<string>(inviteLookupKey(token));
  if (!teamId) return null;
  const raw = await redis.hget(teamInvitesKey(teamId), token);
  const invite = parseMaybeJson<Invite>(raw);
  if (!invite) return null;
  if (invite.expiresAt < Date.now()) return null;
  return invite;
}

export async function listInvites(teamId: string): Promise<Invite[]> {
  const all = (await redis.hgetall(teamInvitesKey(teamId))) as Record<
    string,
    unknown
  > | null;
  if (!all) return [];
  return Object.values(all)
    .map((raw) => parseMaybeJson<Invite>(raw))
    .filter(
      (i): i is Invite => i !== null && i.expiresAt > Date.now(),
    );
}

export async function deleteInvite(
  teamId: string,
  token: string,
): Promise<void> {
  // Look up the invite first so we can clear the by-email index too.
  const raw = await redis.hget(teamInvitesKey(teamId), token);
  const invite = parseMaybeJson<Invite>(raw);
  await redis.hdel(teamInvitesKey(teamId), token);
  await redis.del(inviteLookupKey(token));
  if (invite?.email) {
    // Only clear if the email index still points at this token. Avoids
    // a race where a newer invite to the same email is stomped by an
    // older invite being revoked.
    const idxRaw = await redis.get(inviteByEmailKey(invite.email));
    const idx = parseMaybeJson<{ teamId: string; token: string }>(idxRaw);
    if (idx?.token === token) {
      await redis.del(inviteByEmailKey(invite.email));
    }
  }
}

/**
 * Look up a pending invite by email — used by /api/dashboard and /api/me
 * to auto-claim invites when a user signs in without clicking the magic
 * link. Returns null if no invite exists for this email.
 *
 * Fast path: read the by-email index. Slow-path fallback for invites that
 * predate the index — scan every team's invite hash. The fallback is
 * O(teams × invites) but only fires when the index is missing, and we
 * lazily backfill the index when the fallback finds a match.
 */
export async function findPendingInviteByEmail(
  email: string,
): Promise<Invite | null> {
  const normalized = email.toLowerCase().trim();

  // Fast path
  const idxRaw = await redis.get(inviteByEmailKey(normalized));
  const idx = parseMaybeJson<{ teamId: string; token: string }>(idxRaw);
  if (idx) {
    const raw = await redis.hget(teamInvitesKey(idx.teamId), idx.token);
    const invite = parseMaybeJson<Invite>(raw);
    if (invite && invite.expiresAt > Date.now()) {
      return invite;
    }
  }

  // Fallback: scan every team for a matching pending invite.
  const teamIds = (await redis.smembers(teamsAllKey())) as string[];
  for (const teamId of teamIds || []) {
    const all = (await redis.hgetall(teamInvitesKey(teamId))) as Record<
      string,
      unknown
    > | null;
    if (!all) continue;
    for (const raw of Object.values(all)) {
      const invite = parseMaybeJson<Invite>(raw);
      if (!invite) continue;
      if (invite.email.toLowerCase() !== normalized) continue;
      if (invite.expiresAt < Date.now()) continue;
      // Lazily backfill the index so the next lookup is a single read.
      const ttlSeconds = Math.max(
        60,
        Math.floor((invite.expiresAt - Date.now()) / 1000),
      );
      await redis.set(
        inviteByEmailKey(normalized),
        JSON.stringify({ teamId: invite.teamId, token: invite.token }),
        { ex: ttlSeconds },
      );
      return invite;
    }
  }

  return null;
}

/**
 * Auto-claim any pending team invite for any of the user's verified emails.
 * Idempotent: if the user is already on a team, returns that team. If no
 * pending invite exists for any email, returns null.
 *
 * Side effects on successful claim:
 *   - Adds the user as a member of the team (role from the invite)
 *   - Stamps `tier: "team"` on Clerk publicMetadata
 *   - Deletes the invite + by-email index + token lookup
 */
export async function claimPendingTeamInviteForEmails(
  userId: string,
  emails: string[],
): Promise<{ teamId: string; role: TeamRole } | null> {
  // Already on a team — return that.
  const existing = await getUserTeamId(userId);
  if (existing) {
    const m = await getMember(existing, userId);
    return m ? { teamId: existing, role: m.role } : null;
  }

  // Find a pending invite for any of this user's emails.
  for (const email of emails) {
    if (!email) continue;
    const invite = await findPendingInviteByEmail(email);
    if (!invite) continue;
    // Verify the team still exists before we promote.
    const team = await getTeam(invite.teamId);
    if (!team) continue;

    await addMember(invite.teamId, userId, invite.role, invite.invitedBy);
    // Stamp team tier on Clerk publicMetadata so paid-tier checks pass
    // across every surface (web, Skill, MCP, plugin).
    await setUserSubscription(userId, { tier: "team" });
    await deleteInvite(invite.teamId, invite.token);

    return { teamId: invite.teamId, role: invite.role };
  }

  return null;
}
