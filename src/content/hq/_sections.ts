/**
 * /hq section manifest. Source of truth for sidebar order, slugs,
 * titles, and intent. Each entry has a matching `<slug>.mdx` file in
 * this directory rendered at /hq/<slug>.
 *
 * Section pages are seeded by Sara (Claude) from platform memory and
 * the live codebase. Owners are not displayed per page; surface
 * ownership lives on the Team Assignments page.
 */

export type HqSection = {
  slug: string;
  title: string;
  intent: string;
};

export const HQ_SECTIONS: HqSection[] = [
  {
    slug: "overview",
    title: "Platform Overview",
    intent: "What each Ladder surface is, who it's for, and how they connect.",
  },
  {
    slug: "architecture",
    title: "Architecture",
    intent: "Shared engine, shared auth, shared billing. The system in one diagram.",
  },
  {
    slug: "journeys",
    title: "User Journeys",
    intent: "Sign up, score, upgrade flows for each surface (web, plugin, Skill).",
  },
  {
    slug: "roles",
    title: "Roles",
    intent: "Free, Pro, Team Leader, Team Member, Admin, Super Admin. What each can do.",
  },
  {
    slug: "features",
    title: "Feature Inventory",
    intent: "Shipped, in-flight, roadmap. Tagged by surface and role. Linked to PRs.",
  },
  {
    slug: "team",
    title: "Team Assignments",
    intent: "Who owns what surface, on-call, escalation paths.",
  },
  {
    slug: "api",
    title: "API Protocols",
    intent: "Auth, rate limits, versioning, MCP and Skill usage, key rotation, prompt-leak rule.",
  },
  {
    slug: "decisions",
    title: "Decisions Log",
    intent: "The why behind big choices, so the team rides the strategy not just the tasks.",
  },
  {
    slug: "glossary",
    title: "Glossary",
    intent: "Ladder vocab so the team doesn't drift on what Comfortable vs Delightful means.",
  },
  {
    slug: "brand",
    title: "Brand",
    intent: "Ladder vs Drawbackwards split, level order 5 to 1, voice, no emojis.",
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    intent: "What's in flight this week, what's queued, what's been shipped.",
  },
];

export function findSection(slug: string): HqSection | undefined {
  return HQ_SECTIONS.find((s) => s.slug === slug);
}
