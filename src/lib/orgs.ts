/**
 * Organization helpers for the admin client-management tooling (#190).
 *
 * Team clients are Clerk Organizations. Drawbackwards is itself a Team org
 * (we dogfood the product) but must be protected from suspend/delete and
 * labeled "Internal" in the admin UI. We identify it two ways:
 *
 *   1. publicMetadata.internal === true — the durable signal, set via the
 *      "mark internal" toggle in /admin/clients (works without Clerk
 *      dashboard access, since our backend has CLERK_SECRET_KEY).
 *   2. name === "Drawbackwards" — a default guard so the org is protected
 *      even before the flag has been set.
 */

export type OrgStatus = "pending" | "active" | "suspended" | "terminated";

export type TeamLeadMeta = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

/**
 * Pointer to a team's uploaded writing style guide. The distilled ruleset
 * (what scoring reads) lives in Redis, not here — Clerk publicMetadata is
 * small (~8KB), so we keep only this pointer. See src/lib/style-guide.ts.
 */
export type StyleGuideMeta = {
  /** Vercel Blob URL of the original PDF (served via an authed download route). */
  blobUrl: string;
  fileName: string;
  uploadedAt: number;
  uploadedBy: string;
};

/** Shape we store on an org's publicMetadata. All fields optional/defaulted. */
export type OrgPublicMetadata = {
  status?: OrgStatus;
  internal?: boolean;
  teamLead?: TeamLeadMeta;
  provisionedBy?: string;
  provisionedAt?: number;
  suspendedAt?: number;
  suspendedBy?: string;
  styleGuide?: StyleGuideMeta;
  /**
   * Client industry (e.g. "fintech"), the ONLY client-linked dimension the
   * de-identified learning store keeps (#422). Set in /admin/clients/[orgId].
   * Only meaningful when industryMode is "single" (the default).
   */
  industry?: string;
  /**
   * Account industry mode (#429). "single" (default) means one fixed industry
   * that every score inherits read-only. "multiple" means an agency or
   * consultancy that works across industries, so scores are tagged per-screen
   * and the org has no single `industry`. The internal Drawbackwards org is
   * always treated as multiple (see isMultiIndustryOrg).
   */
  industryMode?: "single" | "multiple";
  /** Contract-termination lifecycle (#398). terminatedAt starts the 30-day
   * purge clock; purgedAt is stamped once the cron has de-identified and
   * deleted the org's Customer Content. */
  terminatedAt?: number;
  terminatedBy?: string;
  purgedAt?: number;
};

/** Minimal org shape these helpers need — satisfied by a Clerk Organization. */
type OrgLike = {
  name?: string | null;
  publicMetadata?: Record<string, unknown> | null;
};

const INTERNAL_ORG_NAME = "drawbackwards";

/** Read publicMetadata as our typed shape (safe on null/undefined). */
export function orgMeta(org: OrgLike): OrgPublicMetadata {
  return (org.publicMetadata ?? {}) as OrgPublicMetadata;
}

/**
 * True if this org is the internal Drawbackwards org and must never be
 * suspended or deleted through the admin tooling.
 */
export function isInternalOrg(org: OrgLike): boolean {
  const meta = orgMeta(org);
  if (meta.internal === true) return true;
  return (org.name ?? "").trim().toLowerCase() === INTERNAL_ORG_NAME;
}

/**
 * True if this account tags industry per score rather than inheriting one fixed
 * org industry (#429). Agencies and consultancies set industryMode "multiple";
 * the internal Drawbackwards org is always multi-industry (it designs across
 * verticals, so no single label is truthful). Single-industry orgs return false
 * and their scores inherit the org `industry` read-only.
 */
export function isMultiIndustryOrg(org: OrgLike): boolean {
  if (isInternalOrg(org)) return true;
  return orgMeta(org).industryMode === "multiple";
}

/**
 * Lifecycle status. A freshly provisioned org is "pending" until its Team
 * Lead accepts the invite and signs in (flipped to "active" by the Clerk
 * membership webhook). Defaults to "active" for anything unset/unknown.
 */
export function orgStatus(org: OrgLike): OrgStatus {
  const s = orgMeta(org).status;
  return s === "suspended" || s === "pending" || s === "terminated"
    ? s
    : "active";
}

/**
 * The Clerk user id of the provisioning service account. Client orgs are
 * created with this user as `createdBy` so individual Drawbackwards admins
 * never become members of (or get trapped in) a client org. The account
 * never logs in; it only owns orgs. Set via the PROVISIONING_USER_ID env
 * var (see scripts/create-provisioning-user.mjs).
 */
export function provisioningUserId(): string | null {
  return process.env.PROVISIONING_USER_ID || null;
}

/**
 * True if `userId` is the provisioning service account. Used to hide it from
 * client-facing views (team roster, member counts) so the client never sees
 * the Drawbackwards owner inside their org.
 */
export function isProvisioningUser(userId: string | null | undefined): boolean {
  const pid = provisioningUserId();
  return !!pid && !!userId && userId === pid;
}
