import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Let's build something worth measuring | Ladder",
  description:
    "Talk to the team behind Ladder. Whether you need enterprise scoring, Pulse deployment, or a design partner, we're ready.",
};

export default function ContactPage() {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="mb-20">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-8">
            Start a conversation
          </p>
          <h1 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-tight leading-[1.08] mb-8">
            The best teams don&apos;t guess at quality. They measure it.
          </h1>
          <p className="text-lg text-body leading-relaxed">
            Ladder gives your team a shared definition of quality. One score, one framework, applied to every screen you ship.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-16">
          {/* Left: form.
              Wrapped in Suspense because ContactForm calls
              useSearchParams() — Next.js 16 fails the build if that
              hook isn't inside a Suspense boundary during static
              generation. */}
          <div>
            <Suspense fallback={null}>
              <ContactForm />
            </Suspense>
          </div>

          {/* Right: what you get */}
          <div className="space-y-10">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-5">
                What changes when you have a score
              </h3>
              <ul className="space-y-4">
                {[
                  {
                    title: "Designers stop debating taste",
                    body: "Every critique anchors to the framework. Measurable gaps replace subjective arguments.",
                  },
                  {
                    title: "PMs ship with confidence",
                    body: "Before launch, you know exactly where you stand. A 2.4 ships differently than a 3.8.",
                  },
                  {
                    title: "Leaders see the whole picture",
                    body: "Portfolio scores across every product and team. Track improvement over time.",
                  },
                  {
                    title: "Teams level up together",
                    body: "Per-dimension scoring shows exactly where to focus. The weakest rung is where the score moves fastest.",
                  },
                ].map((item) => (
                  <li key={item.title} className="border-l-2 border-ladder-green/30 pl-4">
                    <p className="text-sm font-bold text-foreground mb-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-body leading-relaxed">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* "Who we work with" hidden for now — keep for potential reuse
            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                Who we work with
              </p>
              <div className="space-y-3 text-sm text-body">
                <p>Founders who shipped fast and now need to know where they stand.</p>
                <p>Product and design teams with a quality debt problem.</p>
                <p>Design leads who want a number, not a vibe check.</p>
                <p>Directors of Design making the case for quality investment.</p>
              </div>
            </div>
            */}

            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                Backed by 20 years of doing the work
              </p>
              <p className="text-sm text-body leading-relaxed">
                Ladder was built by{" "}
                <a
                  href="https://drawbackwards.com"
                  className="text-foreground hover:text-ladder-green transition-colors"
                >
                  Drawbackwards
                </a>
                , a product design agency that&apos;s spent two decades
                helping Fortune 50 companies and ambitious startups ship
                better experiences. We didn&apos;t build a scoring tool
                from theory. We built it from 100,000+ screens reviewed,
                hundreds of products shipped, and billions of dollars in
                value created for our clients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
