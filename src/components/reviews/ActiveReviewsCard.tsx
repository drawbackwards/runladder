import Link from "next/link";
import { MOCK_REVIEWS, rollupReview } from "@/lib/reviews/mockData";
import { getScoreColor } from "@/lib/ladder";

/**
 * Compact card surfaced on /dashboard so the active Reviews are one
 * click from the entry point. Renders the three most recently updated
 * reviews with their starting → current score and a tiny activity hint.
 */
export function ActiveReviewsCard() {
  const reviews = [...MOCK_REVIEWS]
    .filter((r) => r.status === "active")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 3);

  if (reviews.length === 0) return null;

  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5 mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[10px] text-muted uppercase tracking-widest mb-1">
            Active reviews
          </h2>
          <p className="text-xs text-muted font-sans">
            Bucket iterations of a design. Peers weigh in with annotations and
            a Team Take.
          </p>
        </div>
        <Link
          href="/dashboard/reviews"
          className="text-[10px] uppercase tracking-widest font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors flex-shrink-0"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {reviews.map((review) => {
          const roll = rollupReview(review);
          const positive = roll.delta > 0;
          return (
            <Link
              key={review.id}
              href={`/dashboard/reviews/${review.slug}`}
              className="border border-[#333] bg-[#1e1e1e] hover:bg-[#222] hover:border-[#3a3a3a] transition-colors p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] text-foreground font-sans font-semibold truncate">
                  {review.name}
                </p>
                {review.unread > 0 && (
                  <span className="text-[8px] font-mono font-semibold uppercase tracking-widest text-ladder-green bg-ladder-green/10 border border-ladder-green/30 px-1 py-0.5 flex-shrink-0">
                    {review.unread}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: getScoreColor(roll.startingScore) }}
                >
                  {roll.startingScore.toFixed(1)}
                </span>
                <span className="text-muted text-xs">→</span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: getScoreColor(roll.currentScore) }}
                >
                  {roll.currentScore.toFixed(1)}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold tabular-nums ml-auto ${
                    positive
                      ? "text-ladder-green"
                      : roll.delta < 0
                      ? "text-ladder-red"
                      : "text-muted"
                  }`}
                >
                  {positive ? "↑" : roll.delta < 0 ? "↓" : "±"}
                  {Math.abs(roll.delta).toFixed(1)}
                </span>
              </div>
              <p className="text-[10px] text-muted font-sans">
                {roll.frameCount} frame{roll.frameCount !== 1 ? "s" : ""} ·{" "}
                {roll.totalIterations} iteration
                {roll.totalIterations !== 1 ? "s" : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
