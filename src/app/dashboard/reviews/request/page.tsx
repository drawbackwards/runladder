"use client";

import Link from "next/link";
import { useState } from "react";
import { MOCK_REVIEWS } from "@/lib/reviews/mockData";

export default function RequestReviewPage() {
  const [subject, setSubject] = useState("");
  const [reviewId, setReviewId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !note.trim()) return;
    // Mock submit. Real build will POST /api/reviews/requests
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="border border-ladder-green/30 bg-ladder-green/[0.04] p-8 text-center">
            <div className="mx-auto mb-5 w-14 h-14 border border-ladder-green/40 bg-ladder-green/10 flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6AC89B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-lg font-bold text-foreground font-sans mb-2">
              Request sent.
            </p>
            <p className="text-sm text-muted font-sans leading-relaxed max-w-md mx-auto mb-6">
              Your Team Lead will see it on their team dashboard. You&apos;ll
              get a notification when they pick it up.
            </p>
            <Link
              href="/dashboard"
              className="inline-block text-[11px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-5 py-2.5 hover:bg-ladder-green/90 transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest hover:text-foreground transition-colors mb-6"
        >
          ← Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl text-foreground font-sans mb-2">
            Request a review
          </h1>
          <p className="text-sm text-muted font-sans leading-relaxed">
            Ask your Team Lead for human eyes on a screen. Ladder will
            score it. Your Team Lead and the assigned reviewers will drop
            notes and weigh in with a Team Take.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
              Screen name *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-ladder-green/50 outline-none px-4 py-3 text-sm text-foreground font-sans placeholder:text-muted transition-colors"
              placeholder="Cart page, Onboarding step 2, etc."
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
              Add to a Review
            </label>
            <p className="text-[11px] text-muted font-sans mb-2">
              Optional. Pick an existing Review to attach this screen to, or
              leave blank and let your Team Lead decide.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReviewId("")}
                className={`text-[11px] px-3 py-1.5 border transition-colors ${
                  reviewId === ""
                    ? "border-ladder-green text-ladder-green bg-ladder-green/10"
                    : "border-[#3a3a3a] text-body hover:border-[#555] hover:text-foreground"
                }`}
              >
                Team Lead decides
              </button>
              {MOCK_REVIEWS.filter((r) => r.status === "active").map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReviewId(r.id)}
                  className={`text-[11px] px-3 py-1.5 border transition-colors ${
                    reviewId === r.id
                      ? "border-ladder-green text-ladder-green bg-ladder-green/10"
                      : "border-[#3a3a3a] text-body hover:border-[#555] hover:text-foreground"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
              Context *
            </label>
            <textarea
              required
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-ladder-green/50 outline-none px-4 py-3 text-sm text-foreground font-sans placeholder:text-muted transition-colors resize-none"
              placeholder="What's the screen about? What are you wrestling with? Anything specific you want eyes on?"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!subject.trim() || !note.trim()}
              className="text-[11px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-6 py-3 hover:bg-ladder-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send request
            </button>
            <Link
              href="/dashboard"
              className="text-[11px] font-semibold uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
