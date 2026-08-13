"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { INDUSTRIES, industryLabel } from "@/lib/industries";

type IndustryOption = { value: string; label: string; custom?: boolean };

/**
 * Per-score tagging surface (#429). Two modes:
 *
 * - Multi-industry accounts (agencies, individual Pro, internal Drawbackwards):
 *   `canTag` is true, so the owner can set this score's industry (from the
 *   controlled taxonomy) and add free-form tags. Industry drives the
 *   by-industry breakdowns and the learning store; free-form tags are the
 *   account's own and stay private to it.
 * - Single-industry accounts: `canTag` is false. If the org has an industry it
 *   shows read-only (inherited); otherwise this renders nothing.
 *
 * Owner-only: the write endpoint scopes to the caller's userId, so this is only
 * mounted for the score's owner (a Team Lead viewing a member's score sees it
 * read-only via the same absence of `canTag`).
 */
export function ScoreTags({
  scoreId,
  canTag,
  inheritedIndustry,
  initialIndustry,
  initialTags,
}: {
  scoreId: string;
  canTag: boolean;
  inheritedIndustry: string | null;
  initialIndustry: string | null;
  initialTags: string[];
}) {
  const [industry, setIndustry] = useState<string | null>(initialIndustry);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [options, setOptions] = useState<IndustryOption[]>([...INDUSTRIES]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!canTag) return;
    fetch("/api/industries")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.industries) setOptions(j.industries as IndustryOption[]);
      })
      .catch(() => {});
  }, [canTag]);

  // Read-only mode: single-industry account. Show the inherited industry, or
  // nothing when there isn't one.
  if (!canTag) {
    if (!inheritedIndustry) return null;
    return (
      <section className="mt-8 border-t border-[#222] pt-6">
        <p className="text-[9px] uppercase tracking-widest text-muted font-semibold mb-2">
          Industry
        </p>
        <span className="inline-block border border-[#333] px-2.5 py-1 text-xs text-foreground font-sans">
          {industryLabel(inheritedIndustry)}
        </span>
        <p className="text-[10px] text-muted mt-2 font-sans">
          Set by your team&apos;s account.
        </p>
      </section>
    );
  }

  async function save(patch: {
    industry?: string | null;
    tags?: string[];
  }) {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/dashboard/scores/${scoreId}/tags`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Save failed");
      if ("industry" in j) setIndustry((j.industry as string | null) ?? null);
      if ("tags" in j) setTags((j.tags as string[]) ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onIndustryChange(value: string) {
    const next = value || null;
    setIndustry(next);
    save({ industry: next });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTagInput("");
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    save({ tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((x) => x !== tag);
    setTags(next);
    save({ tags: next });
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <section className="mt-8 border-t border-[#222] pt-6">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">
          Tags
        </p>
        {saving && (
          <span className="text-[10px] text-muted font-mono">Saving…</span>
        )}
      </div>

      <div className="mb-5">
        <label className="text-[9px] uppercase tracking-widest text-muted block mb-1.5 font-semibold">
          Industry
        </label>
        <select
          value={industry ?? ""}
          onChange={(e) => onIndustryChange(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-sm text-foreground px-3 py-2 font-sans focus:outline-none focus:border-ladder-green min-w-[240px]"
        >
          <option value="">Not set</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted mt-1.5 font-sans">
          Tag the industry this screen was designed for. It powers your
          by-industry breakdowns.
        </p>
      </div>

      <div>
        <label className="text-[9px] uppercase tracking-widest text-muted block mb-1.5 font-semibold">
          Your tags
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 border border-[#333] px-2 py-1 text-xs text-foreground font-sans"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`Remove tag ${t}`}
                className="text-muted hover:text-ladder-red transition-colors leading-none"
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
            placeholder="Add a tag"
            className="bg-[#111] border border-[#2a2a2a] text-sm text-foreground px-3 py-1.5 font-sans focus:outline-none focus:border-ladder-green placeholder:text-[#555] min-w-[140px]"
          />
        </div>
        <p className="text-[10px] text-muted mt-1.5 font-sans">
          Your own labels for segmenting scores. Press Enter to add. Private to
          your account.
        </p>
      </div>

      {err && <p className="text-xs text-ladder-red mt-3 font-sans">{err}</p>}
    </section>
  );
}
