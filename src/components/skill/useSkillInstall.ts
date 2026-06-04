"use client";

import { useEffect, useRef, useState } from "react";

type Meta = {
  hasToken: boolean;
  prefix?: string;
  createdAt?: number;
  lastUsedAt?: number;
  installedVersion?: string;
  currentVersion?: string;
  lastUsedSurface?: "claude-code" | "claude-ai";
};

const DOWNLOAD_URL = "/api/skill/download";

function buildCommand(token: string, ver: string): string {
  return `mkdir -p ~/.ladder ~/.claude/skills && printf '%s' '${token}' > ~/.ladder/token && chmod 600 ~/.ladder/token && curl -fsSL https://runladder.com/downloads/ladder-skill-v${ver}.zip -o /tmp/ladder-skill.zip && unzip -oq /tmp/ladder-skill.zip -d ~/.claude/skills/ && rm /tmp/ladder-skill.zip`;
}

/**
 * Shared Ladder-for-Claude install state, so the status box and the two
 * install boxes (Claude Code / Claude.ai) on /dashboard/claude can each use
 * the same source of truth.
 *
 * "Connected" means the Skill has actually run (`lastUsedAt`) — not merely that
 * a credential exists — so the UI never claims you're installed when you aren't.
 * A token is auto-generated on load purely so the install command is ready to
 * copy; that's an internal detail, not a status.
 */
export function useSkillInstall() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    fetch("/api/skill/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMeta(d))
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

  // Auto-generate on first load if there's no token yet, so the install command
  // is ready to copy immediately. Never replaces a working install.
  const autoGenRef = useRef(false);
  useEffect(() => {
    if (autoGenRef.current) return;
    if (loading || !meta || meta.hasToken || rawToken || working) return;
    autoGenRef.current = true;
    generate();
  }, [loading, meta, rawToken, working]);

  async function disconnect() {
    if (
      !confirm(
        "Disconnect the Ladder Skill? It'll stop working until you install it again.",
      )
    )
      return;
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

  const version = meta?.currentVersion;
  const connected = !!meta?.hasToken && !!meta?.lastUsedAt;
  const updateAvailable =
    !!meta?.installedVersion &&
    !!meta?.currentVersion &&
    meta.installedVersion !== meta.currentVersion;
  const command = rawToken && version ? buildCommand(rawToken, version) : null;

  function copyCommand() {
    if (!command) return;
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyToken() {
    if (!rawToken) return;
    navigator.clipboard.writeText(`My Ladder token is ${rawToken}`);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  return {
    loading,
    working,
    connected,
    version,
    lastUsedAt: meta?.lastUsedAt,
    lastUsedSurface: meta?.lastUsedSurface,
    installedVersion: meta?.installedVersion,
    updateAvailable,
    rawToken,
    command,
    copied,
    copyCommand,
    copiedToken,
    copyToken,
    downloadUrl: DOWNLOAD_URL,
    reset: generate,
    disconnect,
  };
}
