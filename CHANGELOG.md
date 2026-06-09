# Changelog — runladder.com + Ladder API

All user-visible changes to the runladder.com web app and the Ladder API are logged here. Surface-specific changelogs live with their surface (Skill, Figma plugin, etc.).

Version format: `<app>` covers the web app + dashboard. `<api>` covers the Ladder API contract exposed by `src/app/api/*`. Either can bump independently.

---

## app 0.5.11 / api 1.0.0 (2026-06-08)

**Design-rhythm heatmap: local-day buckets + friendlier tooltips.**

- `bucketActivity` now buckets scores by the viewer's **local** calendar day instead of UTC. UTC bucketing was a latent off-by-one for scores made near midnight or outside US timezones (it could collapse two days into one, or label a cell with the wrong day). Active Days, Sessions, and the heatmap all key off local days now.
- Heatmap tooltips show a friendly, timezone-safe date ("Jun 2, 2026") instead of the raw ISO string. The date is parsed from local parts so it never shifts a day under `toLocaleDateString`.
- No data change; existing scores re-bucket correctly. (The "Active Days = 1" report was a stale dashboard view — the underlying data was always 2 distinct days.)

---

## app 0.5.10 / api 1.0.0 (2026-06-08)

**Admin archive-not-delete, client usage, and score-detail/admin polish.**

