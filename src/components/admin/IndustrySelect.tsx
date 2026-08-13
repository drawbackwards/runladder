"use client";

import { useEffect, useRef, useState } from "react";
import {
  INDUSTRIES,
  MULTIPLE_INDUSTRY_VALUE,
  MULTIPLE_INDUSTRY_LABEL,
} from "@/lib/industries";

/**
 * Admin industry dropdown (#422, #429). A custom dark dropdown (not a native
 * <select>, whose open option list the browser renders un-themeable): a button
 * plus a dark popup that matches the app's other menus.
 *
 * Options: a "Multiple industries (agency)" choice at the top (marks the
 * account multi-industry so its scores are tagged per-screen, #429), the base
 * taxonomy + admin-added registry entries (loaded from GET /api/admin/industries),
 * and an add-only "New industry…" row that POSTs to the registry — slugified
 * and deduped server-side — and selects the result. No rename/delete: slugs are
 * stamped into de-identified learning records and must stay stable.
 */

type Option = { value: string; label: string; custom?: boolean };

export function IndustrySelect({
  id,
  value,
  onChange,
  selectClassName,
  wrapperClassName = "",
  inputClassName = "w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:border-ladder-green placeholder:text-[#555] font-sans",
}: {
  /** Forwarded to the trigger button so host-form labels can htmlFor it. */
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Styling for the trigger button — match the host form's inputs. */
  selectClassName: string;
  /** Width/layout for the positioning wrapper. */
  wrapperClassName?: string;
  /** Kept for call-site compatibility; the custom chevron is fixed-position. */
  chevronClassName?: string;
  /** Styling for the "new industry" input. */
  inputClassName?: string;
}) {
  const [options, setOptions] = useState<Option[]>([...INDUSTRIES]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/industries");
        if (!res.ok) return; // base list is a fine fallback
        const j = (await res.json()) as { industries?: Option[] };
        if (active && Array.isArray(j.industries) && j.industries.length) {
          setOptions(j.industries);
        }
      } catch {
        // base list fallback
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setAdding(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function submitNew() {
    if (busy || !newLabel.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/industries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Add failed (${res.status})`);
      const option = j.option as Option;
      setOptions((prev) =>
        prev.some((o) => o.value === option.value) ? prev : [...prev, option],
      );
      onChange(option.value);
      setAdding(false);
      setNewLabel("");
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  const label =
    value === MULTIPLE_INDUSTRY_VALUE
      ? MULTIPLE_INDUSTRY_LABEL
      : (options.find((o) => o.value === value)?.label ?? "Select an industry…");

  const item =
    "w-full text-left px-3 py-1.5 text-sm font-sans transition-colors hover:bg-[#242424]";

  return (
    <div ref={ref} className={`relative ${wrapperClassName}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${selectClassName} inline-flex items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{label}</span>
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
          className="absolute left-0 top-full mt-1 z-30 w-full min-w-[240px] max-h-[320px] overflow-y-auto border border-[#333] bg-[#1a1a1a] py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === MULTIPLE_INDUSTRY_VALUE}
            onClick={() => pick(MULTIPLE_INDUSTRY_VALUE)}
            className={`${item} ${
              value === MULTIPLE_INDUSTRY_VALUE
                ? "text-ladder-green"
                : "text-foreground"
            }`}
          >
            {MULTIPLE_INDUSTRY_LABEL}
          </button>
          <div className="my-1 border-t border-[#2a2a2a]" />
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => pick(o.value)}
              className={`${item} ${
                o.value === value ? "text-ladder-green" : "text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
          <div className="my-1 border-t border-[#2a2a2a]" />
          {adding ? (
            <div className="px-3 py-2 flex items-center gap-2">
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitNew();
                  }
                }}
                placeholder="New industry name"
                className={inputClassName}
              />
              <button
                type="button"
                onClick={submitNew}
                disabled={busy || !newLabel.trim()}
                className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {busy ? "Adding…" : "Add"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={`${item} text-muted`}
            >
              + Add new industry…
            </button>
          )}
          {err && (
            <p className="px-3 py-1 text-xs text-ladder-red font-sans">{err}</p>
          )}
        </div>
      )}
    </div>
  );
}
