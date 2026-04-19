"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser, RedirectToSignIn } from "@clerk/nextjs";
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

function UpgradeStrip({ usage }: { usage: UsageInfo }) {
  const remaining = Math.max(0, usage.limit - usage.used);
  const exhausted = remaining === 0;
  return (
    <div
      className={`border-b ${
        exhausted
          ? "border-ladder-red/30 bg-ladder-red/5"
          : "border-[#2a2a2a] bg-[#161616]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-center gap-4 flex-wrap">
        <span className="text-[11px] text-muted font-sans">
          {exhausted ? (
            <>
              <span className="text-ladder-red font-semibold">
                0 scores left
              </span>{" "}
              this month.
            </>
          ) : (
            <>
              <span className="text-foreground font-semibold tabular-nums">
                {remaining}
              </span>{" "}
              of {usage.limit} free scores left this month
            </>
          )}
        </span>
        <Link
          href="/pricing"
          className="text-[10px] uppercase tracking-widest font-semibold text-ladder-green hover:text-ladder-green/80 transition-colors"
        >
          Upgrade to Pro →
        </Link>
      </div>
    </div>
  );
}

function ScoreCTACard() {
  return (
    <Link
      href="/score"
      className="flex items-center gap-4 border border-ladder-green/40 bg-ladder-green/5 hover:bg-ladder-green/10 hover:border-ladder-green/60 transition-colors p-4 group"
    >
      <div className="flex-shrink-0 w-20 h-20 bg-ladder-green/10 border border-ladder-green/30 flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6AC89B"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground font-sans">
          Score a new screen
        </p>
        <p className="text-xs text-muted font-sans mt-1">
          Upload or paste — get a Ladder score back in seconds
        </p>
      </div>
      <span className="text-ladder-green text-xl flex-shrink-0 pr-3 group-hover:translate-x-0.5 transition-transform">
        →
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
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
  const firstName = user?.firstName || null;

  return (
    <div className="pt-20 font-mono">
      <UpgradeStrip usage={usage} />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl text-foreground font-sans">
            {firstName ? `Hi, ${firstName}.` : "Welcome back."}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <main>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] text-muted uppercase tracking-widest">
                Score history
              </span>
              {scores.length > 0 && (
                <span className="text-[10px] text-muted">
                  {scores.length} score{scores.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <ScoreCTACard />

              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-[#333] bg-[#1e1e1e] p-5 shimmer h-24"
                  />
                ))
              ) : scores.length === 0 ? (
                <div className="border border-[#333] bg-[#1e1e1e] p-8 text-center">
                  <p className="text-sm text-muted font-sans">
                    No scores yet — start above.
                  </p>
                </div>
              ) : (
                scores.map((entry) => (
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
                            <img
                              src={entry.thumbnail}
                              alt=""
                              className="w-full h-full object-cover object-top"
                            />
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
                            <p className="text-sm text-foreground font-sans truncate">
                              {entry.screenName || entry.source}
                            </p>
                            {entry.isPublic === false && (
                              <span className="text-[8px] text-[#999] uppercase tracking-widest border border-[#444] px-1.5 py-0.5 flex-shrink-0">
                                Private
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted font-sans mt-1 line-clamp-2">
                            {entry.summary}
                          </p>
                          <span className="text-[10px] text-muted mt-2 block">
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
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                          </svg>
                        </button>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </main>

          <aside>
            <SkillTokenCard />
          </aside>
        </div>
      </div>
    </div>
  );
}
