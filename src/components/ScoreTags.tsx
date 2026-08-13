"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { INDUSTRIES, industryLabel } from "@/lib/industries";

type IndustryOption = { value: string; label: string; custom?: boolean };

const CARD = "border border-[#333] bg-[#1e1e1e] p-5 mt-8 mb-10";
const FIELD_LABEL =
  "text-[9px] uppercase tracking-widest text-muted whitespace-nowrap";
const SELECT =
  "appearance-none pr-9 bg-[#111] border border-[#2a2a2a] text-sm text-foreground pl-3 py-2 font-sans focus:outline-none focus:border-ladder-green min-w-[200px]";

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none text-muted"
    >
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Per-score tagging surface (#429). Two modes:
 *
 * - Multi-industry accounts (agencies, individual Pro, internal Drawbackwards):
 *   `canTag` is true, so the owner sets this score's industry (controlled
 *   taxonomy) and free-form tags. Industry drives the by-industry breakdowns and
 *   the learning store; free-form tags stay private to the account.
 * - Single-industry accounts: `canTag` is false. If the org has an industry it
 *   shows read-only (inherited); otherwise this renders nothing.
 *
 * Owner-only: the write endpoint scopes to the caller's userId, so this is only
 * mounted editable for the score's owner.
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

  // Read-only mode: single-industry account inherits the org industry.
  if (!canTag) {
    if (!inheritedIndustry) return null;
    return (
      <section className={CARD}>
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-3">
          Tags
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className={FIELD_LABEL}>Industry</label>
          <span className="inline-block border border-[#333] px-2.5 py-1 text-xs text-foreground font-sans">
            {industryLabel(inheritedIndustry)}
          </span>
          <span className="text-[10px] text-muted font-sans">
            Set by your team&apos;s account.
          </span>
        </div>
      </section>
    );
  }

  async function save(patch: { industry?: string | null; tags?: string[] }) {
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
    <section className={CARD}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">
          Tags
        </p>
        {saving && (
          <span className="text-[10px] text-muted font-mono">Saving…</span>
        )}
      </div>
      <p className="text-xs text-muted font-sans mb-4 leading-relaxed">
        Tag the industry this screen was designed for. It powers your
        by-industry breakdowns.
      </p>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {/* Industry */}
        <div className="flex items-center gap-3">
          <label className={FIELD_LABEL} htmlFor={`industry-${scoreId}`}>
            Industry
          </label>
          <div className="relative">
            <select
              id={`industry-${scoreId}`}
              value={industry ?? ""}
              onChange={(e) => onIndustryChange(e.target.value)}
              className={SELECT}
            >
              <option value="">Not set</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        {/* Additional tags */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <label className={FIELD_LABEL}>Additional tags</label>
          <div className="flex flex-wrap items-center gap-2 flex-1 border border-[#2a2a2a] bg-[#111] px-2 py-1.5 min-h-[40px]">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 border border-[#333] px-2 py-0.5 text-xs text-foreground font-sans"
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
              placeholder={tags.length ? "" : "Add a tag"}
              className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground px-1 py-0.5 font-sans focus:outline-none placeholder:text-[#555]"
            />
          </div>
        </div>
      </div>

      {err && <p className="text-xs text-ladder-red mt-3 font-sans">{err}</p>}
    </section>
  );
}
