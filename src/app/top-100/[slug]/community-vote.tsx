"use client";

import { useState, useEffect, useCallback } from "react";

const SCORE_LABELS: Record<number, string> = {
  1: "Functional",
  2: "Usable",
  3: "Comfortable",
  4: "Delightful",
  5: "Meaningful",
};

const SCORE_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
  5: "#ffffff",
};

function getColorForScore(score: number): string {
  if (score < 2) return SCORE_COLORS[1];
  if (score < 3) return SCORE_COLORS[2];
  if (score < 4) return SCORE_COLORS[3];
  if (score < 5) return SCORE_COLORS[4];
  return SCORE_COLORS[5];
}

export function CommunityVote({
  slug,
  productName,
  ladderScore,
}: {
  slug: string;
  productName: string;
  ladderScore: number;
}) {
  const [communityAvg, setCommunityAvg] = useState<number | null>(null);
  const [communityCount, setCommunityCount] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [hovering, setHovering] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check localStorage for existing vote
  useEffect(() => {
    const stored = localStorage.getItem(`ladder-vote-${slug}`);
    if (stored) {
      setUserVote(Number(stored));
      setSubmitted(true);
    }
  }, [slug]);

  // Fetch community data
  useEffect(() => {
    fetch(`/api/vote?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setCommunityAvg(data.average);
        setCommunityCount(data.count);
      })
      .catch(() => {});
  }, [slug]);

  const submitVote = useCallback(
    async (score: number) => {
      if (submitted || submitting) return;
      setSubmitting(true);
      setUserVote(score);

      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, score }),
        });
        const data = await res.json();
        setCommunityAvg(data.average);
        setCommunityCount(data.count);
        localStorage.setItem(`ladder-vote-${slug}`, String(score));
        setSubmitted(true);
      } catch {
        setUserVote(null);
      } finally {
        setSubmitting(false);
      }
    },
    [slug, submitted, submitting]
  );

  const displayScore = hovering ?? userVote;
  const gap =
    communityAvg !== null
      ? Math.round((communityAvg - ladderScore) * 10) / 10
      : null;

  return (
    <div className="border border-border bg-card/30 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
            What would you score it?
          </p>
          <p className="text-[11px] text-muted mt-1">
            {submitted
              ? `You scored ${productName} a ${userVote}.0`
              : `Rate ${productName} on the Ladder framework`}
          </p>
        </div>
        {communityAvg !== null && communityCount > 0 && (
          <div className="text-right">
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: getColorForScore(communityAvg) }}
            >
              {communityAvg.toFixed(1)}
            </div>
            <p className="text-[10px] text-muted">
              {communityCount.toLocaleString()} vote{communityCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Score buttons */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((score) => {
          const isSelected = userVote === score;
          const isHovered = hovering === score;
          const color = SCORE_COLORS[score];

          return (
            <button
              key={score}
              onClick={() => submitVote(score)}
              onMouseEnter={() => !submitted && setHovering(score)}
              onMouseLeave={() => setHovering(null)}
              disabled={submitted}
              className={`flex-1 py-3 text-center transition-all rounded ${
                submitted && !isSelected
                  ? "opacity-20 cursor-default"
                  : submitted && isSelected
                    ? "cursor-default"
                    : "cursor-pointer hover:scale-105"
              }`}
              style={{
                border: `1px solid ${isSelected || isHovered ? color : "#333"}`,
                background: isSelected ? `${color}15` : "transparent",
              }}
            >
              <span
                className="text-lg font-bold block"
                style={{ color: isSelected || isHovered ? color : "#666" }}
              >
                {score}
              </span>
              <span
                className="text-[9px] uppercase tracking-wider block mt-0.5"
                style={{ color: isSelected || isHovered ? color : "#444" }}
              >
                {SCORE_LABELS[score]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hover label */}
      {displayScore && !submitted && (
        <p className="text-xs text-center text-muted mb-3">
          <span style={{ color: SCORE_COLORS[displayScore] }}>
            {SCORE_LABELS[displayScore]}
          </span>
          {" "}means: &ldquo;{
            displayScore === 1
              ? "The user fights the product"
              : displayScore === 2
                ? "Tasks complete with effort"
                : displayScore === 3
                  ? "No thinking required"
                  : displayScore === 4
                    ? "Anticipates needs, users refer others"
                    : "Irreplaceable"
          }&rdquo;
        </p>
      )}

      {/* Gap callout */}
      {submitted && gap !== null && gap !== 0 && (
        <div className="border-t border-border pt-4 mt-2">
          <p className="text-xs text-center text-body">
            {Math.abs(gap) >= 0.5 ? (
              <>
                The community scores {productName}{" "}
                <span
                  className="font-bold"
                  style={{
                    color: gap > 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {gap > 0 ? "+" : ""}
                  {gap.toFixed(1)}
                </span>{" "}
                {gap > 0 ? "higher" : "lower"} than Ladder.{" "}
                <span className="text-muted">
                  {gap > 0
                    ? "Think Ladder is underrating them?"
                    : "Think Ladder is being generous?"}
                </span>
              </>
            ) : (
              <>
                Community and Ladder agree within half a point.{" "}
                <span className="text-muted">Rare consensus.</span>
              </>
            )}
          </p>
        </div>
      )}

      {/* Share prompt after voting */}
      {submitted && (
        <div className="border-t border-border pt-4 mt-4 flex items-center justify-center gap-3">
          <span className="text-[10px] text-muted">Share your take:</span>
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(
              `I scored ${productName} a ${userVote}.0 on Ladder. They gave it ${ladderScore.toFixed(1)}.\n\n${
                userVote! > ladderScore ? "Underrated." : userVote! < ladderScore ? "Overrated." : "Fair."
              } What do you think?`
            )}&url=${encodeURIComponent(`https://runladder.com/top-100/${slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground transition-colors"
            title="Share on X"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://runladder.com/top-100/${slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground transition-colors"
            title="Share on LinkedIn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
