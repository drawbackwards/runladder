"use client";

import { useEffect, useState } from "react";

type TokenMeta = {
  hasToken: boolean;
  prefix?: string;
  createdAt?: number;
  lastUsedAt?: number;
  installedVersion?: string;
  currentVersion?: string;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TROUBLESHOOTING: { title: string; body: React.ReactNode }[] = [
  {
    title: "403 — blocked by workspace network allowlist",
    body: (
      <>
        If Claude returns a <code className="text-foreground">403</code>, your
        Claude workspace is blocking egress to{" "}
        <code className="text-foreground">runladder.com</code>. Ask a workspace
        admin to add it to the allowed network domains in workspace settings.
        (Claude Code sidesteps this — it runs locally.)
      </>
    ),
  },
  {
    title: "401 — token invalid",
    body: "Your token was revoked or never saved correctly. Click Rotate above, then re-run the install command in Terminal.",
  },
  {
    title: "429 — monthly limit reached",
    body: (
      <>
        You&apos;ve used all 15 free scores this month.{" "}
        <a
          href="/pricing"
          className="text-ladder-green hover:underline"
        >
          Upgrade to Pro
        </a>{" "}
        for unlimited scoring.
      </>
    ),
  },
];

function NumberedStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 mb-6 last:mb-0">
      <span className="text-[10px] text-ladder-green font-mono tabular-nums shrink-0 mt-1">
        {String(n).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground font-sans font-semibold mb-3">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

export function SkillTokenCard() {
  const [meta, setMeta] = useState<TokenMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ccCopied, setCcCopied] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  useEffect(() => {
    fetch("/api/skill/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMeta(data))
      .finally(() => setLoading(false));
  }, []);

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

  function installCommand(token: string): string {
    return `mkdir -p ~/.ladder && printf '%s' '${token}' > ~/.ladder/token && chmod 600 ~/.ladder/token`;
  }

  function copy() {
    if (!rawToken) return;
    navigator.clipboard.writeText(installCommand(rawToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function claudeCodeInstall(version: string): string {
    return `mkdir -p ~/.claude/skills && curl -fsSL https://runladder.com/downloads/ladder-skill-v${version}.zip -o /tmp/ladder-skill.zip && unzip -oq /tmp/ladder-skill.zip -d ~/.claude/skills/ && rm /tmp/ladder-skill.zip`;
  }

  function copyCc() {
    if (!meta?.currentVersion) return;
    navigator.clipboard.writeText(claudeCodeInstall(meta.currentVersion));
    setCcCopied(true);
    setTimeout(() => setCcCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="border border-[#333] bg-[#1e1e1e] p-6 shimmer h-32" />
    );
  }

  const updateAvailable =
    !!meta?.installedVersion &&
    !!meta?.currentVersion &&
    meta.installedVersion !== meta.currentVersion;

  const version = meta?.currentVersion;

  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
            New
          </span>
          <h3 className="text-sm text-foreground font-sans font-semibold">
            Ladder for Claude
          </h3>
          {version && (
            <span className="text-[10px] font-mono text-muted">v{version}</span>
          )}
        </div>
        <p className="text-xs text-muted font-sans leading-relaxed max-w-lg">
          Score any UI screenshot against the Ladder framework — from Claude
          Code or Claude.ai. Screenshot, say &ldquo;Run Ladder,&rdquo; done.
        </p>
      </div>

      {updateAvailable && (
        <div className="flex items-center justify-between gap-4 border border-ladder-green/30 bg-ladder-green/5 px-4 py-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
              Update available
            </span>
            <span className="text-[11px] text-muted font-sans">
              You have <span className="font-mono text-foreground">v{meta!.installedVersion}</span> installed — <span className="font-mono text-foreground">v{meta!.currentVersion}</span> is current. Re-run step 02 to update.
            </span>
          </div>
        </div>
      )}

      <NumberedStep n={1} title="Get your personal token">
        {rawToken ? (
          <div className="border border-ladder-green/40 bg-ladder-green/5 p-4">
            <p className="text-[10px] text-ladder-green uppercase tracking-widest mb-2 font-semibold">
              Copy and paste into Terminal — you won&apos;t see this again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-foreground bg-[#111] border border-[#333] px-3 py-2 break-all">
                {installCommand(rawToken)}
              </code>
              <button
                onClick={copy}
                className="text-[10px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold flex-shrink-0"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[10px] text-muted font-sans mt-3">
              Saves your token to <code className="text-foreground">~/.ladder/token</code>. macOS &amp; Linux.
            </p>
          </div>
        ) : meta?.hasToken ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[11px] text-muted font-sans flex-wrap">
              <span className="font-mono text-foreground">
                {meta.prefix}
                <span className="text-[#444]">••••••••</span>
              </span>
              {meta.createdAt && (
                <span>Created {formatDate(meta.createdAt)}</span>
              )}
              {meta.lastUsedAt ? (
                <span>Last used {formatDate(meta.lastUsedAt)}</span>
              ) : (
                <span className="text-[#444]">Never used</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={generate}
                disabled={working}
                className="text-[10px] uppercase tracking-widest text-muted border border-[#333] px-3 py-2 hover:border-muted hover:text-foreground transition-colors disabled:opacity-40"
              >
                Rotate
              </button>
              <button
                onClick={revoke}
                disabled={working}
                className="text-[10px] uppercase tracking-widest text-ladder-red border border-[#333] px-3 py-2 hover:border-ladder-red/50 transition-colors disabled:opacity-40"
              >
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={working}
            className="text-xs font-semibold bg-ladder-green text-[#1a1a1a] px-6 py-3 hover:bg-ladder-green/90 transition-colors uppercase tracking-widest disabled:opacity-40"
          >
            {working ? "Generating…" : "Generate Skill token"}
          </button>
        )}
      </NumberedStep>

      <NumberedStep n={2} title="Install the Skill">
        {version ? (
          <>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-foreground bg-[#111] border border-[#333] px-3 py-2 break-all">
                {claudeCodeInstall(version)}
              </code>
              <button
                onClick={copyCc}
                className="text-[10px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold flex-shrink-0"
              >
                {ccCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[10px] text-muted font-sans mt-3 leading-relaxed">
              Paste into Terminal. Installs the Skill for Claude Code at{" "}
              <code className="text-foreground">~/.claude/skills/ladder-quality-score/</code>.
            </p>
            <p className="text-[10px] text-muted font-sans mt-2 leading-relaxed">
              Using Claude.ai chat instead?{" "}
              <a
                href={`/downloads/ladder-skill-v${version}.zip`}
                className="text-ladder-green hover:underline"
              >
                Download the zip
              </a>{" "}
              and upload it in Settings → Capabilities → Skills.
            </p>
          </>
        ) : null}
      </NumberedStep>

      <NumberedStep n={3} title={`Screenshot, then say "Run Ladder"`}>
        <p className="text-xs text-foreground font-sans leading-relaxed">
          Press{" "}
          <kbd className="font-mono text-[11px] text-foreground bg-[#111] border border-[#333] px-2 py-0.5">
            ⌘ ⇧ 4
          </kbd>{" "}
          to screenshot any UI. Then in Claude, say{" "}
          <code className="text-foreground font-semibold">Run Ladder</code>.
        </p>
        <p className="text-[10px] text-muted font-sans mt-3 leading-relaxed">
          The Skill auto-picks up your latest Desktop screenshot or any image on
          your clipboard — no file paths, no attachments.
        </p>
      </NumberedStep>

      <div className="mt-6 pt-5 border-t border-[#333]">
        <button
          type="button"
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          <span>{showTroubleshooting ? "Hide troubleshooting" : "Troubleshooting"}</span>
          <svg
            className={`transition-transform ${showTroubleshooting ? "rotate-180" : ""}`}
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showTroubleshooting && (
          <ul className="mt-5 space-y-4">
            {TROUBLESHOOTING.map((item, i) => (
              <li key={i}>
                <p className="text-xs text-foreground font-sans font-semibold">
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
    </div>
  );
}
