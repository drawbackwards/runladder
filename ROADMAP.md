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
- **Custom limits per user** — override the default lifetime cap without promoting tier
- **Flags** — admin-only booleans on a user (OG beta, reviewer, internal, do-not-contact)
- **Admin activity log** — who (which admin) edited what, when. Accountability for multi-admin teams.

## Admin — analytics & visibility

- **Score trend sparkline** per user in the drawer (score over last 30d)
- **Mode usage breakdown** per user (pie or bar: improve / audit / a11y / copy / compare / generate)
- **Team-level aggregation** that isn't just `/dashboard/team` (admin-side roll-up across all teams)
- **Usage forecast** — project usage based on current pace
- **Cohort view** — new users by week, retention by cohort

## Admin — auth & infra

- **`admin.runladder.com` subdomain** (currently `/admin` subpath — fine for v1)
- **Clerk roles instead of email allowlist** — once other team members need admin access
- **Admin-key-less operations** — move invite/user storage from ai-design-assistant Redis into runladder Redis alongside Clerk, so proxying disappears
- **Audit log export** — CSV of admin actions for compliance/legal

## Billing & Stripe

Core self-serve Pro shipped 2026-05-02. Remaining work is admin tooling, lifecycle handling, and Teams-tier groundwork.

- **Stripe state in admin** — show subscription status, next billing date, invoice history, and `cancel_at_period_end` per user
- **Manual upgrade/downgrade from admin** that writes to Stripe (not just the local tier field)
- **Dunning visibility** — failed-payment users surfaced in admin with `past_due` / `unpaid` reasons
- **Seat management for Teams tier** — landing page, contact-to-quote → Stripe Checkout flow, seat add/remove via Customer Portal (gated on Teams becoming a real product)
- **Re-add API allotments to Pro pricing page + Stripe description** when the public Ladder API ships (currently dropped — scheduled agent fires 2026-06-01 to check)
- **MCP surface restoration** — same as above when MCP ships
- **Subscription pause** — Stripe portal config option, surfaced in dashboard

## Scoring engine

- **Chat endpoint migration** — `ai-design-assistant/api/chat.js` should proxy to runladder like scoring already does. Currently still uses the thin-fetcher framework pattern locally.
- **Feedback-scoring endpoint migration** — same pattern for `api/score-feedback.js`.
- **Per-rung refinement dashboard** — let Ward tune individual rung scoring without a deploy.
- **Model selection as an admin setting** — toggle Sonnet vs Haiku per mode for cost/quality tradeoff.

## Redline / evaluation surface

Pulled out of the score detail page so scoring stays focused on producing the score. The annotation primitives still live in the codebase (`src/components/ScoreAnnotations.tsx`, `src/components/admin/AnnotatedScreen.tsx`, `/api/dashboard/scores/[id]/annotations`, `src/lib/annotation-analysis.ts`) — this is a UX/surface build, not a from-scratch implementation.

- **Dedicated /dashboard/scores/[id]/redline route** — the canvas where a user pulls findings onto the screenshot, draws rectangles, leaves notes. Entered from a clearly-labeled "Redline this screen" CTA on the score detail page, not auto-shown.
- **Mode picker on entry** — manual rectangles vs auto-generate from the score's findings (the auto path uses `annotation-analysis.ts`, already on Sonnet 4.6).
- **Multi-annotation review** — diff your annotations vs the model's annotations vs a teammate's annotations. Useful for design reviews and calibration sessions.
- **Export** — flatten the annotated screen to PNG / PDF for sharing in design crit, Slack, or a Figma frame.
- **Pricing copy in `src/app/pricing/page.tsx` ("redline annotations on every score")** — leave alone for now; rewrite when the surface ships.
- **Plugin parity** — eventually the Figma plugin gets a "Redline this frame" action that hands off to the runladder redline surface (or renders inline). Out of scope until web is shipped.

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

## Ops

- **Error aggregation** beyond per-user — surface global error rate, top error types, deploy correlation
- **Vercel deploy promotion workflow** — staging → prod with a confirmation step (today: push to main = prod)
- **Scheduled framework sync health check** — alert if `/api/framework` 5xx rate crosses threshold
- **Production webhook health check** — scheduled sweep of Stripe Dashboard webhook deliveries; alert on failure spikes or orphaned customers without a Clerk tier

---

*Last touch-up: 2026-05-02 after Stripe self-serve Pro shipped.*
