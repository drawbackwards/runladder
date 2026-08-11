"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Team-wide config surfaces: the Design System and Writing Style Guide cards.
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
 * Design System Compliance (#400): v1 is zero-config. The Figma plugin diffs
 * each scored frame against the libraries enabled in that file, so this card
 * only explains the feature. The planned library-connect flow (#461 Phase 2)
 * will be managed here when it lands. Reuses GET /api/org/style-guide purely
 * for the tier + role gate, same Team-plan gating as the writing style guide.
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
          design-system libraries and flags drift: detached instances, rebuilt
          components, colors that don&apos;t come from the library, and
          off-library text styles. It&apos;s part of the Ladder Team plan.
        </p>
      </div>
    );
  }

  const checks: [string, string][] = [
    [
      "Color",
      "Fills and strokes must come from a library token or style. Raw values, local styles, and local variables are flagged.",
    ],
    ["Typography", "Text must use a library text style."],
    [
      "Detached instances",
      "Components that were detached from the library.",
    ],
    [
      "Rebuilt components",
      "Local copies of components that should come from the library.",
    ],
  ];

  return (
    <div className={CARD}>
      <p className={LABEL}>Design System</p>
      <h3 className="text-lg font-sans font-semibold text-foreground mt-2">
        Automatic design-system checks
      </h3>
      <p className="text-sm text-muted font-sans leading-relaxed mt-2 max-w-2xl">
        When your team scores a frame in the Figma plugin, Ladder checks it
        against the design-system libraries enabled in that file. Findings appear
        in the plugin&apos;s Design System tab and on the score&apos;s dashboard
        page. They never affect the Ladder score.
      </p>

      {/* Setup status: a lightweight line (no bullet) that sits above the checks
          to reassure there's nothing to configure. */}
      <p className="text-sm font-sans font-semibold text-foreground mt-6">
        No setup needed
      </p>
      <p className="text-sm text-muted font-sans leading-relaxed mt-1.5">
        Ladder automatically checks against whatever libraries are enabled in the
        scored file.
      </p>

      <p className="text-[9px] text-muted uppercase tracking-widest font-semibold mt-6 mb-3">
        What we check
      </p>
      <div className="grid gap-px border border-[#333] bg-[#333] sm:grid-cols-2">
        {checks.map(([name, desc]) => (
          <div key={name} className="bg-[#181818] p-4 flex gap-3">
            <span className="mt-[7px] h-1.5 w-1.5 bg-ladder-green flex-shrink-0" />
            <div>
              <p className="text-sm font-sans font-semibold text-foreground">
                {name}
              </p>
              <p className="text-xs text-muted font-sans leading-relaxed mt-1">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming-soon promo: badged green callout so the roadmap item reads as a
          highlight instead of a downplayed aside. */}
      <div className="mt-5 border border-ladder-green/30 bg-ladder-green/[0.06] p-4">
        <span className="inline-block text-[9px] text-ladder-green uppercase tracking-widest font-semibold border border-ladder-green/40 px-2 py-0.5">
          Coming soon
        </span>
        <p className="text-sm font-sans font-semibold text-foreground mt-2.5">
          Connect your team&apos;s Figma library
        </p>
        <p className="text-sm text-muted font-sans leading-relaxed mt-1">
          Run whole-library checks even in files where the library isn&apos;t
          enabled.
          {!status.canManage && " Your team lead will manage this."}
        </p>
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
          deviates from it on every scan, in the web app and the Figma plugin.
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

  const uploadButton = (
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

  // High-level note shown directly under the uploaded file when the guide has
  // internal conflicts. It frames how Ladder resolves them; the individual
  // findings live in the labelled Findings section below it.
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
    <div className="space-y-3">
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
      {/* Header, shared by both states: label, heading, and the full-size intro
          (promoted out of the old footer). */}
      <p className={LABEL}>Team Writing Style Guide</p>
      <h3 className="text-lg font-sans font-semibold text-foreground mt-2">
        Score copy against your style guide
      </h3>
      <p className="text-sm text-muted font-sans leading-relaxed mt-2 max-w-2xl">
        Ladder reads your guide and flags on-screen copy that doesn&apos;t
        comply, with a suggested fix, on the web score and in the Figma
        plugin&apos;s Improve Copy.
      </p>
      <p className="text-sm text-muted font-sans leading-relaxed mt-2 max-w-2xl">
        <span className="text-foreground font-semibold">Note:</span> It never
        changes your Ladder score. Style compliance is advisory only.
      </p>

      {/* Section 1 — the guide itself. Handles both the empty state (prompt to
          upload) and the uploaded state (file + the overarching note), so the
          top-level note reads as part of the guide, not a finding. */}
      <section className="mt-8">
        <h4 className="text-base font-sans font-semibold text-foreground mb-3">
          Your guide
        </h4>
        {status.present ? (
          <div className="space-y-3">
            {fileBox}
            {hasConflicts && ambiguitiesHeader}
            {statusMessages}
          </div>
        ) : (
          <div className="border border-[#333] bg-[#111] p-5">
            <p className="text-sm text-foreground font-sans mb-1">
              No guide uploaded yet
            </p>
            {status.canManage ? (
              <>
                <p className="text-sm text-muted font-sans leading-relaxed mb-4 max-w-xl">
                  Upload a PDF of your team&apos;s writing style guide to start
                  checking copy against it.
                </p>
                {uploadButton}
              </>
            ) : (
              <p className="text-sm text-muted font-sans leading-relaxed max-w-xl">
                Your team lead manages this and hasn&apos;t uploaded one yet.
              </p>
            )}
            {statusMessages}
          </div>
        )}
      </section>

      {/* Section 2 — the findings. Only once a guide exists. Sits behind a clear
          divider with its own section header so it reads as separate from the
          guide above. */}
      {status.present && (
        <section className="mt-10 border-t border-[#2a2a2a] pt-8">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h4 className="text-base font-sans font-semibold text-foreground">
              Findings
            </h4>
            {hasConflicts && (
              <span className="text-[9px] text-[#d4af37] uppercase tracking-widest font-semibold">
                {conflicts.length} ambiguit
                {conflicts.length === 1 ? "y" : "ies"} found
              </span>
            )}
          </div>
          {hasConflicts ? (
            conflictBoxes
          ) : (
            <div className="border border-[#333] bg-[#111] p-4">
              <p className="text-sm text-foreground font-sans">
                No conflicting direction found in your guide.
              </p>
              <p className="text-xs text-muted font-sans mt-1 leading-relaxed">
                Ladder checks copy against it on every web score and in the Figma
                plugin.
              </p>
            </div>
          )}
        </section>
      )}

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
