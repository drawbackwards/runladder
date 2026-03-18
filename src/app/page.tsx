import Link from "next/link";
import { LadderScore } from "@/components/LadderScore";

const LEVELS = [
  {
    score: "1",
    label: "Functional",
    desc: "User fights the product. Trial, error, frustration.",
    color: "text-ladder-red",
    border: "border-ladder-red/20",
  },
  {
    score: "2",
    label: "Usable",
    desc: "Tasks complete with effort. User tolerates it but would switch.",
    color: "text-ladder-orange",
    border: "border-ladder-orange/20",
  },
  {
    score: "3",
    label: "Comfortable",
    desc: "No thinking required. Everything where expected. The modern minimum.",
    color: "text-ladder-yellow",
    border: "border-ladder-yellow/20",
  },
  {
    score: "4",
    label: "Delightful",
    desc: "Anticipates needs. Right help at right moment. Users refer others.",
    color: "text-ladder-delightful",
    border: "border-ladder-delightful/20",
  },
  {
    score: "5",
    label: "Meaningful",
    desc: "Irreplaceable. Changed how they think, work, or live.",
    color: "text-ladder-white",
    border: "border-white/20",
  },
];

const PRODUCTS = [
  {
    name: "runladder.com",
    desc: "Score any screen in your browser. Share results. Track quality over time.",
    href: "/score",
    cta: "Score now",
  },
  {
    name: "Ladder for Figma",
    desc: "Score designs while you design. Real-time coaching in your canvas.",
    href: "/products",
    cta: "Install plugin",
  },
  {
    name: "Ladder Pulse",
    desc: "Score experiences from customer feedback. Reviews, surveys, support logs in — Ladder score out.",
    href: "/products",
    cta: "Try Pulse",
  },
  {
    name: "Ladder for Claude",
    desc: "Score screens mid-conversation with AI. Same account, same scores.",
    href: "/products",
    cta: "Coming soon",
  },
  {
    name: "Ladder API",
    desc: "Let your AI tools score quality automatically. MCP + OpenAPI.",
    href: "/api",
    cta: "View docs",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            The quality score for{" "}
            <span className="text-ladder-green">every experience</span>
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto mb-10">
            Upload a screenshot. Get a Ladder score. Know exactly where your
            design stands — and what to fix first.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/score"
              className="bg-ladder-green text-background font-semibold px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors"
            >
              Score a screen — free
            </Link>
            <Link
              href="/framework"
              className="text-muted border border-border px-8 py-3 rounded-full hover:text-foreground hover:border-muted transition-colors"
            >
              Learn the framework
            </Link>
          </div>
        </div>
      </section>

      {/* Score demo */}
      <section className="pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-card border border-border rounded-2xl p-10">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-4">
              Ladder Score
            </p>
            <LadderScore score={2.4} size="xl" />
            <p className="text-sm text-muted mt-6 leading-relaxed">
              &ldquo;Basic structure exists but users work harder than they
              should. The primary action is buried and the information hierarchy
              doesn&apos;t guide the eye.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Framework */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Five levels. One honest score.
            </h2>
            <p className="text-muted max-w-lg mx-auto">
              Every experience is scored from 1.0 to 5.0 against the Ladder
              framework. Most products are Level 1 or 2. Level 3 is the modern
              minimum. Level 5 is the ceiling.
            </p>
          </div>

          <div className="space-y-3">
            {LEVELS.map((level) => (
              <div
                key={level.score}
                className={`flex items-center gap-6 border ${level.border} rounded-xl px-6 py-4 bg-card`}
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
                  <p className="text-sm text-muted mt-0.5">{level.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/framework"
              className="text-sm text-ladder-green hover:underline"
            >
              Explore the full framework
            </Link>
          </div>
        </div>
      </section>

      {/* Product suite */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              One score.{" "}
              <span className="text-ladder-green">Everywhere.</span>
            </h2>
            <p className="text-muted max-w-lg mx-auto">
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
                className="border border-border rounded-xl p-6 bg-card hover:bg-card-hover hover:border-muted transition-colors group"
              >
                <h3 className="font-mono text-sm font-semibold text-foreground mb-2">
                  {product.name}
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-4">
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
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            What&apos;s your Ladder score?
          </h2>
          <p className="text-muted mb-8">
            Upload a screenshot. Get your score in seconds. No signup required.
          </p>
          <Link
            href="/score"
            className="inline-block bg-ladder-green text-background font-semibold px-10 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-lg"
          >
            Score a screen — free
          </Link>
        </div>
      </section>
    </>
  );
}
