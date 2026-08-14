"use client";

import { useMemo, useState } from "react";
import { RUNG_DISPLAY_ORDER, getLevelForScore } from "@/lib/ladder";
import { industryLabel } from "@/lib/industries";
import { SectionLabel } from "@/components/SectionLabel";

/**
 * Personal analytics surface (#467). Reads back the score history the dashboard
 * already loads and turns it into a handful of genuinely useful charts, all
 * computed client-side (no new endpoints). Industry acts as a cross-cutting
 * segment across every chart, which is the payoff for per-score tagging (#429).
 */

type ScoreLike = {
  id: string;
  score: number;
  rungs?: unknown;
  findings?: unknown;
  timestamp: number;
  industry?: string;
  tags?: string[];
  uplift?: number | null;
  previousScore?: number | null;
  screenName?: string;
  label?: string;
};

const LEVEL_ORDER = [
  "Functional",
  "Usable",
  "Comfortable",
  "Delightful",
  "Meaningful",
];

function rungScore(rungs: unknown, name: string): number | null {
  if (!rungs || typeof rungs !== "object") return null;
  const v = (rungs as Record<string, unknown>)[name];
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && typeof (v as { score?: unknown }).score === "number") {
    return (v as { score: number }).score;
  }
  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Horizontal mono bar scaled to a 1-5 score. */
function ScoreBar({
  label,
  value,
  right,
}: {
  label: string;
  value: number | null;
  right?: string;
}) {
  const pct = value !== null ? (value / 5) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-foreground font-sans">{label}</span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {right ?? (value !== null ? value.toFixed(1) : "—")}
        </span>
      </div>
      <div className="h-2 bg-[#0e0e0e]">
        <div
          className="h-full bg-foreground/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Horizontal count bar (for finding categories / distribution). */
function CountBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-foreground font-sans truncate pr-2">
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {count}
        </span>
      </div>
      <div className="h-2 bg-[#0e0e0e]">
        <div
          className="h-full bg-ladder-green/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-5">
      <p className="text-[9px] uppercase tracking-widest text-muted mb-2">
        {label}
      </p>
      <p className="text-3xl font-bold tabular-nums text-foreground leading-none">
        {value}
      </p>
    </div>
  );
}

const CARD = "border border-[#333] bg-[#1e1e1e] p-6";

