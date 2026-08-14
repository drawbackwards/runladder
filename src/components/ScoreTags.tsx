"use client";

import { useEffect, useRef, useState } from "react";
import { INDUSTRIES, industryLabel } from "@/lib/industries";

type IndustryOption = { value: string; label: string; custom?: boolean };

const FIELD_LABEL =
  "text-[9px] uppercase tracking-widest text-muted whitespace-nowrap";

/**
 * Custom industry dropdown. A native <select> can't dark-theme its open option
 * list (the browser renders it), so this is a button + dark popup menu matching
 * the app's other custom menus (e.g. the member-actions kebab).
 */
function IndustryDropdown({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: IndustryOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-between gap-3 min-w-[200px] bg-[#111] border px-3 py-2 text-sm font-sans transition-colors focus:outline-none ${
          open ? "border-ladder-green" : "border-[#2a2a2a] hover:border-[#3a3a3a]"
        }`}
      >
        <span className={value ? "text-foreground" : "text-muted"}>
          {current?.label ?? "Not set"}
        </span>
        <svg
          aria-hidden="true"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className="text-muted flex-shrink-0"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 z-30 min-w-[220px] max-h-[280px] overflow-y-auto border border-[#333] bg-[#1a1a1a] py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => pick("")}
            className={`w-full text-left px-3 py-1.5 text-sm font-sans transition-colors hover:bg-[#242424] ${
              !value ? "text-ladder-green" : "text-muted"
            }`}
          >
            Not set
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => pick(o.value)}
              className={`w-full text-left px-3 py-1.5 text-sm font-sans transition-colors hover:bg-[#242424] ${
                o.value === value ? "text-ladder-green" : "text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Free-form tag field. Collapsed, it shows the first few tags on one line with
 * a "+N" overflow indicator (no wrapping). Clicking opens a popover to add and
 * remove the full set, so a score with many tags never blows out the row.
 */
function TagField({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function add() {
    const t = input.trim();
    if (!t) return;
    onAdd(t);
    setInput("");
  }

  const preview = tags.slice(0, 3);
  const extra = tags.length - preview.length;

  return (
    <div ref={ref} className="relative flex-1 min-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Edit tags"
        className={`w-full flex items-center gap-2 border bg-[#111] px-2 py-1.5 min-h-[40px] overflow-hidden text-left transition-colors ${
          open ? "border-ladder-green" : "border-[#2a2a2a] hover:border-[#3a3a3a]"
        }`}
      >
        {tags.length === 0 ? (
          <span className="text-sm text-[#555] font-sans px-1">Add tags</span>
        ) : (
          <span className="flex items-center gap-2 min-w-0">
            {preview.map((t) => (
              <span
                key={t}
                className="inline-block border border-[#333] px-2 py-0.5 text-xs text-foreground font-sans whitespace-nowrap"
              >
                {t}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-xs text-muted font-sans whitespace-nowrap">
                +{extra}
              </span>
            )}
          </span>
        )}
        <svg
          aria-hidden="true"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className="text-muted flex-shrink-0 ml-auto"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 border border-[#333] bg-[#1a1a1a] p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Add a tag"
              className="flex-1 min-w-0 bg-[#111] border border-[#2a2a2a] text-sm text-foreground px-2.5 py-1.5 font-sans focus:outline-none focus:border-ladder-green placeholder:text-[#555]"
            />
            <button
              type="button"
              onClick={add}
              disabled={!input.trim()}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {tags.length ? (
            <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 border border-[#333] px-2 py-0.5 text-xs text-foreground font-sans"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => onRemove(t)}
                    aria-label={`Remove tag ${t}`}
                    className="text-muted hover:text-ladder-red transition-colors leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted font-sans">No tags yet.</p>
          )}
        </div>
      )}
    </div>
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
 * mounted editable for the score's owner. `className` lets the host constrain
 * the card width (e.g. to the image column).
 */
export function ScoreTags({
  scoreId,
  canTag,
  inheritedIndustry,
  initialIndustry,
  initialTags,
  className = "",
}: {
  scoreId: string;
  canTag: boolean;
  inheritedIndustry: string | null;
  initialIndustry: string | null;
  initialTags: string[];
  className?: string;
}) {
  const [industry, setIndustry] = useState<string | null>(initialIndustry);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [options, setOptions] = useState<IndustryOption[]>([...INDUSTRIES]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const card = `border border-[#333] bg-[#1e1e1e] p-5 ${className}`;

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
      <section className={card}>
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

  function addTagValue(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    const next = [...tags, t];
    setTags(next);
    save({ tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((x) => x !== tag);
    setTags(next);
    save({ tags: next });
  }

  return (
    <section className={card}>
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
          <label className={FIELD_LABEL}>Industry</label>
          <IndustryDropdown
            value={industry}
            options={options}
            onChange={onIndustryChange}
          />
        </div>

        {/* Additional tags */}
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <label className={FIELD_LABEL}>Additional tags</label>
          <TagField tags={tags} onAdd={addTagValue} onRemove={removeTag} />
        </div>
      </div>

      {err && <p className="text-xs text-ladder-red mt-3 font-sans">{err}</p>}
    </section>
  );
}
