"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MOCK_REVIEW_REQUESTS,
  MOCK_REVIEWS,
  findReviewById,
  type MockReviewRequest,
} from "@/lib/reviews/mockData";
import { getScoreColor } from "@/lib/ladder";
import { MockScreen } from "@/components/reviews/MockScreen";

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

/**
 * Manager-side panel showing pending review requests from designers.
 * Accept routes the manager to "add to Review" flow (mock: marks
 * accepted in local state). Decline removes from view.
 *
 * Sits on /dashboard/team above Active reviews so incoming asks
 * land first thing the manager sees on the team page.
 */
export function ReviewRequestsPanel() {
  // Local state lets the manager dismiss requests interactively in the
  // mock. Real build will hit /api/reviews/requests with optimistic UI.
  const [requests, setRequests] = useState<MockReviewRequest[]>(
    MOCK_REVIEW_REQUESTS.filter((r) => r.status === "pending"),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  function handleAccept(id: string) {
    setRequests((rs) => rs.filter((r) => r.id !== id));
  }
  function handleDecline(id: string) {
    setRequests((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <section className="mb-6 border border-ladder-green/30 bg-ladder-green/[0.04] p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[10px] text-ladder-green uppercase tracking-widest font-mono font-semibold">
              Review requests
            </h2>
            <span className="text-[10px] text-muted font-mono tabular-nums">
              {requests.length} pending
            </span>
          </div>
          <p className="text-xs text-muted font-sans mt-1">
            Designers asking for your eyes. Accept to start (or extend) a
            Review.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {requests.map((req) => {
          const suggested = req.suggestedReviewId
            ? findReviewById(req.suggestedReviewId)
            : null;
          const isExpanded = expandedId === req.id;
          return (
            <div
              key={req.id}
              className="border border-[#2a2a2a] bg-[#1a1a1a] p-3"
            >
              <div className="flex items-stretch gap-3">
                <div className="w-20 flex-shrink-0">
                  <MockScreen hue={req.hue} name={req.subject} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-sm text-foreground font-sans font-semibold">
                      {req.subject}
                    </h3>
                    {req.currentScore !== null && (
                      <span
                        className="text-[11px] font-mono font-semibold tabular-nums"
                        style={{ color: getScoreColor(req.currentScore) }}
                        title="Current Ladder score"
                      >
                        {req.currentScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted font-sans mb-1.5">
                    {req.requestedBy.name} · {timeAgo(req.requestedAt)}
                    {suggested && (
                      <>
                        {" · "}
                        <span className="text-ladder-green">
                          suggests {suggested.name}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-body font-sans leading-relaxed line-clamp-2">
                    {req.note}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="text-[10px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-3 py-1.5 hover:bg-ladder-green/90 transition-colors"
                  >
                    {isExpanded ? "Close" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(req.id)}
                    className="text-[10px] font-semibold uppercase tracking-widest border border-[#3a3a3a] text-muted px-3 py-1.5 hover:text-foreground hover:border-[#555] transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                  <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
                    Add to
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {MOCK_REVIEWS.filter((r) => r.status === "active").map(
                      (r) => (
                        <Link
                          key={r.id}
                          href={`/dashboard/reviews/${r.slug}`}
                          onClick={() => handleAccept(req.id)}
                          className={`text-[10px] px-3 py-1.5 border transition-colors ${
                            suggested?.id === r.id
                              ? "border-ladder-green text-ladder-green bg-ladder-green/10"
                              : "border-[#3a3a3a] text-body hover:border-[#555] hover:text-foreground"
                          }`}
                        >
                          {r.name}
                          {suggested?.id === r.id && (
                            <span className="ml-1.5 text-[9px] opacity-70">
                              suggested
                            </span>
                          )}
                        </Link>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => handleAccept(req.id)}
                      className="text-[10px] font-semibold px-3 py-1.5 border border-ladder-green/40 text-ladder-green bg-ladder-green/5 hover:bg-ladder-green/15 transition-colors"
                    >
                      + Start a new Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
