# Changelog — runladder.com + Ladder API

All user-visible changes to the runladder.com web app and the Ladder API are logged here. Surface-specific changelogs live with their surface (Skill, Figma plugin, etc.).

Version format: `<app>` covers the web app + dashboard. `<api>` covers the Ladder API contract exposed by `src/app/api/*`. Either can bump independently.

---

## app 0.4.15 / api 1.0.0 — 2026-05-13

**Reviews: the social layer for Ladder.**

- **Reviews on the dashboard.** New `/dashboard/reviews` lets a manager group iterations of a design into a Review, watch scores evolve frame-by-frame, and invite peers to weigh in. A compact "Active reviews" entry point sits on `/dashboard` so the workflow is one click away.
- **Frame workspace.** `/dashboard/reviews/[slug]/frames/[frameId]` is the centerpiece — the screen renders with pinned crit overlaid (click any pin to open its thread), a right-rail tabbed panel for Pins / Team Takes / Findings, and a horizontal iteration strip showing version-to-version score lift.
- **Team Take subscore.** Peer designers submit their own score from 1.0–5.0 with a one-line rationale on every frame. The aggregate is shown alongside the Ladder score, never replacing it. "Ladder 3.4 / Team Take 3.5 (2 peers)" — same scale, separate field, trust in the AI preserved.
- **Pin annotations.** Click anywhere on a frame to drop a pinned thread, Figma-style. Replies, resolve toggle, author attribution. Mock interactivity ships now; persistence lands with the next build.
- **Pricing copy refresh.** Cleaner Free and Pro tier copy: dropped "forever", shortened green pills to "5-score trial" / "2,000 scores/mo" / "25,000 pooled scores/mo" so they never wrap. Pro tier explicit on score history without trend line. Team tier now leads with the Reviews + Team Take features. Pulse tier marks customer sentiment "coming soon" and drops "real-time" from the tracking line.
- **Login footer.** Hash-aware footer on `/login` so the create-account view (`/login#/create`) no longer shows "New here? Create an account" under a form that's already creating an account.

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
