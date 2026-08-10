"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Team-wide config surfaces — the Design System and Writing Style Guide cards.
 * Relocated from personal Settings to the Team page (#444) because they're
 * team-scoped, not personal: everyone on a team scores against the same design
 * system and style guide. Both self-fetch `GET /api/org/style-guide` and gate
 * management controls on `status.canManage` (Team plan + org:admin), so they
 * render correctly for a Team Lead (manage) or a member (read-only) anywhere
 * they're mounted. Writes are additionally enforced server-side (`gateTeamLead`
 * in `src/app/api/org/style-guide/route.ts`).
 */

const CARD = "border border-[#333] bg-[#1e1e1e] p-6";
const LABEL =
  "text-[9px] text-ladder-green uppercase tracking-widest font-semibold";
const BTN_PRIMARY =
  "text-xs font-semibold bg-ladder-green text-[#1a1a1a] uppercase tracking-widest px-5 py-2.5 hover:bg-ladder-green-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const BTN_GHOST =
  "text-xs font-semibold text-foreground uppercase tracking-widest border border-[#333] px-5 py-2.5 hover:border-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

type StyleGuideStatus = {
  present: boolean;
  fileName: string | null;
  uploadedAt: number | null;
  conflicts?: { topic: string; summary: string; interpretation: string }[];
  tier: string;
  canManage: boolean;
};

/**
 * Design System Compliance (#400) — v1 is zero-config: the Figma plugin diffs
 * each scored frame against the libraries enabled in that file, so this card
 * only explains the feature. The planned library-connect flow (#461 Phase 2)
 * will be managed here when it lands. Reuses GET /api/org/style-guide purely
 * for the tier + role gate — same Team-plan gating as the writing style guide.
 */
