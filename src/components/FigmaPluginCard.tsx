"use client";

import { useEffect, useState } from "react";

const FIGMA_PLUGIN_URL = "https://www.figma.com/community/plugin/1615455485903292828";

type PluginMeta = {
  hasUsed?: boolean;
  lastUsedAt?: number;
  installedVersion?: string;
  currentVersion?: string;
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Dashboard card for the Ladder for Figma plugin.
 *
 * Three states, picked by what /api/plugin/meta returns:
 *   - Never used: install pitch + Figma Community CTA, with a
 *     collapsible "How to install" panel.
 *   - Connected: "Connected" pill, last-used timestamp, version chip.
 *   - Connected + outdated: same as Connected, plus an "Update
 *     available: vX → vY" banner that links to the Figma plugin page.
 *     Figma auto-updates plugins, so the action is really just "open
 *     the page or restart Figma to pick it up."
 */
export function FigmaPluginCard() {
  const [meta, setMeta] = useState<PluginMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/plugin/meta")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMeta(data))
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5 shimmer h-28" />;
  }

  const version = meta?.currentVersion;
  const updateAvailable =
    !!meta?.installedVersion &&
    !!meta?.currentVersion &&
    meta.installedVersion !== meta.currentVersion;

  const showNewPill = !meta?.hasUsed;
  const showConnectedPill = !!meta?.hasUsed;

  const header = (
    <div className="flex items-baseline justify-between gap-3 mb-1">
      <div className="flex items-baseline gap-2 min-w-0">
        <h3 className="text-sm text-foreground font-sans font-semibold">
          Ladder for Figma
        </h3>
        {version && (
          <span className="text-[10px] font-mono text-muted">v{version}</span>
        )}
      </div>
      {showNewPill && (
        <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
          New
        </span>
      )}
      {showConnectedPill && (
        <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
          Connected
        </span>
      )}
    </div>
  );

  // ── State: connected ────────────────────────────────────────────────
  if (meta?.hasUsed) {
    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        {header}
        <p className="text-xs text-muted font-sans leading-relaxed mb-3">
          Score frames inside Figma without leaving the canvas.
        </p>
        {meta.lastUsedAt && (
          <p className="text-[11px] text-muted font-sans">
            Last used {relativeTime(meta.lastUsedAt)}.
          </p>
        )}

        {updateAvailable && (
          <div className="mt-4 border border-ladder-green/30 bg-ladder-green/5 px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] text-muted font-sans">
              Update available:{" "}
              <span className="font-mono text-foreground">v{meta.installedVersion}</span>
              {" → "}
              <span className="font-mono text-foreground">v{meta.currentVersion}</span>
            </span>
            <a
              href={FIGMA_PLUGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-widest text-ladder-green border border-ladder-green/40 px-3 py-1.5 hover:bg-ladder-green/10 transition-colors font-semibold"
            >
              Update
            </a>
          </div>
        )}

        {!updateAvailable && (
          <a
            href={FIGMA_PLUGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            Open in Figma Community →
          </a>
        )}
      </div>
    );
  }

  // ── State: not used yet (install pitch) ─────────────────────────────
  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      {header}
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
