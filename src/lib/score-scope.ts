/**
 * Visibility label for a non-public score (#301).
 *
 * A single-user account (free / pro) keeps a non-public score truly private —
 * only they can see it, so the badge reads "Private". A team-tier account
 * shares scores within the organization: a non-public score is still visible
 * to the team (and Team Leads), so the accurate word is "Internal", not
 * "Private". The public/private toggle itself is unchanged; this only renames
 * the not-public state for team accounts.
 */
export function privateScopeLabel(isTeam: boolean): "Private" | "Internal" {
  return isTeam ? "Internal" : "Private";
}

/**
 * Whether an account sits in a team/org context for scoring-visibility
 * purposes. Single users (free / pro) are not; team and pulse accounts are.
 * Pulse isn't folded into the scan flow yet, but we treat it as a team context
 * now so labels are correct the moment it is (#290 / #301).
 */
export function isTeamScope(tier: string | null | undefined): boolean {
  return tier === "team" || tier === "pulse";
}

/**
 * Whether an account may save a score privately at all. Free accounts cannot —
 * private scoring is a paid feature (#290). Every paid/team tier can.
 */
export function canScorePrivately(tier: string | null | undefined): boolean {
  return tier === "pro" || tier === "team" || tier === "pulse";
}
