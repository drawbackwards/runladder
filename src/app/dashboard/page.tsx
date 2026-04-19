"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";
import { SkillTokenCard } from "@/components/SkillTokenCard";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";

type ScoreEntry = {
  id: string;
  score: number;
  label: string;
  screenName?: string;
  summary: string;
  source: string;
  thumbnail?: string;
  isPublic?: boolean;
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

function PlanModule({ usage }: { usage: UsageInfo }) {
  const pct = Math.min(100, (usage.used / usage.limit) * 100);
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-muted uppercase tracking-widest">
          Plan
        </span>
        <span className="text-[9px] uppercase tracking-widest font-semibold text-muted border border-[#333] px-2 py-0.5">
          Free
        </span>
      </div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-xl text-foreground tabular-nums">
          {usage.used}
          <span className="text-muted text-sm"> / {usage.limit}</span>
        </span>
        <span className="text-[10px] text-muted">
          {usage.month ? formatMonth(usage.month) : "This month"}
        </span>
      </div>
      <div className="h-1 bg-[#333] rounded-full mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? "#ef4444" : "#6AC89B",
          }}
        />
      </div>
      <Link
        href="/pricing"
        className="block text-center text-[10px] font-semibold bg-ladder-green text-[#1a1a1a] px-4 py-2 hover:bg-ladder-green/90 transition-colors uppercase tracking-widest mb-3"
      >
        Upgrade to Pro
      </Link>
      <p className="text-[10px] text-muted font-sans leading-relaxed">
        Unlimited scoring, private scores, per-dimension scoring, a11y audits, and UX copy review.
      </p>
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
        // Silently fail
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
  const usage = data?.usage ?? { used: 0, limit: FREE_MONTHLY_LIMIT, month: "" };

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-12">
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <main>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] text-muted uppercase tracking-widest">Score history</span>
              {scores.length > 0 && (
                <span className="text-[10px] text-[#444]">{scores.length} score{scores.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-[#333] bg-[#1e1e1e] p-5 shimmer h-24" />
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
                    className="border border-[#333] bg-[#1e1e1e] hover:border-muted transition-colors group"
                  >
                    <Link
                      href={`/dashboard/scores/${entry.id}`}
                      className="block p-4"
                    >
                      <div className="flex items-center gap-4">
                        {entry.thumbnail ? (
                          <div className="flex-shrink-0 w-20 h-20 border border-[#333] bg-[#111] overflow-hidden">
                            <img src={entry.thumbnail} alt="" className="w-full h-full object-cover object-top" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-20 h-20 border border-[#333] bg-[#111] flex items-center justify-center">
                            <span className="text-[#333] text-xs">—</span>
                          </div>
                        )}

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

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-foreground font-sans truncate">{entry.screenName || entry.source}</p>
                            {entry.isPublic === false && (
                              <span className="text-[8px] text-muted uppercase tracking-widest border border-[#333] px-1.5 py-0.5 flex-shrink-0">
                                Private
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted font-sans mt-1 line-clamp-2">{entry.summary}</p>
                          <span className="text-[10px] text-[#444] mt-2 block">
                            {timeAgo(entry.timestamp)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            deleteScore(entry.id);
                          }}
                          disabled={deleting === entry.id}
                          className="flex-shrink-0 text-[#333] hover:text-ladder-red transition-colors disabled:opacity-30 opacity-0 group-hover:opacity-100"
                          title="Delete score"
                          aria-label="Delete score"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                          </svg>
                        </button>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </main>

          <aside className="space-y-4">
            <PlanModule usage={usage} />
            <SkillTokenCard />
          </aside>
        </div>
      </div>
    </div>
  );
}
