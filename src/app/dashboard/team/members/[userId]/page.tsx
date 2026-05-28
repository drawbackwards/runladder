"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";
import {
  ActivityHeatmap,
  type DailyActivity,
} from "@/components/ActivityHeatmap";
import { Avatar } from "@/components/Avatar";
import { TabButton } from "@/components/Tabs";

type ScoreEntry = {
  id: string;
  score: number;
  label: string;
  screenName?: string;
  summary?: string;
  source: string;
  thumbnail?: string;
  isPublic?: boolean;
  timestamp: number;
  uplift?: number | null;
  sessionType?: "design" | "evaluation";
  /**
   * Set when the member soft-deleted this score. Managers see deleted
   * entries in the audit feed with a tag; stats / heatmap exclude them.
   */
  deletedAt?: number;
};

type Member = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
  joinedAt: number;
};

type Stats = {
  totalScans: number;
  avgScore: number | null;
  bestScore: number | null;
  lastScoreAt: number | null;
};

type Bucket = {
  stats: Stats;
  scores: ScoreEntry[];
  activity: DailyActivity[];
};

type MemberData = {
  member: Member;
  stats: Stats; // legacy all-up
  design: Bucket;
  evaluation: Bucket;
  activityWindowDays: number;
};

type Tab = "design" | "evaluation";

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

