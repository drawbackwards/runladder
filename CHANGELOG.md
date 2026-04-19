# Changelog — runladder.com + Ladder API

All user-visible changes to the runladder.com web app and the Ladder API are logged here. Surface-specific changelogs live with their surface (Skill, Figma plugin, etc.).

Version format: `<app>` covers the web app + dashboard. `<api>` covers the Ladder API contract exposed by `src/app/api/*`. Either can bump independently.

---

## app 0.2.0 / api 1.0.0 — 2026-04-19

**Ladder framework unified across the suite.**

- **Scoring engine rebuilt on the full Ladder framework.** `/api/score` and `/api/skill/score` now use the same rich rubric the Figma plugin has used in beta — levels with signals, seven evaluation dimensions, the AI-experience lens for AI-powered products, and scoring principles. No change to the response shape.
- **New `/api/framework` endpoint.** Serves the Ladder framework (levels, dimensions, design types, AI lens, survey domains, pre-rendered prompts) to trusted service callers. Shared-secret auth via `X-Ladder-Service-Token`.
- **New `/api/plugin/analyze` endpoint.** Service-to-service scoring endpoint for Ladder plugin backends. Takes an image + optional `designType`, returns the plugin's `improve` response shape. Shared-secret auth.
- **API version header.** Every endpoint now returns `X-Ladder-API-Version`, and the framework + plugin-analyze endpoints carry it today. Clients can log which contract they hit.
- **App version visible in footer.** Added `CURRENT_APP_VERSION` source of truth in `src/lib/app-version.ts`, surfaced in the footer so "which build is live?" is answerable at a glance.

---

## app 0.1.0 / api 0.1.0 — prior

Initial runladder.com build: marketing site, public `/score` tool, dashboard, Top 100, Ladder for Claude Skill integration (`CURRENT_SKILL_VERSION` — see `src/lib/skill-version.ts`), Skill Pulse, Stripe-free-tier gating, Clerk auth, Upstash Redis persistence.
