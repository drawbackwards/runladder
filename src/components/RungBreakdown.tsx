"use client";

import { RUNG_DISPLAY_ORDER, getRungLevel, analyzeRungs } from "@/lib/ladder";
import type { RungScores, RungName } from "@/lib/ladder";
import { ScoreBar } from "./ScoreBar";

/**
 * Per-rung breakdown bars. Bars are five-segmented white indicators
 * (see ScoreBar). Rung label and score number both render neutral —
 * level color coding is gone (Ward, 2026-05-11). The number itself
 * is what conveys judgment.
 */
function RungBar({
  rung,
  score,
  summary,
  isStrongest,
  isWeakest,
}: {
  rung: RungName;
  score: number;
  summary: string;
  isStrongest: boolean;
  isWeakest: boolean;
}) {
  const level = getRungLevel(rung);

  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
            {level.label}
          </span>
          {isStrongest && (
            <span className="text-[9px] text-muted uppercase tracking-widest">
              Strongest
            </span>
          )}
          {isWeakest && (
            <span className="text-[9px] text-muted uppercase tracking-widest">
              Focus here
            </span>
          )}
        </div>
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">
          {score.toFixed(1)}
        </span>
      </div>

      <ScoreBar score={score} size="md" className="mb-1.5" />

      <p className="text-[11px] text-muted leading-relaxed">{summary}</p>
    </div>
  );
}

export function RungBreakdown({ rungs }: { rungs: RungScores }) {
  const { strongest, weakest } = analyzeRungs(rungs);

  return (
    <div className="space-y-1">
      {/* Heading outside the box, matching the Findings section. */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] text-muted uppercase tracking-widest">
          Per-rung breakdown
        </span>
      </div>

      <div className="border border-[#333] bg-[#1e1e1e] p-6 md:p-8 space-y-5">
        {RUNG_DISPLAY_ORDER.map((rung) => (
          <RungBar
            key={rung}
            rung={rung}
            score={rungs[rung].score}
            summary={rungs[rung].summary}
            isStrongest={
              rung === strongest.rung && strongest.score !== weakest.score
            }
            isWeakest={
              rung === weakest.rung && strongest.score !== weakest.score
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for list views — bars-only, no per-rung summaries.
 * Same neutral five-segment treatment.
 */
export function RungBars({ rungs }: { rungs: RungScores }) {
  return (
    <div className="space-y-1.5">
      {RUNG_DISPLAY_ORDER.map((rung) => {
        const level = getRungLevel(rung);
        return (
          <div key={rung} className="flex items-center gap-2">
            <span className="text-[9px] text-muted w-20 text-right uppercase tracking-wider truncate">
              {level.label}
            </span>
            <ScoreBar score={rungs[rung].score} size="sm" className="flex-1" />
            <span className="text-[10px] font-bold tabular-nums w-6 text-right text-foreground">
              {rungs[rung].score.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
