"use client";

import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { FigmaPluginCard } from "@/components/FigmaPluginCard";

/**
 * Ladder for Figma detail page. The dashboard promo links here; this page
 * carries the screenshot, the pitch, and the install/manage flow.
 */
export default function FigmaDetailPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl text-foreground font-sans mt-4 mb-8">
          Ladder for Figma
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <main>
            {/* Hero — placeholder until we drop in a real plugin screenshot. */}
            <div className="aspect-[16/9] border border-[#2a2a2a] bg-[#161616] flex items-center justify-center mb-6">
              <span className="text-[10px] uppercase tracking-widest text-muted">
                Plugin screenshot
              </span>
            </div>
            <div className="space-y-4 text-sm text-muted font-sans leading-relaxed">
              <p>
                Score frames inside Figma without leaving the canvas. Run it on
                any frame, get a Ladder score and ranked findings back in
                seconds, and watch them sync straight to your dashboard.
              </p>
              <p>
                Select any frame and get an honest Ladder Score that tells you
                where your design stands — from Functional (users fight the
                product) to Meaningful (users can&apos;t imagine using anything
                else).
              </p>
              <p>
                Every score comes with specific, actionable findings ranked by
                impact. Each finding tells you exactly what to fix, why it
                matters to your users, and how much your score will improve. Get
                additional help on UX copywriting and accessibility factors.
              </p>
              <p>
                Ask follow-up questions to go deeper on any finding. Rescore
                after making changes to track your improvement over time.
              </p>
              <div>
                <p className="text-foreground font-semibold mb-2">How it works</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Select a frame or score the whole page</li>
                  <li>
                    The scoring engine analyzes the screenshot against the
                    Ladder framework
                  </li>
                  <li>
                    Get your score, findings, and a clear path to the next level
                  </li>
                  <li>Make changes, rescore, and watch your score climb</li>
                </ol>
              </div>
              <p>
                Built for designers who want honest feedback, not flattery. Most
                screens score a 1 or 2. Level 3 is the modern minimum bar. 4 and
                5 are aspirational goals. Can you get there?
              </p>
            </div>
          </main>

          <aside className="space-y-4">
            <FigmaPluginCard />
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
              <h3 className="text-sm text-foreground font-sans font-semibold mb-3">
                How to install
              </h3>
              <ol className="space-y-3 text-xs text-muted font-sans leading-relaxed">
                <li>
                  <span className="text-foreground">1.</span> Open the plugin on
                  Figma Community (the button above) and install it.
                </li>
                <li>
                  <span className="text-foreground">2.</span> In any Figma file,
                  run{" "}
                  <code className="text-foreground">
                    Plugins → Ladder for Figma
                  </code>{" "}
                  and sign in with the same email you use here.
                </li>
                <li>
                  <span className="text-foreground">3.</span> Score a frame — it
                  syncs to your dashboard automatically.
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
