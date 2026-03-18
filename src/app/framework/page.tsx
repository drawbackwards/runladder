import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Ladder Framework — How UX Quality Is Measured",
  description:
    "Five levels from Functional to Meaningful. Learn how Ladder scores every experience on a 1.0 to 5.0 scale.",
};

const LEVELS = [
  {
    score: 1,
    label: "Functional",
    color: "text-ladder-red",
    border: "border-ladder-red/30",
    bg: "bg-ladder-red/5",
    tagline: "It works. Barely.",
    description:
      "The user fights the product. Navigation is confusing, actions are unclear, and completing basic tasks requires trial and error. Built for engineering requirements, not human needs. Users feel frustrated and lost.",
    experienceTest:
      "Can the user complete their primary task without outside help?",
    signals: [
      "No clear visual hierarchy",
      "Primary actions buried or missing",
      "No feedback states",
      "Confusing navigation",
      "Walls of undifferentiated text",
    ],
  },
  {
    score: 2,
    label: "Usable",
    color: "text-ladder-orange",
    border: "border-ladder-orange/30",
    bg: "bg-ladder-orange/5",
    tagline: "Tasks complete with effort.",
    description:
      "Basic structure exists. Users can accomplish goals, but it takes more effort than it should. The interface doesn't guide — it presents. Users tolerate it but would switch to something better without hesitation.",
    experienceTest:
      "Can the user complete their task without stopping to think about the interface?",
    signals: [
      "Inconsistent patterns across screens",
      "Unclear information hierarchy",
      "Missing or misleading affordances",
      "Cognitive load higher than necessary",
      "User succeeds despite the design, not because of it",
    ],
  },
  {
    score: 3,
    label: "Comfortable",
    color: "text-ladder-yellow",
    border: "border-ladder-yellow/30",
    bg: "bg-ladder-yellow/5",
    tagline: "No thinking required. The modern minimum.",
    description:
      "Everything is where expected. The interface is intuitive — users feel their way through without conscious thought. Friction is removed. Patterns are consistent. This is the modern minimum bar for professional software. Level 3 must be earned.",
    experienceTest:
      "Does the interface feel intuitive? Can users navigate by feel rather than by reading?",
    signals: [
      "Consistent visual language throughout",
      "Clear information hierarchy",
      "Intuitive navigation patterns",
      "Appropriate feedback for every action",
      "Accessibility basics in place",
    ],
  },
  {
    score: 4,
    label: "Delightful",
    color: "text-ladder-delightful",
    border: "border-ladder-delightful/30",
    bg: "bg-ladder-delightful/5",
    tagline: "Anticipates needs. Users refer others.",
    description:
      "The product actively helps. It's tailored and assistive — the UI adapts to context, surfaces the right information at the right moment, and packages complexity into quick decisions. Users don't just complete tasks; they feel supported. They tell others about it.",
    experienceTest:
      "Does the interface actively assist the user? Does it anticipate what they need next?",
    signals: [
      "Contextual help and guidance",
      "Smart defaults that reduce decisions",
      "Progressive disclosure of complexity",
      "Personalized or adaptive interfaces",
      "Moments of surprise and satisfaction",
    ],
  },
  {
    score: 5,
    label: "Meaningful",
    color: "text-ladder-white",
    border: "border-white/30",
    bg: "bg-white/5",
    tagline: "Irreplaceable.",
    description:
      "The experience has become trusted and irreplaceable. It changed how the user thinks, works, or lives. Unique workflows, loyalty features, and addictive loops make switching unthinkable. The user can't imagine going back. Level 5 is the ceiling — it represents the best experiences humans have ever built.",
    experienceTest:
      "Has this experience become irreplaceable? Would the user feel genuine loss without it?",
    signals: [
      "Unique value that can't be replicated elsewhere",
      "Deep integration into the user's workflow or life",
      "Emotional attachment to the product",
      "Active advocacy — users recruit others",
      "The product defines its category",
    ],
  },
];

export default function FrameworkPage() {
  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">The Ladder Framework</h1>
          <p className="text-lg text-muted max-w-xl mx-auto">
            Every experience is scored from 1.0 to 5.0 — a single number that
            captures how well a product serves the human using it. Developed over
            two decades of product design work.
          </p>
        </div>

        {/* Reality check */}
        <div className="bg-card border border-border rounded-xl p-6 mb-16 text-center">
          <p className="text-sm text-muted">
            <span className="text-foreground font-semibold">Honest scoring is everything.</span>{" "}
            Most products are Level 1 or 2. Level 3 (Comfortable) is the modern
            minimum bar — it must be earned. Level 5 is the ceiling. Ladder
            doesn&apos;t flatter.
          </p>
        </div>

        {/* Levels */}
        <div className="space-y-8">
          {LEVELS.map((level) => (
            <div
              key={level.score}
              className={`border ${level.border} ${level.bg} rounded-2xl p-8`}
            >
              <div className="flex items-baseline gap-4 mb-4">
                <span
                  className={`font-mono text-4xl font-bold ${level.color}`}
                >
                  {level.score}
                </span>
                <div>
                  <h2 className={`font-mono text-lg font-semibold ${level.color}`}>
                    {level.label}
                  </h2>
                  <p className="text-sm text-muted">{level.tagline}</p>
                </div>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed mb-6">
                {level.description}
              </p>

              <div className="mb-6">
                <p className="font-mono text-xs text-muted uppercase tracking-wider mb-2">
                  Experience test
                </p>
                <p className={`text-sm italic ${level.color}`}>
                  {level.experienceTest}
                </p>
              </div>

              <div>
                <p className="font-mono text-xs text-muted uppercase tracking-wider mb-2">
                  Signals
                </p>
                <ul className="space-y-1">
                  {level.signals.map((signal) => (
                    <li key={signal} className="text-sm text-muted flex items-start gap-2">
                      <span className={`${level.color} mt-1 text-xs`}>--</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Domains */}
        <div className="mt-16 border-t border-border pt-16">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Scores any experience
          </h2>
          <p className="text-muted text-center max-w-lg mx-auto mb-10">
            Ladder isn&apos;t just for apps. The framework adapts to any domain
            where humans interact with a designed experience.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "B2B Interfaces", desc: "Dashboards, SaaS, admin tools" },
              { name: "B2C Products", desc: "Apps, e-commerce, social" },
              { name: "Processes", desc: "Onboarding, checkout, workflows" },
              { name: "Services", desc: "Support, events, physical spaces" },
            ].map((domain) => (
              <div
                key={domain.name}
                className="border border-border rounded-xl p-4 bg-card text-center"
              >
                <p className="font-mono text-xs font-semibold text-foreground mb-1">
                  {domain.name}
                </p>
                <p className="text-xs text-muted">{domain.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/score"
            className="inline-block bg-ladder-green text-background font-semibold px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors"
          >
            Score your first screen — free
          </Link>
        </div>
      </div>
    </div>
  );
}
