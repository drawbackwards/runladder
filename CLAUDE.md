# CLAUDE.md — runladder.com

## What This Is

The home of **Ladder** — the quality score for every experience. This is the self-serve product site: public scoring tool, education, dashboard, API docs, and content engine.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **Auth:** Clerk (email + Google, magic links, JWTs, roles)
- **Database:** Upstash Redis (existing) + Postgres (future)
- **Payments:** Stripe (subscriptions + usage-based)
- **AI:** Anthropic Claude (scoring engine)
- **Hosting:** Vercel
- **Content:** MDX (blog + teardowns)

## Brand

- **Product name:** Ladder
- **Domain:** runladder.com
- **Accent color:** `#6AC89B` (Ladder green)
- **Dark theme** — dark backgrounds, light text, green accents
- **Typography:** Inter for body, mono for scores/data
- **Maker credit:** "Built by Drawbackwards" in footer (small, subtle)
- **No emojis** in product UI

## Brand Architecture

| | runladder.com (THIS SITE) | drawbackwards.com |
|---|---|---|
| **Role** | Product — self-serve scoring tool | Agency — sells Ladder-powered services |
| **Content** | Score screens, dashboard, API docs, Top 100 | Client work, services, team, blog |

**Rules:**
- This site IS Ladder. The entire product lives here.
- Do NOT build agency/services content here — that's drawbackwards.com.
- Drawbackwards appears only as "Built by Drawbackwards" in the footer.

## Product Suite

All surfaces share one scoring engine, one auth (Clerk), one billing (Stripe), one database.

| Product | Surface | Role |
|---------|---------|------|
| **runladder.com** | This site | Score anything, dashboard, Top 100, API docs |
| **Ladder for Figma** | Figma plugin | In-canvas scoring (repo: ai-design-assistant) |
| **Ladder Pulse** | Web app (/dashboard/pulse) | Score from customer feedback data |
| **Ladder for Claude** | Claude.ai skill | Score in AI conversations |
| **Ladder API** | api.runladder.com | MCP + OpenAPI for developers and AI tools |

## Domains

| Domain | What | Auth |
|--------|------|------|
| **runladder.com** | Marketing + web app + public scoring | Clerk (public + authenticated) |
| **admin.runladder.com** | Platform admin console | Clerk (admin role only) |
| **api.runladder.com** | Public API for developers + AI tools | API keys / Bearer tokens |

## Route Structure

```
/ (public)
├── /                    — Homepage
├── /score               — Public scoring tool (no auth required)
├── /framework           — Ladder education
├── /framework/[level]   — Level deep dives
├── /top-100             — Ranked products
├── /top-100/[slug]      — Product scorecard
├── /teardowns           — Weekly teardowns
├── /teardowns/[slug]    — Individual teardown
├── /blog                — Blog
├── /blog/[slug]         — Post
├── /products            — Suite overview
├── /pricing             — Tiers
├── /login               — Auth
├── /[username]          — Public profile

/dashboard (authenticated)
├── /dashboard           — Personal scores, stats
├── /dashboard/team      — Team portfolio, leaderboard
├── /dashboard/pulse     — Feedback analysis
├── /dashboard/settings  — Account, billing, API keys
```

## The Ladder Framework

| Score | Level | Description |
|-------|-------|-------------|
| 1.00-1.99 | Functional | User fights the product |
| 2.00-2.99 | Usable | Tasks complete with effort |
| 3.00-3.99 | Comfortable | No thinking required — the modern minimum |
| 4.00-4.99 | Delightful | Anticipates needs, users refer others |
| 5.00 | Meaningful | Irreplaceable |

**Score colors:**
- Functional: `#ef4444` (red)
- Usable: `#f97316` (orange)
- Comfortable: `#eab308` (yellow)
- Delightful: `#22c55e` (green)
- Meaningful: `#ffffff` (white)

## Git Workflow

Same as all Drawbackwards repos:
- **Never push to main.** Always branch + PR + merge.
- Branch naming: `ward/<feature>` or `claude/<feature>`
- Create from latest main, push with `-u`, PR with `gh pr create`

## Code Style

