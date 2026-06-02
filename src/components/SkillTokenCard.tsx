"use client";

import { useEffect, useRef, useState } from "react";

type TokenMeta = {
  hasToken: boolean;
  prefix?: string;
  createdAt?: number;
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
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const TROUBLESHOOTING: { title: string; body: React.ReactNode }[] = [
  {
    title: "401 — token invalid",
    body: "Token revoked or never saved. Rotate, then re-run install.",
  },
  {
    title: "429 — free tier limit reached",
    body: (
      <>
        You&apos;ve used all 5 free Ladder scores.{" "}
        <a href="/pricing" className="text-ladder-green hover:underline">
          Upgrade to Pro
        </a>{" "}
        for 2,000 scores per month.
      </>
    ),
  },
];

/**
 * Compact, state-driven install card for the Ladder for Claude Skill.
 *
 * Three states:
 *   - "set up": no token yet. One CTA reveals the full install command.
 *   - "install": token just generated. Single combined command (token +
 *     skill) ready to copy. User pastes once, done.
 *   - "connected": token has been used. Compact status, manage-on-toggle.
 *
 * One copy button per state. No numbered steps. Troubleshooting hidden
 * inside the connected manage panel.
 */
export function SkillTokenCard() {
  const [meta, setMeta] = useState<TokenMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [troubleshootOpen, setTroubleshootOpen] = useState(false);

  useEffect(() => {
    fetch("/api/skill/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMeta(data))
      .finally(() => setLoading(false));
  }, []);

  // Auto-generate on first view if the user has no token yet, so the
  // install command is visible immediately rather than gated behind a
  // click. Only fires when meta has loaded and confirmed there's no
  // existing token, so we never replace a working install. Once tried,
  // the ref blocks re-firing for the rest of the session.
  const autoGenRef = useRef(false);
  useEffect(() => {
    if (autoGenRef.current) return;
    if (loading) return;
    if (!meta) return;
    if (meta.hasToken) return;
    if (rawToken) return;
    if (working) return;
    autoGenRef.current = true;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, meta, rawToken, working]);

  async function generate() {
    setWorking(true);
    try {
      const res = await fetch("/api/skill/token", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setRawToken(json.token);
        const again = await fetch("/api/skill/token");
        if (again.ok) setMeta(await again.json());
      }
    } finally {
      setWorking(false);
    }
  }

  async function revoke() {
    if (!confirm("Revoke this token? The Ladder Skill will stop working until you generate a new one.")) return;
    setWorking(true);
    try {
      const res = await fetch("/api/skill/token", { method: "DELETE" });
      if (res.ok) {
        setMeta({ hasToken: false });
        setRawToken(null);
      }
    } finally {
      setWorking(false);
    }
  }

  function copyToken() {
    if (!rawToken) return;
    navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5 shimmer h-28" />;
  }

  const version = meta?.currentVersion;
  const updateAvailable =
    !!meta?.installedVersion &&
    !!meta?.currentVersion &&
    meta.installedVersion !== meta.currentVersion;

  // ── Header (shared) ─────────────────────────────────────────────────
  // Pill only appears when there's a positive state to communicate:
  // "New" (never installed) or "Connected" (used at least once).
  // Mid-flow states (token created but never used) intentionally show
  // no pill — the body copy explains where the user stands.
  const showNewPill = !meta?.hasToken;
  const showConnectedPill = !!meta?.hasToken && !!meta?.lastUsedAt;
  const header = (
    <div className="flex items-baseline justify-between gap-3 mb-1">
      <div className="flex items-baseline gap-2 min-w-0">
        <h3 className="text-sm text-foreground font-sans font-semibold">
          Ladder for Claude
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

  // ── State: install command revealed (rawToken just generated) ────────
  if (rawToken && version) {
    return (
      <div className="border border-ladder-green/40 bg-ladder-green/[0.03] p-5">
        {header}
        <p className="text-xs text-muted font-sans leading-relaxed mb-4">
          Three steps to get started.
        </p>
        <ol className="space-y-3 mb-4">
          <li className="text-[11px] text-muted font-sans leading-relaxed">
            <span className="text-foreground font-semibold">1. Copy your token</span>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="text-[10.5px] font-mono text-foreground bg-[#0e0e0e] border border-[#2a2a2a] px-2 py-1">
                {rawToken}
              </code>
              <button
                onClick={copyToken}
                className="text-[10px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-3 py-1.5 font-semibold flex-shrink-0"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </li>
          <li className="text-[11px] text-muted font-sans leading-relaxed">
            <span className="text-foreground font-semibold">2. Create a Claude Project</span>
            <p className="mt-1">In Claude, create a new Project and add this line to its instructions:</p>
            <code className="block mt-1.5 text-[10.5px] font-mono text-foreground bg-[#0e0e0e] border border-[#2a2a2a] px-2 py-1.5">
              My Ladder token is {rawToken}
            </code>
          </li>
          <li className="text-[11px] text-muted font-sans leading-relaxed">
            <span className="text-foreground font-semibold">3. Add the Skill to your Project</span>
            <p className="mt-1">
              Download the Skill file and upload it in your Project under{" "}
              <span className="text-foreground">Knowledge → Add content</span>, or go to{" "}
              <span className="text-foreground">Settings → Capabilities → Skills</span>.
            </p>
            <a
              href="/api/skill/download"
              className="inline-block mt-2 text-[10px] uppercase tracking-widest text-ladder-green border border-ladder-green/40 px-3 py-1.5 hover:bg-ladder-green/10 transition-colors font-semibold"
            >
              Download SKILL.md →
            </a>
          </li>
        </ol>
        <p className="text-[10px] text-muted font-sans">
          Then attach a screenshot to any message in that Project and say{" "}
          <span className="text-foreground">&ldquo;Run Ladder&rdquo;</span>.
        </p>
      </div>
    );
  }

  // ── State: not set up yet (no token) ────────────────────────────────
  // Auto-generation is in flight (or about to fire). Show a "preparing"
  // state instead of a click-to-reveal button. Once generate() resolves,
  // rawToken sets and the install-state branch above takes over.
  // If auto-gen failed (tried, no rawToken, not working), surface a
  // fallback button so the user can retry.
  if (!meta?.hasToken) {
    const tried = autoGenRef.current;
    const failed = tried && !working && !rawToken;

    if (failed) {
      return (
        <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          {header}
          <p className="text-xs text-muted font-sans leading-relaxed mb-2">
            A Claude Skill that scores any UI screenshot against the Ladder
            framework. Works in Claude.ai, Claude Code, and VS Code.
          </p>
          <p className="text-[11px] text-muted font-sans leading-relaxed mb-4">
            Couldn&apos;t prepare your install command. Try again?
          </p>
          <button
            onClick={generate}
            disabled={working}
            className="text-[11px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold disabled:opacity-40"
          >
            Get install command →
          </button>
        </div>
      );
    }

    return (
      <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        {header}
        <p className="text-xs text-muted font-sans leading-relaxed mb-3">
          A Claude Skill that scores any UI screenshot against the Ladder
          framework. Works in Claude.ai, Claude Code, and VS Code.
        </p>
        <div className="bg-[#0e0e0e] border border-[#2a2a2a] p-3 shimmer h-20" />
        <p className="text-[10px] text-muted font-sans mt-3">
          Preparing your install command…
        </p>
      </div>
    );
  }

  // ── State: connected (has token) ────────────────────────────────────
  return (
    <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      {header}
      <p className="text-xs text-muted font-sans leading-relaxed mb-3">
        A Claude Skill that scores any UI screenshot against the Ladder
        framework. Works in Claude.ai, Claude Code, and VS Code.
      </p>
      {meta.lastUsedAt ? (
        <p className="text-[11px] text-muted font-sans">
          Last used {relativeTime(meta.lastUsedAt)}.
        </p>
      ) : (
        <div className="border-t border-[#2a2a2a] pt-3 text-[11px] text-muted font-sans leading-relaxed">
          Token created, but the Skill hasn&apos;t connected yet.
          {" "}
          <span className="text-foreground">If you ran the install,</span>{" "}
          screenshot a UI and say &ldquo;Run Ladder&rdquo; in any Claude
          conversation. The first run shows up here.
          <br />
          <span className="text-foreground">If you didn&apos;t,</span>{" "}
          <button
            onClick={generate}
            disabled={working}
            className="text-ladder-green hover:underline disabled:opacity-40"
          >
            show a fresh install command
          </button>
          {" "}
          (replaces the existing token).
        </div>
      )}

      {updateAvailable && (
        <div className="mt-4 border border-ladder-green/30 bg-ladder-green/5 px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] text-muted font-sans">
            Update available:{" "}
            <span className="font-mono text-foreground">v{meta.installedVersion}</span>
            {" → "}
            <span className="font-mono text-foreground">v{meta.currentVersion}</span>
          </span>
          <button
            onClick={generate}
            disabled={working}
            className="text-[10px] uppercase tracking-widest text-ladder-green border border-ladder-green/40 px-3 py-1.5 hover:bg-ladder-green/10 transition-colors font-semibold disabled:opacity-40"
          >
            Update
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setManageOpen(!manageOpen)}
        className="mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        aria-expanded={manageOpen}
      >
        {manageOpen ? "Hide manage" : "Manage"}
        <svg
          className={`transition-transform ${manageOpen ? "rotate-180" : ""}`}
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

      {manageOpen && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted font-sans">
            <span className="font-mono text-foreground">
              {meta.prefix}
              <span className="text-[#444]">••••••••</span>
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={generate}
                disabled={working}
                className="text-[10px] uppercase tracking-widest text-muted border border-[#333] px-3 py-1.5 hover:border-muted hover:text-foreground transition-colors disabled:opacity-40"
              >
                Rotate
              </button>
              <button
                onClick={revoke}
                disabled={working}
                className="text-[10px] uppercase tracking-widest text-ladder-red border border-[#333] px-3 py-1.5 hover:border-ladder-red/50 transition-colors disabled:opacity-40"
              >
                Revoke
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTroubleshootOpen(!troubleshootOpen)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            aria-expanded={troubleshootOpen}
          >
            {troubleshootOpen ? "Hide troubleshooting" : "Troubleshooting"}
            <svg
              className={`transition-transform ${troubleshootOpen ? "rotate-180" : ""}`}
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

          {troubleshootOpen && (
            <ul className="space-y-3 pt-1">
              {TROUBLESHOOTING.map((item, i) => (
                <li key={i}>
                  <p className="text-[11px] text-foreground font-sans font-semibold">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted font-sans mt-1 leading-relaxed">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
