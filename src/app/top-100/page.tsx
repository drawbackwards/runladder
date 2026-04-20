"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PRODUCTS, CATEGORIES, getScoreColor, getLevel } from "./data";

export default function Top100Page() {
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    if (category === "All") return PRODUCTS;
    return PRODUCTS.filter((p) => p.category === category);
  }, [category]);

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* ── Hero ── */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-ladder-green uppercase tracking-[0.2em] mb-6">
            Ladder Top 100
          </p>
          <h1 className="text-3xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-6 text-foreground">
            The definitive ranking of<br />
            digital experience quality.
          </h1>
          <p className="text-base text-body max-w-xl mx-auto leading-relaxed">
            A quick-scan ranking of the web&apos;s most notable digital
            experiences. Public screenshots and user sentiment mapped to the
            Ladder framework. It&apos;s a snapshot for fun &mdash; not a full
            Ladder Screen Score or Pulse Score. No sponsorships. No paid
            placements.
          </p>
          <p className="text-xs text-muted mt-4">
            {PRODUCTS.length} products &middot; Updated monthly &middot;{" "}
            <Link href="/score" className="hover:text-body transition-colors">
              Want the real score?
            </Link>
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="mb-4 space-y-4">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-[11px] font-semibold px-4 py-2 border transition-colors ${
                  category === cat
                    ? "border-ladder-green/40 bg-ladder-green/10 text-ladder-green"
                    : "border-border text-muted hover:text-body hover:border-muted"
                }`}
              >
                {cat}
                {cat !== "All" && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {PRODUCTS.filter((p) => p.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>

        </div>

        {/* ── The list ── */}
        <div className="space-y-0">
          {/* Header row */}
          <div className="grid grid-cols-[32px_1fr_70px_50px] md:grid-cols-[40px_1fr_100px_80px_60px] gap-4 px-4 py-3 border-b border-border text-[10px] font-semibold text-muted uppercase tracking-widest">
            <span>#</span>
            <span>Product</span>
            <span className="hidden md:block">Category</span>
            <span className="text-right">Score</span>
            <span className="text-right">Move</span>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted">
              No products match your filters.
            </div>
          )}

          {filtered.map((product) => (
            <Link
              key={product.slug}
              href={`/top-100/${product.slug}`}
              className="grid grid-cols-[32px_1fr_70px_50px] md:grid-cols-[40px_1fr_100px_80px_60px] gap-4 px-4 py-4 border-b border-border/50 hover:bg-card/50 transition-colors group block"
            >
              {/* Rank */}
              <span className="text-sm font-bold text-muted tabular-nums">
                {product.rank}
              </span>

              {/* Name + verdict */}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-foreground group-hover:text-ladder-green transition-colors">
                    {product.name}
                  </span>
                  <span className="text-[10px] text-[#444] truncate hidden sm:inline">
                    {product.url}
                  </span>
                </div>
                <p className="text-xs text-body mt-0.5 leading-relaxed truncate">
                  {product.verdict}
                </p>
              </div>

              {/* Category */}
              <span className="hidden md:flex items-center">
                <span className="text-[10px] text-muted border border-border px-2 py-0.5">
                  {product.category}
                </span>
              </span>

              {/* Score */}
              <div className="text-right flex flex-col items-end justify-center">
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: getScoreColor(product.score) }}
                >
                  {product.score.toFixed(1)}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider"
                  style={{ color: getScoreColor(product.score) }}
                >
                  {getLevel(product.score)}
                </span>
              </div>

              {/* Delta */}
              <div className="text-right flex items-center justify-end">
                {product.delta ? (
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      product.delta > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {product.delta > 0 ? "+" : ""}
                    {product.delta.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#333]">&mdash;</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* ── Updated note ── */}
        <div className="text-center py-12 border-b border-border">
          <p className="text-sm text-muted">
            100 products scored for the Ladder Top 100 &middot; Rankings updated monthly
          </p>
        </div>

        {/* ── Nominate ── */}
        <div className="mt-16 border border-border bg-card/30 p-8 md:p-10 text-center">
          <h2 className="text-lg font-bold text-foreground mb-3">
            Think your product belongs here?
          </h2>
          <p className="text-sm text-body max-w-md mx-auto leading-relaxed mb-6">
            Every product on this list was scored against the Ladder
            framework using the same method. No exceptions. Want a full,
            detailed Screen Score on your own product? Try the free scorer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/score"
              className="font-semibold bg-ladder-green text-background px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors text-sm"
            >
              Score your product
            </Link>
            <Link
              href="/contact"
              className="text-sm font-semibold text-body border border-border px-8 py-3 rounded-full hover:text-foreground hover:border-muted transition-colors"
            >
              Nominate a product
            </Link>
          </div>
        </div>

        {/* ── Methodology ── */}
        <div className="mt-16 mb-4">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-6">
            How the Ladder Top 100 is scored
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Sentiment signal",
              body: "We scan public sentiment — user reviews, community discussions, forum threads, app store ratings — and map the aggregate voice to the Ladder framework. For the Top 100, this is a quick-scan signal. The real Ladder Pulse product goes far deeper for paying customers, ingesting thousands of data points per experience and letting teams feed in internal signals like NPS, support tickets, and field reports.",
            },
            {
              title: "Interface review",
              body: "Public screenshots from marketing sites, review platforms, and product tours, analyzed against the Ladder framework. This is a quick visual read — a full Ladder Screen Score goes deeper with original product screens a company submits. The gap between interface and sentiment is often where the real story lives.",
            },
            {
              title: "Company verified",
              body: "Companies can submit demo links and real product screenshots for a more accurate interface review. Verified entries are flagged. Sentiment reflects real public discourse — it can't be tuned by the company.",
            },
          ].map((item) => (
            <div key={item.title} className="border-t border-border pt-6">
              <h3 className="text-sm font-bold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-body leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "No pay-to-play",
              body: "Rankings come from the Ladder Top 100 evaluation alone. No company can pay for placement, boost their ranking, or suppress a low score.",
            },
            {
              title: "Updated monthly",
              body: "We re-score every product each month as new signals come in. Scores go up and down. The delta column shows real movement.",
            },
            {
              title: "Quick read, not the full picture",
              body: "The Top 100 is for curiosity and conversation. It's lighter than a full Ladder Screen Score or a Pulse Score — those look at far more depth per product. Think of this as the leaderboard; the real scoring lives on runladder.com/score and in Ladder Pulse.",
            },
          ].map((item) => (
            <div key={item.title} className="border-t border-border pt-6">
              <h3 className="text-sm font-bold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-body leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-20 text-center">
          <p className="text-sm text-muted mb-6">
            Want to understand the scoring system?
          </p>
          <Link
            href="/framework"
            className="text-sm font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            Read the Ladder framework &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
