"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getScoreColor } from "@/lib/ladder";
import { surfaceParts } from "@/lib/surface";

// Surface chip (Web / Figma / Skill / …) — matches the dashboard score-row badge.
const SURFACE_BADGE =
  "flex-shrink-0 text-[8px] text-[#888] uppercase tracking-widest border border-[#3a3a3a] px-1.5 py-0.5";

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
  const { isSignedIn } = useAuth();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/feedback?limit=200");
        if (res.status === 403) {
          // Should not happen: layout gates access before this page mounts.
          return;
        }
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
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

  // Auth + access gating live in the admin layout (#231).

  const helpful = entries.filter((e) => e.rating === "up").length;
  const offBase = entries.filter((e) => e.rating === "down").length;
  const noted = entries.filter((e) => e.note.trim().length > 0).length;

  return (
    <>
      <div className="mb-6">
        <p className="text-xs text-muted font-sans">
          Score-by-score feedback from authenticated users.
        </p>
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
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm text-foreground font-sans truncate">
                          {surfaceParts(e.screenName ?? "").name || "Untitled screen"}
                        </p>
                        <span className={SURFACE_BADGE}>
                          {surfaceParts(e.screenName ?? "").surface}
                        </span>
                      </div>
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
    </>
  );
}
