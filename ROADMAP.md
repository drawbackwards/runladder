# Roadmap

Deferred work, parked ideas, and multi-phase migrations for runladder.com and the Ladder ecosystem. Items move from here into `CHANGELOG.md` when shipped.

Not a promise of order or priority — this is a capture list so nothing falls on the floor. Promotions to active work happen in PR discussions.

---

## Admin — CRM

- **Search + filter** on the users list (by email, company, tier, last-active window)
- **Segments / tags** — admin-assigned labels on users (e.g. `agency`, `qualified`, `reviewer`). Filter by tag.
- **Lifecycle stages** — `new → active → engaged → at-risk → churned`. Auto-computed from activity signals.
- **CSV export** — users, invite codes, activity windows
- **Bulk actions** on selected users (email, re-tier, tag)
- **Custom limits per user** — override the default monthly cap without promoting tier
- **Flags** — admin-only booleans on a user (OG beta, reviewer, internal, do-not-contact)
- **Admin activity log** — who (which admin) edited what, when. Accountability for multi-admin teams.

## Admin — analytics & visibility

- **Score trend sparkline** per user in the drawer (score over last 30d)
- **Mode usage breakdown** per user (pie or bar: improve / audit / a11y / copy / compare / generate)
- **Team-level aggregation** that isn't just `/dashboard/team` (admin-side roll-up across all teams)
- **Usage forecast** — project monthly usage based on current pace
- **Cohort view** — new users by week, retention by cohort

## Admin — auth & infra

- **`admin.runladder.com` subdomain** (currently `/admin` subpath — fine for v1)
- **Clerk roles instead of email allowlist** — once other team members need admin access
- **Admin-key-less operations** — move invite/user storage from ai-design-assistant Redis into runladder Redis alongside Clerk, so proxying disappears
- **Audit log export** — CSV of admin actions for compliance/legal

## Billing & Stripe

- **Stripe sync in admin** — show subscription state, next billing date, invoice history per user
- **Manual upgrade/downgrade** that writes to Stripe (not just the local tier field)
- **Dunning visibility** — failed-payment users surfaced in admin
- **Seat management for Teams tier** (when Teams becomes a real product)

## Scoring engine

- **Chat endpoint migration** — `ai-design-assistant/api/chat.js` should proxy to runladder like scoring already does. Currently still uses the thin-fetcher framework pattern locally.
- **Feedback-scoring endpoint migration** — same pattern for `api/score-feedback.js`.
- **Per-rung refinement dashboard** — let Ward tune individual rung scoring without a deploy.
- **Model selection as an admin setting** — toggle Sonnet vs Haiku per mode for cost/quality tradeoff.

## Plugin (Ladder for Figma)

- **Compare-mode activity logging** — currently only single-frame modes log to `user:{id}:activity`
- **Generate-mode activity logging** — same
- **Plugin-side version check** — plugin fetches current version from API, shows "update available" pill when outdated (like the Skill does today)
- **First-run tour** inside the plugin
- **Analytics: which Figma file / project** is being scored (aggregate, not per-user privacy-respecting)

## runladder.com — public surfaces

- **Public changelog page** at `/changelog` that renders `CHANGELOG.md`
- **Public roadmap page** at `/roadmap` — curated subset of this file (customer-facing only)
- **`/status` page** with API uptime + recent deploy times
- **API docs site** for the forthcoming public Ladder API
- **Pricing page reality check** — sync copy with actual Stripe plans after Stripe sync lands

## Ops

- **Error aggregation** beyond per-user — surface global error rate, top error types, deploy correlation
- **Vercel deploy promotion workflow** — staging → prod with a confirmation step (today: push to main = prod)
- **Scheduled runladder-framework sync health check** — alert if `/api/framework` 5xx rate crosses threshold

---

*Last touch-up: 2026-04-19 after the light-CRM v1 ship.*
