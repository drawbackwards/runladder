import Link from "next/link";
import { LadderScore } from "@/components/LadderScore";

const ROLES = [
  {
    role: "Head of Design",
    pain: "Your team ships beautiful work but you can't prove its quality to leadership. Every review is subjective. You fight for headcount with no measurable output beyond 'it looks good.'",
    solve: "Ladder gives your team a shared quality bar. Every screen scored against the same framework. Portfolio trends over time. You walk into leadership reviews with a number, not a feeling.",
  },
  {
    role: "Product Manager",
    pain: "You're caught between engineering timelines and design quality. You don't have a reliable way to know if a design is 'good enough' to ship or if it needs another round.",
    solve: "Set a Ladder threshold. If it scores below a 3, it goes back. No more gut calls, no more politics, no more shipping something you know isn't ready because you ran out of sprint.",
  },
  {
    role: "Engineering Lead",
    pain: "You get handed designs with no quality signal. You build exactly what's spec'd, users complain, and your team takes the blame. There's no objective bar for 'ready to implement.'",
    solve: "Ladder scores the design before it hits your backlog. Your team builds with confidence that what they're implementing has been validated. Fewer rework cycles. Fewer post-launch fires.",
  },
  {
    role: "VP of Product",
    pain: "You oversee multiple product lines and have no consistent way to compare quality across teams. Every PM has their own definition of 'good.' Roadmap prioritization is a guessing game.",
    solve: "One score across every product, every team, every surface. See which products are stuck at Level 2 and which are approaching Level 4. Allocate resources where quality is lowest and impact is highest.",
  },
  {
    role: "CTO / CIO",
    pain: "You're investing millions in digital products but have no quality metric equivalent to what manufacturing has had for decades. You measure uptime, performance, and security, but not whether people can actually use the thing.",
    solve: "Ladder is the quality metric you've been missing. Bake it into your CI/CD pipeline. Gate deployments. Track quality trends alongside your technical metrics. Finally measure the human side of your technology investment.",
  },
  {
    role: "CEO / COO",
    pain: "Customer satisfaction surveys arrive quarterly. By the time you see the data, the damage is done. You know experience matters but have no leading indicator, only lagging ones.",
    solve: "Ladder scores are a leading indicator of customer satisfaction. You see quality before users do. Set organizational policy: nothing ships below a 3. Watch NPS follow.",
  },
];

const POLICIES = [
  {
    policy: "Nothing ships below a 3.0",
    detail: "Set the modern minimum bar. Level 3 (Comfortable) means users don't have to think. Anything below that creates friction, support tickets, and churn.",
  },
  {
    policy: "Score before every handoff",
    detail: "Designers score their work before passing to engineering. Engineers know what they're building has been validated. No more rework cycles.",
  },
  {
    policy: "Track portfolio trends monthly",
    detail: "Every product, every team, one dashboard. See who's improving, who's stuck, and where to invest next.",
  },
  {
    policy: "Celebrate level crossings",
    detail: "When a product moves from Level 2 to Level 3, that's a milestone worth recognizing. Ladder makes quality improvement visible and rewarding.",
  },
];

