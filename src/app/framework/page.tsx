import type { Metadata } from "next";
import Link from "next/link";
import { LEVELS as LADDER_LEVELS } from "@/lib/ladder";

export const metadata: Metadata = {
  title: "The Ladder Framework | How UX Quality Is Measured",
  description:
    "Five levels from Meaningful to Functional. Learn how Ladder scores every experience on a 1.0 to 5.0 scale.",
};

const LEVELS = [
  {
    score: "5",
    label: LADDER_LEVELS[4].label,
    color: LADDER_LEVELS[4].color,
    tagline: "Irreplaceable.",
    oneLiner:
      "The experience changed how the user thinks, works, or lives. Switching is unthinkable. The user can't imagine going back.",
    experienceTest:
      "Has this experience become irreplaceable? Would the user feel genuine loss without it?",
    signals: [
      "Unique value that can't be replicated",
      "Deep integration into workflow or life",
      "Emotional attachment to the product",
      "Active advocacy: users recruit others",
      "The product defines its category",
    ],
    truth:
      "Level 5 is the ceiling. It represents the best experiences humans have ever built. A handful of products in the world live here.",
  },
  {
    score: "4",
    label: LADDER_LEVELS[3].label,
    color: LADDER_LEVELS[3].color,
    tagline: "Anticipates needs.",
    oneLiner:
      "The product actively helps. It adapts to context, surfaces the right thing at the right moment, and turns complexity into quick decisions. Users tell others about it.",
    experienceTest:
      "Does the interface actively assist the user? Does it anticipate what they need next?",
    signals: [
      "Contextual help and guidance",
      "Smart defaults that reduce decisions",
      "Progressive disclosure of complexity",
      "Personalized or adaptive interfaces",
      "Moments of surprise and satisfaction",
    ],
    truth:
      "This is where products become loved. The team isn't just removing friction. They're adding intelligence.",
  },
  {
    score: "3",
    label: LADDER_LEVELS[2].label,
    color: LADDER_LEVELS[2].color,
    tagline: "No thinking required.",
    oneLiner:
      "Everything where expected. The interface is intuitive, and users feel their way through without conscious thought. This is the modern minimum bar.",
    experienceTest:
      "Does the interface feel intuitive? Can users navigate by feel rather than by reading?",
    signals: [
      "Consistent visual language throughout",
      "Clear information hierarchy",
      "Intuitive navigation patterns",
      "Appropriate feedback for every action",
      "Accessibility basics in place",
    ],
    truth:
      "Level 3 must be earned. This is where the best teams operate. Below this, you're behind. Above this, you're competing for love.",
  },
  {
    score: "2",
    label: LADDER_LEVELS[1].label,
    color: LADDER_LEVELS[1].color,
    tagline: "Tasks complete with effort.",
    oneLiner:
      "Basic structure exists. Users get through, but it takes more effort than it should. They would switch without hesitation.",
    experienceTest:
      "Can the user complete their task without stopping to think about the interface?",
    signals: [
      "Inconsistent patterns across screens",
      "Unclear information hierarchy",
      "Missing or misleading affordances",
      "Cognitive load higher than necessary",
      "User succeeds despite the design",
    ],
    truth:
      "Most apps and websites score here. The work is functional, sometimes even pretty, but the experience still costs the user energy.",
  },
  {
    score: "1",
    label: LADDER_LEVELS[0].label,
    color: LADDER_LEVELS[0].color,
    tagline: "It works. Barely.",
    oneLiner:
      "The user fights the product. Trial, error, frustration. Built for engineering, not humans.",
    experienceTest:
      "Can the user complete their primary task without outside help?",
    signals: [
      "No clear visual hierarchy",
      "Primary actions buried or missing",
      "No feedback on user actions",
      "Confusing navigation",
      "Walls of undifferentiated text",
    ],
    truth:
      "This is where most products live. The team shipped something. The user endures it.",
  },
];

