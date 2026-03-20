import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | Ladder",
  description:
    "Score your first screen free. Professional for $19/mo. Organization for $35/seat/mo. One subscription across all surfaces.",
};

const TIERS = [
  {
    badge: "Free",
    name: "Starter",
    price: "$0",
    period: "forever",
    tagline: "See where you stand",
    highlight: false,
    limit: "5 scores / month across any surface",
    features: [
      "Overall Ladder score + coaching",
      "UX copy suggestions",
      "Accessibility audit",
      "Web, Figma, or Claude",
    ],
    cta: "Start free",
    href: "/score",
  },
  {
    badge: "Most popular",
    name: "Professional",
    price: "$19",
    period: "/ mo",
    periodNote: "billed annually \u00b7 $25 month-to-month",
    tagline: "Full pipeline for one designer",
    highlight: true,
    limit: "Unlimited scores \u00b7 50 URL analyses / mo",
    features: [
      "Everything in Starter",
      "Per-dimension scoring (hierarchy, spacing, copy, a11y, navigation, visual)",
      "Full score history + trend line",
      "Fix suggestions with score uplift",
      "Competitor site analysis",
      "Shareable score cards",
    ],
    cta: "Start 14-day free trial",
    href: "/score",
  },
  {
    badge: "Team",
    name: "Organization",
    price: "$35",
    period: "/ seat / mo",
    periodNote: "billed annually",
    tagline: "Quality across the whole team",
    highlight: false,
    limit: "Unlimited everything",
    features: [
      "Everything in Professional",
      "Team leaderboard + portfolio score",
      "Design system compliance scoring",
      "Manager dashboard + performance tracking",
      "Training, coaching, and custom scoring via Drawbackwards Consulting",
    ],
    cta: "Contact us",
    href: "/contact",
  },
];

export default function PricingPage() {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-20">
          <h1 className="text-[2.5rem] font-bold mb-6">
            Simple pricing. Score your first screen free.
          </h1>
          <p className="text-body max-w-lg mx-auto leading-relaxed">
            One subscription works across every Ladder surface: web, Figma,
            and Claude. Start free, upgrade when you need more.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 flex flex-col ${
                tier.highlight
                  ? "border-2 border-ladder-green bg-ladder-green/5"
                  : "border border-border bg-card"
              }`}
            >
              {/* Badge */}
              <span
                className={`self-start text-[11px] font-mono uppercase tracking-widest px-3 py-1 mb-6 ${
                  tier.highlight
                    ? "bg-ladder-green/15 text-ladder-green"
                    : "bg-border/50 text-muted"
                }`}
              >
                {tier.badge}
              </span>

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
              {tier.periodNote ? (
                <p className="text-xs text-muted mb-6">{tier.periodNote}</p>
              ) : (
                <div className="mb-6" />
              )}

              {/* Tagline */}
              <p className="text-sm text-body mb-8">{tier.tagline}</p>

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
                    : "border border-border text-foreground hover:bg-card-hover"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise + API */}
        <div className="mt-8 border border-border rounded-2xl p-10 bg-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                Ladder API &amp; Enterprise
              </h3>
              <p className="text-sm text-body max-w-lg leading-relaxed">
                Need programmatic access or organization-wide deployment? API
                access, SSO, custom Ladder calibration, cross-team dashboards,
                executive reporting, and dedicated support. Priced for your
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

        {/* Pulse */}
        <div className="mt-4 border border-border rounded-2xl p-10 bg-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground mb-1">
                Ladder Pulse
              </h3>
              <p className="text-xs text-muted mb-3">Starting at $100K / year</p>
              <p className="text-sm text-body max-w-lg leading-relaxed">
                Turn customer feedback, field reports, internal ops signals, and
                support transcripts into a single Ladder score. Custom bespoke
                interfaces, real-time tracking, dedicated onboarding.
              </p>
            </div>
            <Link
              href="/pulse"
              className="shrink-0 text-center text-sm font-semibold border border-border text-foreground hover:bg-card-hover py-3 px-8 rounded-full transition-colors"
            >
              Learn about Pulse
            </Link>
          </div>
        </div>

        {/* Drawbackwards Consulting */}
        <div className="mt-4 border border-border rounded-2xl p-10 bg-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                Drawbackwards Consulting
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
                a: "Yes. Your Ladder account works on runladder.com, in the Figma plugin, and the Claude Skill. One subscription, one usage meter.",
              },
              {
                q: "What counts as a score?",
                a: "Each time you submit a screenshot or URL for Ladder analysis on any surface, that\u2019s one score. Viewing history, sharing results, or browsing the Top 100 doesn\u2019t count.",
              },
              {
                q: "Can I try Professional before paying?",
                a: "Yes. Professional comes with a 14-day free trial. No credit card required to start.",
              },
              {
                q: "What\u2019s the difference between Organization and Enterprise?",
                a: "Organization gives your team leaderboards, compliance scoring, and manager dashboards at $35/seat. Enterprise adds SSO, API access, custom calibration, and dedicated support. Contact us for pricing.",
              },
              {
                q: "What is Ladder Pulse?",
                a: "Pulse is our enterprise experience measurement platform. It ingests feedback from any source, including customer reviews, field reports, internal ops, and employee surveys, then maps it to a Ladder score with custom dashboards. Starting at $100K/year.",
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
