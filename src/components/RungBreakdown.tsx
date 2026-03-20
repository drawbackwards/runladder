"use client";

import { RUNG_DISPLAY_ORDER, getRungLevel, analyzeRungs } from "@/lib/ladder";
import type { RungScores, RungName } from "@/lib/ladder";

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
  const pct = Math.max(2, (score / 5) * 100); // min 2% so bar is always visible

  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[11px] font-bold uppercase tracking-wider"
            style={{ color: level.color }}
          >
            {level.label}
          </span>
          {isStrongest && (
            <span className="text-[9px] text-green-400 uppercase tracking-widest">
              Strongest
            </span>
          )}
          {isWeakest && (
            <span className="text-[9px] text-red-400 uppercase tracking-widest">
              Focus here
            </span>
          )}
        </div>
        <span
          className="font-mono text-sm font-bold tabular-nums"
          style={{ color: level.color }}
        >
          {score.toFixed(1)}
        </span>
      </div>

      <div className="h-2 bg-[#333] rounded-sm overflow-hidden mb-1.5">
        <div
          className="h-full rounded-sm transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: level.color }}
        />
      </div>

      <p className="text-[11px] text-muted leading-relaxed">
        {summary}
      </p>
    </div>
  );
}

export function RungBreakdown({ rungs }: { rungs: RungScores }) {
  const { strongest, weakest } = analyzeRungs(rungs);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
          Per-rung breakdown
        </span>
      </div>

      {RUNG_DISPLAY_ORDER.map((rung) => (
        <RungBar
          key={rung}
          rung={rung}
          score={rungs[rung].score}
          summary={rungs[rung].summary}
          isStrongest={rung === strongest.rung && strongest.score !== weakest.score}
          isWeakest={rung === weakest.rung && strongest.score !== weakest.score}
        />
      ))}
    </div>
  );
}

/** Compact version for list views — just bars, no summaries */
export function RungBars({ rungs }: { rungs: RungScores }) {
  return (
    <div className="space-y-1.5">
      {RUNG_DISPLAY_ORDER.map((rung) => {
        const level = getRungLevel(rung);
        const pct = Math.max(2, (rungs[rung].score / 5) * 100);
        return (
          <div key={rung} className="flex items-center gap-2">
            <span className="text-[9px] text-muted w-20 text-right uppercase tracking-wider truncate">
              {level.label}
            </span>
            <div className="flex-1 h-1.5 bg-[#333] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{ width: `${pct}%`, background: level.color }}
              />
            </div>
            <span
              className="text-[10px] font-bold tabular-nums w-6 text-right"
              style={{ color: level.color }}
            >
              {rungs[rung].score.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
