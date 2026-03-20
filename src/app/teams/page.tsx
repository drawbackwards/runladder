import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ladder for Teams | The quality standard for design organizations",
  description:
    "Give your design team a shared quality bar. Brand standards, custom rubrics, designer dashboards, and score trends, all managed from one place. $12,000/year.",
};

const CAPABILITIES = [
  {
    name: "Team Dashboard",
    desc: "Every designer, every score, every trend in one view. See who's improving, who's shipping, and where your team's quality stands right now.",
    detail: "Portfolio score, individual trends, activity feed, improvement velocity",
  },
  {
    name: "Brand Standards",
    desc: "Upload your brand guidelines. Ladder scores every screen against them automatically. Every score reflects your brand, not just generic UX principles.",
    detail: "Brand voice, visual identity, interaction patterns, tone rules",
  },
  {
    name: "Leadership Lens",
    desc: "Your VP of Design has opinions that no framework captures. Encode them. 'We never use modals.' 'Density is intentional.' 'Every screen needs a clear back path.' Ladder learns what your leadership cares about.",
    detail: "Custom rules, weighted priorities, team-specific quality definitions",
  },
  {
    name: "Design System Compliance",
    desc: "Connect your design system. Ladder checks every screen against your tokens, components, and patterns, then tells designers exactly where they drifted.",
    detail: "Figma library sync, token validation, component coverage, drift detection",
  },
  {
    name: "Custom Rubric Weights",
    desc: "Care more about accessibility than visual polish? Prioritize information hierarchy over delight? Adjust the scoring weights. The Ladder score reflects your team's priorities.",
    detail: "Dimension weighting, category emphasis, scoring calibration",
  },
  {
    name: "Designer Management",
    desc: "Invite designers by email. See each person's score history, improvement trajectory, and areas of strength. Know who needs coaching before they ask for it.",
    detail: "Invite flow, individual profiles, skill mapping, coaching signals",
  },
];

const WHAT_CHANGES = [
  {
    before: "Designers score in isolation",
    after: "Every score factors in your brand standards, leadership lens, and design system automatically",
  },
  {
    before: "Quality is subjective across the team",
    after: "One number, calibrated to your organization's definition of good",
  },
  {
    before: "You find out about quality problems at review time",
    after: "Dashboard shows drift in real time. Intervene early, not late",
  },
  {
    before: "Design system compliance is a manual audit",
    after: "Every score includes a compliance check against your tokens and components",
  },
  {
    before: "No way to measure team improvement over time",
    after: "Portfolio score trends, individual growth curves, velocity metrics",
  },
];

const TIER = {
  name: "Teams",
  price: "$12,000",
  period: "/ year",
  features: [
    "Team leader dashboard on runladder.com",
    "Add and manage up to ten designers",
    "Team knowledge base (brand standards + leadership lens)",
    "Per-designer scores, trends, and leaderboard",
    "Design system compliance scoring",
    "Unlimited scores on all surfaces (web, Figma, Claude)",
    "Priority support",
  ],
};