- TypeScript strict mode
- Functional React components, no class components
- Server Components by default, `'use client'` only when needed
- Tailwind utility classes, no CSS modules
- `const` by default, `let` only when needed, never `var`

## /hq docs lockstep (UNBREAKABLE)

Every PR that touches code in this repo MUST update the matching `/hq` page in the same PR. The team relies on `/hq` as truth. If it drifts from the code, it dies.

When you change code:

1. Find the `/hq` page(s) that document the area you changed.
2. Update the relevant content in the same PR (new feature row in `/hq/features`, updated flow in `/hq/journeys`, new endpoint in `/hq/api`, etc.).
3. Bump the frontmatter:

```yaml
---
title: <section title>
updatedAt: <today YYYY-MM-DD>
updatedBy: <your name, or Sara if AI pair>
lastPr: <the PR number this change ships in>
---
```

The `LastUpdated` header on the page renders these three fields so anyone reading the page can see when it was last verified against the code and which PR did the verifying.

Map of code areas to docs:

| When you change... | Update... |
|---|---|
| A user-visible web/plugin/Skill feature | `/hq/features` row, `/hq/journeys` flow if it changes |
| An API endpoint, MCP tool, or auth shape | `/hq/api` (endpoint shape, examples) |
| Pricing, positioning, roles, model, ICP, or any strategic decision | `/hq/decisions` (new entry or revise existing) |
| `src/lib/admin.ts` auth tiers | `/hq/roles` capability matrix |
| Roadmap status (priority moved, gate flipped) | `/hq/roadmap` |
| Engine architecture, shared services, surface boundaries | `/hq/architecture` |
| Vocabulary (new term, renamed concept) | `/hq/glossary` |
| Brand rules (voice, colors, taboos) | `/hq/brand` |

If a code change has no doc consequence, say so in the commit body. Otherwise the doc update is part of the PR. Sara enforces this for AI-paired work. Ward, Chester, and Michael enforce it for their own PRs.

## Post-merge /hq verification (UNBREAKABLE, all Ladder platform repos)

After ANY PR ships live in any of the four Ladder platform repos, Sara verifies `/hq` is current and prints a confirmation to Ward. The four repos:

1. `drawbackwards/runladder` (this repo)
2. `drawbackwards/ai-design-assistant` (Figma plugin + first-gen API)
3. `drawbackwards/ladder-beta` (Pulse)
4. `drawbackwards/ladder` (original Rails)

When a PR ships live, walk the `/hq` pages most likely affected (the same map as the lockstep section above). If updates are needed, open a follow-up PR. Then print the confirmation in this shape:

```
HQ verified for PR #N (vX.Y.Z).
- Pages updated: list (or "none, all current")
- Pages spot-checked: list
- Live at runladder.com/hq
```

Silence after a deploy is not acceptable. Even if no `/hq` update was needed, say so explicitly. The handshake is the discipline.

Documentation-only PRs to non-platform repos (engineering-standards, drawbackwards-knowledge, etc.) do not trigger the rule.

## Engineering model

- **Ward** leads engineering with Claude (Sara) as AI pair.
- **Michael** can build any surface (web, plugin, Skill, API, MCP, Pulse, admin) with Ward's prior approval on scope.
- **Chester** can build on web, plugin, and Skill with Ward's prior approval.
- **Sean** does a one-hour weekly engineering audit and on-demand reviews.

Any Drawbackwards engineer can review, approve, and merge PRs once CI (the `next build` check) passes. Reviews are encouraged — especially on sensitive surfaces (API, MCP, Pulse, admin) — but they are not a hard gate, and no PR is blocked waiting on one specific person. See `/hq/decisions` for the full rationale.

## Related Repos

- **drawbackwards/ai-design-assistant** — Figma plugin + current API (will migrate API here over time)
- **drawbackwards/ladder-beta** — Pulse codebase (Next.js + Prisma on Fly.io)
- **drawbackwards/ladder** — original Ladder Rails backend
- **drawbackwards/db-website-2026** — Drawbackwards agency website
- **drawbackwards/engineering-standards** — engineering standards, security, dev workflows
