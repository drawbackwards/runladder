"use client";

import { useEffect, useState } from "react";

export type SessionType = "design" | "evaluation";

const STORAGE_KEY = "ladder:session-type";

/**
 * Reads the session-type intent for the current browser session. Returns
 * `null` when the user hasn't picked yet, so callers can show the prompt.
 *
 * Uses sessionStorage (per-tab) rather than localStorage so a designer who
 * comes back tomorrow gets the prompt fresh — intent isn't always sticky
 * across days.
 */
export function useSessionType(): {
  sessionType: SessionType | null;
  ready: boolean;
  pick: (type: SessionType) => void;
  clear: () => void;
} {
  const [sessionType, setSessionType] = useState<SessionType | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "design" || stored === "evaluation") {
        setSessionType(stored);
      }
    } catch {
      // sessionStorage unavailable (private mode, etc.) — caller still works
      // by re-prompting each time.
    }
    setReady(true);
  }, []);

  function pick(type: SessionType) {
    setSessionType(type);
    try {
      sessionStorage.setItem(STORAGE_KEY, type);
    } catch {
      // ignore
    }
  }

  function clear() {
    setSessionType(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return { sessionType, ready, pick, clear };
}

/**
 * Full-screen prompt asking the user to declare intent for this scoring
 * session. Two big choice cards. Used on /score when the user is signed
 * in and hasn't picked yet.
 */
export function SessionTypeModal({
  onPick,
}: {
  onPick: (type: SessionType) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 font-mono">
      <div className="max-w-2xl w-full">
        <div className="mb-8 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted mb-3">
            Before you score
          </p>
          <h2 className="text-2xl text-foreground font-sans tracking-tight">
            What kind of session is this?
          </h2>
          <p className="text-sm text-muted font-sans mt-2">
            Pick once. We&apos;ll remember it for the rest of your session.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SessionChoiceCard
            title="Design Session"
            tagline="Working on your own design"
            body="Counts toward your craft trends, design rhythm, and personal records."
            onClick={() => onPick("design")}
          />
          <SessionChoiceCard
            title="Evaluation Session"
            tagline="Auditing someone else's UI"
            body="Powers your audit toolkit, saved findings library, and competitor research."
            onClick={() => onPick("evaluation")}
          />
        </div>
      </div>
    </div>
  );
}

function SessionChoiceCard({
  title,
  tagline,
  body,
  onClick,
}: {
  title: string;
  tagline: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-[#2a2a2a] bg-[#1a1a1a] hover:border-ladder-green hover:bg-ladder-green/[0.04] transition-colors p-6 group"
    >
      <p className="text-[10px] uppercase tracking-widest text-ladder-green font-semibold mb-3">
        {title}
      </p>
      <h3 className="text-base font-sans font-semibold text-foreground mb-2 group-hover:text-ladder-green transition-colors">
        {tagline}
      </h3>
      <p className="text-xs text-muted font-sans leading-relaxed">{body}</p>
    </button>
  );
}

/**
 * Compact pill that shows the current session type with a quick way to
 * change it. Shown above the scoring tool once a type has been picked.
 */
export function SessionTypePill({
  type,
  onChange,
}: {
  type: SessionType;
  onChange: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] font-mono border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5">
      <span className="text-muted">
        {type === "evaluation" ? "In an" : "In a"}
      </span>
      <span className="font-semibold text-ladder-green">
        {type === "design" ? "Design Session" : "Evaluation Session"}
      </span>
      <span className="text-[#3a3a3a]">·</span>
      <button
        type="button"
        onClick={onChange}
        className="text-muted hover:text-foreground transition-colors uppercase tracking-widest text-[10px]"
      >
        Change
      </button>
    </div>
  );
}