export default function OrganizationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-40 pb-36 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-8">
            One score. Every role. Every team.
          </p>
          <h1 className="text-[3.5rem] md:text-[5rem] font-bold tracking-tight leading-[1.05] mb-8">
            The language your{" "}
            <span className="text-ladder-green">whole org speaks</span>
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto mb-12 leading-relaxed">
            Designers, engineers, PMs, and executives all looking at the same
            five-point scale. No more subjective debates. No more &ldquo;it
            looks good to me.&rdquo; One honest number that everyone
            understands.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/pricing"
              className="bg-ladder-green text-background font-semibold px-8 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-base"
            >
              See organization plans
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
            The problem
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            Every team has a different definition{" "}
            <br />
            <span className="text-body">of &ldquo;good enough.&rdquo;</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Design thinks the product is polished. Engineering thinks
              it matches spec. Product thinks it&apos;s ready to ship. The CEO
              sees it and asks why it feels clunky. Users churn and nobody
              knows why, because nobody was measuring the same thing.
            </p>
            <p>
              Manufacturing solved this decades ago with Six Sigma and
              quality standards. Software has testing, code coverage, and
              uptime monitors. But for the actual human experience of using
              a product? There has never been a standard. Until now.
            </p>
            <p className="text-foreground font-medium">
              Ladder is the quality standard your organization has been
              missing. Five levels. One score. A shared language that turns
              subjective design debates into objective quality decisions.
            </p>
          </div>
        </div>
      </section>

      {/* The Score Card */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-16 items-center">
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
                Universal language
              </p>
              <h2 className="text-[2rem] font-bold leading-snug mb-6">
                Five levels everyone{" "}
                <span className="text-ladder-green">understands.</span>
              </h2>
              <p className="text-body leading-relaxed mb-6">
                When a designer says &ldquo;this is a 2.4,&rdquo; the PM
                knows exactly what that means. When the CTO sets a policy of
                &ldquo;nothing ships below a 3,&rdquo; every engineer knows
                the bar. When the CEO sees a portfolio trending from 1.8 to
                3.2, they know the investment is working.
              </p>
              <p className="text-body leading-relaxed">
                The five rungs of the Ladder aren&apos;t arbitrary. They
                represent distinct levels of experience quality that have been
                validated across thousands of real products over two decades.
                This isn&apos;t a framework someone invented last year. It&apos;s
                a standard backed by Fortune 50 deployments and a database of
                over 10,000 scored screens.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { score: "1", label: "Functional", color: "text-ladder-red", border: "border-ladder-red/20", desc: "User fights the product" },
                { score: "2", label: "Usable", color: "text-ladder-orange", border: "border-ladder-orange/20", desc: "Tasks complete with effort" },
                { score: "3", label: "Comfortable", color: "text-ladder-yellow", border: "border-ladder-yellow/20", desc: "The modern minimum bar" },
                { score: "4", label: "Delightful", color: "text-ladder-delightful", border: "border-ladder-delightful/20", desc: "Anticipates user needs" },
                { score: "5", label: "Meaningful", color: "text-ladder-white", border: "border-white/20", desc: "Irreplaceable" },
              ].map((level) => (
                <div
                  key={level.score}
                  className={`flex items-center gap-6 border ${level.border} rounded-xl px-6 py-4 bg-card`}
                >
                  <span className={`font-mono text-xl font-bold ${level.color} w-6`}>
                    {level.score}
                  </span>
                  <div>
                    <span className={`font-mono text-sm font-semibold ${level.color}`}>
                      {level.label}
                    </span>
                    <p className="text-xs text-body mt-0.5">{level.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Role Callouts */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              Every seat at the table
            </p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold mb-6">
              Their pain.{" "}
              <span className="text-ladder-green">Your answer.</span>
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              Every role in your organization has a different relationship
              with quality. Ladder meets each one where they are.
            </p>
          </div>

          <div className="space-y-4">
            {ROLES.map((r) => (
              <div
                key={r.role}
                className="border border-border rounded-xl bg-card p-8 hover:bg-card-hover hover:border-muted transition-colors"
              >
                <h3 className="font-mono text-sm font-bold text-ladder-green mb-4">
                  {r.role}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                      The pain
                    </p>
                    <p className="text-sm text-body leading-relaxed">
                      {r.pain}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-ladder-green uppercase tracking-widest mb-2">
                      How Ladder solves it
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {r.solve}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not a DIY */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            Why not build your own
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            You could build a quality scoring system.
            <br />
            <span className="text-ladder-green">But why would you?</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              Ladder is a standard that has been refined over two decades
              at a product design agency that serves the Fortune 50. It has
              been tested across healthcare, energy, finance, hospitality,
              and consumer products. The scoring methodology is backed by
              a database of over 10,000 evaluated screens.
            </p>
            <p>
              Building your own quality framework means years of
              calibration, internal politics about what &ldquo;good&rdquo;
              means, and a system that only works inside your walls. Ladder
              gives you an external, objective standard that your teams
              can adopt immediately and that benchmarks you against the
              industry, not just against yourselves.
            </p>
            <p className="text-foreground font-medium">
              You don&apos;t build your own credit scoring system. You
              don&apos;t invent your own financial audit standard. Ladder
              is the quality standard for experience. Buy into it and
              start measuring on day one.
            </p>
          </div>
        </div>
      </section>

      {/* Proof points */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { stat: "20+", label: "years of practice", detail: "The framework was forged over two decades of real design work" },
              { stat: "Fortune 50", label: "clients served", detail: "Validated at the scale of the world's largest organizations" },
              { stat: "10,000+", label: "screens scored", detail: "The calibration behind every score comes from real products" },
              { stat: "5", label: "universal levels", detail: "One framework that every role in your org can learn in minutes" },
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

      {/* Quality Policies */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              Set the bar
            </p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold mb-6">
              Quality policies{" "}
              <span className="text-ladder-green">that stick.</span>
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              When quality has a number, you can build policy around it.
              These are the organizational practices that the best teams adopt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POLICIES.map((p) => (
              <div
                key={p.policy}
                className="border border-border rounded-xl p-8 bg-card"
              >
                <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                  {p.policy}
                </h3>
                <p className="text-sm text-body leading-relaxed">
                  {p.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it integrates */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-16 items-start">
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
                Fits your workflow
              </p>
              <h2 className="text-[2rem] font-bold leading-snug mb-6">
                Score everywhere{" "}
                <span className="text-ladder-green">your team works.</span>
              </h2>
              <p className="text-body leading-relaxed">
                Ladder isn&apos;t a destination. It&apos;s a layer that sits
                on top of your existing tools and workflows. Designers score
                in Figma. Engineers gate deploys via API. PMs track trends
                on the dashboard. Leadership sees the portfolio view.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { surface: "runladder.com", desc: "Upload a screenshot and get a score in seconds. No installs, no configuration." },
                { surface: "Ladder for Figma", desc: "Score screens without leaving your design tool. Built into the workflow designers already use." },
                { surface: "Ladder API", desc: "Bake quality scoring into CI/CD. Every deploy, every PR, automatically scored before it reaches users." },
                { surface: "Ladder Pulse", desc: "Turn customer feedback, support logs, and field reports into a quality score that tracks real experience." },
              ].map((s) => (
                <div
                  key={s.surface}
                  className="border border-border rounded-xl px-6 py-5 bg-card"
                >
                  <h3 className="font-mono text-sm font-semibold text-foreground mb-1">
                    {s.surface}
                  </h3>
                  <p className="text-sm text-body leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-[2.5rem] font-bold mb-6">
            Give your org a{" "}
            <span className="text-ladder-green">common language.</span>
          </h2>
          <p className="text-body mb-10 leading-relaxed max-w-lg mx-auto">
            The same five-point scale across every team, every product,
            every decision. Set quality policies. Track improvement over
            time. Ship with confidence.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/pricing"
              className="inline-block bg-ladder-green text-background font-semibold px-10 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-lg"
            >
              See organization plans
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
