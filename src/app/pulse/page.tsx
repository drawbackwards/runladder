import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Ladder Pulse — Customer data in. Quality score out.",
  description:
    "AI-driven experience measurement from real customer and operational data. Reviews, field reports, support logs, employee feedback — all mapped to a single Ladder score.",
};

export default function PulsePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="pt-40 pb-36 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-8">
            Ladder Pulse
          </p>
          <h1 className="text-[2.5rem] md:text-[4.5rem] font-bold tracking-tight leading-[1.05] mb-8">
            Customer data in.
            <br />
            <span className="text-ladder-green">Quality score out.</span>
          </h1>
          <p className="text-xl text-body max-w-2xl leading-relaxed mb-12">
            Every organization generates signals about the quality of the
            experiences it delivers. Pulse listens to all of them and gives you
            one number you can trust.
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <Link
              href="/contact"
              className="bg-ladder-green text-background font-semibold px-8 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-base"
            >
              Talk to us about Pulse
            </Link>
            <Link
              href="/framework"
              className="text-body border border-border px-8 py-4 rounded-full hover:text-foreground hover:border-muted transition-colors text-base"
            >
              Learn the Ladder framework
            </Link>
          </div>
        </div>
      </section>

      {/* ── Product preview ── */}
      <section className="pb-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="border border-border rounded-2xl overflow-hidden bg-card">
            <Image
              src="https://drawbackwards.com/images/ladder/ladder-on-laptop.webp"
              alt="Ladder Pulse dashboard showing real-time UX quality score from customer data"
              width={1200}
              height={675}
              className="w-full"
              unoptimized
            />
          </div>
        </div>
      </section>

      {/* ── The shift ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            A new way to measure
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            For twenty years, we measured satisfaction.
            <br />
            <span className="text-body">We should have been measuring quality.</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              NPS asks one question: would you recommend us? CSAT asks another:
              was this interaction okay? Both give you a number. Neither tells
              you <em>why</em> the experience feels the way it does, or
              what specifically would make it better.
            </p>
            <p>
              Organizations have spent decades collecting feedback — app
              reviews, surveys, support tickets, field reports, employee
              sentiment — and pouring it into dashboards full of charts.
              The data is everywhere. The clarity is nowhere.
            </p>
            <p className="text-foreground font-medium text-xl leading-snug">
              What if you could take all of that signal — every source, every
              format, every voice — and distill it into one honest score that
              tells you exactly where the experience stands and what to fix
              first?
            </p>
            <p>
              That&apos;s Pulse.
            </p>
          </div>
        </div>
      </section>

      {/* ── Four capabilities ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-[2rem] font-bold mb-6">
              Four things no other tool does.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* AI-driven insights */}
            <div className="text-center">
              <div className="border border-border rounded-xl overflow-hidden bg-card mb-5">
                <Image
                  src="https://drawbackwards.com/images/ladder/insights-ai.webp"
                  alt="AI-driven analysis turning customer feedback into actionable UX insights"
                  width={300}
                  height={200}
                  className="w-full"
                  unoptimized
                />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">
                AI-driven experience scoring
              </h3>
              <p className="text-xs text-body leading-relaxed">
                Applies the Ladder framework — five levels of experience
                quality, refined over 20 years — to every piece of feedback.
              </p>
            </div>

            {/* Real-time sentiment */}
            <div className="text-center">
              <div className="border border-border rounded-xl overflow-hidden bg-card mb-5">
                <Image
                  src="https://drawbackwards.com/images/ladder/insights-customer-sentiment.webp"
                  alt="Real-time customer sentiment filters and experience quality tracking"
                  width={300}
                  height={200}
                  className="w-full"
                  unoptimized
                />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">
                Real-time experience pulse
              </h3>
              <p className="text-xs text-body leading-relaxed">
                Your score updates as new signal flows in. Filter by audience,
                product area, channel, region, or time period.
              </p>
            </div>

            {/* Built for leaders */}
            <div className="text-center">
              <div className="border border-border rounded-xl overflow-hidden bg-card mb-5">
                <Image
                  src="https://drawbackwards.com/images/ladder/insights-design-minded.webp"
                  alt="Executive dashboard designed for Product Owners, Design Leaders, and CXOs"
                  width={300}
                  height={200}
                  className="w-full"
                  unoptimized
                />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">
                Built for the people who decide
              </h3>
              <p className="text-xs text-body leading-relaxed">
                A single number for the boardroom. A detailed breakdown for
                the team. Designed for leaders, not analysts.
              </p>
            </div>

            {/* Integrations */}
            <div className="text-center">
              <div className="border border-border rounded-xl overflow-hidden bg-card mb-5">
                <Image
                  src="https://drawbackwards.com/images/ladder/insights-integrate.webp"
                  alt="Integration with Qualtrics, SalesForce, Zendesk, and other data platforms"
                  width={300}
                  height={200}
                  className="w-full"
                  unoptimized
                />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">
                Connects to everything
              </h3>
              <p className="text-xs text-body leading-relaxed">
                Qualtrics. Salesforce. Zendesk. App reviews. Slack. Field
                reports. Call logs. No migration required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The product screenshots ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Image
                src="https://drawbackwards.com/images/ladder/customer-insights-score.svg"
                alt="Customer data in, UX quality score out"
                width={600}
                height={400}
                className="w-full p-6"
                unoptimized
              />
              <div className="px-8 pb-8">
                <p className="text-sm font-bold text-foreground">Customer data in. UX score out.</p>
                <p className="text-xs text-body mt-1">Every signal mapped to the five-level Ladder framework</p>
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Image
                src="https://drawbackwards.com/images/ladder/customer-insights-filters.svg"
                alt="Apply filters to get a targeted experience score"
                width={600}
                height={400}
                className="w-full p-6"
                unoptimized
              />
              <div className="px-8 pb-8">
                <p className="text-sm font-bold text-foreground">Apply filters. Get a targeted score.</p>
                <p className="text-xs text-body mt-1">Segment by team, region, product, channel, or audience</p>
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Image
                src="https://drawbackwards.com/images/ladder/customer-insights-secure.svg"
                alt="Customer data is private and secure"
                width={600}
                height={400}
                className="w-full p-6"
                unoptimized
              />
              <div className="px-8 pb-8">
                <p className="text-sm font-bold text-foreground">Your data is private and secure.</p>
                <p className="text-xs text-body mt-1">Enterprise-grade security, SOC 2 compliant infrastructure</p>
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Image
                src="https://drawbackwards.com/images/ladder/customer-insights-trusted.svg"
                alt="Trusted by global brands"
                width={600}
                height={400}
                className="w-full p-6"
                unoptimized
              />
              <div className="px-8 pb-8">
                <p className="text-sm font-bold text-foreground">Trusted by global brands.</p>
                <p className="text-xs text-body mt-1">Built by the team behind 20 years of Fortune 50 design work</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Not just customers ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            Beyond customer feedback
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            Everyone you serve has a voice.
            <br />
            <span className="text-ladder-green">Pulse makes it count.</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Most feedback tools stop at customers. But the people you
              serve aren&apos;t just the ones buying your product. They&apos;re
              the nurse on hour eleven. The technician on a cell tower. The
              officer responding to a call with software that crashes. The
              manufacturing team relaying issues from satellites back to HQ.
            </p>
            <p>
              Their experience matters just as much. And they&apos;re already
              telling you about it — in field reports, dispatch logs, incident
              tickets, internal surveys, and break room conversations that
              never make it to a dashboard.
            </p>
            <p className="text-foreground font-medium">
              Pulse treats every voice as signal. Customer or employee. External
              or internal. Digital or physical. If someone&apos;s experience
              depends on the systems you build and the decisions you make,
              Pulse measures whether you&apos;re making their life better.
            </p>
          </div>
        </div>
      </section>

      {/* ── Signal sources ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              Signal sources
            </p>
            <h2 className="text-[2rem] font-bold mb-6">
              Pulse listens to{" "}
              <span className="text-ladder-green">everything</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { source: "Customer reviews", detail: "App Store, Google Play, G2, Trustpilot, Yelp — wherever your users talk about you" },
              { source: "Support transcripts", detail: "Zendesk, Intercom, Freshdesk, call center logs — the raw voice of frustration or delight" },
              { source: "NPS and surveys", detail: "Qualtrics, SurveyMonkey, Typeform, Alchemer, in-app surveys — structured sentiment at scale" },
              { source: "Field reports", detail: "Technicians, officers, nurses, inspectors — people in the field telling HQ what\u2019s really happening" },
              { source: "Internal operations", detail: "Manufacturing lines, logistics teams, satellite feeds, warehouse ops — the experience of the people who keep the machine running" },
              { source: "Employee feedback", detail: "Slack channels, retros, engagement surveys, exit interviews — the internal experience is an experience too" },
            ].map((s) => (
              <div
                key={s.source}
                className="border border-border rounded-xl p-8 bg-card"
              >
                <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                  {s.source}
                </h3>
                <p className="text-sm text-body leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            How it works
          </p>
          <h2 className="text-[2rem] font-bold mb-16">
            From raw signal to{" "}
            <span className="text-ladder-green">trusted score</span>
          </h2>

          <div className="space-y-16">
            <div className="grid grid-cols-[60px_1fr] gap-6 items-start">
              <span className="font-mono text-3xl font-bold text-ladder-green/30">01</span>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Connect your signals</h3>
                <p className="text-body leading-relaxed">
                  We ingest data from wherever your people talk — review
                  platforms, support tools, CRM systems, internal channels,
                  field reporting systems. Qualtrics, Salesforce, Zendesk,
                  Podium, and dozens more. No format requirements. No
                  migration. Raw signal in.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[60px_1fr] gap-6 items-start">
              <span className="font-mono text-3xl font-bold text-ladder-green/30">02</span>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Map to the Ladder</h3>
                <p className="text-body leading-relaxed">
                  Our AI — trained on 20 years of experience evaluation —
                  analyzes sentiment, identifies friction patterns, and scores
                  the quality of the experience being described. Not just
                  positive or negative. Five levels of quality. The same
                  framework that Drawbackwards has used on thousands of real
                  projects for the Fortune 50.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[60px_1fr] gap-6 items-start">
              <span className="font-mono text-3xl font-bold text-ladder-green/30">03</span>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Your interface, your context</h3>
                <p className="text-body leading-relaxed">
                  We design a bespoke Pulse dashboard for your organization.
                  Your teams, your segments, your vocabulary, your reporting
                  cadence. A hospital system sees clinician experience. A
                  manufacturer sees production lines. A police department sees
                  precincts. Not a generic analytics tool — a purpose-built
                  experience scorecard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[60px_1fr] gap-6 items-start">
              <span className="font-mono text-3xl font-bold text-ladder-green/30">04</span>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Watch the score move</h3>
                <p className="text-body leading-relaxed">
                  As your organization makes changes — new tools, new
                  workflows, new policies — Pulse shows whether the experience
                  is actually improving. Not vanity metrics. A Ladder score that
                  moves when real things change. Track it weekly. Report it
                  quarterly. Prove that the investment is working.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              Where Pulse works
            </p>
            <h2 className="text-[2rem] font-bold mb-6">
              Any organization. Any audience. One score.
            </h2>
          </div>

          <div className="space-y-6">
            {[
              { industry: "Healthcare", problem: "Clinicians spend 40% of their time on documentation, not patients", how: "Pulse ingests clinician feedback, EHR friction reports, and patient experience surveys. Maps the care delivery experience to a Ladder score. Tracks improvement as workflows change.", outcome: "See whether new tools are actually reducing burden or just shifting it" },
              { industry: "Manufacturing", problem: "Field teams report issues upward but nothing changes because the signal gets lost", how: "Pulse analyzes field reports, incident logs, and operator feedback from the floor. Surfaces the real experience of the people doing the work \u2014 not the executive summary.", outcome: "Quantify the gap between what leadership thinks and what the team actually experiences" },
              { industry: "Public Safety", problem: "Officers in the field deal with broken tools and disconnected systems daily", how: "Pulse processes officer feedback, dispatch transcripts, and after-action reports. Scores the quality of the tools and workflows they depend on.", outcome: "Track whether technology investments are actually improving the experience on the ground" },
              { industry: "Financial Services", problem: "Compliance tools are built for auditors, not for the people using them 8 hours a day", how: "Pulse ingests internal ops feedback, workflow friction reports, and task completion data. Reveals where the experience breaks down.", outcome: "Prioritize improvements based on actual user pain, not feature requests from stakeholders" },
              { industry: "Consumer Products", problem: "You have 50,000 app reviews and no idea what they\u2019re really saying", how: "Pulse analyzes reviews, support tickets, and NPS verbatims across every channel. Distills them into a single score with dimension breakdowns.", outcome: "Know your real Ladder score from the people who use your product every day" },
              { industry: "Energy & Utilities", problem: "Technicians in the field are the last to be heard and the first to suffer from bad software", how: "Pulse processes field service reports, technician feedback, and dispatch logs. Maps the end-to-end field experience to the Ladder framework.", outcome: "Prove whether new field tools are improving the technician experience or adding overhead" },
              { industry: "Hospitality", problem: "Guest experience is measured in seconds, but feedback takes months to act on", how: "Pulse ingests guest reviews, in-stay survey data, front desk logs, and loyalty program feedback. Scores the end-to-end guest experience against the Ladder.", outcome: "Know your real guest experience score \u2014 not just what TripAdvisor says" },
            ].map((uc) => (
              <div
                key={uc.industry}
                className="border border-border rounded-xl p-8 bg-card"
              >
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
                  <span className="font-mono text-xs text-ladder-green uppercase tracking-widest">
                    {uc.industry}
                  </span>
                  <div className="space-y-4">
                    <p className="text-sm text-foreground font-semibold">{uc.problem}</p>
                    <p className="text-sm text-body leading-relaxed">{uc.how}</p>
                    <p className="text-sm text-ladder-green">{uc.outcome}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Jobs close ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            Why this matters
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            Transform the way you improve
            <br />
            <span className="text-ladder-green">every experience you deliver.</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Most tools measure what happened. Pulse measures how it felt.
              That&apos;s the difference between a dashboard that confirms your
              assumptions and a score that challenges them.
            </p>
            <p>
              When you know your Ladder score — from the people who actually
              live the experience — you stop guessing. You stop debating. You
              start improving with precision. And when the score moves, you
              know the improvement is real, because it came from the people
              you serve.
            </p>
            <p>
              Drawbackwards spent 20 years inside these organizations — at the
              bedside, on the factory floor, in the field, at the front desk.
              We didn&apos;t build Pulse from a conference room. We built it
              because we kept seeing the same thing: the signal was already
              there. It just wasn&apos;t being measured.
            </p>
            <p className="text-foreground font-bold text-xl leading-snug">
              Now it is.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            Engagement
          </p>
          <h2 className="text-[2rem] font-bold mb-6">
            Enterprise deployments starting at $100K / year
          </h2>
          <p className="text-body max-w-lg mx-auto leading-relaxed mb-8">
            Every Pulse deployment includes custom interface design, signal
            integration, Ladder calibration for your domain, ongoing scoring,
            and dedicated support from the Drawbackwards team.
          </p>
          <div className="inline-block border border-border rounded-xl p-8 bg-card text-left space-y-3 mb-12">
            {[
              "Custom Pulse dashboard designed for your organization",
              "Integration with your existing feedback and data sources",
              "Ladder framework calibrated to your domain and audience",
              "Real-time scoring and trend tracking",
              "Segment by team, region, product, channel, or audience",
              "Executive reporting and quarterly reviews",
              "Dedicated onboarding and ongoing support",
            ].map((item) => (
              <p key={item} className="text-sm text-body flex items-start gap-2">
                <span className="text-ladder-green mt-0.5 flex-shrink-0">+</span>
                {item}
              </p>
            ))}
          </div>
          <div>
            <Link
              href="/contact"
              className="inline-block bg-ladder-green text-background font-semibold px-10 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-lg"
            >
              Talk to us about Pulse
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
