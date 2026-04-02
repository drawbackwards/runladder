import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | Ladder",
  description:
    "Score your first screen free. Screen Score from $0 to $500/mo. Ladder Pulse starting at $5,000/mo.",
};

const SCREEN_SCORE_TIERS = [
  {
    name: "Web and Claude",
    price: "$0",
    period: "forever",
    highlight: false,
    limit: "5 scores / month",
    features: [
      "Overall Ladder score + coaching",
      "Score from the web or Claude",
      "Scores may be published publicly",
    ],
    cta: "Start free",
    href: "/score",
    solidCta: true,
  },
  {
    name: "Professional",
    price: "$50",
    period: "/ mo",
    highlight: true,
    limit: "Unlimited scores",
    features: [
      "Everything in Free",
      "All scores are private",
      "UX copy suggestions",
      "Accessibility audit",
      "Per-dimension scoring (hierarchy, spacing, copy, a11y, navigation, visual)",
      "Full score history + trend line",
      "Fix suggestions with score uplift",
      "Access to Pulse data (if subscribed)",
    ],
    cta: "Subscribe",
    href: "/score",
    solidCta: false,
  },
  {
    name: "Team",
    price: "Custom",
    period: "",
    highlight: false,
    limit: "Unlimited everything",
    features: [
      "Everything in Professional",
      "All scores are private",
      "Up to 5 team members, $100 / additional seat",
      "Team leaderboard + portfolio score",
      "Design system compliance scoring",
      "Manager dashboard + performance tracking",
      "Access to Pulse data (if subscribed)",
    ],
    cta: "Talk to us about Ladder",
    href: "/contact",
    solidCta: false,
  },
];

