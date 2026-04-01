"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";

type ScoreEntry = {
  id: string;
  score: number;
  label: string;
  summary: string;
  source: string;
  timestamp: number;
};

type UsageInfo = {
  used: number;
  limit: number;
  month: string;
};

type DashboardData = {
  scores: ScoreEntry[];
  usage: UsageInfo;
};

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

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-6">
      <span className="text-[10px] text-muted uppercase tracking-widest block mb-2">{label}</span>
      <span className="font-mono text-2xl font-bold" style={{ color: color || "#e5e5e5" }}>
        {value}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Silently fail — page still renders
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isSignedIn]);

  async function deleteScore(scoreId: string) {
    setDeleting(scoreId);
    try {
      const res = await fetch("/api/dashboard/scores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreId }),
      });
      if (res.ok && data) {
        setData({
          ...data,
          scores: data.scores.filter((s) => s.id !== scoreId),
        });
      }
    } catch {
      // Silently fail
    } finally {
      setDeleting(null);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const scores = data?.scores ?? [];
  const usage = data?.usage ?? { used: 0, limit: 5, month: "" };

  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    : 0;

  const highScore = scores.length > 0
    ? Math.max(...scores.map((s) => s.score))
    : 0;

  const usagePercent = Math.min(100, (usage.used / usage.limit) * 100);

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-sans">Dashboard</h1>
            <p className="text-sm text-muted mt-1 font-sans">Your scoring history and usage</p>
          </div>
          <Link
            href="/score"
            className="text-xs font-semibold bg-ladder-green text-[#1a1a1a] px-6 py-3 hover:bg-ladder-green/90 transition-colors uppercase tracking-widest"
          >
            Score a screen
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard label="Total scores" value={scores.length.toString()} />
          <StatCard label="Average" value={avgScore > 0 ? avgScore.toFixed(1) : "--"} color={avgScore > 0 ? getScoreColor(avgScore) : undefined} />
          <StatCard label="Highest" value={highScore > 0 ? highScore.toFixed(1) : "--"} color={highScore > 0 ? getScoreColor(highScore) : undefined} />
          <div className="border border-[#333] bg-[#1e1e1e] p-6">
            <span className="text-[10px] text-muted uppercase tracking-widest block mb-2">
              {usage.month ? formatMonth(usage.month) : "This month"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">
                {usage.used}
              </span>
              <span className="text-sm text-muted">/ {usage.limit}</span>
            </div>
            <div className="h-1 bg-[#333] mt-3">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  background: usagePercent >= 100 ? "#ef4444" : "#6AC89B",
                }}
              />
            </div>
            {usagePercent >= 100 && (
              <Link href="/pricing" className="text-[10px] text-ladder-green mt-2 block hover:underline">
                Upgrade for unlimited
              </Link>
            )}
          </div>
        </div>

        {/* Score history */}
        <div className="border-t border-[#333] pt-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] text-muted uppercase tracking-widest">Score history</span>
            {scores.length > 0 && (
              <span className="text-[10px] text-[#444]">{scores.length} score{scores.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-[#333] bg-[#1e1e1e] p-5 shimmer h-20" />
              ))}
            </div>
          ) : scores.length === 0 ? (
            <div className="border border-[#333] bg-[#1e1e1e] p-12 text-center">
              <p className="text-sm text-muted font-sans mb-4">No scores yet</p>
              <Link
                href="/score"
                className="text-xs text-ladder-green uppercase tracking-widest hover:underline"
              >
                Score your first screen
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {scores.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-[#333] bg-[#1e1e1e] p-5 hover:border-muted transition-colors"
                >
                  <div className="flex items-center gap-6">
                    {/* Score */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <span
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: getScoreColor(entry.score) }}
                      >
                        {entry.score.toFixed(1)}
                      </span>
                      <span
                        className="block text-[9px] uppercase tracking-widest mt-0.5"
                        style={{ color: getScoreColor(entry.score) }}
                      >
                        {entry.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-sans truncate">{entry.source}</p>
                      <p className="text-xs text-muted font-sans mt-1 truncate">{entry.summary}</p>
                    </div>

                    {/* Time + delete */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[10px] text-[#444]">
                        {timeAgo(entry.timestamp)}
                      </span>
                      <button
                        onClick={() => deleteScore(entry.id)}
                        disabled={deleting === entry.id}
                        className="text-[#444] hover:text-ladder-red transition-colors disabled:opacity-30"
                        title="Delete score"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
