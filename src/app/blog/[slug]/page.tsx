import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_POSTS, getPostBySlug } from "../posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Ladder`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
    },
  };
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="text-xl font-bold text-foreground mt-10 mb-4"
        >
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="text-base font-bold text-foreground mt-8 mb-3"
        >
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph — handle bold
    elements.push(
      <p
        key={i}
        className="text-sm text-body leading-relaxed mb-4"
        dangerouslySetInnerHTML={{
          __html: line
            .replace(
              /\*\*(.+?)\*\*/g,
              '<strong class="text-foreground font-semibold">$1</strong>'
            )
            .replace(/\*(.+?)\*/g, "<em>$1</em>"),
        }}
      />
    );
    i++;
  }

  return elements;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const currentIndex = BLOG_POSTS.findIndex((p) => p.slug === slug);
  const prev = currentIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIndex + 1] : null;
  const next = currentIndex > 0 ? BLOG_POSTS[currentIndex - 1] : null;

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-10 flex items-center gap-2 text-xs text-muted">
          <Link
            href="/blog"
            className="hover:text-body transition-colors"
          >
            Blog
          </Link>
          <span>/</span>
          <span className="text-body truncate">{post.title}</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[10px] text-ladder-green uppercase tracking-widest">
              {post.category}
            </span>
            <span className="text-[10px] text-muted">
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-[10px] text-muted">{post.readTime}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>

          <p className="text-base text-body leading-relaxed">
            {post.subtitle}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-10" />

        {/* Content */}
        <article className="mb-16">{renderContent(post.content)}</article>

        {/* Product links */}
        {post.products && post.products.length > 0 && (
          <div className="border border-border bg-card/30 p-6 mb-12">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">
              Products mentioned
            </p>
            <div className="flex flex-wrap gap-2">
              {post.products.map((slug) => (
                <Link
                  key={slug}
                  href={`/top-100/${slug}`}
                  className="text-xs text-body border border-border px-3 py-1.5 hover:border-muted hover:text-foreground transition-colors"
                >
                  {slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="border border-border bg-card/30 p-6 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-foreground font-semibold">
              Share this post
            </p>
            <p className="text-xs text-muted mt-1">{post.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                `${post.title}\n\n"${post.excerpt}"\n\n`
              )}&url=${encodeURIComponent(
                `https://runladder.com/blog/${post.slug}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors"
              title="Share on X"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                `https://runladder.com/blog/${post.slug}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors"
              title="Share on LinkedIn"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Prev/Next */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {prev && (
            <Link
              href={`/blog/${prev.slug}`}
              className="border border-border p-5 hover:border-muted transition-colors group"
            >
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                Previous
              </p>
              <p className="text-sm font-bold text-foreground group-hover:text-ladder-green transition-colors">
                {prev.title}
              </p>
            </Link>
          )}
          {next && (
            <Link
              href={`/blog/${next.slug}`}
              className="border border-border p-5 hover:border-muted transition-colors group sm:text-right"
            >
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                Next
              </p>
              <p className="text-sm font-bold text-foreground group-hover:text-ladder-green transition-colors">
                {next.title}
              </p>
            </Link>
          )}
        </div>

        {/* Top 100 CTA */}
        <div className="border border-border bg-card/30 p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">
                Explore the Ladder Top 100
              </p>
              <p className="text-xs text-body mt-1">
                See Pulse scores, Screen scores, and the gap for 36 of the world&apos;s most-used products.
              </p>
            </div>
            <Link
              href="/top-100"
              className="whitespace-nowrap text-sm font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
            >
              View the Top 100 &rarr;
            </Link>
          </div>
        </div>

        {/* Pulse Demo CTA */}
        <div className="border border-ladder-green/20 bg-ladder-green/5 p-8 mb-6 text-center">
          <p className="font-mono text-[10px] text-ladder-green uppercase tracking-widest mb-3">
            Ladder Pulse
          </p>
          <p className="text-lg font-bold text-foreground mb-2">
            What would Pulse reveal about your organization?
          </p>
          <p className="text-sm text-body max-w-md mx-auto mb-6">
            The same intelligence engine behind every score in this article, pointed at your customer data, your reviews, your support tickets. One honest score.
          </p>
          <Link
            href="/contact"
            className="inline-block font-semibold bg-ladder-green text-background px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors text-sm"
          >
            Request a Pulse demo
          </Link>
        </div>

        {/* Score CTA */}
        <div className="border border-border bg-card/30 p-8 text-center">
          <p className="text-sm font-bold text-foreground mb-2">
            Score a screen right now
          </p>
          <p className="text-xs text-body mb-4">
            Upload a screenshot and get a Ladder Score in seconds. Free, no signup.
          </p>
          <Link
            href="/score"
            className="inline-block font-semibold text-sm text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            Try the free scorer &rarr;
          </Link>
        </div>

        {/* Back */}
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="text-sm font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            &larr; All posts
          </Link>
        </div>
      </div>
    </div>
  );
}
