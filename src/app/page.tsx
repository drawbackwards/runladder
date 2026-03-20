import Link from "next/link";
import { LadderScore } from "@/components/LadderScore";

const LEVELS = [
  {
    score: "5",
    label: "Meaningful",
    desc: "Irreplaceable. Changed how they think, work, or live.",
    color: "text-ladder-white",
    border: "border-white/20",
  },
  {
    score: "4",
    label: "Delightful",
    desc: "Anticipates needs. Right help at right moment. Users refer others.",
    color: "text-ladder-delightful",
    border: "border-ladder-delightful/20",
  },
  {
    score: "3",
    label: "Comfortable",
    desc: "No thinking required. Everything where expected. The modern minimum.",
    color: "text-ladder-yellow",
    border: "border-ladder-yellow/20",
  },
  {
    score: "2",
    label: "Usable",
    desc: "Tasks complete with effort. User tolerates it but would switch.",
    color: "text-ladder-orange",
    border: "border-ladder-orange/20",
  },
  {
    score: "1",
    label: "Functional",
    desc: "User fights the product. Trial, error, frustration.",
    color: "text-ladder-red",
    border: "border-ladder-red/20",
  },
];

const PRODUCTS = [
  {
    name: "runladder.com",
    desc: "You shipped a screen. Is it actually good? Get a trusted quality score in seconds. No installs, no signup, no second-guessing.",
    href: "/score",
    cta: "Score a screen free",
  },
  {
    name: "Ladder for Figma",
    desc: "Stop designing in the dark. Know your Ladder score before you hand off, so you never ship something that looks done but feels broken.",
    href: "/products",
    cta: "Install the plugin",
  },
  {
    name: "Ladder Pulse",
    desc: "Every organization generates signals: customer reviews, field reports, internal ops feedback, support logs. Pulse turns all of it into a quality score that tracks whether the people you serve are actually better off.",
    href: "/pulse",
    cta: "Learn about Pulse",
  },
  {
    name: "Ladder for Claude",
    desc: "Building with AI? Get a quality check mid-conversation. Know if what Claude generated is a 2.1 or a 3.8 before you ship it.",
    href: "/products",
    cta: "Coming soon",
  },
  {
    name: "Drawbackwards Consulting",
    desc: "The team behind Ladder embeds with yours, sprint by sprint. Ideation workshops, design thinking studios, UI/UX execution, team mentoring, skill evaluation, and custom Pulse deployments. 20 years of doing the work, not just scoring it.",
    href: "https://drawbackwards.com",
    cta: "Work with Drawbackwards",
  },
];

