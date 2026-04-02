"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";

type ScoreEntry = {
  id: string;
  score: number;
  label: string;
  screenName?: string;
  summary: string;
  source: string;
  thumbnail?: string;
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

        {/* Usage + Upgrade */}
        <div className="flex items-center gap-6 mb-10">
          {/* Usage meter */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              {usage.month ? formatMonth(usage.month) : "This month"}
            </span>
            <span className="font-mono text-sm text-foreground">
              {usage.used}<span className="text-muted">/{usage.limit}</span>
            </span>
            <div className="w-24 h-1 bg-[#333] rounded-full">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  background: usagePercent >= 100 ? "#ef4444" : "#6AC89B",
                }}
              />
            </div>
          </div>

          {/* Pro upgrade promo */}
          <Link
            href="/pricing"
            className="flex items-center gap-2 border border-[#333] bg-[#1e1e1e] px-4 py-2 hover:border-ladder-green transition-colors group"
          >
            <span className="text-[10px] text-ladder-green uppercase tracking-widest font-semibold">Pro</span>
            <span className="text-[11px] text-muted font-sans group-hover:text-foreground transition-colors">
              Unlimited scores, team features, API access
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6AC89B" strokeWidth="2" className="flex-shrink-0">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
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
                  <div className="flex items-center gap-5">
                    {/* Thumbnail */}
                    {entry.thumbnail ? (
                      <div className="flex-shrink-0 w-16 h-16 border border-[#333] bg-[#111] overflow-hidden">
                        <img src={entry.thumbnail} alt="" className="w-full h-full object-cover object-top" />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-16 h-16 border border-[#333] bg-[#111] flex items-center justify-center">
                        <span className="text-[#333] text-xs">--</span>
                      </div>
                    )}

                    {/* Score */}
                    <div className="flex-shrink-0 w-14 text-center">
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
                      <p className="text-sm text-foreground font-sans truncate">{entry.screenName || entry.source}</p>
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
