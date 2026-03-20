import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "./posts";

export const metadata: Metadata = {
  title: "Blog | Ladder",
  description:
    "Screen Scores, Pulse Scores, and the real experience stories behind the world's most-used digital products.",
  openGraph: {
    title: "Ladder Blog | Scores, Teardowns & Intelligence",
    description:
      "Screen Scores, Pulse Scores, and the real experience stories behind the world's most-used digital products.",
  },
};

export default function BlogPage() {
  const featured = BLOG_POSTS.filter((p) => p.featured);
  const rest = BLOG_POSTS.filter((p) => !p.featured);

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-16">
          <p className="font-mono text-xs text-ladder-green uppercase tracking-[0.2em] mb-6">
            Ladder Blog
          </p>
          <h1 className="text-3xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-6 text-foreground">
            Scores don&apos;t lie.
            <br />
            <span className="text-muted">Neither does Ladder.</span>
          </h1>
          <p className="text-base text-body max-w-xl leading-relaxed">
            Ladder&apos;s Screen and Pulse proprietary intelligence scoring
            engine tells the real experience story behind every offering. These
            are the stories it uncovers.
          </p>
        </div>

        {/* Featured posts */}
        {featured.length > 0 && (
          <div className="mb-16">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-6">
              Featured
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="border border-border bg-card/30 p-6 hover:border-muted transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[10px] text-ladder-green uppercase tracking-widest">
                      {post.category}
                    </span>
                    <span className="text-[10px] text-muted">
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground group-hover:text-ladder-green transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-body leading-relaxed mb-3">
                    {post.subtitle}
                  </p>
                  <p className="text-xs text-muted leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All posts */}
        <div>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-6">
            All posts
          </p>
          <div className="space-y-0">
            {[...featured, ...rest].map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="flex items-start justify-between gap-6 py-5 border-b border-border/50 hover:bg-card/30 transition-colors group px-4 -mx-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-[10px] text-ladder-green uppercase tracking-widest">
                      {post.category}
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
                <span className="text-[10px] text-muted whitespace-nowrap mt-1">
                  {post.readTime}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top 100 CTA */}
        <div className="mt-16 border border-border bg-card/30 p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">
              Explore the Ladder Top 100
            </p>
            <p className="text-xs text-body mt-1">
              Pulse scores, Screen scores, and the reality gap for 36 of the world&apos;s most-used products.
            </p>
          </div>
          <Link
            href="/top-100"
            className="whitespace-nowrap text-sm font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            View the Top 100 &rarr;
          </Link>
        </div>

        {/* Pulse CTA */}
        <div className="mt-4 border border-ladder-green/20 bg-ladder-green/5 p-8 text-center">
          <p className="font-mono text-[10px] text-ladder-green uppercase tracking-widest mb-3">
            Ladder Pulse
          </p>
          <h2 className="text-lg font-bold text-foreground mb-2">
            What would Pulse reveal about your product?
          </h2>
          <p className="text-sm text-body max-w-md mx-auto mb-6">
            The same AI intelligence engine behind every score on this blog, pointed at your customer data. One honest score.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/contact"
              className="inline-block font-semibold bg-ladder-green text-background px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors text-sm"
            >
              Request a Pulse demo
            </Link>
            <Link
              href="/score"
              className="inline-block font-semibold text-sm text-ladder-green hover:text-ladder-green/80 transition-colors"
            >
              Or score a screen free &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