function fmtDate(input: number | string | Date | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: color ?? "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}

function ScoreRow({ entry }: { entry: ScoreEntry }) {
  const isDeleted = typeof entry.deletedAt === "number";
  return (
    <div
      className={`border transition-colors ${
        isDeleted
          ? // Faded + dashed border for audit-only entries the member
            // has removed from their own view.
            "border-dashed border-[#3a2a2a] bg-[#1a1414] opacity-70 hover:opacity-100 hover:bg-[#1f1818]"
          : "border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#1f1f1f] hover:border-[#3a3a3a]"
      }`}
    >
      <div className="px-4 py-3 flex items-center gap-4">
        {entry.thumbnail ? (
          <div
            className={`flex-shrink-0 w-12 h-12 border border-[#2a2a2a] bg-[#111] overflow-hidden ${
              isDeleted ? "grayscale" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.thumbnail}
              alt=""
              className="w-full h-full object-cover object-top"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-12 h-12 border border-[#2a2a2a] bg-[#111]" />
        )}

        <div className="flex-shrink-0 w-12 text-center">
          <span
            className={`text-xl font-bold tabular-nums ${
              isDeleted ? "line-through decoration-from-font" : ""
            }`}
            style={{ color: getScoreColor(entry.score) }}
          >
            {entry.score.toFixed(1)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-sans truncate ${
                isDeleted
                  ? "text-muted line-through decoration-from-font"
                  : "text-foreground"
              }`}
            >
              {entry.screenName || entry.source}
            </p>
            {isDeleted && (
              <span
                className="text-[8px] uppercase tracking-widest border px-1.5 py-0.5 flex-shrink-0"
                style={{
                  color: "#ef4444",
                  borderColor: "rgba(239,68,68,0.4)",
                  backgroundColor: "rgba(239,68,68,0.06)",
                }}
                title={`Deleted by member on ${fmtDate(entry.deletedAt)}. Visible to admins only.`}
              >
                Deleted
              </span>
            )}
            {entry.isPublic === false && (
              <span className="text-[8px] text-[#888] uppercase tracking-widest border border-[#3a3a3a] px-1.5 py-0.5 flex-shrink-0">
                Private
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted font-sans truncate mt-0.5">
            <span style={{ color: getScoreColor(entry.score) }}>
              {entry.label}
            </span>
            <span className="text-[#444] mx-1.5">·</span>
            {timeAgo(entry.timestamp)}
            {isDeleted && entry.deletedAt && (
              <>
                <span className="text-[#444] mx-1.5">·</span>
                <span className="text-ladder-red/80">
                  deleted {timeAgo(entry.deletedAt)}
                </span>
              </>
            )}
            {entry.source && (
              <>
                <span className="text-[#444] mx-1.5">·</span>
                <span className="uppercase tracking-widest text-[9px]">
                  {entry.source}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TeamMemberDetailPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("design");

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/team/members/${userId}`);
        if (res.status === 403) {
          if (!cancelled) setAuthorized(false);
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Status ${res.status}`);
        }
        const json = (await res.json()) as MemberData;
        if (!cancelled) {
          setAuthorized(true);
          setData(json);
        }
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Failed to load member");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (authorized === false) {
    return (
      <div className="pt-20 max-w-2xl mx-auto px-6 py-20 font-mono">
        <h1 className="text-xl font-bold font-sans mb-3">Manager access required</h1>
        <p className="text-sm text-muted font-sans">
          Only team managers can see member detail. Head back to{" "}
          <Link href="/dashboard/team" className="text-ladder-green hover:underline">
            your team
          </Link>
          .
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <p className="text-sm text-muted font-sans">Loading member…</p>
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <h1 className="text-xl font-bold font-sans mb-3">
            Couldn&apos;t load member
          </h1>
          <p className="text-sm text-muted font-sans mb-6">
            {err ?? "Unknown error"}
          </p>
          <Link
            href="/dashboard/team"
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            ← Back to team
          </Link>
        </div>
      </div>
    );
  }

  const { member, design, evaluation, activityWindowDays } = data;
  const name =
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    member.email ||
    "—";

  const bucket = tab === "design" ? design : evaluation;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link
            href="/dashboard/team"
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            ← Team
          </Link>
          <div className="mt-4 flex items-center gap-5">
            <Avatar
              imageUrl={member.imageUrl}
              name={[member.firstName, member.lastName]
                .filter(Boolean)
                .join(" ")}
              email={member.email}
              size={64}
              ring={member.role === "org:admin" ? "manager" : "none"}
            />
            <div className="min-w-0">
              <h1 className="text-xl text-foreground font-sans truncate">
                {name}
              </h1>
              <p className="text-xs text-muted font-sans mt-1">
                {member.email ?? "—"}
                <span className="text-[#444] mx-1.5">·</span>
                Joined {fmtDate(member.joinedAt)}
                {member.role === "org:admin" && (
                  <>
                    <span className="text-[#444] mx-1.5">·</span>
                    <span className="text-ladder-green">manager</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-[#2a2a2a] flex items-end mb-6">
          <TabButton
            label="Design sessions"
            count={design.scores.length}
            active={tab === "design"}
            onClick={() => setTab("design")}
          />
          <TabButton
            label="Evaluations"
            count={evaluation.scores.length}
            active={tab === "evaluation"}
            onClick={() => setTab("evaluation")}
          />
          <span className="ml-auto pb-3 text-[10px] text-muted">
            {tab === "design"
              ? "Their own design work"
              : "Audits, research, and competitor scoring"}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
          <StatPill
            label="Avg score"
            value={
              bucket.stats.avgScore !== null
                ? bucket.stats.avgScore.toFixed(1)
                : "—"
            }
            color={
              bucket.stats.avgScore !== null
                ? getScoreColor(bucket.stats.avgScore)
                : undefined
            }
          />
          <StatPill
            label="Total scans"
            value={String(bucket.stats.totalScans)}
          />
          <StatPill
            label="Best"
            value={
              bucket.stats.bestScore !== null
                ? bucket.stats.bestScore.toFixed(1)
                : "—"
            }
            color={
              bucket.stats.bestScore !== null
                ? getScoreColor(bucket.stats.bestScore)
                : undefined
            }
          />
          <StatPill
            label="Last scored"
            value={
              bucket.stats.lastScoreAt
                ? timeAgo(bucket.stats.lastScoreAt)
                : "—"
            }
          />
        </div>

        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5 mb-8">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Activity
            </span>
            <span className="text-[10px] text-muted">
              Last {activityWindowDays} days
            </span>
          </div>
          <ActivityHeatmap
            activity={bucket.activity}
            cellWidth={18}
            cellHeight={7}
            cellGap={2}
            emptyClassName="bg-[#222]"
          />
        </div>

        <div className="mb-3 flex items-baseline justify-between gap-3 flex-wrap">
          <span className="text-[10px] text-muted uppercase tracking-widest">
            Score history
          </span>
          <span className="text-[10px] text-muted">
            {(() => {
              const total = bucket.scores.length;
              const deleted = bucket.scores.filter((s) => !!s.deletedAt).length;
              if (deleted === 0) {
                return (
                  <>
                    {total} score{total !== 1 ? "s" : ""}
                  </>
                );
              }
              return (
                <>
                  {total} score{total !== 1 ? "s" : ""} ·{" "}
                  <span className="text-ladder-red/80">
                    {deleted} deleted
                  </span>
                </>
              );
            })()}
          </span>
        </div>

        {bucket.scores.length === 0 ? (
          <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
            <p className="text-sm text-muted font-sans">
              {tab === "design"
                ? `No design sessions from ${name} yet.`
                : `No evaluation sessions from ${name} yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {bucket.scores.map((entry) => (
              <ScoreRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
