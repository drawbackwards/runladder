# Changelog — runladder.com + Ladder API

All user-visible changes to the runladder.com web app and the Ladder API are logged here. Surface-specific changelogs live with their surface (Skill, Figma plugin, etc.).

Version format: `<app>` covers the web app + dashboard. `<api>` covers the Ladder API contract exposed by `src/app/api/*`. Either can bump independently.

---

## app 0.3.0 / api 1.0.0 — 2026-05-05

**Teams beta — invite, manage, measure, learn.**

- **Team management page.** New `/dashboard/team` lets a team manager (Clerk Org admin) invite designers by email, see members and pending invites, and remove or revoke as needed. Custom dark-themed UI matching the rest of the dashboard.
- **Auto-comp on accept.** When an invitee accepts and lands in the org, the new `/api/webhooks/clerk` handler grants them a `tier: "team"` complimentary subscription with a reason naming the org. Removal revokes the comp only when the user has no remaining org memberships.
- **Clerk Organizations as the primitive.** Manager and member roles, invite emails, and acceptance flow handled natively by Clerk. Custom super-admin protection on `SUPER_ADMIN_EMAILS` lives alongside (see `src/lib/admin.ts`).
- **Designer letter grades.** Each member gets an A-F grade based on the percentage of their last-30-day scores that hit Comfortable+ (3.0). Grade color echoes the Ladder rung the designer typically reaches: A=Meaningful white, B=Delightful green, C=Comfortable yellow, D=Usable orange, F=Functional red.
- **Team performance insights.** The team dashboard shows total scans, team average, and the team's strongest and weakest rung over the window. Lets a manager see at a glance what to coach toward.
- **Per-member activity.** Members list shows letter grade, total scans, average score, and last-active relative time per designer. Manager sees everyone; non-admin members see only the roster.
- **Analysis-quality feedback widget.** New `<AnalysisFeedback>` component on `/dashboard/scores/[id]` lets users mark each analysis Helpful or Off-base with an optional note. Backed by `/api/feedback/score` (GET/POST). Anonymous viewers see no widget.
- **Admin feedback console.** New `/admin/feedback` aggregates ratings and notes across all users, enriched with email, org name, and underlying score data. Helpful/off-base totals at the top so QA can scan trends. Admin-allowlist gated.

---

## app 0.2.0 / api 1.0.0 — 2026-04-19

**Scoring engine alignment across the suite.**

- **Consistent scoring everywhere.** runladder.com and the Claude Skill now run the same scoring engine as the Figma plugin — one evaluation, same result, regardless of surface. No change to the public response shape.
- **Internal sync endpoint.** Added a service-to-service endpoint for trusted backends to stay aligned. Shared-secret auth.
- **Internal plugin-scoring endpoint.** Added an internal scoring endpoint for Ladder plugin backends. Shared-secret auth.
- **API version header.** Every API response now returns `X-Ladder-API-Version` so callers can log which contract they hit.
- **App version visible in footer.** Added a source-of-truth constant (`src/lib/app-version.ts`) surfaced in the footer — "which build is live?" is now answerable at a glance.

---

## app 0.1.0 / api 0.1.0 — prior

Initial runladder.com build: marketing site, public `/score` tool, dashboard, Top 100, Ladder for Claude Skill integration (`CURRENT_SKILL_VERSION` — see `src/lib/skill-version.ts`), Skill Pulse, Stripe-free-tier gating, Clerk auth, Upstash Redis persistence.
