"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/**
 * Single-select segment control. The trigger always shows the active filter
 * (so "what this page is filtered by" is never hidden) and turns green when a
 * specific industry is applied; the full list lives in a dark popover so many
 * industries never spill onto the page.
 */
function SegmentDropdown({
  value,
  options,
  onChange,
  allLabel,
  labelFor = (v) => v,
}: {
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  allLabel: string;
  labelFor?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = value !== null;
  const item =
    "w-full text-left px-3 py-1.5 text-xs uppercase tracking-widest font-sans transition-colors hover:bg-[#242424]";

  function pick(v: string | null) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-between gap-3 min-w-[220px] border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
          active
            ? "text-ladder-green border-ladder-green/50 bg-ladder-green/10"
            : open
              ? "text-foreground border-ladder-green"
              : "text-foreground border-[#2a2a2a] hover:border-[#3a3a3a]"
        }`}
      >
        <span className="truncate">{value ? labelFor(value) : allLabel}</span>
        <svg
          aria-hidden="true"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className="text-muted flex-shrink-0"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 z-30 min-w-[240px] max-h-[300px] overflow-y-auto border border-[#333] bg-[#1a1a1a] py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            onClick={() => pick(null)}
            className={`${item} ${value === null ? "text-ladder-green" : "text-foreground"}`}
          >
            {allLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={opt === value}
              onClick={() => pick(opt)}
              className={`${item} ${opt === value ? "text-ladder-green" : "text-foreground"}`}
            >
              {labelFor(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardAnalytics({ scores }: { scores: ScoreLike[] }) {
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const s of scores) if (s.industry) set.add(s.industry);
    return [...set].sort();
  }, [scores]);

  const tagList = useMemo(() => {
    const set = new Set<string>();
    for (const s of scores)
      if (Array.isArray(s.tags)) for (const t of s.tags) set.add(t);
    return [...set].sort();
  }, [scores]);

  const rows = useMemo(
    () =>
      scores.filter(
        (s) =>
          (!industryFilter || s.industry === industryFilter) &&
          (!tagFilter || (Array.isArray(s.tags) && s.tags.includes(tagFilter))),
      ),
    [scores, industryFilter, tagFilter],
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
      {/* Filter by Industry and Tags (#429 payoff). Same terms as the score
          detail page; single-select dropdowns so the active filter is always
          visible and the option list never spills. */}
      {(industries.length > 0 || tagList.length > 0) && (
        <div className="flex items-center gap-x-6 gap-y-3 flex-wrap">
          {industries.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-widest text-muted shrink-0">
                Industry
              </span>
              <SegmentDropdown
                value={industryFilter}
                options={industries}
                onChange={setIndustryFilter}
                allLabel="All industries"
                labelFor={industryLabel}
              />
            </div>
          )}
          {tagList.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-widest text-muted shrink-0">
                Tags
              </span>
              <SegmentDropdown
                value={tagFilter}
                options={tagList}
                onChange={setTagFilter}
                allLabel="All tags"
              />
            </div>
          )}
          {(industryFilter !== null || tagFilter !== null) && (
            <button
              type="button"
              onClick={() => {
                setIndustryFilter(null);
                setTagFilter(null);
              }}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
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
            <div className="flex-1 min-h-[120px] flex gap-2">
              {/* Y axis: the 0-5 score scale, aligned to the gridlines. */}
              <div className="flex flex-col justify-between text-[9px] text-muted font-mono text-right w-3 shrink-0">
                {[5, 4, 3, 2, 1, 0].map((n) => (
                  <span key={n} className="leading-none">
                    {n}
                  </span>
                ))}
              </div>
              <svg
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                className="flex-1 min-h-[120px]"
              >
                {[0, 1, 2, 3, 4, 5].map((g) => (
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
            </div>
          ) : (
            <div className="flex-1 min-h-[120px] flex items-center">
              <p className="text-xs text-muted font-sans">
                Score a few more screens to see your trend.
              </p>
            </div>
          )}
          <p className="text-[10px] text-muted font-mono mt-2">
            Oldest to newest.
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
