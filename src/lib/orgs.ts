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

export type OrgStatus = "pending" | "active" | "suspended";

export type TeamLeadMeta = {
  firstName?: string;
  lastName?: string;
  email?: string;
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
 * Lifecycle status. A freshly provisioned org is "pending" until its Team
 * Lead accepts the invite and signs in (flipped to "active" by the Clerk
 * membership webhook). Defaults to "active" for anything unset/unknown.
 */
export function orgStatus(org: OrgLike): OrgStatus {
  const s = orgMeta(org).status;
  return s === "suspended" || s === "pending" ? s : "active";
}
