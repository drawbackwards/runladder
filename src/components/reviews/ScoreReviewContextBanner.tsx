"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { findReviewBySlug } from "@/lib/reviews/mockData";

/**
 * When /score is opened via ?review=<slug>, surface a banner so the
 * user knows the next score will land inside that Review. Mock — real
 * build will persist the association in the score record.
 */
export function ScoreReviewContextBanner() {
  const params = useSearchParams();
  const slug = params?.get("review") ?? null;
  const review = slug ? findReviewBySlug(slug) : null;
  if (!review) return null;
  return (
    <div className="mb-6 border border-ladder-green/40 bg-ladder-green/[0.06] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-ladder-green bg-ladder-green/15 border border-ladder-green/40 px-1.5 py-0.5 flex-shrink-0">
          Review
        </span>
        <p className="text-xs text-foreground font-sans truncate">
          Adding to <span className="font-semibold">{review.name}</span>.
          This score will land inside the Review.
        </p>
      </div>
      <Link
        href="/score"
        className="text-[10px] uppercase tracking-widest font-semibold text-muted hover:text-foreground transition-colors flex-shrink-0"
      >
        Clear
      </Link>
    </div>
  );
}
