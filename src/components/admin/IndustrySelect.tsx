"use client";

import { useEffect, useState } from "react";
import { INDUSTRIES } from "@/lib/industries";

/**
 * Admin industry dropdown (#422) with an add-only "new industry" flow.
 *
 * Renders the base list immediately, then swaps in the live list (base +
 * admin-added registry entries) from GET /api/admin/industries. "Add new
 * industry…" reveals an inline input that POSTs to the registry — slugified
 * and deduped server-side — and selects the result. No rename/delete: slugs
 * are stamped into de-identified learning records and must stay stable.
 */

type Option = { value: string; label: string; custom?: boolean };

export function IndustrySelect({
  id,
  value,
  onChange,
  selectClassName,
  wrapperClassName = "",
  chevronClassName = "right-3",
  inputClassName = "w-64 bg-[#111] border border-[#2a2a2a] text-xs text-foreground px-3 py-2 focus:outline-none focus:border-ladder-green placeholder:text-[#555] font-sans",
}: {
  /** Forwarded to the <select> so host-form labels can htmlFor it. */
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Styling hook so the select matches its host form's inputs. */
  selectClassName: string;
  /** Width/layout for the select's positioning wrapper. The chevron pins to
   * this wrapper's right edge, so a non-full-width select needs its width
   * HERE (e.g. "w-56") with the select itself w-full — otherwise the arrow
   * floats outside the field. */
  wrapperClassName?: string;
  /** Right inset for the custom chevron — match the host input's LEFT
   * padding so the arrow doesn't hug the edge (native arrows can't move,
   * so the select is appearance-none with our own chevron). */
  chevronClassName?: string;
  /** Styling for the "add new industry" input — match the host form's
   * inputs (same text size + padding = same height) with a bounded width
   * so the Add/Cancel buttons sit next to it instead of at the far edge. */
  inputClassName?: string;
}) {
  const [options, setOptions] = useState<Option[]>([...INDUSTRIES]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={`relative ${wrapperClassName}`}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${selectClassName} appearance-none pr-9`}
        >
          <option value="" disabled>
            Select an industry…
          </option>
          {options.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-muted ${chevronClassName}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      {adding ? (
        <div className="mt-2 flex items-center gap-3">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNew();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setNewLabel("");
                setErr(null);
              }
            }}
            placeholder="New industry name"
            className={inputClassName}
          />
          <button
            type="button"
            onClick={submitNew}
            disabled={busy || !newLabel.trim()}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            {busy ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewLabel("");
              setErr(null);
            }}
            disabled={busy}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1.5 text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          + Add new industry
        </button>
      )}
      {err && <p className="mt-1 text-[10px] text-ladder-red font-sans">{err}</p>}
    </div>
  );
}
