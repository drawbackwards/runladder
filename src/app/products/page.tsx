import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Products — Ladder",
  description:
    "One quality score across every surface. Score in your browser, in Figma, from customer feedback, through Claude, or via API.",
};

const SURFACES = [
  {
    name: "runladder.com",
    badge: "Web",
    tagline: "Upload a screenshot. Get the truth.",
    description:
      "The fastest path to knowing where your product stands. Drop a screenshot, paste a URL, or upload a design — and get an honest Ladder score in seconds. No installs, no plugins, no friction. Just the truth about your experience quality.",
    features: [
      "Overall Ladder score with per-rung breakdown",
      "Ranked findings with exact fix instructions",
      "Score uplift estimates for each fix",
      "Score history and trend tracking",
      "Shareable score cards",
    ],
    cta: "Score a screen free",
    href: "/score",
    available: true,
  },
  {
    name: "Ladder for Figma",
    badge: "Plugin",
    tagline: "Know your score before you hand off.",
    description:
      "Score any frame while you design. The plugin sees your actual layout, typography, color, spacing, and hierarchy — and scores it against the Ladder framework in context. Stop shipping screens that look done but feel broken.",
    features: [
      "In-canvas scoring — select a frame, get a score",
      "Per-rung breakdown (Meaningful through Functional)",
      "Coaching cards with fix-by-fix guidance",
      "Design system generation from your existing patterns",
      "Score history per frame with trend indicators",
    ],
    cta: "Install from Figma Community",
    href: "#",
    available: true,
  },
  {
    name: "Ladder Pulse",
    badge: "Feedback Intelligence",
    tagline: "Score the lived experience, not just the screen.",
    description:
      "Screens only tell half the story. Pulse ingests what real people say — customer reviews, support logs, survey responses, field reports, NPS comments — and scores the actual lived experience against the Ladder framework. The gap between your screen score and your Pulse score is where the real work lives.",
    features: [
      "Ingest reviews, surveys, support tickets, field reports",
      "Per-rung scoring from real human language",
      "AI-to-screen gap analysis (screen score vs lived experience)",
      "Domain-specific rubrics (B2B, B2C, Process, Service)",
      "Trend tracking across feedback windows",
    ],
    cta: "Learn about Pulse",
    href: "/pulse",
    available: true,
  },
  {
    name: "Ladder for Claude",
    badge: "AI Skill",
    tagline: "Quality check mid-conversation.",
    description:
      "Building with AI? Get a Ladder score without leaving the conversation. Ask Claude to score a screenshot, and it uses the same framework, same calibration, same honesty. Know if what you generated is a 2.1 or a 3.8 before anyone else sees it.",
    features: [
      "Score screenshots inside any Claude conversation",
      "Same Ladder framework as every other surface",
      "Scores attributed to your Ladder account",
      "Works with Claude.ai and the Claude API",
    ],
    cta: "Coming soon",
    href: "#",
    available: false,
  },
  {
    name: "Ladder API",
    badge: "Infrastructure",
    tagline: "Bake quality into your pipeline.",
    description:
      "Every deploy, every PR, every AI-generated screen — automatically scored before it reaches users. The API is the backbone that powers every Ladder surface and is available for you to integrate into your own tools, CI/CD pipelines, and AI workflows.",
    features: [
      "REST API with per-rung scoring",
      "MCP server for AI agent integration",
      "Batch scoring for portfolios and audits",
      "Webhook support for CI/CD pipelines",
      "Per-call pricing with generous free tier",
    ],
    cta: "View the docs",
    href: "/api",
    available: true,
  },
  {
    name: "Drawbackwards Consulting",
    badge: "Expert Services",
    tagline: "The team behind Ladder, embedded with yours.",
    description:
      "Some problems need more than a score — they need the people who built the scoring system. Drawbackwards brings 20 years of design execution to your team: sprint-by-sprint design work, Ladder-powered audits, design system builds, team mentoring, and custom Pulse deployments for enterprise feedback intelligence.",
    features: [
      "Ladder-scored UX audits with prioritized roadmaps",
      "Design system creation and migration",
      "Competitive analysis with benchmark reports",
      "Team skill evaluation and mentoring",
      "Custom Pulse deployments for in-house teams",
    ],
    cta: "Work with Drawbackwards",
    href: "https://drawbackwards.com",
    available: true,
  },
];

