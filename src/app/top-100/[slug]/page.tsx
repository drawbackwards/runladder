import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  PRODUCTS,
  getProductBySlug,
  getRelatedProducts,
} from "../data";
import { getScoreColor, getLevel, getNextLevel, getGapToNext } from "@/lib/ladder";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} | Ladder Score ${product.score.toFixed(1)} (${getLevel(product.score)})`,
    description: product.verdict,
    openGraph: {
      title: `${product.name} scored ${product.score.toFixed(1)} on Ladder`,
      description: product.verdict,
    },
  };
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  const color = getScoreColor(score);
  return (
    <div className="w-full">
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>1.0</span>
        <span>2.0</span>
        <span>3.0</span>
        <span>4.0</span>
        <span>5.0</span>
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const level = getLevel(product.score);
  const color = getScoreColor(product.score);
  const related = getRelatedProducts(product);
  const nextLevel = getNextLevel(product.score);
  const gap = getGapToNext(product.score).toFixed(1);

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* ── Breadcrumb ── */}
        <div className="mb-10 flex items-center gap-2 text-xs text-muted">
          <Link
            href="/top-100"
            className="hover:text-body transition-colors"
          >
            Top 100
          </Link>
          <span>/</span>
          <span className="text-body">{product.name}</span>
        </div>

        {/* ── Hero ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-10 mb-16">
          {/* Left: product info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-muted border border-border px-2 py-0.5">
                {product.category}
              </span>
              <span className="text-[10px] text-muted">
                #{product.rank} of {PRODUCTS.length}
              </span>
              {product.delta && (
                <span
                  className={`text-[10px] font-semibold ${
                    product.delta > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {product.delta > 0 ? "+" : ""}
                  {product.delta.toFixed(1)} this quarter
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {product.name}
            </h1>

            <p className="text-base text-body leading-relaxed mb-4">
              {product.verdict}
            </p>

            <a
              href={`https://${product.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ladder-green hover:text-ladder-green/80 transition-colors"
            >
              {product.url} &rarr;
            </a>
          </div>

          {/* Right: score card */}
          <div className="border border-border bg-card/30 p-8 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted uppercase tracking-widest mb-4">
              Ladder Score
            </span>
            <span
              className="text-6xl font-bold tabular-nums"
              style={{ color }}
            >
              {product.score.toFixed(1)}
            </span>
            <span
              className="text-sm font-bold uppercase tracking-wider mt-1"
              style={{ color }}
            >
              {level}
            </span>

            <div className="w-full mt-6">
              <ScoreBar score={product.score} />
            </div>

            <div className="mt-6 pt-4 border-t border-border w-full">
              <div className="flex justify-center gap-6 mb-4">
                <div className="text-center">
                  <span className="text-[9px] text-muted uppercase tracking-widest">Screen</span>
                  <div className="text-sm font-bold mt-0.5" style={{ color: product.screenScore ? getScoreColor(product.screenScore.score) : undefined }}>
                    {product.screenScore ? product.screenScore.score.toFixed(1) : "—"}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[9px] text-muted uppercase tracking-widest">Pulse</span>
                  <div className="text-sm font-bold mt-0.5" style={{ color: product.pulseScore ? getScoreColor(product.pulseScore.score) : undefined }}>
                    {product.pulseScore ? product.pulseScore.score.toFixed(1) : <span className="text-muted text-xs">Pending</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border w-full">
              <span className="text-[10px] text-muted uppercase tracking-widest">
                Gap to {nextLevel}
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-lg font-bold" style={{ color: getScoreColor(Math.ceil(product.score)) }}>
                  +{gap}
                </span>
                <span className="text-[11px] text-muted">points</span>
              </div>
            </div>

            {product.scoreDisclaimer && (
              <div className="mt-4 pt-3 border-t border-border w-full text-center">
                <span className="text-[9px] text-muted uppercase tracking-wider">
                  {product.scoreDisclaimer}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Score layers ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <div className="border border-border p-5">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">
              Screen Score
            </p>
            <p className="text-[9px] text-muted/60 mb-2">AI analysis of public interface screenshots</p>
            {product.screenScore ? (
              <>
                <span className="text-2xl font-bold" style={{ color: getScoreColor(product.screenScore.score) }}>
                  {product.screenScore.score.toFixed(1)}
                </span>
                <p className="text-[10px] text-muted mt-1">{product.screenScore.source}</p>
              </>
            ) : (
              <p className="text-xs text-muted">Pending: will be scored from public screenshots</p>
            )}
          </div>

          <div className="border border-border p-5">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">
              Pulse Score
            </p>
            <p className="text-[9px] text-muted/60 mb-2">Lived experience scored from real user signals</p>
            {product.pulseScore ? (
              <>
                <span className="text-2xl font-bold" style={{ color: getScoreColor(product.pulseScore.score) }}>
                  {product.pulseScore.score.toFixed(1)}
                </span>
                <p className="text-[10px] text-muted mt-1">
                  {product.pulseScore.source}
                  {product.pulseScore.sourceCount && ` (${product.pulseScore.sourceCount.toLocaleString()} data points)`}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted">Pending: will aggregate G2, Reddit, App Store, and more</p>
            )}
          </div>

          <div className="border border-border p-5">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">
              Company Verified
            </p>
            {product.verified ? (
              <p className="text-xs text-ladder-green font-semibold">Verified by {product.name}</p>
            ) : (
              <p className="text-xs text-muted">
                Work at {product.name}? Submit product screenshots or a demo link for a more accurate score.
              </p>
            )}
            <Link
              href={`/contact?subject=${encodeURIComponent(`Verify ${product.name}'s Ladder score`)}&product=${product.slug}`}
              className="inline-block text-[10px] font-semibold text-ladder-green mt-2 hover:underline"
            >
              {product.verified ? "Update your submission" : "Submit for verification"} &rarr;
            </Link>
          </div>
        </div>

        {/* ── Full analysis ── */}
        {product.description && (
          <div className="mb-16">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">
              Analysis
            </h2>
            <p className="text-sm text-body leading-relaxed max-w-2xl">
              {product.description}
            </p>
          </div>
        )}

        {/* ── Strengths & Weaknesses ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {product.strengths && product.strengths.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">
                What earns the score
              </h3>
              <ul className="space-y-3">
                {product.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-3 text-sm text-body leading-relaxed">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.weaknesses && product.weaknesses.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-4">
                What holds it back
              </h3>
              <ul className="space-y-3">
                {product.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-3 text-sm text-body leading-relaxed">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&ndash;</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Share ── */}
        <div className="border border-border bg-card/30 p-6 mb-16 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-foreground font-semibold">
              Share this score
            </p>
            <p className="text-xs text-muted mt-1">
              {product.name} scored {product.score.toFixed(1)} ({level}) on Ladder
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                `${product.name} scored ${product.score.toFixed(1)} (${level}) on the Ladder framework.\n\n"${product.verdict}"\n\nSee the full Top 100:`
              )}&url=${encodeURIComponent(`https://runladder.com/top-100/${product.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors"
              title="Share on X"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://runladder.com/top-100/${product.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors"
              title="Share on LinkedIn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Score your own ── */}
        <div className="border border-ladder-green/20 bg-ladder-green/5 p-8 text-center mb-16">
          <p className="text-lg font-bold text-foreground mb-2">
            How does your product compare?
          </p>
          <p className="text-sm text-body mb-6">
            Score any screen against the same framework. Free, no signup.
          </p>
          <Link
            href="/score"
            className="inline-block font-semibold bg-ladder-green text-background px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors text-sm"
          >
            Score your product
          </Link>
        </div>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-6">
              More in {product.category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/top-100/${r.slug}`}
                  className="border border-border bg-card/30 p-5 hover:border-muted transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-bold text-foreground group-hover:text-ladder-green transition-colors">
                      {r.name}
                    </span>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: getScoreColor(r.score) }}
                    >
                      {r.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-body leading-relaxed">
                    {r.verdict}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Back to list ── */}
        <div className="mt-12 text-center">
          <Link
            href="/top-100"
            className="text-sm font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            &larr; Back to Top 100
          </Link>
        </div>
      </div>
    </div>
  );
}
