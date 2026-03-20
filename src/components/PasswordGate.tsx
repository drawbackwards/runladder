"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "ladder_site_access";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Verify stored password is still valid
      fetch("/api/auth-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: stored }),
      })
        .then((r) => {
          if (r.ok) setUnlocked(true);
          else sessionStorage.removeItem(STORAGE_KEY);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, []);

  if (!loaded) return null;
  if (unlocked) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input }),
      });
      if (res.ok) {
        sessionStorage.setItem(STORAGE_KEY, input);
        setUnlocked(true);
      } else {
        setError(true);
        setInput("");
      }
    } catch {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-sm w-full text-center">
        <span className="font-mono font-bold text-2xl text-ladder-green">
          LADDER
        </span>
        <p className="text-sm text-body mt-4 mb-8">
          This site is in private preview. Enter the password to continue.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground text-center placeholder:text-muted focus:border-ladder-green/50 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="w-full bg-ladder-green text-background font-semibold py-3 rounded-full hover:bg-ladder-green/90 transition-colors text-sm"
          >
            Enter
          </button>
          {error && (
            <p className="text-xs text-red-400">Wrong password. Try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}