export default function FrameworkPage() {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* ── Hero ── */}
        <div className="text-center mb-24">
          <p className="text-xs font-semibold text-ladder-green uppercase tracking-[0.2em] mb-6">
            The Ladder Framework
          </p>
          <h1 className="text-3xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-8">
            You already know when something<br />
            feels wrong. Now you can{" "}
            <span className="text-ladder-green">prove it.</span>
          </h1>
          <p className="text-base text-body max-w-xl mx-auto leading-relaxed">
            One number. Five levels. Twenty years of product design distilled
            into a universal quality score that tells you exactly where your
            experience stands, and what it takes to reach the next level.
          </p>
        </div>

        {/* ── The hard truth ── */}
        <div className="border border-border bg-card/50 p-8 md:p-10 mb-24 text-center max-w-2xl mx-auto">
          <p className="text-sm text-body leading-relaxed">
            <span className="text-foreground font-semibold">
              Ladder doesn&apos;t flatter.
            </span>{" "}
            Most products are Level 1 or 2. Level 3 is the modern minimum,
            and it must be earned. Level 5 is the ceiling. If you want an honest
            answer, you&apos;re in the right place.
          </p>
        </div>

        {/* ── The scale ── */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">
              The five levels
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-0">
            {LEVELS.map((level, i) => (
              <div
                key={level.score}
                className="group"
              >
                {/* Level row */}
                <div className="grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] gap-6 md:gap-10 py-10 border-b border-border">
                  {/* Score number */}
                  <div className="flex flex-col items-center pt-1">
                    <span
                      className="text-4xl md:text-5xl font-bold"
                      style={{ color: level.color }}
                    >
                      {level.score}
                    </span>
                  </div>

                  {/* Content */}
                  <div>
                    {/* Label + tagline */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-3 mb-1">
                        <h2
                          className="text-base font-bold uppercase tracking-wider"
                          style={{ color: level.color }}
                        >
                          {level.label}
                        </h2>
                        <span className="text-sm text-muted">
                          {level.tagline}
                        </span>
                      </div>
                      <p className="text-sm text-body leading-relaxed mt-3">
                        {level.oneLiner}
                      </p>
                    </div>

                    {/* Experience test */}
                    <div className="mb-5 pl-4 border-l-2" style={{ borderColor: level.color + "40" }}>
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.15em] mb-1.5">
                        Experience test
                      </p>
                      <p className="text-sm italic" style={{ color: level.color }}>
                        &ldquo;{level.experienceTest}&rdquo;
                      </p>
                    </div>

                    {/* Signals */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {level.signals.map((signal) => (
                        <span
                          key={signal}
                          className="text-[10px] text-muted border border-border px-2.5 py-1 tracking-wide"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>

                    {/* Truth */}
                    <p className="text-xs text-muted leading-relaxed">
                      {level.truth}
                    </p>
                  </div>
                </div>

                {/* Progress marker between levels */}
                {i < LEVELS.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-6 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── How scoring works ── */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">
              How it works
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Drop a screen",
                body: "Upload a screenshot or enter a URL. Ladder captures the experience exactly as users see it.",
              },
              {
                step: "02",
                title: "AI evaluates against the framework",
                body: "Visual hierarchy, interaction patterns, spacing, feedback, accessibility: scored against twenty years of product design criteria.",
              },
              {
                step: "03",
                title: "Get your score and a path forward",
                body: "One number. Ranked findings by impact. The exact changes that will move you to the next level.",
              },
            ].map((item) => (
              <div key={item.step} className="border border-border bg-card/30 p-6">
                <span className="text-[10px] font-semibold text-ladder-green tracking-[0.2em]">
                  {item.step}
                </span>
                <h3 className="text-sm font-bold text-foreground mt-3 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-body leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Domains ── */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">
              Scores any experience
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-sm text-body text-center max-w-lg mx-auto mb-10 leading-relaxed">
            Ladder adapts to any domain where humans interact with a designed
            experience. The framework is universal. The evaluation is specific.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "B2B Interfaces", desc: "Dashboards, SaaS, admin tools" },
              { name: "B2C Products", desc: "Apps, e-commerce, social" },
              { name: "Processes", desc: "Onboarding, checkout, workflows" },
              { name: "Services", desc: "Support, events, physical spaces" },
            ].map((domain) => (
              <div
                key={domain.name}
                className="border border-border bg-card/30 p-5 text-center"
              >
                <p className="text-[11px] font-bold text-foreground mb-1">
                  {domain.name}
                </p>
                <p className="text-[11px] text-muted">{domain.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="text-center pt-8 border-t border-border">
          <p className="text-lg font-bold text-foreground mb-3">
            Ready to see where you stand?
          </p>
          <p className="text-sm text-body mb-8">
            Your first score is free. No signup required.
          </p>
          <Link
            href="/score"
            className="inline-block font-semibold bg-ladder-green text-background px-10 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-sm"
          >
            Score a screen
          </Link>
        </div>
      </div>
    </div>
  );
}
