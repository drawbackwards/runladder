"use client";

import { useEffect, useState } from "react";

type Rating = "up" | "down";

type Feedback = {
  rating: Rating;
  note: string;
  ts: number;
};

/**
 * Inline rating widget shown beneath a score result. Lets the user mark
 * the analysis as helpful or off-base, with an optional follow-up note.
 * Posts to /api/feedback/score; super admins can aggregate at
 * /api/admin/feedback.
 */
export function AnalysisFeedback({ scoreId }: { scoreId: string }) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Feedback | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/feedback/score?scoreId=${encodeURIComponent(scoreId)}`,
        );
        if (!res.ok) {
          if (res.status === 401) {
            // Anonymous viewer — hide widget entirely.
            if (!cancelled) setLoading(false);
            return;
          }
          throw new Error(`status ${res.status}`);
        }
        const json = await res.json();
        if (cancelled) return;
        if (json.feedback) {
          setExisting(json.feedback);
          setRating(json.feedback.rating);
          setNote(json.feedback.note ?? "");
        }
      } catch {
        // Silent — feedback is optional UX.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [scoreId]);

  async function persist(nextRating: Rating, nextNote: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/feedback/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreId,
          rating: nextRating,
          note: nextNote,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const json = await res.json();
      setExisting(json.feedback);
      setRating(json.feedback.rating);
      setNote(json.feedback.note ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  const submitted = !!existing;

  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] text-muted uppercase tracking-widest">
          Analysis quality
        </p>
        {submitted && (
          <span className="text-[10px] text-muted">
            You marked this {rating === "up" ? "helpful" : "off-base"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={() => persist("up", note)}
          disabled={busy}
          className={`text-xs font-semibold uppercase tracking-widest border px-4 py-2 transition-colors disabled:opacity-40 ${
            rating === "up"
              ? "border-ladder-green text-ladder-green bg-ladder-green/10"
              : "border-[#333] text-muted hover:text-foreground hover:border-muted"
          }`}
        >
          Helpful
        </button>
        <button
          onClick={() => persist("down", note)}
          disabled={busy}
          className={`text-xs font-semibold uppercase tracking-widest border px-4 py-2 transition-colors disabled:opacity-40 ${
            rating === "down"
              ? "border-ladder-red text-ladder-red bg-ladder-red/10"
              : "border-[#333] text-muted hover:text-foreground hover:border-muted"
          }`}
        >
          Off-base
        </button>
      </div>

      {rating && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              rating === "down"
                ? "What was off about the analysis?"
                : "What worked well? Anything we should keep doing?"
            }
            rows={2}
            maxLength={1000}
            className="w-full bg-[#111] border border-[#333] text-sm text-foreground p-2 focus:outline-none focus:border-ladder-green placeholder:text-[#555] resize-y font-sans"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => persist(rating, note)}
              disabled={busy || note === (existing?.note ?? "")}
              className="text-[10px] font-semibold bg-ladder-green text-[#1a1a1a] uppercase tracking-widest px-3 py-1.5 hover:bg-ladder-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy
                ? submitted
                  ? "Saving…"
                  : "Submitting…"
                : submitted
                  ? "Save Feedback"
                  : "Submit Feedback"}
            </button>
            <span className="text-[10px] text-muted font-sans">
              Optional. Your note goes to the team that tunes the scoring engine.
            </span>
          </div>
        </div>
      )}

      {err && (
        <p className="mt-2 text-xs text-ladder-red font-sans">{err}</p>
      )}
    </div>
  );
}