export default function ProductsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-8">
            The platform
          </p>
          <h1 className="text-[3rem] md:text-[4rem] font-bold tracking-tight leading-[1.05] mb-8">
            One score.{" "}
            <span className="text-ladder-green">Every surface.</span>
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto leading-relaxed">
            Score in your browser, in Figma, from customer feedback, through
            Claude, or via API. Every score feeds the same account, the same
            history, the same truth.
          </p>
        </div>
      </section>

      {/* Architecture diagram */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="border border-border rounded-xl bg-card p-10">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-8 text-center">
              How it connects
            </p>
            <div className="space-y-3 font-mono text-sm text-body">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-ladder-green flex-shrink-0" />
                <span>runladder.com</span>
                <span className="flex-1 border-b border-dashed border-border" />
                <span className="text-muted text-xs">web</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-ladder-green flex-shrink-0" />
                <span>Ladder for Figma</span>
                <span className="flex-1 border-b border-dashed border-border" />
                <span className="text-muted text-xs">plugin</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-ladder-green flex-shrink-0" />
                <span>Ladder Pulse</span>
                <span className="flex-1 border-b border-dashed border-border" />
                <span className="text-muted text-xs">feedback</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#555] flex-shrink-0" />
                <span className="text-muted">Ladder for Claude</span>
                <span className="flex-1 border-b border-dashed border-border" />
                <span className="text-muted text-xs">coming soon</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-ladder-green flex-shrink-0" />
                <span>Ladder API</span>
                <span className="flex-1 border-b border-dashed border-border" />
                <span className="text-muted text-xs">infrastructure</span>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted leading-relaxed">
                All surfaces share one scoring engine, one account, one history,
                one subscription.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Individual surfaces */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {SURFACES.map((surface) => (
            <div
              key={surface.name}
              className="border border-border rounded-xl bg-card p-8 md:p-10"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                    {surface.badge}
                  </span>
                  <h2 className="text-xl font-bold text-foreground mt-1">
                    {surface.name}
                  </h2>
                </div>
                {!surface.available && (
                  <span className="font-mono text-[10px] text-[#555] uppercase tracking-widest border border-[#333] px-3 py-1 rounded-full">
                    Coming soon
                  </span>
                )}
              </div>

              <p className="text-base font-semibold text-foreground mb-4">
                {surface.tagline}
              </p>

              <p className="text-sm text-body leading-relaxed mb-6">
                {surface.description}
              </p>

              <ul className="space-y-2 mb-8">
                {surface.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-body"
                  >
                    <span className="text-ladder-green mt-0.5 flex-shrink-0">
                      +
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {surface.available && (
                <Link
                  href={surface.href}
                  className="inline-block text-sm font-semibold text-ladder-green hover:underline"
                >
                  {surface.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Shared infrastructure */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            One subscription. Every surface.
          </p>
          <h2 className="text-[2rem] font-bold mb-6">
            Your score is your score.{" "}
            <span className="text-body">Everywhere.</span>
          </h2>
          <p className="text-body leading-relaxed max-w-xl mx-auto mb-10">
            Score a screen on the web, check it in Figma, reference it in
            Claude, pull it from the API — it&apos;s the same score, the same
            history, the same account. One subscription unlocks every surface.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/pricing"
              className="text-body border border-border px-8 py-4 rounded-full hover:text-foreground hover:border-muted transition-colors text-base"
            >
              View pricing
            </Link>
            <Link
              href="/score"
              className="bg-ladder-green text-background font-semibold px-8 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-base"
            >
              Score a screen — free
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
