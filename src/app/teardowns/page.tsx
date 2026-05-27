import type { Metadata } from "next";
import Link from "next/link";
import { TEARDOWN_POSTS } from "./posts";

export const metadata: Metadata = {
  title: "Teardowns | Ladder",
  description:
    "The Ladder framework applied to the products designers use every day. Honest scores, rung by rung.",
};

export default function TeardownsPage() {
  const featured = TEARDOWN_POSTS.filter((p) => p.featured);
  const rest = TEARDOWN_POSTS.filter((p) => !p.featured);

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-16">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-[0.2em] mb-6">
            Ladder Teardowns
          </p>
          <h1 className="text-3xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-6 text-foreground">
            The products you use every day.
            <br />
            <span className="text-muted">Scored honestly.</span>
          </h1>
          <p className="text-base text-body max-w-xl leading-relaxed">
            We apply the full Ladder framework to real products. Not to expose
            them. To put a number on what everyone already senses. Rung by rung.
          </p>
        </div>

        {/* Featured teardowns */}
        {featured.length > 0 && (
          <div className="mb-16">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-6">
              Latest
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/teardowns/${post.slug}`}
                  className="border border-border bg-card/30 p-6 hover:border-muted transition-colors group"
                >
                  {/* Score badge */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                      {post.product}
                    </span>
                    <div className="flex flex-col items-end">
                      <span
                        className="font-mono text-2xl font-bold leading-none"
                        style={{ color: post.scoreColor }}
                      >
                        {post.score}
                      </span>
                      {post.scoreTbd && (
                        <span className="font-mono text-[9px] text-muted uppercase tracking-widest mt-0.5">
                          score pending
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-foreground group-hover:text-ladder-green transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-body leading-relaxed mb-3">
                    {post.subtitle}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[10px] text-muted">{post.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All teardowns list */}
        {rest.length > 0 && (
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-6">
              All teardowns
            </p>
            <div className="space-y-0">
              {[...featured, ...rest].map((post) => (
                <Link
                  key={post.slug}
                  href={`/teardowns/${post.slug}`}
                  className="flex items-start justify-between gap-6 py-5 border-b border-border/50 hover:bg-card/30 transition-colors group px-4 -mx-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                        {post.product}
                      </span>
                      <span className="text-[10px] text-muted">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-ladder-green transition-colors mb-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-body leading-relaxed truncate">
                      {post.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 mt-1">
                    <span
                      className="font-mono text-lg font-bold leading-none"
                      style={{ color: post.scoreColor }}
                    >
                      {post.score}
                    </span>
                    <span className="text-[10px] text-muted mt-1">{post.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Score CTA */}
        <div className="mt-16 border border-border bg-card/30 p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">
              Score your own product
            </p>
            <p className="text-xs text-body mt-1">
              The same framework behind every teardown. Upload a screenshot and get a Ladder score in seconds.
            </p>
          </div>
          <Link
            href="/score"
            className="whitespace-nowrap text-sm font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            Score a screen free &rarr;
          </Link>
        </div>

        {/* Framework CTA */}
        <div className="mt-4 border border-ladder-green/20 bg-ladder-green/5 p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] text-ladder-green uppercase tracking-widest mb-2">
              The framework
            </p>
            <p className="text-sm font-bold text-foreground">
              Learn what each rung means
            </p>
            <p className="text-xs text-body mt-1">
              Every score in every teardown uses the same six rungs. Read the framework to understand what we are actually measuring.
            </p>
          </div>
          <Link
            href="/framework"
            className="whitespace-nowrap text-sm font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            Read the framework &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
