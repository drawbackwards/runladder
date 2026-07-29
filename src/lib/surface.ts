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

/**
 * Canonical surfaces for usage attribution (#401). The ticket calls for three:
 * web, Figma, and the Claude skill. Pulse is a separate SOW/product and is not
 * pooled here, so it is deliberately not a usage surface.
 */
export const USAGE_SURFACES = ["web", "figma", "skill"] as const;
export type UsageSurface = (typeof USAGE_SURFACES)[number];

/** Human labels for the usage breakdown UI. */
export const USAGE_SURFACE_LABEL: Record<UsageSurface, string> = {
  web: "Web",
  figma: "Figma",
  skill: "Claude Skill",
};

/**
 * Map a persisted score `source` to a canonical usage surface (#401).
 * `source` is set at persist time: "upload"/"url"/"org" (web-originated),
 * "figma", "claude-skill". Anything unrecognized falls back to web — the same
 * default `surfaceParts` uses for an untagged label.
 */
export function surfaceFromSource(source: string | null | undefined): UsageSurface {
  const s = (source || "").toLowerCase().trim();
  if (s === "figma") return "figma";
  if (s === "claude-skill" || s === "skill" || s === "claude") return "skill";
  return "web";
}
