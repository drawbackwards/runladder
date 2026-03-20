import type { Metadata } from "next";
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
        <div className="max-w-2xl mb-20">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-8">
            Start a conversation
          </p>
          <h1 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-tight leading-[1.08] mb-8">
            The best teams don&apos;t guess
            <br />
            at quality. They measure it.
          </h1>
          <p className="text-lg text-body leading-relaxed">
            You&apos;ve built the product. You&apos;ve shipped the features.
            But how do you know it&apos;s actually good? Ladder gives your
            entire team a shared definition of quality: one score, one
            framework, one language from design to the boardroom.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-16">
          {/* Left: form */}
          <div>
            <ContactForm />
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
                    body: "Every critique is anchored to the Ladder. No more subjective arguments, just measurable quality gaps and a clear path up.",
                  },
                  {
                    title: "PMs ship with confidence",
                    body: "Before launch, you know exactly where you stand. A 2.4 ships differently than a 3.8. The score gives you the language to make that call.",
                  },
                  {
                    title: "Leaders see the whole picture",
                    body: "Portfolio scores across every product, every team, every quarter. Track improvement over time. Prove the ROI of design investment.",
                  },
                  {
                    title: "Teams level up together",
                    body: "Leaderboards, coaching, and per-dimension scoring show exactly where to focus. Your weakest dimension becomes your biggest opportunity.",
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

            <div className="border border-border rounded-xl p-6 bg-card">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                Who we work with
              </p>
              <div className="space-y-3 text-sm text-body">
                <p>Product and design teams at growth-stage startups and Fortune 500 companies.</p>
                <p>CTOs who want a quality gate before every release.</p>
                <p>Design leaders building a culture of measurement.</p>
                <p>Operations teams who need to understand experience quality from the field.</p>
              </div>
            </div>

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
                from theory. We built it from 10,000+ screens reviewed,
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
