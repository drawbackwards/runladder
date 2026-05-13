import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
// LegalNotice removed in v0.4.5 — the canonical legal text lives on
// /legal and is linked from the footer. Marketing pages stay clean.
import { SubscribeButton } from "@/components/SubscribeButton";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { getUserSubscription } from "@/lib/tier";
import type { Subscription } from "@/lib/tier";
import type { Tier } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing | Ladder",
  description:
    "Score your first screen free. Professional from $1,000/mo. Team and Pulse pricing is custom.",
};

type TierKey = "free" | "pro" | "team";

type ScreenTier = {
  key: TierKey;
  name: string;
  /** Optional brand pill shown next to the tier name. */
  badge?: string;
  price: string;
  period: string;
  highlight: boolean;
  limit: string;
  features: string[];
  cta: string;
  href: string;
  solidCta: boolean;
};

const SCREEN_SCORE_TIERS: ScreenTier[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    highlight: false,
    limit: "5 scores to get started",
    features: [
      "Overall Ladder score + coaching",
      "Score on web, Claude Skill, or Figma",
      "Scores are public",
    ],
    cta: "Start free",
    href: "/score",
    solidCta: true,
  },
  {
    key: "pro",
    name: "Professional",
    price: "$1,000",
    period: "/ mo",
    highlight: true,
    limit: "2,000 scores / month",
    features: [
      "2,000 scores per month on web, Claude Skill, and Figma",
      "All scores are private",
      "UX copy suggestions",
      "Accessibility audit",
      "Per-dimension scoring (hierarchy, spacing, copy, a11y, navigation, visual)",
      "Full score history + trend line",
      "Fix suggestions with score uplift",
      "Higher volume? Talk to us",
      "Access to customer sentiment and Ladder Pulse scoring data + insights, if subscribed",
    ],
    cta: "Subscribe",
    href: "/score",
    solidCta: false,
  },
  {
    key: "team",
    name: "Team",
    badge: "Beta",
    price: "Custom",
    period: "",
    highlight: false,
    limit: "25,000 pooled scores / month",
    features: [
      "Everything in Professional",
      "25,000 scores per month pooled across the team",
      "Manager dashboard + designer performance tracking",
      "Design rhythm + activity heatmap per designer",
      "Audit toolkit with redline annotations on every score",
      "Design / evaluation session bucketing across the team",
      "Custom volume + SSO available — talk to us",
      "Access to customer sentiment and Ladder Pulse scoring data + insights, if subscribed (coming soon)",
    ],
    cta: "Apply to be a beta tester",
    href: "/contact?interest=teams-beta",
    solidCta: false,
  },
];

const CURRENT_PLAN_CLASSES =
  "w-full text-center text-sm font-semibold py-3 rounded-full border border-border text-muted bg-card cursor-not-allowed";

function CurrentPlanBadge({ comp }: { comp?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ladder-green/40 bg-ladder-green/5 text-[10px] font-mono uppercase tracking-widest text-ladder-green">
      <span className="w-1.5 h-1.5 rounded-full bg-ladder-green" />
      {comp ? "Complimentary" : "Current plan"}
    </span>
  );
}