export default function TeamsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-40 pb-36 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-8">
            Ladder for Teams
          </p>
          <h1 className="text-[3.5rem] md:text-[5rem] font-bold tracking-tight leading-[1.05] mb-8">
            Your standards.{" "}
            <span className="text-ladder-green">Every score.</span>
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto mb-12 leading-relaxed">
            Load your brand standards, encode your design leadership's
            priorities, connect your design system, and every Ladder score
            your team runs reflects what quality means to{" "}
            <em>your</em> organization. Not generic. Yours.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/contact"
              className="bg-ladder-green text-background font-semibold px-8 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-base"
            >
              Talk to us about Teams
            </Link>
            <Link
              href="/framework"
              className="text-body border border-border px-8 py-4 rounded-full hover:text-foreground hover:border-muted transition-colors text-base"
            >
              Learn the framework
            </Link>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            The gap
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            Generic quality frameworks{" "}
            <br />
            <span className="text-body">
              don&rsquo;t know your brand.
            </span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Your design team has standards that go beyond basic UX. You
              have a brand voice. You have a design system. Your VP of
              Design has specific things they care about that no external
              tool knows. When a new designer joins, it takes months
              before they internalize all of it.
            </p>
            <p>
              A Ladder score is already honest. But a Ladder score
              calibrated to your organization is transformative. It
              doesn't just tell a designer &ldquo;this screen is a
              2.4.&rdquo; It tells them &ldquo;this screen is a 2.4
              because it violates your brand's density principles and
              drifts from your design system's spacing tokens.&rdquo;
            </p>
            <p className="text-foreground font-medium">
              Teams turns Ladder from a universal quality score into your
              team's quality score. Same rigor, your rules.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              What you control
            </p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold mb-6">
              A dashboard built for{" "}
              <span className="text-ladder-green">design leaders.</span>
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              Log in to runladder.com. See your team. Manage your
              standards. Watch quality improve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.name}
                className="border border-border rounded-xl p-8 bg-card hover:bg-card-hover hover:border-muted transition-colors"
              >
                <h3 className="font-mono text-sm font-bold text-ladder-green mb-3">
                  {cap.name}
                </h3>
                <p className="text-sm text-body leading-relaxed mb-4">
                  {cap.desc}
                </p>
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest">
                  {cap.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              The shift
            </p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold mb-6">
              What changes{" "}
              <span className="text-ladder-green">on day one.</span>
            </h2>
          </div>

          <div className="space-y-3">
            {WHAT_CHANGES.map((item) => (
              <div
                key={item.before}
                className="border border-border rounded-xl bg-card p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center">
                  <div>
                    <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                      Before
                    </p>
                    <p className="text-sm text-body leading-relaxed">
                      {item.before}
                    </p>
                  </div>
                  <div className="hidden md:block text-ladder-green text-lg">
                    &rarr;
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-ladder-green uppercase tracking-widest mb-2">
                      With Teams
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {item.after}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Designers Experience It */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            For your designers
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            Nothing changes for them.{" "}
            <br />
            <span className="text-ladder-green">Everything improves.</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Designers keep using the Figma plugin or runladder.com
              exactly as they do now. They hit &ldquo;Score This
              Screen&rdquo; and get a Ladder score with coaching cards.
            </p>
            <p>
              The difference: behind the scenes, their score now factors
              in your brand standards, your leadership's priorities, and
              your design system. The coaching cards don't just say
              &ldquo;improve spacing.&rdquo; They say &ldquo;your 12px
              gap doesn't match your system's 16px base unit.&rdquo;
            </p>
            <p className="text-foreground font-medium">
              Zero onboarding friction. Every designer gets your team's
              quality DNA baked into every score, from their first day.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              Pricing
            </p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold mb-6">
              Annual plans for{" "}
              <span className="text-ladder-green">serious teams.</span>
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              Teams is infrastructure, not a trial. Annual commitment,
              full customization, dedicated support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Try it out — single designer */}
            <div className="rounded-2xl p-8 flex flex-col border border-border bg-card">
              <span className="self-start text-[11px] font-mono uppercase tracking-widest px-3 py-1 mb-6 bg-border/50 text-muted">
                Try it out
              </span>
              <h3 className="text-lg font-bold text-foreground mb-4">
                One Designer
              </h3>

              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[2.5rem] font-bold text-foreground leading-none">
                  $29
                </span>
                <span className="text-sm text-muted">/ mo</span>
              </div>
              <p className="text-xs text-muted mb-6">Test it out with one designer</p>

              <div className="border border-border rounded-lg px-4 py-3 mb-8">
                <p className="font-mono text-xs text-ladder-green">
                  Unlimited scores on all surfaces
                </p>
              </div>

              <ul className="space-y-3 mb-10 flex-1">
                {[
                  "Ladder score with coaching cards",
                  "Per-dimension scoring breakdown",
                  "Full score history + trend line",
                  "Web, Figma, and Claude access",
                ].map((f: string) => (
                  <li
                    key={f}
                    className="text-sm text-body flex items-start gap-2.5"
                  >
                    <span className="text-ladder-green text-xs mt-1 flex-shrink-0">
                      +
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/score"
                className="text-center text-sm font-semibold py-3 rounded-full transition-colors border border-border text-foreground hover:bg-card-hover"
              >
                Start scoring
              </Link>
            </div>

            {/* Teams */}
            <div className="rounded-2xl p-8 flex flex-col border-2 border-ladder-green bg-ladder-green/5">
              <span className="self-start text-[11px] font-mono uppercase tracking-widest px-3 py-1 mb-6 bg-ladder-green/15 text-ladder-green">
                Full team
              </span>
              <h3 className="text-lg font-bold text-foreground mb-4">
                {TIER.name}
              </h3>

              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[2.5rem] font-bold text-foreground leading-none">
                  {TIER.price}
                </span>
                <span className="text-sm text-muted">{TIER.period}</span>
              </div>
              <p className="text-xs text-muted mb-6">Everything your design org needs</p>

              <div className="border border-border rounded-lg px-4 py-3 mb-8">
                <p className="font-mono text-xs text-ladder-green">
                  Unlimited scores on all surfaces
                </p>
              </div>

              <ul className="space-y-3 mb-10 flex-1">
                {TIER.features.map((f: string) => (
                  <li
                    key={f}
                    className="text-sm text-body flex items-start gap-2.5"
                  >
                    <span className="text-ladder-green text-xs mt-1 flex-shrink-0">
                      +
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className="text-center text-sm font-semibold py-3 rounded-full transition-colors bg-ladder-green text-background hover:bg-ladder-green/90"
              >
                Talk to us about Teams
              </Link>
            </div>
          </div>

          {/* Enterprise */}
          <div className="mt-6 border border-border rounded-2xl p-10 bg-card max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div>
                <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                  Enterprise
                </h3>
                <p className="text-sm text-body max-w-lg leading-relaxed">
                  25+ designers, SSO, API access, multi-team dashboards,
                  dedicated CSM, and custom integrations. Priced for your
                  scale.
                </p>
              </div>
              <Link
                href="/contact"
                className="shrink-0 text-center text-sm font-semibold border border-border text-foreground hover:bg-card-hover py-3 px-8 rounded-full transition-colors"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                stat: "20+",
                label: "years of practice",
                detail:
                  "The Ladder framework was built over two decades of real design work at a Fortune 50 agency",
              },
              {
                stat: "10,000+",
                label: "screens scored",
                detail:
                  "Every score is calibrated against a database of real product evaluations",
              },
              {
                stat: "5",
                label: "universal levels",
                detail:
                  "One framework every designer on your team can learn in minutes",
              },
              {
                stat: "Day 1",
                label: "onboarding",
                detail:
                  "New designers inherit your team's quality DNA from their very first score",
              },
            ].map((p) => (
              <div key={p.label} className="text-center">
                <span className="block font-bold text-[2rem] text-foreground mb-1">
                  {p.stat}
                </span>
                <span className="block font-mono text-xs text-ladder-green uppercase tracking-widest mb-3">
                  {p.label}
                </span>
                <p className="text-xs text-muted leading-relaxed">
                  {p.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-[2.5rem] font-bold mb-6">
            Make quality{" "}
            <span className="text-ladder-green">your team's DNA.</span>
          </h2>
          <p className="text-body mb-10 leading-relaxed max-w-lg mx-auto">
            Your brand standards. Your leadership's priorities. Your
            design system. Baked into every score, every coaching card,
            every designer's workflow. From day one.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/contact"
              className="inline-block bg-ladder-green text-background font-semibold px-10 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-lg"
            >
              Talk to us about Teams
            </Link>
            <Link
              href="/score"
              className="text-body border border-border px-8 py-4 rounded-full hover:text-foreground hover:border-muted transition-colors text-base"
            >
              Try a free score
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
