/**
 * /hq section manifest. Source of truth for sidebar order, slugs,
 * titles, owners, and intent. Each entry has a matching `<slug>.mdx`
 * file in this directory rendered at /hq/<slug>.
 */

export type HqSection = {
  slug: string;
  title: string;
  owner: string;
  intent: string;
};

export const HQ_SECTIONS: HqSection[] = [
  {
    slug: "overview",
    title: "Platform Overview",
    owner: "Ward",
    intent: "What each Ladder surface is, who it's for, and how they connect.",
  },
  {
    slug: "architecture",
    title: "Architecture",
    owner: "Ward",
    intent: "Shared engine, shared auth, shared billing. The system in one diagram.",
  },
  {
    slug: "journeys",
    title: "User Journeys",
    owner: "Chester",
    intent: "Sign up, score, upgrade flows for each surface (web, plugin, Skill).",
  },
  {
    slug: "roles",
    title: "Roles",
    owner: "Ward",
    intent: "Free, Pro, Team Leader, Team Member, Admin, Super Admin. What each can do.",
  },
  {
    slug: "features",
    title: "Feature Inventory",
    owner: "Michael",
    intent: "Shipped, in-flight, roadmap. Tagged by surface and role. Linked to PRs.",
  },
  {
    slug: "team",
    title: "Team Assignments",
    owner: "Michael",
    intent: "Who owns what surface, on-call, escalation paths.",
  },
  {
    slug: "api",
    title: "API Protocols",
    owner: "Ward",
    intent: "Auth, rate limits, versioning, MCP and Skill usage, key rotation, prompt-leak rule.",
  },
  {
    slug: "decisions",
    title: "Decisions Log",
    owner: "Ward",
    intent: "The why behind big choices, so the team rides the strategy not just the tasks.",
  },
  {
    slug: "glossary",
    title: "Glossary",
    owner: "Michael",
    intent: "Ladder vocab so the team doesn't drift on what Comfortable vs Delightful means.",
  },
  {
    slug: "brand",
    title: "Brand",
    owner: "Jordan",
    intent: "Ladder vs Drawbackwards split, level order 5→1, voice, no emojis.",
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    owner: "Michael",
    intent: "Live view of the GitHub Project. What's in flight this week, this month.",
  },
];

export function findSection(slug: string): HqSection | undefined {
  return HQ_SECTIONS.find((s) => s.slug === slug);
}
