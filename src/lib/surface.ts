/**
 * Score names carry a surface suffix like "Login (Figma)" / "Onboarding
 * (Skill)" (added in scores.ts when a score is persisted). This module strips
 * that suffix from the display name and exposes the surface so a UI can render
 * it as a tag instead of inline text (#299).
 *
 * Recognized surfaces: figma, skill (Ladder for Claude), web, claude, pulse.
 */
export const SURFACE_SUFFIX_RE = /\s*\((figma|skill|web|claude|pulse)\)\s*$/i;

export function surfaceParts(label: string): {
  name: string;
  surface: string;
} {
  const m = label.match(SURFACE_SUFFIX_RE);
  // No suffix means the score was made on the web app — the default surface.
  // Every score gets a surface tag (no untagged rows).
  if (!m) return { name: label, surface: "Web" };
  const s = m[1].toLowerCase();
  return {
    name: label.replace(SURFACE_SUFFIX_RE, "").trim(),
    surface: s.charAt(0).toUpperCase() + s.slice(1),
  };
}