export default async function PricingPage() {
  const { userId } = await auth();
  const sub: Subscription | null = userId ? await getUserSubscription(userId) : null;
  const currentTier: Tier | null = sub?.tier ?? null;
  const isComp = !!sub?.comp;
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-20">
          <h1 className="text-[2.5rem] font-bold mb-6">
            Simple pricing. Score your first screen free.
          </h1>
          <p className="text-body max-w-lg mx-auto leading-relaxed">
            One subscription works across every Ladder surface: web,
            Claude, and Figma. Start free, upgrade when you need more.
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
          {SCREEN_SCORE_TIERS.map((tier) => {
            const isCurrent = currentTier === tier.key;
            return (
            <div
              key={tier.name}
              aria-current={isCurrent ? "true" : undefined}
              className={`rounded-2xl p-8 flex flex-col ${
                isCurrent
                  ? "border-2 border-ladder-green bg-ladder-green/[0.07]"
                  : tier.highlight
                  ? "border-2 border-ladder-green bg-ladder-green/5"
                  : "border-2 border-ladder-green/30 bg-card"
              }`}
            >
              {/* Name + current badge */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {tier.name}
                  </h2>
                  {tier.badge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-ladder-green/40 bg-ladder-green/5 text-[10px] font-mono uppercase tracking-widest text-ladder-green">
                      {tier.badge}
                    </span>
                  )}
                </div>
                {isCurrent && <CurrentPlanBadge comp={isComp} />}
              </div>

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

              {isCurrent ? (
                isComp ? (
                  <button
                    type="button"
                    disabled
                    aria-label={`${tier.name} is complimentary access`}
                    className={CURRENT_PLAN_CLASSES}
                    title={sub?.comp?.reason || undefined}
                  >
                    Complimentary access
                  </button>
                ) : tier.key === "pro" ? (
                  <ManageSubscriptionButton
                    className={CURRENT_PLAN_CLASSES + " hover:text-foreground hover:border-ladder-green/40"}
                  >
                    Manage subscription
                  </ManageSubscriptionButton>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-label={`${tier.name} is your current plan`}
                    className={CURRENT_PLAN_CLASSES}
                  >
                    Current plan
                  </button>
                )
              ) : tier.key === "pro" ? (
                <SubscribeButton
                  plan="pro"
                  className="w-full text-center text-sm font-semibold py-3 rounded-full transition-colors bg-ladder-green text-background hover:bg-ladder-green/90 disabled:opacity-60"
                >
                  {tier.cta}
                </SubscribeButton>
              ) : (
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
              )}
            </div>
          );})}

          {/* Pulse column */}
          <div
            aria-current={currentTier === "pulse" ? "true" : undefined}
            className={`rounded-2xl p-8 flex flex-col border-2 ${
              currentTier === "pulse"
                ? "border-ladder-purple bg-ladder-purple/[0.09]"
                : "border-ladder-purple bg-ladder-purple/5"
            }`}
          >
            {/* Mobile-only section label */}
            <p className="font-mono text-xs uppercase tracking-widest text-ladder-purple mb-4 lg:hidden">
              Ladder Pulse Scoring
            </p>

            {/* Name + current badge */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-bold text-foreground">Pulse</h2>
              {currentTier === "pulse" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ladder-purple/40 bg-ladder-purple/5 text-[10px] font-mono uppercase tracking-widest text-ladder-purple">
                  <span className="w-1.5 h-1.5 rounded-full bg-ladder-purple" />
                  {isComp ? "Complimentary" : "Current plan"}
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[2.5rem] font-bold text-foreground leading-none">
                Custom
              </span>
            </div>
            <div className="mb-6" />

            <div className="mb-8" />

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

            {currentTier === "pulse" ? (
              <button
                type="button"
                disabled
                aria-label={
                  isComp
                    ? "Pulse is your complimentary plan"
                    : "Pulse is your current plan"
                }
                className="text-center text-sm font-semibold border border-border text-muted bg-card py-3 rounded-full cursor-not-allowed"
                title={isComp ? sub?.comp?.reason || undefined : undefined}
              >
                {isComp ? "Complimentary access" : "Current plan"}
              </button>
            ) : (
              <Link
                href="/contact"
                className="text-center text-sm font-semibold border border-ladder-purple/40 text-ladder-purple hover:bg-ladder-purple/10 py-3 rounded-full transition-colors"
              >
                Talk to us about Pulse
              </Link>
            )}
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
                a: "Yes. Create a free account with just your email — no password, no credit card. You get 5 free scores to get started across any Ladder surface.",
              },
              {
                q: "Does one subscription cover all surfaces?",
                a: "Yes. Your Ladder account works on runladder.com, the Claude Skill, and the Figma plugin. One subscription, one usage meter — your 5 free scores are shared across every surface.",
              },
              {
                q: "What counts as a score?",
                a: "Each time you submit a screenshot, URL, or payload for Ladder analysis on any surface, that\u2019s one score. Viewing history, sharing results, or browsing the Top 100 doesn\u2019t count.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Professional is month-to-month with a 3-day money-back guarantee. If you cancel your Pro subscription within 3 days, we refund you in full. After that, cancel anytime from your account settings, no questions asked. Team and Pulse require a contract. Contact us for terms.",
              },
              {
                q: "How does Team seat pricing work?",
                a: "Team pricing is custom and requires a contract. It includes up to 5 team members with additional seats available, team leaderboards, and manager dashboards. Contact us for details.",
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
