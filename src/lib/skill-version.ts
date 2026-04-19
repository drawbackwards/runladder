/**
 * Skill bundle version — source of truth.
 *
 * Bump when shipping changes to skill/SKILL.md, skill/README.md, or
 * skill/scripts/*. Add a matching entry in skill/CHANGELOG.md.
 *
 * scripts/sync-skill-version.mjs writes this value into skill/VERSION
 * before build:skill zips the bundle, so the file inside the .zip stays
 * in sync with this constant automatically.
 */
export const CURRENT_SKILL_VERSION = "1.0.0";
