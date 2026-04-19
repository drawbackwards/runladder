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

const SETUP_STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Generate your token",
    body: "Click Generate Skill token. The raw token appears once — you won't see it again.",
  },
  {
    title: "Install on your Mac or Linux machine",
    body: (
      <>
        Copy the command that appears and paste into Terminal. It saves the
        token to <code className="text-foreground">~/.ladder/token</code> with
        the right permissions.
      </>
    ),
  },
  {
    title: "Download the Skill bundle",
    body: "Click the Download Skill button above to get the latest versioned zip.",
  },
  {
    title: "Upload to Claude",
    body: "In Claude: Settings → Capabilities → Skills → upload the zip you just downloaded.",
  },
  {
    title: "Score something",
    body: (
      <>
        Start a new chat, attach a screenshot, and say{" "}
        <code className="text-foreground">Run Ladder</code>.
      </>
    ),
  },
];

export function SkillTokenCard() {
  const [meta, setMeta] = useState<TokenMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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

  if (loading) {
    return (
      <div className="border border-[#333] bg-[#1e1e1e] p-6 shimmer h-32" />
    );
  }

  const updateAvailable =
    !!meta?.installedVersion &&
    !!meta?.currentVersion &&
    meta.installedVersion !== meta.currentVersion;

  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-6">
      <div className="flex items-start justify-between gap-6 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
              New
            </span>
            <h3 className="text-sm text-foreground font-sans font-semibold">
              Ladder for Claude
            </h3>
          </div>
          <p className="text-xs text-muted font-sans leading-relaxed max-w-lg">
            Score screens directly in Claude conversations. Install the Ladder
            Skill in Claude, paste your token, and drag a screenshot into any
            chat.
          </p>
        </div>
        <a
          href={
            meta?.currentVersion
              ? `/downloads/ladder-skill-v${meta.currentVersion}.zip`
              : "#"
          }
          className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors border border-[#333] px-3 py-2 hover:border-muted flex-shrink-0"
        >
          Download Skill{meta?.currentVersion ? ` v${meta.currentVersion}` : ""}
        </a>
      </div>

      {updateAvailable && (
        <div className="flex items-center justify-between gap-4 border border-ladder-green/30 bg-ladder-green/5 px-4 py-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
              Update available
            </span>
            <span className="text-[11px] text-muted font-sans">
              You have <span className="font-mono text-foreground">v{meta!.installedVersion}</span> installed — <span className="font-mono text-foreground">v{meta!.currentVersion}</span> is current.
            </span>
          </div>
          <a
            href={`/downloads/ladder-skill-v${meta!.currentVersion}.zip`}
            className="text-[10px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-3 py-2 font-semibold flex-shrink-0"
          >
            Download v{meta!.currentVersion}
          </a>
        </div>
      )}

      {rawToken ? (
        <div className="border border-ladder-green/40 bg-ladder-green/5 p-4 mb-3">
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
            Saves your token to <code className="text-foreground">~/.ladder/token</code> so the Skill can authenticate. macOS &amp; Linux.
          </p>
        </div>
      ) : null}

      {meta?.hasToken ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[11px] text-muted font-sans">
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

      <div className="mt-6 pt-5 border-t border-[#333]">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          <span>{showGuide ? "Hide setup guide" : "Show setup guide"}</span>
          <svg
            className={`transition-transform ${showGuide ? "rotate-180" : ""}`}
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
        {showGuide && (
          <>
            <ol className="mt-6 space-y-5">
              {SETUP_STEPS.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-[10px] text-ladder-green font-mono tabular-nums shrink-0 mt-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-xs text-foreground font-sans font-semibold">
                      {step.title}
                    </p>
                    <p className="text-[11px] text-muted font-sans mt-1 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 pt-5 border-t border-[#333]">
              <p className="text-[10px] uppercase tracking-widest text-muted mb-4">
                Troubleshooting
              </p>
              <ul className="space-y-4">
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
