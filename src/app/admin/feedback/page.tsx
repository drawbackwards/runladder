"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";

type FeedbackEntry = {
  scoreId: string;
  userId: string;
  orgId: string | null;
  rating: "up" | "down";
  note: string;
  ts: number;
  userEmail: string | null;
  userName: string | null;
  orgName: string | null;
  score: number | null;
  scoreLabel: string | null;
  screenName: string | null;
};

function fmtTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminFeedbackPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/feedback?limit=200");
        if (res.status === 403) {
          if (!cancelled) setAuthorized(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setAuthorized(true);
          setEntries(json.feedback ?? []);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (authorized === false) {
    return (
      <div className="pt-20 max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-xl font-bold font-sans mb-3">Admin access required</h1>
        <p className="text-sm text-muted font-sans">
          Your Clerk account is signed in but not on the admin allowlist.
        </p>
      </div>
    );
  }

  const helpful = entries.filter((e) => e.rating === "up").length;
  const offBase = entries.filter((e) => e.rating === "down").length;
  const noted = entries.filter((e) => e.note.trim().length > 0).length;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl text-foreground font-sans">Analysis feedback</h1>
            <p className="text-xs text-muted font-sans mt-1">
              Score-by-score feedback from authenticated users.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            ← Admin
          </Link>
        </div>

        {err && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {err}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className="border border-[#333] bg-[#1e1e1e] p-4">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Total
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {entries.length}
            </p>
          </div>
          <div className="border border-[#333] bg-[#1e1e1e] p-4">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Helpful
            </p>
            <p className="text-2xl font-bold tabular-nums text-ladder-green">
              {helpful}
            </p>
          </div>
          <div className="border border-[#333] bg-[#1e1e1e] p-4">
            <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
              Off-base
            </p>
            <p className="text-2xl font-bold tabular-nums text-ladder-red">
              {offBase}
            </p>
          </div>
        </div>

        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[10px] text-muted uppercase tracking-widest">
            Recent feedback
          </span>
          <span className="text-[10px] text-muted">
            {noted} with note · {entries.length - noted} rating only
          </span>
        </div>

        <div className="border border-[#333] bg-[#1e1e1e]">
          {loading && entries.length === 0 ? (
            <div className="p-8 text-center text-muted font-sans text-sm">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-muted font-sans text-sm">
              No feedback yet.
            </div>
          ) : (
            <ul>
              {entries.map((e) => (
                <li
                  key={`${e.scoreId}:${e.userId}:${e.ts}`}
                  className="border-b border-[#222] last:border-0 p-4"
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    <div
                      className={`flex-shrink-0 px-2.5 py-1 text-[10px] uppercase tracking-widest border ${
                        e.rating === "up"
                          ? "border-ladder-green/40 text-ladder-green bg-ladder-green/5"
                          : "border-ladder-red/40 text-ladder-red bg-ladder-red/5"
                      }`}
                    >
                      {e.rating === "up" ? "Helpful" : "Off-base"}
                    </div>
                    <div className="flex-shrink-0 text-center min-w-[60px]">
                      <p
                        className="text-lg font-bold tabular-nums"
                        style={{
                          color: e.score !== null ? getScoreColor(e.score) : "#444",
                        }}
                      >
                        {e.score !== null ? e.score.toFixed(1) : "—"}
                      </p>
                      <p
                        className="text-[9px] uppercase tracking-widest"
                        style={{
                          color: e.score !== null ? getScoreColor(e.score) : "#444",
                        }}
                      >
                        {e.scoreLabel ?? "—"}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-sans truncate">
                        {e.screenName || "Untitled screen"}
                      </p>
                      <p className="text-xs text-muted font-sans truncate">
                        {e.userName ?? "—"} · {e.userEmail ?? "—"}
                        {e.orgName && (
                          <>
                            {" · "}
                            <span className="text-ladder-green">{e.orgName}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted flex-shrink-0">
                      {fmtTime(e.ts)}
                    </span>
                  </div>
                  {e.note.trim().length > 0 && (
                    <div className="mt-3 pl-2 border-l-2 border-[#333]">
                      <p className="text-sm text-muted font-sans whitespace-pre-wrap">
                        {e.note}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
