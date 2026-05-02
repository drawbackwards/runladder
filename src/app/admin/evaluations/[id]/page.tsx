"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Evaluation, AnnotationFinding, EvaluationScreen } from "@/lib/evaluation";
import { AnnotatedScreen } from "@/components/admin/AnnotatedScreen";

const SCORE_COLOR = (s: number | null) => {
  if (s === null) return "text-muted";
  if (s >= 4) return "text-ladder-green";
  if (s >= 3) return "text-ladder-yellow";
  if (s >= 2) return "text-ladder-orange";
  return "text-ladder-red";
};

export default function EvaluationReviewPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeScreenIdx, setActiveScreenIdx] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/evaluations/${params.id}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Fetch failed (${res.status})`);
      }
      const { evaluation: ev } = await res.json();
      setEvaluation(ev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSignedIn) load();
  }, [isSignedIn, params.id]);

  async function analyze(screenId?: string) {
    if (!evaluation) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/evaluations/${params.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(screenId ? { screenId } : {}),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Analyze failed");
      setEvaluation(j.evaluation);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function doSave(ev: typeof evaluation, silent = false) {
    if (!ev) return;
    setSaving(true);
    if (!silent) setError(null);
    try {
      const res = await fetch(`/api/admin/evaluations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screens: ev.screens,
          auditorName: ev.auditorName,
          executiveSummary: ev.executiveSummary,
          nextSteps: ev.nextSteps,
          humanNotes: ev.humanNotes,
          status: ev.status,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setEvaluation(j.evaluation);
      setDirty(false);
      setLastSavedAt(new Date());
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function save() {
    return doSave(evaluation);
  }

  // Auto-save 3s after the last change
  useEffect(() => {
    if (!dirty || !evaluation) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(evaluation, true), 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [dirty, evaluation]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve() {
    if (!evaluation) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/evaluations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Approve failed");
      setEvaluation(j.evaluation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEval() {
    if (!confirm("Delete this evaluation? This cannot be undone.")) return;
    await fetch(`/api/admin/evaluations/${params.id}`, { method: "DELETE" });
    router.push("/admin/evaluations");
  }

  const updateFinding = useCallback(
    (screenId: string, findingId: string, field: "humanNote" | "fix" | "issue", value: string) => {
      setEvaluation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          screens: prev.screens.map((s) =>
            s.id !== screenId
              ? s
              : {
                  ...s,
                  findings: s.findings.map((f) =>
                    f.id !== findingId ? f : { ...f, [field]: value },
                  ),
                },
          ),
        };
      });
      setDirty(true);
    },
    [],
  );

  const updatePinPosition = useCallback(
    (screenId: string, findingId: string, xPct: number, yPct: number) => {
      setEvaluation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          screens: prev.screens.map((s) =>
            s.id !== screenId
              ? s
              : {
                  ...s,
                  findings: s.findings.map((f) =>
                    f.id !== findingId ? f : { ...f, xPercent: xPct, yPercent: yPct },
                  ),
                },
          ),
        };
      });
      setDirty(true);
    },
    [],
  );

  const updateScreen = useCallback((screenId: string, field: keyof EvaluationScreen, value: string) => {
    setEvaluation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        screens: prev.screens.map((s) =>
          s.id !== screenId ? s : { ...s, [field]: value },
        ),
      };
    });
    setDirty(true);
  }, []);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (loading) {
    return (
      <div className="pt-20 font-mono max-w-6xl mx-auto px-6 py-10">
        <p className="text-muted font-sans">Loading…</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="pt-20 font-mono max-w-6xl mx-auto px-6 py-10">
        <p className="text-red-400 font-sans">{error ?? "Evaluation not found."}</p>
      </div>
    );
  }

  const activeScreen: EvaluationScreen | undefined = evaluation.screens[activeScreenIdx];
  const allAnalyzed = evaluation.screens.every((s) => s.analyzedAt);

  return (
    <div className="pt-20 font-mono min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Nav */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1 font-sans">
              <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
              <span className="mx-1.5">/</span>
              <Link href="/admin/evaluations" className="hover:text-foreground transition-colors">Evaluations</Link>
              <span className="mx-1.5">/</span>
              <span className="text-foreground">{evaluation.clientName}</span>
            </div>
            <h1 className="text-xl text-foreground font-sans">
              {evaluation.clientName}
              <span className="text-muted mx-2">—</span>
              {evaluation.projectName}
            </h1>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {evaluation.overallScore !== null && (
                <span className={`text-2xl font-semibold tabular-nums ${SCORE_COLOR(evaluation.overallScore)}`}>
                  {evaluation.overallScore.toFixed(1)}
                </span>
              )}
              <span className="text-[10px] uppercase tracking-widest text-muted">
                {evaluation.mode === "sample" ? "Sample report" : "Full audit"}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted">
                {evaluation.status}
              </span>
              {saving && (
                <span className="text-[10px] text-muted font-sans">Saving…</span>
              )}
              {!saving && lastSavedAt && (
                <span className="text-[10px] text-muted font-sans">
                  Saved {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] uppercase tracking-widest text-muted font-sans">Auditor:</span>
              <input
                type="text"
                value={evaluation.auditorName ?? ""}
                onChange={(e) => {
                  setEvaluation((prev) => prev ? { ...prev, auditorName: e.target.value } : prev);
                  setDirty(true);
                }}
                placeholder="Your name"
                className="bg-transparent border-b border-[#333] text-xs text-muted px-0 py-0.5 focus:outline-none focus:border-muted placeholder:text-[#444] font-sans w-40"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {!allAnalyzed && (
              <button
                onClick={() => analyze()}
                disabled={analyzing}
                className="text-xs font-semibold border border-ladder-green text-ladder-green px-4 py-1.5 rounded-sm hover:bg-ladder-green/10 transition-colors disabled:opacity-40"
              >
                {analyzing ? "Analyzing…" : "Run analysis"}
              </button>
            )}
            {dirty && (
              <button
                onClick={save}
                disabled={saving}
                className="text-xs font-semibold bg-ladder-green text-background px-4 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
            {allAnalyzed && evaluation.status !== "approved" && (
              <button
                onClick={approve}
                disabled={saving}
                className="text-xs font-semibold bg-foreground text-background px-4 py-1.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-40"
              >
                Approve
              </button>
            )}
            {evaluation.status === "approved" && (
              <Link
                href={`/admin/evaluations/${evaluation.id}/report`}
                className="text-xs font-semibold bg-ladder-green text-background px-4 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors"
              >
                Open report
              </Link>
            )}
            <button
              onClick={deleteEval}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 border border-red-500/40 bg-red-500/5 text-red-400 text-xs font-sans p-3">
            {error}
          </div>
        )}

        {/* Screen tabs */}
        {evaluation.screens.length > 1 && (
          <div className="flex gap-1 mb-6 border-b border-[#2a2a2a] pb-0">
            {evaluation.screens.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveScreenIdx(i)}
                className={`px-3 py-2 text-[11px] font-sans border-b-2 transition-colors ${
                  i === activeScreenIdx
                    ? "border-ladder-green text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {s.screenName || `Screen ${i + 1}`}
                {s.score !== null && (
                  <span className={`ml-1.5 tabular-nums ${SCORE_COLOR(s.score)}`}>
                    {s.score.toFixed(1)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {activeScreen && (
          <div>
            {/* Screen header */}
            <div className="flex items-center gap-4 mb-4">
              <input
                type="text"
                value={activeScreen.screenName}
                onChange={(e) => updateScreen(activeScreen.id, "screenName", e.target.value)}
                placeholder="Screen name…"
                className="bg-transparent border-b border-[#333] text-sm text-foreground px-0 py-1 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans w-64"
              />
              {activeScreen.score !== null && (
                <>
                  <span className={`text-xl font-semibold tabular-nums ${SCORE_COLOR(activeScreen.score)}`}>
                    {activeScreen.score.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted font-sans">{activeScreen.label}</span>
                </>
              )}
              {!activeScreen.analyzedAt && (
                <button
                  onClick={() => analyze(activeScreen.id)}
                  disabled={analyzing}
                  className="text-[10px] uppercase tracking-widest text-ladder-green hover:text-ladder-green/80 transition-colors disabled:opacity-40"
                >
                  {analyzing ? "Analyzing…" : "Analyze this screen"}
                </button>
              )}
              {activeScreen.analyzedAt && (
                <button
                  onClick={() => analyze(activeScreen.id)}
                  disabled={analyzing}
                  className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {analyzing ? "Re-analyzing…" : "Re-analyze"}
                </button>
              )}
            </div>

            {activeScreen.summary && (
              <p className="text-sm text-muted font-sans mb-6 italic">{activeScreen.summary}</p>
            )}

            {/* Annotated screen */}
            {activeScreen.analyzedAt ? (
              <div className="overflow-x-auto">
                <AnnotatedScreen
                  imageDataUrl={activeScreen.imageData}
                  findings={activeScreen.findings}
                  displayWidth={620}
                  onFindingEdit={(findingId, field, value) =>
                    updateFinding(activeScreen.id, findingId, field, value)
                  }
                  onPinMove={(findingId, xPct, yPct) =>
                    updatePinPosition(activeScreen.id, findingId, xPct, yPct)
                  }
                />
              </div>
            ) : (
              <div className="border border-dashed border-[#333] p-8 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeScreen.imageData}
                  alt="Screen preview"
                  className="max-w-full mx-auto mb-4 opacity-50"
                  style={{ maxHeight: 400, objectFit: "contain" }}
                />
                <p className="text-muted font-sans text-sm">
                  {analyzing ? "Analyzing…" : "Run analysis to generate annotations."}
                </p>
              </div>
            )}

            {/* Findings list below */}
            {activeScreen.findings.length > 0 && (
              <div className="mt-8">
                <div className="text-[10px] uppercase tracking-widest text-muted mb-3">
                  Findings ({activeScreen.findings.length})
                </div>
                <div className="space-y-3">
                  {activeScreen.findings.map((f, i) => (
                    <FindingRow
                      key={f.id}
                      index={i + 1}
                      finding={f}
                      onEdit={(field, value) => updateFinding(activeScreen.id, f.id, field, value)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Executive summary + next steps */}
        {allAnalyzed && (
          <div className="mt-10 grid grid-cols-2 gap-6 border-t border-[#2a2a2a] pt-8">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
                Executive summary
              </label>
              <textarea
                value={evaluation.executiveSummary}
                onChange={(e) => {
                  setEvaluation((prev) => prev ? { ...prev, executiveSummary: e.target.value } : prev);
                  setDirty(true);
                }}
                rows={5}
                placeholder="Overall assessment for the report…"
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground p-2.5 focus:outline-none focus:border-muted placeholder:text-[#555] resize-y font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
                What&apos;s next (report pitch)
              </label>
              <textarea
                value={evaluation.nextSteps}
                onChange={(e) => {
                  setEvaluation((prev) => prev ? { ...prev, nextSteps: e.target.value } : prev);
                  setDirty(true);
                }}
                rows={5}
                placeholder="Pitch for the next engagement step…"
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground p-2.5 focus:outline-none focus:border-muted placeholder:text-[#555] resize-y font-sans"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
                Internal notes (not in report)
              </label>
              <textarea
                value={evaluation.humanNotes}
                onChange={(e) => {
                  setEvaluation((prev) => prev ? { ...prev, humanNotes: e.target.value } : prev);
                  setDirty(true);
                }}
                rows={3}
                placeholder="Sales context, call notes, anything internal…"
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground p-2.5 focus:outline-none focus:border-muted placeholder:text-[#555] resize-y font-sans"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FindingRow({
  index,
  finding,
  onEdit,
}: {
  index: number;
  finding: AnnotationFinding;
  onEdit: (field: "humanNote" | "fix" | "issue", value: string) => void;
}) {
  const SCOLOR = { high: "text-red-400", medium: "text-orange-400", low: "text-yellow-400" };
  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-start gap-3">
        <span className="text-[10px] tabular-nums text-muted mt-0.5 w-4 flex-shrink-0">{index}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-foreground">{finding.title}</span>
            <span className={`text-[9px] uppercase tracking-widest ${SCOLOR[finding.severity]}`}>
              {finding.severity}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[#555]">{finding.category}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-muted block mb-1">Issue</label>
              <textarea
                value={finding.issue}
                onChange={(e) => onEdit("issue", e.target.value)}
                rows={2}
                className="w-full bg-[#111] border border-[#2a2a2a] text-xs text-muted p-2 focus:outline-none focus:border-muted resize-none font-sans"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-muted block mb-1">Fix</label>
              <textarea
                value={finding.fix}
                onChange={(e) => onEdit("fix", e.target.value)}
                rows={2}
                className="w-full bg-[#111] border border-[#2a2a2a] text-xs text-muted p-2 focus:outline-none focus:border-muted resize-none font-sans"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] uppercase tracking-widest text-muted block mb-1">
                Human note (optional)
              </label>
              <input
                type="text"
                value={finding.humanNote}
                onChange={(e) => onEdit("humanNote", e.target.value)}
                placeholder="Add context or emphasis…"
                className="w-full bg-[#111] border border-[#2a2a2a] text-xs text-ladder-green px-2 py-1.5 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
