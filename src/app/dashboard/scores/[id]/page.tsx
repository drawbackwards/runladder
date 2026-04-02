"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getScoreColor, getLevelColor, getNextLevel, getGapToNext, getRungLevel } from "@/lib/ladder";
import type { RungName, RungScores } from "@/lib/ladder";
import { RungBreakdown } from "@/components/RungBreakdown";

type Finding = {
  title: string;
  impact: string;
  fix: string;
  category: string;
  region: string;
  uplift: number;
  targetLevel: string;
  rung?: string;
};

type ScoreDetail = {
  id: string;
  score: number;
  label: string;
  screenName: string;
  summary: string;
  next?: string;
  findings?: Finding[];
  rungs?: RungScores;
  source: string;
  thumbnail?: string;
  isPublic: boolean;
  timestamp: number;
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-widest text-muted border border-[#333] px-2 py-0.5">
      {category}
    </span>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ScoreDetailPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const [data, setData] = useState<ScoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchScore() {
      try {
        const res = await fetch(`/api/dashboard/scores/${params.id}`);
        if (!res.ok) throw new Error("Score not found");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Score not found");
      } finally {
        setLoading(false);
      }
    }

    fetchScore();
  }, [isSignedIn, params.id]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (loading) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-[#333] bg-[#1e1e1e] p-5 shimmer h-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-sm text-muted font-sans mb-4">Score not found</p>
          <Link href="/dashboard" className="text-xs text-ladder-green uppercase tracking-widest hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const nextLevel = getNextLevel(data.score);
  const gap = getGapToNext(data.score).toFixed(1);

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Back + meta */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="text-[11px] text-muted uppercase tracking-widest hover:text-foreground transition-colors">
            &larr; Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 border ${
              data.isPublic
                ? "text-ladder-green border-ladder-green/30"
                : "text-muted border-[#333]"
            }`}>
              {data.isPublic ? "Public" : "Private"}
            </span>
            <span className="text-[10px] text-[#444]">{timeAgo(data.timestamp)}</span>
          </div>
        </div>

        {/* Score hero */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 mb-10">
          {/* Left: thumbnail */}
          <div>
            {data.thumbnail ? (
              <div className="border border-[#333] bg-[#1e1e1e] p-1">
                <img src={data.thumbnail} alt="" className="w-full max-h-[420px] object-contain" />
              </div>
            ) : (
              <div className="border border-[#333] bg-[#1e1e1e] p-12 flex items-center justify-center">
                <span className="text-[#333] text-sm">No preview</span>
              </div>
            )}
          </div>

          {/* Right: score panel */}
          <div className="border border-[#333] bg-[#1e1e1e] p-8 flex flex-col">
            <span className="text-[10px] text-muted uppercase tracking-widest mb-2">Screen Score</span>
            <p className="text-sm text-foreground font-sans mb-6">{data.screenName}</p>

            <div className="flex-1 flex flex-col items-start justify-center">
              <span className="font-mono font-bold text-[4rem] leading-none tabular-nums" style={{ color: getScoreColor(data.score) }}>
                {data.score.toFixed(1)}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest mt-1" style={{ color: getScoreColor(data.score) }}>
                {data.label}
              </span>

              <div className="mt-6 pt-4 border-t border-[#333] w-full">
                <span className="text-[10px] text-muted uppercase tracking-widest">Gap to {nextLevel}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold" style={{ color: getLevelColor(nextLevel) }}>+{gap}</span>
                  <span className="text-[11px] text-muted">points</span>
                </div>
              </div>

              <div className="mt-6 w-full">
                <div className="h-1.5 bg-[#333] w-full">
                  <div
                    className="h-full transition-all duration-700 ease-out"
                    style={{ width: `${(data.score / 5) * 100}%`, background: getScoreColor(data.score) }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[#444]">
                  <span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span><span>5.0</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-body leading-relaxed mt-6 border-t border-[#333] pt-4">
              {data.summary}
            </p>
          </div>
        </div>

        {/* Rung breakdown */}
        {data.rungs && (
          <div className="border border-[#333] bg-[#1e1e1e] p-6 md:p-8 mb-10">
            <RungBreakdown rungs={data.rungs} />
          </div>
        )}

        {/* Next step */}
        {data.next && (
          <div className="border border-ladder-green/20 bg-[#1e1e1e] p-5 flex items-start gap-4 mb-10">
            <span className="text-ladder-green text-sm mt-0.5">&#8594;</span>
            <div>
              <span className="text-[10px] text-ladder-green uppercase tracking-widest">Fix this first</span>
              <p className="text-sm text-foreground leading-relaxed mt-1">{data.next}</p>
            </div>
          </div>
        )}

        {/* Findings */}
        {data.findings && data.findings.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] text-muted uppercase tracking-widest">Findings</span>
              <span className="text-[10px] text-[#444]">{data.findings.length} issues ranked by impact</span>
            </div>

            {data.findings.map((f, i) => (
              <div
                key={i}
                className="border border-[#333] bg-[#1e1e1e] p-6"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-8 h-8 border border-[#444] flex items-center justify-center text-xs text-muted">
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-sm font-bold text-foreground">{f.title}</h4>
                      <CategoryBadge category={f.category} />
                      {f.rung && (() => {
                        const level = getRungLevel(f.rung as RungName);
                        return (
                          <span
                            className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                            style={{ color: level.color, borderColor: level.color + "40" }}
                          >
                            {level.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-body leading-relaxed mb-3">{f.impact}</p>
                    <div className="border-t border-[#2a2a2a] pt-3 mt-3">
                      <p className="text-xs text-foreground leading-relaxed">{f.fix}</p>
                    </div>
                    {f.region && (
                      <p className="text-[10px] text-[#555] mt-3 tracking-wide">Region: {f.region}</p>
                    )}
                  </div>

                  {f.uplift && (
                    <div className="flex-shrink-0 text-right">
                      <span className="text-lg font-bold" style={{ color: getLevelColor(f.targetLevel) }}>
                        +{f.uplift.toFixed(1)}
                      </span>
                      <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: getLevelColor(f.targetLevel) }}>
                        {f.targetLevel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="border border-[#333] bg-[#1e1e1e] p-5 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted uppercase tracking-widest">
                  Potential score if all findings addressed
                </span>
                <span
                  className="text-xl font-bold"
                  style={{ color: getScoreColor(
                    Math.min(5, data.score + (data.findings?.reduce((s, f) => s + (f.uplift || 0), 0) || 0))
                  )}}
                >
                  {Math.min(5, data.score + (data.findings?.reduce((s, f) => s + (f.uplift || 0), 0) || 0)).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No detailed data message for older scores */}
        {!data.findings && !data.rungs && (
          <div className="border border-[#333] bg-[#1e1e1e] p-8 text-center">
            <p className="text-sm text-muted font-sans">
              Detailed findings are not available for this score. Scores created after this update include the full breakdown.
            </p>
            <Link
              href="/score"
              className="inline-block mt-4 text-xs text-ladder-green uppercase tracking-widest hover:underline"
            >
              Score a new screen
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