export function DesignSystemCard() {
  const [status, setStatus] = useState<StyleGuideStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/org/style-guide")
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load design-system status.");
        return res.json();
      })
      .then((j) => setStatus(j as StyleGuideStatus))
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Failed to load."),
      );
  }, []);

  if (err) {
    return (
      <div className={CARD}>
        <p className="text-sm text-ladder-red font-sans">{err}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={CARD}>
        <p className="text-sm text-muted font-sans">Loading…</p>
      </div>
    );
  }

  // Not on the Team plan → upsell, mirroring the writing style guide tab.
  if (status.tier !== "team") {
    return (
      <div className={CARD}>
        <p className={LABEL}>Design System</p>
        <h2 className="text-base font-sans text-foreground mt-2 mb-2">
          A Team-plan feature
        </h2>
        <p className="text-sm text-muted font-sans leading-relaxed">
          Ladder checks every frame your team scores in Figma against your
          design-system libraries and flags drift — detached instances, rebuilt
          components, colors that don&apos;t come from the library, and
          off-library text styles. It&apos;s part of the Ladder Team plan.
        </p>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <p className={LABEL}>Design System</p>
      <div className="mt-3 grid gap-8 md:grid-cols-2">
        {/* Left — what it does + exactly what gets checked */}
        <div>
          <p className="text-sm text-muted font-sans leading-relaxed">
            When your team scores a frame in the Figma plugin, Ladder checks
            it against the design-system libraries enabled in that file. What
            we check:
          </p>
          <ul className="mt-4 space-y-3">
            {[
              ["Color", "Fills and strokes must come from a library token or style. Raw values, local styles, and local variables are flagged."],
              ["Typography", "Text must use a library text style."],
              ["Detached instances", "Components that were detached from the library."],
              ["Rebuilt components", "Local copies of components that should come from the library."],
            ].map(([name, desc]) => (
              <li key={name}>
                <p className="text-sm font-sans font-semibold text-foreground">
                  {name}
                </p>
                <p className="text-sm text-muted font-sans leading-relaxed mt-0.5">
                  {desc}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted font-sans leading-relaxed mt-3">
            Findings appear in the plugin&apos;s Design System tab and on the
            score&apos;s dashboard page. Design system issues never affect the
            Ladder score.
          </p>
        </div>
        {/* Right — how it's configured (it isn't, yet) */}
        <div>
          <p className="text-sm text-foreground font-sans leading-relaxed">
            No setup needed. Ladder automatically checks against whatever
            libraries are enabled in the scored file.
          </p>
          <p className="text-sm text-muted font-sans leading-relaxed mt-3">
            Coming soon: connect your team&apos;s Figma library here for
            whole-library checks, even in files where it isn&apos;t enabled.
            {!status.canManage && " Your team lead will manage this."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Team style guide upload/manage. Drives entirely off GET /api/org/style-guide,
 * which reports tier + whether this user can manage. Non-team users see an
 * upsell; non-lead members see read-only status.
 */
export function StyleGuideCard() {
  const [status, setStatus] = useState<StyleGuideStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** Live progress line shown while the PDF is being distilled (slow step). */
  const [progress, setProgress] = useState<string | null>(null);
  /** Success confirmation after an upload/replace. */
  const [notice, setNotice] = useState<string | null>(null);
  /** Branded remove-confirmation dialog. */
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/org/style-guide");
      if (!res.ok) throw new Error("Couldn't load style-guide status.");
      setStatus((await res.json()) as StyleGuideStatus);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same filename
    if (!file) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    setProgress("Reading your style guide. This can take a few seconds…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/org/style-guide", {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Upload failed.");
      await load();
      setNotice(
        "Style guide saved. Ladder will flag copy that doesn't match it on future scans.",
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/org/style-guide", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Remove failed.");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  if (!status) {
    return (
      <div className={CARD}>
        <p className="text-sm text-muted font-sans">Loading…</p>
      </div>
    );
  }

  // Not on the Team plan → upsell.
  if (status.tier !== "team") {
    return (
      <div className={CARD}>
        <p className={LABEL}>Writing Style Guide</p>
        <h2 className="text-base font-sans text-foreground mt-2 mb-2">
          A Team-plan feature
        </h2>
        <p className="text-sm text-muted font-sans leading-relaxed">
          Upload your team&apos;s writing style guide and Ladder flags copy that
          deviates from it on every scan — in the web app and the Figma plugin.
          It&apos;s part of the Ladder Team plan.
        </p>
      </div>
    );
  }

  const conflicts = status.conflicts ?? [];
  const hasConflicts = status.present && conflicts.length > 0;

  const fileBox = (
    <div className="border border-[#333] bg-[#111] p-3 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <a
          href="/api/org/style-guide/download"
          target="_blank"
          rel="noopener"
          className="text-sm text-foreground font-sans underline"
        >
          {status.fileName || "style-guide.pdf"}
        </a>
        <p className="text-[10px] text-muted font-sans mt-0.5">
          {status.uploadedAt
            ? `Uploaded ${new Date(status.uploadedAt).toLocaleDateString()}`
            : ""}
          {!status.canManage && " · Your team lead manages this."}
        </p>
      </div>
      {status.canManage && (
        <div className="flex items-center gap-2">
          <label className={`${BTN_GHOST} cursor-pointer`}>
            {busy ? "Working…" : "Replace"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={busy}
              onChange={handleUpload}
            />
          </label>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className={BTN_GHOST}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );

  const uploadOrEmpty = status.canManage ? (
    <label className={`${BTN_PRIMARY} cursor-pointer inline-block`}>
      {busy ? "Uploading…" : "Upload PDF"}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={busy}
        onChange={handleUpload}
      />
    </label>
  ) : (
    <p className="text-sm text-muted font-sans">
      No style guide uploaded yet. Your team lead manages this.
    </p>
  );

  const statusMessages = (
    <>
      {progress && (
        <p className="mt-3 text-xs text-ladder-green font-sans animate-pulse">
          {progress}
        </p>
      )}
      {notice && !progress && !hasConflicts && (
        <p className="mt-3 text-xs text-ladder-green font-sans">{notice}</p>
      )}
      {err && <p className="mt-3 text-xs text-ladder-red font-sans">{err}</p>}
    </>
  );

  // When the guide has internal conflicts, the right column leads with this gold
  // description box (the heading sits in the top row, aligned with "Team Style
  // Guide"), then the file box, then the conflict detail boxes.
  const ambiguitiesHeader = (
    <div className="border border-[#b8860b]/50 bg-[#b8860b]/10 p-4">
      <p className="text-sm text-[#e3c46b] font-sans leading-relaxed">
        Your guide gives conflicting direction in places. Ladder applies the most
        specific rule (shown below). To change how these are handled, edit your
        style guide and upload a new version.
      </p>
    </div>
  );

  const conflictBoxes = (
    <div className="mt-4 space-y-3">
      {conflicts.map((c, i) => (
        <div key={i} className="border border-[#b8860b]/50 bg-[#b8860b]/10 p-4">
          <p className="text-sm text-[#e3c46b] font-sans font-semibold">
            {c.topic}
          </p>
          <p className="text-sm text-[#e3c46b] font-sans mt-1.5 leading-relaxed">
            {c.summary}
          </p>
          {c.interpretation && (
            <p className="text-sm text-foreground font-sans mt-2 leading-relaxed">
              Ladder applies: {c.interpretation}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className={CARD}>
      {/* Heading row mirrors the content grid below, so "Team Style Guide"
          (left) and, when the guide has conflicts, the gold ambiguities heading
          (right) are each left-aligned at the top of their own column. */}
      <div className="grid gap-8 md:grid-cols-2">
        <p className={LABEL}>Team Writing Style Guide</p>
        {hasConflicts && (
          <p className="text-[9px] text-[#d4af37] uppercase tracking-widest font-semibold">
            {conflicts.length} ambiguit{conflicts.length === 1 ? "y" : "ies"} in
            your guide
          </p>
        )}
      </div>
      <div className="mt-3 grid gap-8 md:grid-cols-2">
        {/* Left — what it does / doesn't do */}
        <div>
          <p className="text-sm text-muted font-sans leading-relaxed">
            Upload a PDF of your team&apos;s writing style guide. Ladder reads it
            and flags on-screen copy that doesn&apos;t comply, with a suggested
            fix, on the web score and in the Figma plugin&apos;s Improve Copy.
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest font-semibold mt-4">
            Does
          </p>
          <p className="text-sm text-muted font-sans mt-1 leading-relaxed">
            Point out wording, terminology, tone, and formatting that breaks your
            guide.
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest font-semibold mt-3">
            Does Not
          </p>
          <p className="text-sm text-muted font-sans mt-1 leading-relaxed">
            Change your Ladder score. Style compliance is advisory only.
          </p>
        </div>

        {/* Right — upload + controls. When the guide has conflicts, the alert
            (heading + description) leads, then the file box, then the details. */}
        <div>
          {hasConflicts ? (
            <>
              {ambiguitiesHeader}
              <div className="mt-4">{fileBox}</div>
              {statusMessages}
              {conflictBoxes}
            </>
          ) : (
            <>
              {status.present ? fileBox : uploadOrEmpty}
              {statusMessages}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove style guide?"
        body="Scans will stop checking copy against it."
        confirmLabel="Remove"
        destructive
        busy={busy}
        onConfirm={handleRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