export function DashboardAnalytics({ scores }: { scores: ScoreLike[] }) {
  const [segment, setSegment] = useState<string | null>(null);

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const s of scores) if (s.industry) set.add(s.industry);
    return [...set].sort();
  }, [scores]);

  const rows = useMemo(
    () => (segment ? scores.filter((s) => s.industry === segment) : scores),
    [scores, segment],
  );

  const stats = useMemo(() => {
    const n = rows.length;
    const avg = n ? rows.reduce((a, s) => a + s.score, 0) / n : 0;
    const best = n ? Math.max(...rows.map((s) => s.score)) : 0;
    const rescored = rows.filter(
      (s) => typeof s.uplift === "number" && s.previousScore != null,
    );
    const avgUplift = rescored.length
      ? rescored.reduce((a, s) => a + (s.uplift as number), 0) / rescored.length
      : null;
    return { n, avg, best, avgUplift, rescoredCount: rescored.length };
  }, [rows]);

  const rungProfile = useMemo(
    () =>
      RUNG_DISPLAY_ORDER.map((rung) => {
        const vals = rows
          .map((s) => rungScore(s.rungs, rung))
          .filter((v): v is number => v !== null);
        const avg = vals.length
          ? vals.reduce((a, v) => a + v, 0) / vals.length
          : null;
        return { rung, avg };
      }),
    [rows],
  );

  const topIssues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of rows) {
      if (!Array.isArray(s.findings)) continue;
      for (const f of s.findings as Array<{ category?: unknown }>) {
        const c = typeof f?.category === "string" ? f.category : null;
        if (!c) continue;
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [rows]);

  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of rows) {
      const label = getLevelForScore(s.score).label;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return LEVEL_ORDER.map((label) => ({ label, count: counts.get(label) ?? 0 }));
  }, [rows]);

  // Score over time: chronological points for a simple line.
  const trend = useMemo(() => {
    const pts = [...rows]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((s) => s.score);
    return pts;
  }, [rows]);

  if (scores.length === 0) {
    return (
      <div className={`${CARD} text-center`}>
        <p className="text-sm text-foreground font-sans mb-1">No analytics yet</p>
        <p className="text-xs text-muted font-sans max-w-sm mx-auto leading-relaxed">
          Score a few screens and your trends, rung profile, and recurring issues
          show up here.
        </p>
      </div>
    );
  }

  const maxIssue = topIssues.length ? topIssues[0].count : 0;
  const maxDist = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="space-y-6">
      {/* Segment by industry (#429 payoff) */}
      {industries.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] uppercase tracking-widest text-muted mr-1">
            Segment
          </span>
          <button
            type="button"
            onClick={() => setSegment(null)}
            className={`text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              segment === null
                ? "text-ladder-green border-ladder-green/50 bg-ladder-green/10"
                : "text-muted border-[#2a2a2a] hover:border-[#3a3a3a]"
            }`}
          >
            All
          </button>
          {industries.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setSegment(ind)}
              className={`text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                segment === ind
                  ? "text-ladder-green border-ladder-green/50 bg-ladder-green/10"
                  : "text-muted border-[#2a2a2a] hover:border-[#3a3a3a]"
              }`}
            >
              {industryLabel(ind)}
            </button>
          ))}
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Screens scored" value={String(stats.n)} />
        <Stat label="Average score" value={stats.avg.toFixed(1)} />
        <Stat label="Best score" value={stats.best.toFixed(1)} />
        <Stat
          label="Avg gain on re-score"
          value={
            stats.avgUplift !== null
              ? `${stats.avgUplift >= 0 ? "+" : ""}${stats.avgUplift.toFixed(1)}`
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score over time */}
        <div className={`${CARD} flex flex-col`}>
          <SectionLabel className="mb-4">Score over time</SectionLabel>
          {trend.length >= 2 ? (
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="w-full flex-1 min-h-[120px]"
            >
              {[1, 2, 3, 4].map((g) => (
                <line
                  key={g}
                  x1="0"
                  x2="100"
                  y1={40 - (g / 5) * 40}
                  y2={40 - (g / 5) * 40}
                  stroke="#2a2a2a"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <polyline
                fill="none"
                stroke="var(--ladder-green, #6AC89B)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                points={trend
                  .map((v, i) => {
                    const x = (i / (trend.length - 1)) * 100;
                    const y = 40 - (v / 5) * 40;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          ) : (
            <div className="flex-1 min-h-[120px] flex items-center">
              <p className="text-xs text-muted font-sans">
                Score a few more screens to see your trend.
              </p>
            </div>
          )}
          <p className="text-[10px] text-muted font-mono mt-2">
            Oldest to newest, 0 to 5.
          </p>
        </div>

        {/* Rung profile */}
        <div className={CARD}>
          <SectionLabel className="mb-4">Rung profile</SectionLabel>
          <div className="space-y-4">
            {rungProfile.map((r) => (
              <ScoreBar key={r.rung} label={capitalize(r.rung)} value={r.avg} />
            ))}
          </div>
        </div>

        {/* Top recurring issues */}
        <div className={CARD}>
          <SectionLabel className="mb-4">Top recurring issues</SectionLabel>
          {topIssues.length ? (
            <div className="space-y-4">
              {topIssues.map((t) => (
                <CountBar
                  key={t.category}
                  label={t.category}
                  count={t.count}
                  max={maxIssue}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted font-sans">
              No findings recorded on these scores.
            </p>
          )}
        </div>

        {/* Portfolio distribution */}
        <div className={CARD}>
          <SectionLabel className="mb-4">Portfolio distribution</SectionLabel>
          <div className="space-y-4">
            {distribution.map((d) => (
              <CountBar
                key={d.label}
                label={d.label}
                count={d.count}
                max={maxDist}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
