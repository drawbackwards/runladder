# Ladder Skill changelog

All notable changes to the Ladder Skill bundle (SKILL.md, README.md, scripts/) are listed here. The Skill tracks its own version independently of the runladder.com web app.

## 1.0.0 — 2026-04-18

Initial public release.

- Thin-client scoring against the Ladder API via Bearer token auth.
- Trigger phrases: "Run Ladder", "Ladder this", "Ladder score", and related UX/UI audit phrasings.
- Sends `X-Ladder-Skill-Version` so the dashboard can detect out-of-date installs and prompt for re-download.
