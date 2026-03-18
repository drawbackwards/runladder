import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Ladder",
  description:
    "Score your first screen free. Pro for 100 scores/month. Team for unlimited with dashboards and leaderboards.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Get started. Score anything.",
    cta: "Start free",
    href: "/score",
    highlight: false,
    features: [
      "10 scores per month",
      "All surfaces (web, Figma, Claude)",
      "Score history",
      "Shareable score cards",
      "Community access",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    desc: "For designers who score daily.",
    cta: "Start free trial",
    href: "/score",
    highlight: true,
    features: [
      "100 scores per month",
      "Everything in Free",
      "API access",
      "Export reports",
      "Priority scoring",
      "Score comparisons",
      "Advanced findings",
    ],
  },
  {
    name: "Team",
    price: "$29",
    period: "per seat / month",
    desc: "For design teams tracking quality.",
    cta: "Contact us",
    href: "/contact",
    highlight: false,
    features: [
      "Unlimited scores",
      "Everything in Pro",
      "Team dashboard",
      "Portfolio score",
      "Leaderboard",
      "Dimension trends",
      "Weekly digest",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For organizations setting standards.",
    cta: "Talk to us",
    href: "/contact",
    highlight: false,
    features: [
      "Unlimited everything",
      "SSO (Okta, Azure AD)",
      "Custom Ladder calibration",
      "API volume pricing",
      "Dedicated support",
      "Cross-team dashboards",
      "Executive reports",
    ],
  },
  {
    name: "Pulse",
    price: "$100K",
    period: "per year",
    desc: "Score your experience from real customer data.",
    cta: "Talk to us",
    href: "/contact",
    highlight: false,
    features: [
      "Ingest customer feedback at scale",
      "App reviews, NPS, surveys, support logs",
      "Real-time Ladder score from lived experience",
      "Segment by audience, product area, or channel",
      "Trend tracking over time",
      "Executive reporting",
      "Dedicated onboarding + support",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Simple pricing. Score your first screen free.
          </h1>
          <p className="text-muted max-w-lg mx-auto">
            No signup required for your first score. Upgrade when you need more.
            One subscription works across all Ladder surfaces.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-6 flex flex-col ${
                tier.highlight
                  ? "border-2 border-ladder-green bg-ladder-green/5"
                  : "border border-border bg-card"
              }`}
            >
              <div className="mb-6">
                <h2 className="font-mono text-sm font-semibold mb-2">
                  {tier.name}
                </h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm text-muted">/{tier.period}</span>
                  )}
                </div>
                <p className="text-sm text-muted mt-2">{tier.desc}</p>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="text-sm text-muted flex items-start gap-2">
                    <span className="text-ladder-green mt-0.5">+</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`text-center text-sm font-semibold py-2.5 rounded-full transition-colors ${
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

        {/* Drawbackwards Consulting */}
        <div className="mt-8 border border-border rounded-2xl p-8 bg-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="font-mono text-sm font-semibold mb-2">
                Drawbackwards Consulting
              </h3>
              <p className="text-sm text-muted max-w-lg leading-relaxed">
                Need more than software? The team behind Ladder runs workshops,
                builds custom Ladder intelligence for your domain, and deploys
                Pulse for your in-house teams, customer base, call centers, or
                field service operations. Enterprise-grade, white-glove.
              </p>
            </div>
            <Link
              href="https://drawbackwards.com/ladder"
              className="shrink-0 text-center text-sm font-semibold border border-border text-foreground hover:bg-card-hover py-2.5 px-6 rounded-full transition-colors"
            >
              Work with Drawbackwards
            </Link>
          </div>
        </div>

        {/* API pricing */}
        <div className="mt-16 border-t border-border pt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3">API Pricing</h2>
            <p className="text-muted max-w-lg mx-auto">
              For developers and AI tools that call Ladder programmatically.
              Usage-based pricing on top of any plan.
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Free tier</span>
                <span className="font-mono">50 calls/month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Growth</span>
                <span className="font-mono">$0.08/score</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Scale (1,000+/mo)</span>
                <span className="font-mono">$0.04/score</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Enterprise</span>
                <span className="font-mono">Custom</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 border-t border-border pt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Do I need to sign up to score a screen?",
                a: "No. Your first score is completely free with no signup. Create an account to save your scores and get 10 free every month.",
              },
              {
                q: "Does one subscription cover all surfaces?",
                a: "Yes. Your Ladder account works on runladder.com, in the Figma plugin, the Claude Skill, and the API. One subscription, one usage meter.",
              },
              {
                q: "What counts as a score?",
                a: "Each time you submit a screenshot or feedback data for Ladder analysis, that's one score. Viewing your history, sharing results, or browsing the Top 100 doesn't count.",
              },
              {
                q: "Can I try Pro before paying?",
                a: "Yes. Pro comes with a 14-day free trial. No credit card required to start.",
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="text-sm font-semibold mb-1">{faq.q}</h3>
                <p className="text-sm text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
