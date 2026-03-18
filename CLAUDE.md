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

## Related Repos

- **drawbackwards/ai-design-assistant** — Figma plugin + current API (will migrate API here over time)
- **drawbackwards/db-website-2026** — Drawbackwards agency website
