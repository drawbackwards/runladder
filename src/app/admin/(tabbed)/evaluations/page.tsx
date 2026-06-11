"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import type { Evaluation } from "@/lib/evaluation";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLOR: Record<string, string> = {
  draft: "text-muted",
  analyzing: "text-ladder-yellow",
  review: "text-ladder-green",
  approved: "text-foreground",
};

const MODE_LABEL: Record<string, string> = {
  sample: "Sample",
  audit: "Audit",
};

export default function EvaluationsPage() {
  const { isSignedIn } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/evaluations");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Fetch failed (${res.status})`);
      }
      const { evaluations: list } = await res.json();
      setEvaluations(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSignedIn) load();
  }, [isSignedIn]);

  // Auth + access gating live in the admin layout (#231).

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <p className="text-xs text-muted font-sans">
          Multi-screen audits of client products (sample or full)
        </p>
        <Link
          href="/admin/evaluations/new"
          className="text-xs font-semibold bg-ladder-green text-[#1a1a1a] uppercase tracking-widest px-5 py-2.5 hover:bg-ladder-green-light transition-colors"
        >
          New evaluation
        </Link>
      </div>

        {error && (
          <div className="mb-6 border border-red-500/40 bg-red-500/5 text-red-400 text-xs font-sans p-3">
            {error}
          </div>
        )}

        <div className="border border-[#333] bg-[#1e1e1e]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-muted uppercase tracking-widest text-[9px]">
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Project</th>
                <th className="text-left p-3">Mode</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Screens</th>
                <th className="text-left p-3">Score</th>
                <th className="text-left p-3">Created</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted font-sans">
                    Loading…
                  </td>
                </tr>
              ) : evaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted font-sans">
                    No evaluations yet.{" "}
                    <Link href="/admin/evaluations/new" className="text-ladder-green hover:underline">
                      Create the first one.
                    </Link>
                  </td>
                </tr>
              ) : (
                evaluations.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-[#222] last:border-0 hover:bg-[#222]"
                  >
                    <td className="p-3 text-foreground">{ev.clientName}</td>
                    <td className="p-3 text-muted">{ev.projectName}</td>
                    <td className="p-3 text-muted uppercase tracking-widest text-[10px]">
                      {MODE_LABEL[ev.mode]}
                    </td>
                    <td className={`p-3 uppercase tracking-widest text-[10px] ${STATUS_COLOR[ev.status] ?? "text-muted"}`}>
                      {ev.status}
                    </td>
                    <td className="p-3 text-muted tabular-nums">{ev.screens.length}</td>
                    <td className="p-3 tabular-nums">
                      {ev.overallScore !== null ? (
                        <span className="text-foreground font-semibold">
                          {ev.overallScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted">{fmtDate(ev.createdAt)}</td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/evaluations/${ev.id}`}
                        className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors mr-3"
                      >
                        Review
                      </Link>
                      <Link
                        href={`/admin/evaluations/${ev.id}/report`}
                        className="text-[10px] uppercase tracking-widest text-ladder-green hover:text-ladder-green/80 transition-colors"
                      >
                        Report
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </>
  );
}
