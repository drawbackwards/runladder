"use client";

import { useState } from "react";

const FIGMA_PLUGIN_URL = "https://www.figma.com/community/plugin/1615455485903292828";

/**
 * Compact dashboard install card for the Ladder for Figma plugin. Default
 * state is a one-line pitch with a primary CTA. The full install steps
 * live behind a "How to install" toggle so the dashboard right-rail
 * doesn't carry verbose copy by default.
 */
export function FigmaPluginCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm text-foreground font-sans font-semibold">
          Ladder for Figma
        </h3>
        <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
          New
        </span>
      </div>
      <p className="text-xs text-muted font-sans leading-relaxed mb-4">
        Score frames inside Figma without leaving the canvas.
      </p>
      <a
        href={FIGMA_PLUGIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-[11px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold"
      >
        Open in Figma Community →
      </a>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        {open ? "Hide steps" : "How to install"}
        <svg
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ol className="mt-3 space-y-2.5 text-[11px] text-muted font-sans leading-relaxed">
          <li>
            <span className="text-foreground">1.</span> Click the button above
            to open the plugin page on Figma Community, then install.
          </li>
          <li>
            <span className="text-foreground">2.</span> In any Figma file, run{" "}
            <code className="text-foreground">Plugins → Ladder for Figma</code>{" "}
            and sign in with the same email you use here. Scores sync to your
            dashboard automatically.
          </li>
        </ol>
      )}
    </div>
  );
}