const PROOF_POINTS = [
  { stat: "20+", label: "years of practice", detail: "Drawbackwards has been designing experiences since 2003" },
  { stat: "Fortune 50", label: "clients served", detail: "From startups to the largest companies on the planet" },
  { stat: "$B+", label: "in value created", detail: "Measurable outcomes across healthcare, energy, finance, and consumer" },
  { stat: "10,000+", label: "screens evaluated", detail: "The framework has been tested across every industry and platform" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="pt-40 pb-36 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-8">
            Built over 20 years. Now available to everyone.
          </p>
          <h1 className="text-[3.5rem] md:text-[5rem] font-bold tracking-tight leading-[1.05] mb-8">
            The quality score for{" "}
            <span className="text-ladder-green">every experience</span>
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto mb-12 leading-relaxed">
            Ladder is the framework Ward Andrews and the team at Drawbackwards
            built over two decades of designing products for the Fortune 50.
            Now it&apos;s an AI-powered scoring engine anyone can use.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/score"
              className="bg-ladder-green text-background font-semibold px-8 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-base"
            >
              Score a screen, free
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

      {/* The Why */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            Why Ladder exists
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            Everyone can ship a product now.
            <br />
            <span className="text-body">Almost no one knows if it&apos;s good.</span>
          </h2>
          <div className="space-y-6 text-body leading-relaxed">
            <p>
              AI tools have made it trivially easy to generate interfaces.
              Designers can produce more screens in a day than they used to in
              a month. But speed without judgment creates a new problem: a flood
              of products that look finished but feel broken.
            </p>
            <p>
              There was never a universal standard for experience quality. No
              credit score for design. Teams shipped and hoped. Users suffered
              and churned. The only feedback loop was revenue, and by then it
              was too late.
            </p>
            <p className="text-foreground font-medium">
              Ladder changes that. One score, one framework, one honest answer:
              where does this experience actually stand, and what would make it
              better?
            </p>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-16 items-start">
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
                The origin
              </p>
              <h2 className="text-[2rem] font-bold leading-snug mb-6">
                20 years in the making.
                <br />
                <span className="text-ladder-green">Not a weekend project.</span>
              </h2>
              <p className="text-body leading-relaxed">
                Ward Andrews founded Drawbackwards in 2003. Over two decades,
                his team designed products for healthcare systems, energy
                companies, financial institutions, hospitality brands, and
                consumer startups, creating billions of dollars in measurable
                value along the way.
              </p>
            </div>
            <div className="space-y-6 text-body leading-relaxed">
              <p>
                Through thousands of projects, Ward noticed the same pattern:
                the best products weren&apos;t just usable. They climbed through
                distinct levels of quality. Functional. Usable. Comfortable.
                Delightful. Meaningful. Every product sat somewhere on that
                ladder, and knowing where it sat was the key to knowing what to
                fix.
              </p>
              <p>
                He codified this into a framework and began using it internally
                at Drawbackwards: first as a workshop tool, then as a scoring
                methodology, then as the lens through which every design
                decision was evaluated. Clients started asking for it by name.
              </p>
              <p className="text-foreground font-medium">
                The Ladder framework wasn&apos;t invented to be a product. It was
                earned through decades of real work with real users at real
                companies. The AI just made it possible to share with the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Proof points */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {PROOF_POINTS.map((p) => (
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

      {/* Score demo */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-16 items-center">
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
                How it works
              </p>
              <h2 className="text-[2rem] font-bold leading-snug mb-6">
                Upload a screenshot.
                <br />
                Get the truth.
              </h2>
              <p className="text-body leading-relaxed mb-6">
                Upload a screenshot and get a <strong className="text-foreground">Screen Score</strong>: an
                AI evaluation of the interface against the same five-level
                framework Drawbackwards has used on thousands of real projects.
                Not generic best practices, but the specific patterns
                that separate products people tolerate from products people love.
              </p>
              <p className="text-body leading-relaxed mb-6">
                You get an honest score, the specific issues holding you back,
                and exactly how much each fix would improve your score.
                No flattery. No vague advice. Just the truth.
              </p>
              <p className="text-body leading-relaxed">
                Want to measure the lived experience, not just the interface?{" "}
                <a href="/pulse" className="text-ladder-green hover:text-ladder-green/80 transition-colors">
                  Ladder Pulse
                </a>{" "}
                ingests real customer signals from across the internet and scores
                what people actually feel. The gap between Screen Score and
                Pulse Score is where the real insight lives.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <p className="font-mono text-xs text-muted uppercase tracking-wider mb-6">
                Screen Score
              </p>
              <LadderScore score={2.4} size="xl" />
              <p className="text-sm text-body mt-8 leading-relaxed">
                &ldquo;Basic structure exists but users work harder than they
                should. The primary action is buried and the information hierarchy
                doesn&apos;t guide the eye.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Framework */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              The framework
            </p>
            <h2 className="text-[2.5rem] font-bold mb-6">
              Five levels. One honest score.
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              Every experience is scored from 1.0 to 5.0. Most products are
              Level 1 or 2. Level 3 is the modern minimum bar. It must be
              earned. Level 5 is the ceiling.
            </p>
          </div>

          <div className="space-y-3">
            {LEVELS.map((level) => (
              <div
                key={level.score}
                className={`flex items-center gap-6 border ${level.border} rounded-xl px-6 py-5 bg-card`}
              >
                <span
                  className={`font-mono text-2xl font-bold ${level.color} w-8`}
                >
                  {level.score}
                </span>
                <div>
                  <span className={`font-mono text-sm font-semibold ${level.color}`}>
                    {level.label}
                  </span>
                  <p className="text-sm text-body mt-0.5">{level.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/framework"
              className="text-sm text-ladder-green hover:underline"
            >
              Explore the full framework
            </Link>
          </div>
        </div>
      </section>

      {/* No one else */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
            Why us
          </p>
          <h2 className="text-[2rem] md:text-[2.5rem] font-bold leading-snug mb-10">
            Anyone can build an AI scoring tool.
            <br />
            <span className="text-ladder-green">No one else has the framework.</span>
          </h2>
          <div className="max-w-2xl mx-auto space-y-6 text-body leading-relaxed text-left">
            <p>
              There are plenty of AI tools that will tell you your button
              should be bigger. Ladder is different because the intelligence
              behind it isn&apos;t generic. It&apos;s the product of 20 years of
              designing for healthcare workers on 12-hour shifts, energy
              technicians in the field, hotel guests in a hurry, and millions
              of consumers who just want something that works.
            </p>
            <p>
              The Ladder framework was forged in the complexity of real
              businesses with real constraints. It knows the difference between
              a screen that looks polished and one that actually helps someone
              accomplish their goal. That distinction takes decades to learn.
              You can&apos;t prompt-engineer it into existence.
            </p>
            <p className="text-foreground font-medium">
              The framework is the moat. The AI is just the delivery mechanism.
              Drawbackwards spent 20 years building the judgment. Now Ladder
              makes it instant.
            </p>
          </div>
        </div>
      </section>

      {/* Product suite */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-8">
              The platform
            </p>
            <h2 className="text-[2.5rem] font-bold mb-6">
              One score.{" "}
              <span className="text-ladder-green">Everywhere.</span>
            </h2>
            <p className="text-body max-w-lg mx-auto leading-relaxed">
              Score in your browser, in Figma, in Claude, from customer feedback,
              or through the API. Every score feeds the same account, the same
              history, the same dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.map((product) => (
              <Link
                key={product.name}
                href={product.href}
                className="border border-border rounded-xl p-8 bg-card hover:bg-card-hover hover:border-muted transition-colors group"
              >
                <h3 className="font-mono text-sm font-semibold text-foreground mb-3">
                  {product.name}
                </h3>
                <p className="text-sm text-body leading-relaxed mb-5">
                  {product.desc}
                </p>
                <span className="text-xs text-ladder-green group-hover:underline">
                  {product.cta}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-36 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-[2.5rem] font-bold mb-6">
            What&apos;s your Ladder score?
          </h2>
          <p className="text-body mb-10 leading-relaxed max-w-lg mx-auto">
            Two decades of design expertise, distilled into a single number.
            Upload a screenshot. Get your score in seconds. No signup required.
          </p>
          <Link
            href="/score"
            className="inline-block bg-ladder-green text-background font-semibold px-10 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-lg"
          >
            Score a screen, free
          </Link>
        </div>
      </section>
    </>
  );
}
