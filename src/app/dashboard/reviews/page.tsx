import Link from "next/link";
import type { Metadata } from "next";
import { MOCK_REVIEWS, rollupReview } from "@/lib/reviews/mockData";
import { getScoreColor } from "@/lib/ladder";

export const metadata: Metadata = {
  title: "Reviews | Ladder",
  description: "Group iterations of a design and watch scores evolve, with peer crit from your team.",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ReviewsPage() {
  const reviews = [...MOCK_REVIEWS].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
              Team
            </p>
            <h1 className="text-2xl text-foreground font-sans mb-2">Reviews</h1>
            <p className="text-sm text-muted font-sans max-w-xl leading-relaxed">
              Group iterations of a design into a Review. Watch scores evolve.
              Invite peers to drop notes on the screen and weigh in with a Team
              Take alongside the Ladder score.
            </p>
          </div>
          <button
            type="button"
            className="text-[11px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-5 py-2.5 hover:bg-ladder-green/90 transition-colors"
          >
            + New review
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          <StatCard
            label="Active reviews"
            value={reviews.filter((r) => r.status === "active").length.toString()}
          />
          <StatCard
            label="Frames in flight"
            value={reviews
              .reduce((sum, r) => sum + r.frames.length, 0)
              .toString()}
          />
          <StatCard
            label="Peer takes this month"
            value={reviews
              .reduce(
                (sum, r) =>
                  sum +
                  r.frames.reduce((s, f) => s + f.teamTakes.length, 0),
                0,
              )
              .toString()}
          />
        </div>

        {/* Reviews list */}
        <div className="space-y-2">
          {reviews.map((review) => {
            const roll = rollupReview(review);
            const positive = roll.delta > 0;
            return (
              <Link
                key={review.id}
                href={`/dashboard/reviews/${review.slug}`}
                className="block border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#1f1f1f] hover:border-[#3a3a3a] transition-colors p-5 group"
              >
                <div className="flex items-start justify-between gap-6 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h2 className="text-base text-foreground font-sans">
                        {review.name}
                      </h2>
                      {review.unread > 0 && (
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-ladder-green bg-ladder-green/10 border border-ladder-green/30 px-1.5 py-0.5">
                          {review.unread} new
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted font-sans leading-relaxed line-clamp-2 max-w-xl">
                      {review.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {review.reviewers.slice(0, 5).map((r) => (
                      <Avatar key={r.id} initials={r.initials} role={r.role} />
                    ))}
                    {review.reviewers.length > 5 && (
                      <span className="text-[10px] text-muted font-mono ml-1">
                        +{review.reviewers.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score evolution */}
                <div className="flex items-end gap-8 flex-wrap">
                  <div>
                    <p className="text-[9px] text-muted uppercase tracking-widest mb-1">
                      Starting
                    </p>
                    <span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: getScoreColor(roll.startingScore) }}
                    >
                      {roll.startingScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-muted text-base pb-1">→</div>
                  <div>
                    <p className="text-[9px] text-muted uppercase tracking-widest mb-1">
                      Current
                    </p>
                    <span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: getScoreColor(roll.currentScore) }}
                    >
                      {roll.currentScore.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted uppercase tracking-widest mb-1">
                      Delta
                    </p>
                    <span
                      className={`text-base font-mono font-semibold tabular-nums ${
                        positive ? "text-ladder-green" : roll.delta < 0 ? "text-ladder-red" : "text-muted"
                      }`}
                    >
                      {positive ? "↑" : roll.delta < 0 ? "↓" : "±"}
                      {Math.abs(roll.delta).toFixed(1)}
                    </span>
                  </div>
                  <div className="ml-auto text-right space-y-1">
                    <p className="text-[10px] text-muted font-sans">
                      <span className="text-foreground tabular-nums">
                        {roll.frameCount}
                      </span>{" "}
                      frame{roll.frameCount !== 1 ? "s" : ""} ·{" "}
                      <span className="text-foreground tabular-nums">
                        {roll.totalIterations}
                      </span>{" "}
                      iterations
                    </p>
                    <p className="text-[10px] text-muted font-sans">
                      <span className="tabular-nums">{roll.totalPins}</span>{" "}
                      pins ·{" "}
                      <span className="tabular-nums">{roll.totalTakes}</span>{" "}
                      team takes
                    </p>
                    <p className="text-[10px] text-muted font-sans">
                      Updated {timeAgo(review.updatedAt)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Beta footer */}
        <div className="mt-10 border border-ladder-green/20 bg-ladder-green/[0.04] p-5">
          <div className="flex items-start gap-3">
            <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-ladder-green bg-ladder-green/10 border border-ladder-green/30 px-1.5 py-0.5 mt-0.5">
              Beta
            </span>
            <div className="text-xs text-muted font-sans leading-relaxed">
              Reviews is a Team-tier feature in private beta. The data on this
              page is seeded so you can feel the workflow. Real persistence,
              invites, and notifications ship with the GA build.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-4">
      <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function Avatar({ initials, role }: { initials: string; role: "owner" | "key" | "viewer" }) {
  const ring =
    role === "owner"
      ? "border-ladder-green"
      : role === "key"
      ? "border-ladder-green/40"
      : "border-[#3a3a3a]";
  return (
    <div
      className={`w-7 h-7 rounded-full border ${ring} bg-[#1e1e1e] text-[10px] font-mono font-semibold text-foreground flex items-center justify-center`}
      title={`${role} reviewer`}
    >
      {initials}
    </div>
  );
}
