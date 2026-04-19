"use client";

import { useEffect, useState } from "react";

type TokenMeta = {
  hasToken: boolean;
  prefix?: string;
  createdAt?: number;
  lastUsedAt?: number;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SkillTokenCard() {
  const [meta, setMeta] = useState<TokenMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  function copy() {
    if (!rawToken) return;
    navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="border border-[#333] bg-[#1e1e1e] p-6 shimmer h-32" />
    );
  }

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
          href="https://runladder.com/downloads/ladder-skill.zip"
          className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors flex-shrink-0 border border-[#333] px-3 py-2 hover:border-muted"
        >
          Download Skill
        </a>
      </div>

      {rawToken ? (
        <div className="border border-ladder-green/40 bg-ladder-green/5 p-4 mb-3">
          <p className="text-[10px] text-ladder-green uppercase tracking-widest mb-2 font-semibold">
            Copy this token — you won&apos;t see it again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-foreground bg-[#111] border border-[#333] px-3 py-2 break-all">
              {rawToken}
            </code>
            <button
              onClick={copy}
              className="text-[10px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold flex-shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      {meta?.hasToken ? (
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#333]">
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
        <div className="pt-3 border-t border-[#333]">
          <button
            onClick={generate}
            disabled={working}
            className="text-xs font-semibold bg-ladder-green text-[#1a1a1a] px-6 py-3 hover:bg-ladder-green/90 transition-colors uppercase tracking-widest disabled:opacity-40"
          >
            {working ? "Generating…" : "Generate Skill token"}
          </button>
          <p className="text-[10px] text-[#555] font-sans mt-3">
            Uses your monthly scoring pool. Free tier: 5 scores / month across
            all surfaces.
          </p>
        </div>
      )}
    </div>
  );
}
