import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ladder for Teams | The quality standard for design organizations",
  description:
    "Give your design team a shared quality bar. Live activity feed, per-designer trends, pooled scoring across every Ladder surface. Talk to us.",
};

const CAPABILITIES = [
  {
    name: "Team Dashboard",
    desc: "Every designer, every score, every trend in one view. Live activity feed, per-member trajectory, and pooled usage in real time.",
    detail: "Portfolio score, individual trends, activity feed",
  },
  {
    name: "Designer Management",
    desc: "Invite designers by email. Promote co-admins, pause members during leave, archive alumni, and remove anyone who shouldn't be on the team.",
    detail: "Invite flow, role and status controls, audit trail",
  },
  {
    name: "Pooled Scoring",
    desc: "One monthly allowance shared across the whole team, every surface. Web, Figma, and the Claude Skill all draw from the same pool, all show up in your team feed.",
    detail: "Shared queries, unified history, every Ladder surface",
  },
];

const WHAT_CHANGES = [
  {
    before: "Designers score in isolation",
    after: "Every score lands in a shared team feed the leader watches in real time",
  },
  {
    before: "Quality is subjective across the team",
    after: "One framework, one score, calibrated to the same five-rung Ladder",
  },
  {
    before: "You find out about quality problems at review time",
    after: "Dashboard surfaces every score as it lands. Catch drift early, not late",
  },
  {
    before: "No way to measure team improvement over time",
    after: "Per-designer trajectory, team portfolio score, monthly pooled usage",
  },
];

const TIER = {
  name: "Teams",
  features: [
    "Team leader dashboard on runladder.com",
    "Up to 10 active designers included (extra seats available)",
    "Live activity feed across web, Figma, and the Claude Skill",
    "Per-designer scores and trajectory",
    "Pooled monthly query allowance shared across the team",
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
            Your team.{" "}
            <span className="text-ladder-green">One quality bar.</span>
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto mb-12 leading-relaxed">
            Every designer&rsquo;s scores in one feed. Per-member trends,
            pooled usage, full member management. The dashboard your design
            organization should have had years ago.
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
            Design quality is invisible{" "}
            <br />
            <span className="text-body">
              until the review meeting.
            </span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Designers ship. Leaders catch up. By the time a quality
              problem surfaces in a review, it has been in production for a
              week. Coaching happens too late. New hires drift before
              anyone notices. The team has no shared number to point at.
            </p>
            <p>
              Teams puts every score your designers run in one live feed.
              You see the scan the moment it lands. You see the trend per
              designer. You see which surfaces are weakest. You manage who
              is on the team and when. Same Ladder framework. Now you can
              actually run a design quality program with it.
            </p>
            <p className="text-foreground font-medium">
              Stop finding out at review time. Watch quality in real time.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              What you get
            </p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold mb-6">
              A dashboard built for{" "}
              <span className="text-ladder-green">design leaders.</span>
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              Log in to runladder.com. See your team. Run the team.
              Watch quality move.
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
            <span className="text-ladder-green">You see everything.</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Designers keep using runladder.com, the Figma plugin, and
              the Claude Skill exactly as they do today. Score a screen,
              get a Ladder score with coaching cards.
            </p>
            <p>
              Once they accept the team invite, every score they run shows
              up on the leader&rsquo;s team dashboard automatically. No
              extra UI to learn. No new workflow to adopt.
            </p>
            <p className="text-foreground font-medium">
              Zero onboarding friction. Full visibility from day one.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              Pricing
            </p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold mb-6">
              Built for{" "}
              <span className="text-ladder-green">serious teams.</span>
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              Teams is sold through a master services agreement, not self-serve
              checkout. We set the seat count and pool that fits your team.
            </p>
          </div>

          <div className="rounded-2xl p-10 flex flex-col border-2 border-ladder-green bg-ladder-green/5 max-w-2xl mx-auto">
            <span className="self-start text-[11px] font-mono uppercase tracking-widest px-3 py-1 mb-6 bg-ladder-green/15 text-ladder-green">
              Full team
            </span>
            <h3 className="text-lg font-bold text-foreground mb-3">
              {TIER.name}
            </h3>
            <p className="text-sm text-muted mb-8">
              Talk to us. We&rsquo;ll work out the right plan for your design org.
            </p>

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
                stat: "100,000+",
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
                label: "visibility",
                detail:
                  "Every new designer's scores show up on your team dashboard from their first scan",
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
            Stop guessing.{" "}
            <span className="text-ladder-green">Start measuring.</span>
          </h2>
          <p className="text-body mb-10 leading-relaxed max-w-lg mx-auto">
            Every score, every designer, every surface, in one feed.
            Manage who&rsquo;s on the team. Watch quality move.
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
