/**
 * Runladder web app + Ladder API versions — source of truth.
 *
 * Bump when shipping user-visible changes (app) or contract changes (API).
 * Always add a matching entry in CHANGELOG.md at the repo root. Both
 * constants propagate via the footer, API response headers, and anywhere
 * else the version is surfaced.
 *
 * Co-located with skill-version.ts so all Ladder-surface version
 * constants live under src/lib and are easy to find + bump together.
 *
 * This constant is the SOURCE OF TRUTH for the web app product version.
 * `package.json`'s `version` field is a build-metadata mirror of it (it is
 * not read at runtime); keep the two in lockstep. See /hq/architecture →
 * Versioning and the /hq/decisions versioning-convention entry.
 */

// runladder.com (this web app). Visible in the footer. Mirror this value
// into package.json's `version` field on every bump.
export const CURRENT_APP_VERSION = "0.5.4";

// Ladder API (plugin/analyze, framework, score, skill/score, etc.). Sent
// back to every API caller via the X-Ladder-API-Version response header
// so clients can log which contract they hit.
export const CURRENT_API_VERSION = "1.0.0";
