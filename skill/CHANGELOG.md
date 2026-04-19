# Ladder Skill changelog

All notable changes to the Ladder Skill bundle (SKILL.md, README.md, scripts/) are listed here. The Skill tracks its own version independently of the runladder.com web app.

## 1.0.3 — 2026-04-18

- `score.py` can now be invoked with **no arguments**. On macOS it reads the clipboard first (via AppleScript `«class PNGf»`), then falls back to the most recent `~/Desktop/Screenshot*.png`. This means a user can just hit Cmd+Shift+4, then say "Run Ladder" without typing a path.
- `score.py` tolerates the U+202F (narrow no-break space) that macOS screenshots embed between the time and AM/PM in filenames. Paths typed with a regular space are auto-corrected; if that still misses, a `?` glob fallback runs.
- `SKILL.md` documents the zero-arg invocation so Claude calls `python scripts/score.py` (no path) when the user says "Run Ladder" without attaching a file.

## 1.0.2 — 2026-04-18

- Zip is now packaged with a top-level `ladder-quality-score/` folder so `unzip -d ~/.claude/skills/` just works for Claude Code installs.
- `README.md` and the dashboard now document a one-line install for Claude Code users, which bypasses the Claude.ai workspace network allowlist entirely (scripts run locally).

## 1.0.1 — 2026-04-18

- `score.py` now returns an actionable message when the request is blocked by a Claude workspace network allowlist (HTTP 403): tells the user to ask their workspace admin to add `runladder.com` to allowed network domains.
- `SKILL.md` adds 403 to the error playbook so Claude narrates the fix to the user directly.

## 1.0.0 — 2026-04-18

Initial public release.

- Thin-client scoring against the Ladder API via Bearer token auth.
- Trigger phrases: "Run Ladder", "Ladder this", "Ladder score", and related UX/UI audit phrasings.
- Sends `X-Ladder-Skill-Version` so the dashboard can detect out-of-date installs and prompt for re-download.
