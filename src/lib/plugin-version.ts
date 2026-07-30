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
 * Bump cadence: every Figma-marketplace submission. This is the "latest
 * available" value; the plugin's installed version is PLUGIN_VERSION in
 * ai-design-assistant's plugin/ui.html. Set this to the SAME value at the
 * moment the new build is published to the marketplace — not before (users
 * get nagged toward a build they can't download) and not after (new installs
 * get a backwards "downgrade" nag). See /hq/architecture → Versioning for the
 * full plugin release sequence.
 */
export const CURRENT_PLUGIN_VERSION = "1.13.1";