- **Admin Clients archive, never delete (#295).** Removed the hard-Delete path entirely (button, confirm modal, DELETE call). Suspend → **Archive**, Reactivate → **Restore**, status shows **Archived**. Same reversible soft state; client data is never destroyed. (Pro/Free user lists have no removal actions, so "only archive" already holds.)
- **Pooled usage on the admin Clients list (#297).** New Usage column showing each org's monthly scans vs the team pool (orange at/over pool).
- **Score-detail polish.** Page widened to match Dashboard/Team (`max-w-6xl`); the screenshot is enlarged and no longer upscaled-blurry; `makeThumbnail` bumped to 1400px/q82 so new screenshots stay crisp. Methodology CTA reworded to **"Get Moderated Testing"** (#292).
- **Surface tag on every score (#299 follow-up).** Scores with no surface suffix now tag as **"Web"** instead of going untagged.
- **Admin tab "Evaluations" → "Heuristic Evaluations"** for clarity.
- **Claude page hero image** updated (`/claude-skill-hero.png`, alongside the Figma hero); old `images/claude-code-ladder-img.png` removed.
- `/hq` updated: Features (archive + usage rows), Decisions (client-data-archived-never-deleted).

---

## app 0.5.9 / api 1.0.0 (2026-06-08)

**Fully hide the Evaluations concept for launch (#302, follow-up).**

- The score screen no longer shows the "What kind of session is this?" prompt or the top-right session-type pill — every score is logged as a design session. This completes #302: the design-vs-evaluation "Evaluations" concept (prompt + pill on the score screen, member-detail Evaluations tab, team Reviews tab) is gone from the customer-facing app for launch, all behind the single `SHOW_EVALUATIONS_AND_REVIEWS` flag.
- The internal admin tool at `/admin/evaluations` (client evaluation reports) is a separate feature and is intentionally left intact.
- `/hq` updated: Features (#302 row expanded to cover the score-screen pieces).

---

## app 0.5.8 / api 1.0.0 (2026-06-08)

**Launch gating + Team Lead score visibility.**

- **Free tier loses design rhythm + heatmap (#289).** The design-rhythm card and activity heatmap on the personal dashboard are now paid-only (pro/team/pulse). Gate respects the dev "view as" override.
- **Surface tags on the designer detail page (#299).** Each score row now shows a surface tag (Figma / Claude / Web / Skill / Pulse), parsed from the score name. Extracted the parser into a shared `src/lib/surface.ts` (de-duplicated from the dashboard).
- **Evaluations + Reviews hidden for launch (#302).** The Evaluations tab (member detail) and the Reviews tab (team dashboard) are hidden behind a single restorable flag, `SHOW_EVALUATIONS_AND_REVIEWS` in `src/lib/feature-flags.ts`.
- **Team Lead can open a member's score detail (#300).** From the designer detail page, a Team Lead can click any of that member's scores and see the full score detail. The score-detail API (`/api/dashboard/scores/[id]`) accepts `?member=<userId>` and authorizes the cross-user read as `org:admin` + member-in-org (mirroring the member-detail endpoint); soft-deleted scores are included for audit. The detail page reframes the back link + badge for the Team Lead view.
- **Dev "view as" now drives the scan-screen toggle.** Selecting Free/Pro/Team in the dev switcher exercises the private-scoring toggle states without juggling accounts (UI preview only; saves still use the real server-side tier).
- `/hq` updated: GTM (Team Lead persona), API (member-scoped score detail), Features (4 rows), Roles (capability matrix).

---

## app 0.5.7 / api 1.0.0 (2026-06-08)

**Private scoring as a paid feature, scoring-engine versioning, and dashboard polish.**

- **Private / Internal scoring (#290 + #301).** The scan-screen public/private toggle is now tier-aware. Free accounts can't score privately — the toggle is disabled, locked to public, with an "Upgrade to keep your scores private" prompt. Pro/Team/Pulse default to **private**, and turning it off shows an inline warning that the score will be public. The label is tier-aware everywhere a non-public score appears (dashboard list, score detail, designer detail): single users (Free/Pro) see "Private," team-context users (Team/Pulse) see "Internal." Enforced client-side and server-side (`/api/score` + `/api/score/stream` force `isPublic` for free users so the gate can't be bypassed via the API). New shared helper `src/lib/score-scope.ts`.
- **Scoring-engine version (#309).** New `CURRENT_ENGINE_VERSION` constant (started at `1.2`) tracks the scoring algorithm independently of the app/API versions. Footer now reads "Scoring Engine v1.2 · App v0.5.7."
- **Team dashboard hover fix (#303).** On a member row, the Archive/Delete actions now fade in as the score stats + drill arrow fade out, so the actions no longer overlap the numbers.
- Versions 0.5.5 and 0.5.6 were skipped — they're reserved by the client-provisioning work (#200 / #217) that labeled ahead of the source of truth.
- `/hq` updated: Architecture (Versioning), Decisions Log (private-scoring entry + engine version), Glossary (Score visibility), Features (private-scoring row).

---

## app 0.5.4 / api 1.0.0 (2026-05-26)

**Auth + onboarding fixes ahead of the Ladder Team sale.**

- **Post-auth redirects.** `ClerkProvider` now sets `signInUrl`/`signUpUrl`, `signInFallbackRedirectUrl`/`signUpFallbackRedirectUrl`, and `afterSignOutUrl`, so any Clerk flow (not just the embedded login/signup pages) has a redirect target. The org-invitation redirect on Clerk's hosted portal is governed by the dashboard Home URL and is tracked separately (#181).
- **Password gate bypasses signed-in users.** `PasswordGate` lets any signed-in user through the `SITE_PASSWORD` wall, including invitees returning from Clerk's hosted portal with a session. This unblocks the Team onboarding flow; cold visitors still see the wall. The gate is dead code once `SITE_PASSWORD` is removed from Vercel (cleanup TODO added). New Decisions Log entry codifies the rationale.
- **OTP form background fix.** An over-broad `globals.css` selector (`[class*="bg"]`) was matching Clerk's hashed internal classes and painting a dark background behind the OTP digits. Scoped `.cl-form` transparent and excluded it from the catch-all rule.
- **Login UI cleanup.** Removed the dark background behind the identity-preview email field and removed the redundant Ladder logo above the auth form (the nav already shows it).
- **Onboarding env docs.** Added `.env.local.example` documenting every env var needed for local onboarding work.
- `/hq` updated: Decisions Log (gate bypass) and User Journeys (Team manager flow access note + invite-redirect known issue). PR #198.
- **Version-stamp correction (added in [#277](https://github.com/drawbackwards/runladder/pull/277)).** #198 added this entry but left `CURRENT_APP_VERSION` at 0.5.3, so the footer trailed the changelog by one release. The constant is now `0.5.4`, and `package.json` (orphaned at `0.3.0` since the 0.4.x cutover, never read at runtime) is back in lockstep with it. The source-of-truth + mirror convention is codified in [Decisions Log](/hq/decisions#versioning-source-of-truth) and [Architecture → Versioning](/hq/architecture).

---

## app 0.5.3 / api 1.0.0 (2026-05-19)

**Engineering model update + post-merge /hq verification protocol.**

- **Michael graduates to full-surface engineering scope.** Was previously web/plugin/Skill only; now can build on any surface (API, MCP, Pulse, admin included) with Ward's prior approval. Chester stays scoped to web/plugin/Skill where his design lens applies directly. `/hq/decisions` Engineering model entry updated, `/hq/team` matrix updated to show Michael as build support on every surface, project CLAUDE.md reflects the new model.
- **Post-merge `/hq` verification protocol.** New unbreakable rule: after ANY PR ships live in any of the four Ladder platform repos (`runladder`, `ai-design-assistant`, `ladder-beta`, `ladder`), Sara verifies `/hq` is current and prints a confirmation to Ward. Confirmation format includes pages updated, pages spot-checked, and a link to /hq. Silence after a deploy is not acceptable; "no updates needed, all current" must still be said explicitly. New Decisions Log entry codifies it. CLAUDE.md gains a dedicated section. New `feedback-hq-post-merge-verification` memory enforces it across future Sara sessions.

---

## app 0.5.2 / api 1.0.0 (2026-05-19)

**Ladder HQ: audit corrections, full platform roadmap, Go-to-Market strategy, Skill distribution plan, pricing scrub.**

**Pricing scrub.** Two issues caught by Ward late in PR review: (1) `/hq` was citing Pro at $250 in multiple places, but Pro went to $1,000/mo in v0.4.8 (PR #166) and that's live on Stripe today. All references corrected. (2) `/hq` is read by everyone in `TEAM_EMAILS` / `ADMIN_EMAILS`, including engineering audit and design roles who don't need to see internal sales numbers. Specific Team floor pricing, Pulse engagement ACVs, customer dollar values, and Ladder Lift price bands all removed from `/hq`. They stay in non-`/hq` memory. New Decisions Log entry codifies the rule: "/hq documents PUBLIC pricing only". The GTM page now talks revenue strategy qualitatively, not in specific dollar projections.



- **Audit corrections.** v0.5.0 and v0.5.1 invented things that didn't exist. This release tells the truth: `api.runladder.com` does not exist (DNS NXDOMAIN), MCP server does not exist, `/dashboard/settings` does not exist, the `POST /v1/score` shape was fiction. Every page now distinguishes Live (file/route/PR evidence) vs In flight (code partially exists) vs Roadmap (no code yet).
- **Codebase map** added to `/hq/architecture`. Three repos called out: `runladder` (this), `ladder-beta` (Pulse on Fly.io), `ladder` (original Rails). Pulse and Ladder stay in separate repos for now; consolidation is roadmap.
- **API Protocols rewritten** at `/hq/api`. Full table of every endpoint that actually exists in `src/app/api/`. Auth tiers documented honestly. Real `POST /api/score` shape pulled from the actual route file. Roadmap clearly separated from today.
- **User Journeys re-tagged** with Live / In flight / Roadmap on every flow. Pulse flow notes that Pulse runs in `ladder-beta`. Token issuance flows reference the real `/api/plugin/issue-token` and `/api/skill/token` routes, not the fictional `/dashboard/settings`.
- **Feature Inventory** every row now has an Evidence column. If a row claims Live, it points to a file path or PR. Otherwise it's In flight or Roadmap. Pulse and Original Ladder get their own sections so the repo split is clear.
- **Decisions Log** two new entries: (1) Every claim of "live" in /hq must point to a route, file, or PR (UNBREAKABLE rule). (2) Pulse and original Ladder stay in separate repos for now; consolidation is a future decision, not active.
- **Roadmap expanded** at `/hq/roadmap` with a full platform plan: public-launch gate tracker, This Week / Next 30 Days / This Quarter, **Skill distribution roadmap** (publish `marketplace.json`, submit to `anthropics/skills`, Teams enterprise deployment), **api.runladder.com roadmap** (6 phases: DNS + Phase 1 redirect, architecture decision, API key UI, MCP server, OpenAPI spec, public launch flip), Pulse consolidation triggers, hiring trigger triggers, standing items, weekly review cadence.
- **Go-to-Market strategy** new page at `/hq/gtm`. CRO-voice draft: north star, positioning recap, ICP, full funnel (awareness, activation, engagement, conversion, expansion, retention) with surface mapping, three-motion sales (PLG for Pro, sales-assisted for Lift, enterprise for Teams and Pulse), channel strategy (owned, earned, partner, paid), public-launch sequence by day, metrics dashboard, risks called out, open questions for Ward.

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
