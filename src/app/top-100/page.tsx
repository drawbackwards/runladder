"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PRODUCTS, CATEGORIES, SORT_OPTIONS, getScoreColor, getLevel } from "./data";
import type { Product } from "./data";

function sortProducts(products: Product[], sort: string): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "score-desc":
      return sorted.sort((a, b) => b.score - a.score);
    case "score-asc":
      return sorted.sort((a, b) => a.score - b.score);
    case "movers":
      return sorted.sort(
        (a, b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0)
      );
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "rank":
    default:
      return sorted.sort((a, b) => a.rank - b.rank);
  }
}

export default function Top100Page() {
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("rank");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (category !== "All") {
      list = list.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.verdict.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return sortProducts(list, sort);
  }, [category, sort, search]);

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
            Ladder Pulse scans thousands of sources, including G2, Reddit, Trustpilot,
            App Store, Hacker News, and Product Hunt, then combines that
            intelligence with interface analysis to produce one score no other
            system can. No sponsorships. No paid placements. Just the truth.
          </p>
          <p className="text-xs text-muted mt-4">
            {PRODUCTS.length} products scored &middot; Updated monthly
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

          {/* Search + sort row */}
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 bg-card border border-border text-sm text-foreground px-4 py-2.5 rounded-lg placeholder:text-muted focus:border-ladder-green/50 focus:outline-none transition-colors"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-card border border-border text-sm text-body px-3 py-2.5 rounded-lg focus:border-ladder-green/50 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Result count ── */}
        <div className="text-center mb-8">
          <span className="text-[11px] text-muted">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            {category !== "All" ? ` in ${category}` : ""}
            {search.trim() ? ` matching "${search}"` : ""}
          </span>
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

        {/* ── "More coming" ── */}
        <div className="text-center py-12 border-b border-border">
          <p className="text-sm text-muted">
            {PRODUCTS.length} of 100 scored by Pulse &middot; New products added monthly
          </p>
        </div>

        {/* ── Nominate ── */}
        <div className="mt-16 border border-border bg-card/30 p-8 md:p-10 text-center">
          <h2 className="text-lg font-bold text-foreground mb-3">
            Think your product belongs here?
          </h2>
          <p className="text-sm text-body max-w-md mx-auto leading-relaxed mb-6">
            Every product on this list was scored by Pulse, the same
            intelligence engine, the same framework, no exceptions. Score yours
            and see where you stand.
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
            How Pulse scores every product
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Pulse Intelligence",
              body: "Pulse ingests thousands of data points per product from G2, Capterra, Trustpilot, App Store, Reddit, Hacker News, Product Hunt, and community forums. Our AI maps every signal to the Ladder framework's five levels of experience quality. This is the lived experience score.",
            },
            {
              title: "Screen Score",
              body: "Public screenshots from marketing sites, review platforms, and product tours, analyzed by AI against the Ladder framework. This measures what the product looks like. The gap between Screen Score and Pulse Score is where the real insight lives.",
            },
            {
              title: "Company Verified",
              body: "Companies can submit demo links and real product screenshots for a more accurate screen analysis. Verified scores are flagged. But Pulse scores can't be influenced. They come directly from real users.",
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
              body: "Rankings are determined entirely by Pulse. No company can pay for placement, boost their ranking, or suppress a low score. The intelligence is what it is.",
            },
            {
              title: "Updated monthly",
              body: "Pulse re-scores every product each month as new data flows in. Scores go up and down. The delta column shows real movement.",
            },
            {
              title: "The gap is the story",
              body: "A beautiful product with a low Pulse score is a warning: the team invests in appearance over substance. An unremarkable product with a high Pulse score is an opportunity. Pulse finds both.",
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
