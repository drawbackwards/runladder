# Changelog — runladder.com + Ladder API

All user-visible changes to the runladder.com web app and the Ladder API are logged here. Surface-specific changelogs live with their surface (Skill, Figma plugin, etc.).

Version format: `<app>` covers the web app + dashboard. `<api>` covers the Ladder API contract exposed by `src/app/api/*`. Either can bump independently.

---

## app 0.5.1 / api 1.0.0 (2026-05-19)

**Ladder HQ: drop human-owner labels, Sara seeds every section, lockstep protocol baked in.**

- **Lockstep protocol.** Every PR that touches code in this repo updates the matching `/hq` page in the same PR. Bump `updatedAt`, `updatedBy`, and `lastPr` in the page frontmatter every time. The `LastUpdated` header renders the timestamp and PR number (linked to GitHub) so anyone reading the page can see when it was last verified against the code. New section added to CLAUDE.md with the code-area-to-doc map. New Decisions Log entry codifies the rule.
- **Owner labels removed from chrome.** The `/hq` index cards no longer show "Owner: X" tags and per-page headers no longer display an owner line. Pages are seeded by Sara from platform memory and the live codebase. Surface ownership (the matrix of who's accountable for shipping web vs plugin vs Skill, etc.) still lives on `/hq/team` where it belongs.
- **User Journeys populated.** Full walkthroughs of the core flows on each surface (web sign-up to score to upgrade, Figma plugin first-run, Claude Skill flow, Pulse data flow, API key flow, MCP agent flow) with Mermaid diagrams for each.
- **Feature Inventory populated.** Every surface (web, plugin, Skill, Pulse, API + MCP, admin, HQ) now lists shipped, in-flight, and roadmap features with PR links where known. Pro-only and Teams-only features called out separately so the upgrade case is easy to articulate.
- **API Protocols filled.** Endpoint shape, request and response examples for `POST /v1/score`, full MCP server section (`ladder.score`, `ladder.framework`, `ladder.account` tools, config example, why it matters).
- **Roadmap populated.** Public-launch gate tracker, "This week" / "Next 30 days" / "This quarter" priorities, standing items (doc drift, prompt-leak check, versioning sync, decisions log review), weekly review cadence.

---

## app 0.5.0 / api 1.0.0 (2026-05-19)

**Ladder HQ: internal team hub at `/hq`.**

- **New `/hq` route.** Authenticated team-only knowledge base behind a new `TEAM_EMAILS` env tier. Sidebar nav, 11 sections (Platform Overview, Architecture, User Journeys, Roles, Feature Inventory, Team Assignments, API Protocols, Decisions Log, Glossary, Brand, Roadmap). Renders MDX with Mermaid diagrams.
- **TEAM_EMAILS auth tier.** New `getTeamEmailWithStatus()` helper in `src/lib/admin.ts` returns `anonymous` / `unauthorized` / `team` for clean server-component gating. Admins automatically pass. Set `TEAM_EMAILS` on Vercel with Chester and Sean's addresses so they can see `/hq` without inheriting `/admin` powers.
- **MDX rendering via `next-mdx-remote/rsc`.** Frontmatter parsed with `gray-matter` for typed access. Custom components (`Mermaid`) registered on the page. Bespoke prose styling under `.hq-prose` in globals.css matches Ladder dark theme.
- **Mermaid diagrams.** Client component with dark theme tokens (Ladder green border on nodes). First diagram is the platform architecture on `/hq/architecture` showing the five surfaces over the shared scoring engine, auth, and billing.
- **Seeded content.** Platform Overview, Architecture, Decisions Log (pricing, positioning, launch gating, ICP, Ladder Lift, engineering model, never-expose-prompts, level order 5→1, trademark), Team Assignments (full surface ownership matrix), Roles (capability matrix), Brand, Glossary. Stubs for User Journeys (Chester), Feature Inventory and Roadmap (Michael), API Protocols.
- **Nav.** `/hq` joins `/dashboard` and `/score` as an in-product surface so marketing nav hides.

---

## app 0.4.18 / api 1.0.0 — 2026-05-13

**Team pool meter: show the 25K cap prominently.**

- The pool meter on `/dashboard/team` was compacted in v0.4.17, but the limit number (25,000 default) ended up in muted text where it could be missed at a glance. Restructured the inline numbers so both used and cap render at the same weight, foreground color, semibold mono, tabular-nums. Reads "0 of 25,000 scores · this month" with both numerals equally legible.

---

## app 0.4.17 / api 1.0.0 — 2026-05-13

**Reviews: request flow, interactive pins, scoring integration.**

- **Designer-initiated review requests.** New `/dashboard/reviews/request` form lets a designer ask their manager for human eyes on a screen. Picks an optional Review to attach to. A "Request a review" CTA card sits on `/dashboard` for team-tier members.
- **Manager-side requests panel.** `/dashboard/team` now shows incoming review requests above Active reviews. Each card carries the requester avatar, screen thumbnail, current Ladder score, and a context note. Accept expands an in-row "Add to" picker (suggested Review highlighted) or "Start a new Review". Decline dismisses. Seeded with three sample requests for the mock.
- **Drop-a-pin interactivity.** On the frame workspace, click "+ Drop a pin", then click anywhere on the screen image. A dashed-outline pending pin appears with an inline comment input. Submit drops it as a real pin in local state, selected by default in the right rail.
- **Submit-a-Team-Take.** The "+ Submit your Team Take" button on the frame workspace now opens an inline form. Score (1.0–5.0) plus a one-line rationale. Submit adds your take to the list and updates the aggregate subscore.
- **Scoring assign-to-Review.** "+ Score a frame" on a review detail page and "+ Score next iteration" on the frame workspace now route to `/score?review=<slug>`. /score reads that param and surfaces a "Adding to [Review name]" banner above the upload zone so the user knows the next score lands inside that Review. Mock-grade — real persistence ships with the next pass.
- **Compact team pool meter.** The pool meter on `/dashboard/team` is now a one-line slim bar instead of a section card. Same data, tooltip-on-hover for the over/near-ceiling messaging. Frees up the vertical real estate for the manager workflow.

---

## app 0.4.16 / api 1.0.0 — 2026-05-13

**Move Active Reviews to the team dashboard.**

- Reviews is a manager workflow, so the entry-point card belongs on `/dashboard/team`, not the personal dashboard. Removed from `/dashboard`. Now renders on `/dashboard/team` directly under the team pool meter, gated on `isAdmin`. Non-admin team members will get their own "Reviews you're invited to" panel in a later pass.

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
