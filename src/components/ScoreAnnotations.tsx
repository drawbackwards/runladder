"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnnotatedScreen } from "@/components/admin/AnnotatedScreen";
import type { AnnotationFinding } from "@/lib/evaluation";

/**
 * User-facing redline panel for evaluation-session scores. Wraps the
 * shared AnnotatedScreen pin-board with persistence to
 * /api/dashboard/scores/:id/annotations.
 *
 * Add-mode toggles a click-to-place pin. Edits and pin moves auto-save
 * (debounced) so users don't have to think about a Save button.
 */

const SAVE_DEBOUNCE_MS = 500;

export function ScoreAnnotations({
  scoreId,
  imageDataUrl,
}: {
  scoreId: string;
  imageDataUrl: string;
}) {
  const [findings, setFindings] = useState<AnnotationFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [addMode, setAddMode] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load any existing annotations.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/dashboard/scores/${scoreId}/annotations`,
        );
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            setFindings(json.findings ?? []);
            setSavedAt(json.updatedAt ?? null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [scoreId]);

  const persist = useCallback(
    (next: AnnotationFinding[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const res = await fetch(
            `/api/dashboard/scores/${scoreId}/annotations`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ findings: next }),
            },
          );
          if (res.ok) {
            const json = await res.json();
            if (typeof json.updatedAt === "number") setSavedAt(json.updatedAt);
          }
        } finally {
          setSaving(false);
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [scoreId],
  );

  function update(next: AnnotationFinding[]) {
    setFindings(next);
    persist(next);
  }

  function handleAddFinding(xPct: number, yPct: number) {
    const nf: AnnotationFinding = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: "Untitled finding",
      issue: "",
      fix: "",
      severity: "medium",
      xPercent: xPct,
      yPercent: yPct,
      category: "audit",
      humanNote: "",
    };
    update([...findings, nf]);
    setAddMode(false);
  }

  function handleEdit(
    id: string,
    field: "humanNote" | "fix" | "issue" | "title",
    value: string,
  ) {
    update(
      findings.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  }

  function handleDelete(id: string) {
    update(findings.filter((f) => f.id !== id));
  }

  function handlePinMove(id: string, xPct: number, yPct: number) {
    update(
      findings.map((f) =>
        f.id === id ? { ...f, xPercent: xPct, yPercent: yPct } : f,
      ),
    );
  }

  if (loading) {
    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5 shimmer h-32" />
    );
  }

  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h2 className="text-[10px] text-muted uppercase tracking-widest mb-1">
            Your annotations
          </h2>
          <p className="text-xs text-muted font-sans">
            Pin specific issues on the screen. Auto-saves as you go.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted font-sans">
            {saving
              ? "Saving…"
              : savedAt
                ? `Saved ${relativeShort(savedAt)}`
                : findings.length === 0
                  ? "Not started"
                  : ""}
          </span>
          <button
            type="button"
            onClick={() => setAddMode(!addMode)}
            className={`text-[11px] uppercase tracking-widest border px-3 py-1.5 transition-colors font-semibold ${
              addMode
                ? "border-ladder-red/40 text-ladder-red bg-ladder-red/5"
                : "border-ladder-green/40 text-ladder-green hover:bg-ladder-green/10"
            }`}
          >
            {addMode ? "Cancel" : "+ Add pin"}
          </button>
        </div>
      </div>

      <AnnotatedScreen
        imageDataUrl={imageDataUrl}
        findings={findings}
        onFindingEdit={handleEdit}
        onFindingDelete={handleDelete}
        onPinMove={handlePinMove}
        addMode={addMode}
        onAddFinding={handleAddFinding}
      />

      {findings.length === 0 && !addMode && (
        <p className="text-[11px] text-muted font-sans mt-4 leading-relaxed">
          Click <span className="text-foreground">+ Add pin</span> to drop a
          callout, then click on the screenshot to place it. Each pin gets a
          title and notes you can include in your audit deliverable.
        </p>
      )}
    </div>
  );
}

function relativeShort(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