export default function PricingPage() {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-20">
          <h1 className="text-[2.5rem] font-bold mb-6">
            Simple pricing. Score your first screen free.
          </h1>
          <p className="text-body max-w-lg mx-auto leading-relaxed">
            One subscription works across every Ladder surface: web
            and Claude. Start free, upgrade when you need more.
          </p>
        </div>

        {/* Section headers with extending lines */}
        <div className="hidden lg:grid grid-cols-4 gap-6 mb-4">
          <div className="col-span-3 flex items-center gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-ladder-green whitespace-nowrap">
              Ladder Screen Scoring
            </span>
            <div className="flex-1 h-px bg-ladder-green/30" />
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-ladder-purple whitespace-nowrap">
              Ladder Pulse Scoring
            </span>
            <div className="flex-1 h-px bg-ladder-purple/30" />
          </div>
        </div>

        {/* Four-column grid: 3 Screen Score + 1 Pulse */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Screen Score tiers */}
          {SCREEN_SCORE_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 flex flex-col ${
                tier.highlight
                  ? "border-2 border-ladder-green bg-ladder-green/5"
                  : "border-2 border-ladder-green/30 bg-card"
              }`}
            >
              {/* Name */}
              <h2 className="text-lg font-bold text-foreground mb-4">
                {tier.name}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[2.5rem] font-bold text-foreground leading-none">
                  {tier.price}
                </span>
                <span className="text-sm text-muted">{tier.period}</span>
              </div>
              <div className="mb-6" />

              {/* Usage limit */}
              <div className="border border-border rounded-lg px-4 py-3 mb-8">
                <p className="font-mono text-xs text-ladder-green">
                  {tier.limit}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-10 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="text-sm text-body flex items-start gap-2.5">
                    <span className="text-ladder-green text-xs mt-1 flex-shrink-0">+</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`text-center text-sm font-semibold py-3 rounded-full transition-colors ${
                  tier.highlight
                    ? "bg-ladder-green text-background hover:bg-ladder-green/90"
                    : tier.solidCta
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-border text-foreground hover:bg-card-hover"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}

          {/* Pulse column */}
          <div className="rounded-2xl p-8 flex flex-col border-2 border-ladder-purple bg-ladder-purple/5">
            {/* Mobile-only section label */}
            <p className="font-mono text-xs uppercase tracking-widest text-ladder-purple mb-4 lg:hidden">
              Ladder Pulse Scoring
            </p>

            {/* Name */}
            <h2 className="text-lg font-bold text-foreground mb-4">
              Pulse
            </h2>

            {/* Price */}
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[2.5rem] font-bold text-foreground leading-none">
                Custom
              </span>
            </div>
            <div className="mb-6" />

            {/* Usage limit */}
            <div className="border border-ladder-purple/30 rounded-lg px-4 py-3 mb-8">
              <p className="font-mono text-xs text-ladder-purple">
                Real-time experience scoring
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-10 flex-1">
              {[
                "Customer feedback, reviews, and support transcripts mapped to Ladder scores",
                "Field reports and internal ops signals",
                "Custom bespoke dashboards and interfaces",
                "Real-time tracking and alerting",
                "Dedicated onboarding and support",
              ].map((f) => (
                <li key={f} className="text-sm text-body flex items-start gap-2.5">
                  <span className="text-ladder-purple text-xs mt-1 flex-shrink-0">+</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/contact"
              className="text-center text-sm font-semibold border border-ladder-purple/40 text-ladder-purple hover:bg-ladder-purple/10 py-3 rounded-full transition-colors"
            >
              Talk to us about Pulse
            </Link>
          </div>
        </div>

        {/* Enterprise */}
        <div className="mt-8 border border-border rounded-2xl p-10 bg-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                Enterprise
              </h3>
              <p className="text-sm text-body max-w-lg leading-relaxed">
                Organization-wide deployment with SSO, custom Ladder
                calibration, cross-team dashboards, executive reporting, and
                dedicated support. Priced for your scale.
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

        {/* Drawbackwards Consulting */}
        <div className="mt-4 border border-border rounded-2xl p-10 bg-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                Drawbackwards
              </h3>
              <p className="text-sm text-body max-w-lg leading-relaxed">
                The team behind Ladder embeds with yours. Ideation workshops,
                design thinking studios, sprint-by-sprint UI/UX execution, team
                mentoring, skill evaluation, and custom Pulse deployments.
                20 years of doing the work, not just scoring it.
              </p>
            </div>
            <Link
              href="https://drawbackwards.com"
              className="shrink-0 text-center text-sm font-semibold border border-border text-foreground hover:bg-card-hover py-3 px-8 rounded-full transition-colors"
            >
              Work with Drawbackwards
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-24 border-t border-border pt-24 max-w-2xl mx-auto">
          <h2 className="text-[2rem] font-bold mb-10 text-center">Questions</h2>
          <div className="space-y-8">
            {[
              {
                q: "Do I need to sign up to score a screen?",
                a: "No. Your first score is completely free with no signup. Create an account to save your history and get 5 free scores per month across any surface.",
              },
              {
                q: "Does one subscription cover all surfaces?",
                a: "Yes. Your Ladder account works on runladder.com and the Claude Skill. One subscription, one usage meter.",
              },
              {
                q: "What counts as a score?",
                a: "Each time you submit a screenshot or URL for Ladder analysis on any surface, that\u2019s one score. Viewing history, sharing results, or browsing the Top 100 doesn\u2019t count.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Professional and Team are month-to-month. Cancel anytime from your account settings, no questions asked.",
              },
              {
                q: "How does Team seat pricing work?",
                a: "Team is $500/mo and includes up to 5 team members. Each additional seat is $100/mo. You get team leaderboards, compliance scoring, and manager dashboards.",
              },
              {
                q: "What\u2019s the difference between Screen Score and Pulse?",
                a: "Screen Score analyzes individual screens and interfaces for visual and UX quality. Pulse measures experience quality at scale by ingesting customer feedback, reviews, support transcripts, and internal signals into a single Ladder score.",
              },
              {
                q: "What is Enterprise?",
                a: "Enterprise is for organization-wide deployment of Screen Score or Pulse with SSO, custom Ladder calibration, cross-team dashboards, executive reporting, and dedicated support. Contact us for pricing.",
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="text-sm font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-body leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
