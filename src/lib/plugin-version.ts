/**
 * Figma plugin bundle version — source of truth.
 *
 * Bump when publishing a new build of the Figma plugin to the
 * marketplace. The plugin sends X-Ladder-Plugin-Version on its calls;
 * runladder compares against this constant and surfaces an
 * "Update available" banner on the dashboard + inside the plugin UI.
 *
 * Co-located with skill-version.ts and app-version.ts so all Ladder
 * surface versions live next to each other.
 *
 * Bump cadence: every Figma-marketplace submission. Update at the same
 * time as LADDER_PLUGIN_VERSION in ai-design-assistant's plugin/ui.html
 * (they must match) and add a release note somewhere user-visible.
 */
export const CURRENT_PLUGIN_VERSION = "1.11.5";
