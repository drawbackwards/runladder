# Deterministic Ladder Scoring — Engineering Plan

Status: approved to build (Chester, 2026-07-02). Not started. Tracks GitHub #343.
Owner: Chester + Sara (AI pair). Resume here after the holiday weekend.

## The goal (the contract)

For a given engine version, a given screen produces the same Ladder score every
time and on every surface. A score moves for exactly two reasons: the screen
changed, or we deliberately versioned the engine and announced it. Nothing else.
This is what makes the core product loop trustworthy: measure a screen, improve
it, remeasure to validate the improvement.

Precise wording of the promise: **same pixels, same score.** Not "a design
mockup and its shipped code score identically."

## Why "same pixels, same score" is the right contract

The engine scores an image. Every surface reduces to pixels before scoring:
Figma rasterizes a frame to an image, Web takes an uploaded image, URL takes a
screenshot of rendered code. So cross-surface consistency is just two things:
one deterministic engine, and surfaces that hand it the same pixels when the
source genuinely is the same artifact.

That is why only pairs can be compared, not the trio:

- Figma and Web: yes. Export the frame as a PNG, upload that PNG to Web.
  Identical pixels, identical score.
- Web and URL: yes. Screenshot the live page, upload that screenshot to Web.
  Identical pixels, identical score.
- All three: no. A Figma frame is a design. The URL is the built, live code.
  Different renderings of the same screen (real fonts, real data, responsive
  layout, engineering drift), so different pixels. Different scores there are
  correct, not a defect.

## What is broken today (grounded in the code)

1. The screen score is a number the model invents holistically. In
   `src/lib/scoring.ts` the model returns a JSON `score` field and the code uses
   it verbatim (`JSON.parse(...).score`). Holistic numbers are high variance.
   Per-rung scores are also model-emitted, and the prompt tells the model to do
   the weighted combination itself. Code does no math.
2. "Determinism" was never real. It was a cache with a 30-day TTL
   (`setCachedScore`, `redis.set(key, core, { ex: 60*60*24*30 })`) hiding the
   variance. It only matches byte-identical images, and it expires.
3. Three different engines, and the #377 determinism fix touched only one:
   - Web + Skill: `scoreImage` in `src/lib/scoring.ts`, model `claude-haiku-4-5`,
     temperature 0, 30-day cache.
   - Figma plugin: its own backend `ai-design-assistant/api/analyze.js`, builds
     its own prompt (`buildPrompt`), calls Anthropic directly via `fetch` with
     NO temperature field (so API default ~1.0) and NO score cache. Drifts on
     every scan and never matched Web. It fetches only the framework CONTENT
     from runladder (`/api/framework` via `_ladder.js`), not the scoring logic.
   - Pulse: separate repo `ladder-beta`, OpenAI, out of scope (see below).

## Design principles

- The model MEASURES. Code COMPUTES the score with a fixed formula. We already
  do exactly this for Pulse: `scoreFromSentiments` in
  `src/lib/ladder-framework.ts` maps per-rung values to a score via a weighted
  formula and a `RUNG_WEIGHTS` table. Screens never got that treatment.
- One engine, all surfaces.
- Pin the model version and the engine version. The engine version is the only
  thing that intentionally moves scores.
- Constrain the model's outputs to discrete, checkable judgments to minimize
  measurement variance.
- Any cache is a pure performance optimization that returns what the engine
  would compute. It is never the source of "sameness."
- The Ladder score and Style Guide compliance are separate features. Compliance
  NEVER affects the number. This invariant is now stated in
  `src/content/hq/architecture.mdx` (working-tree edit, not yet shipped).

## Locked decisions (Chester, 2026-07-02)

- No real customers use the tool yet, so a one-time score shift when we move to
  computed scoring is acceptable, as long as new scores are not wildly different
  from today's. Wildly different is a signal the formula needs tuning, not a
  blocker.
- Figma unification is critical and moves early. The client's designers work in
  Figma daily and most screens will be scored there. We cannot measure
  consistency while the plugin runs a different engine.
- Contract wording is "same pixels, same score."

## Out of scope: rebuilding Pulse

Ladder Pulse (in `ladder-beta`, on OpenAI) has been in use by the target client
for about a year. It is out of scope to rebuild it on Anthropic. The same client
will use Pulse and the new screen-scoring tool at the same time, so we stay aware
of it.

Plain-language framing for Ward when he asks: Pulse measures what customers SAY
about an experience (survey feedback). The new tool measures what a SCREEN IS
(its UX quality). Same Ladder, same five rungs, same style of math, but different
inputs, so for the same product a Pulse score and a screen score answer different
questions and will not necessarily match. That is expected. Pulse is already
consistent because it is math over survey answers. We leave it untouched and make
the screen score equally rock solid.

## The phased plan

### Phase 0. Consistency harness (no scoring changes)

Objective: make the problem measurable and give ourselves a regression gate. Its
absence is why the drift went unseen.

- New script, e.g. `scripts/score-consistency.mjs`:
  - Score a fixed set of fixture images (`public/screenshots/*`) N times each and
    report the score spread per image. Must run with the cache DISABLED, or it
    trivially passes on cache hits and measures nothing.
  - Valid-pair check: score a Figma-exported PNG through the plugin path and
    through the web path (same bytes), and a URL screenshot vs a web upload of
    that screenshot. Expect identical once the engine is unified.
  - Baseline vs current: snapshot today's scores to a JSON baseline, then compare
    later phases against it to catch "wildly different."
- Done when: the report exists, today's variance is quantified, baseline captured.

### Phase 1. Unify Figma onto runladder's engine

Objective: one engine, all surfaces. Kill the plugin's separate scorer. This
alone stops the plugin's default-temperature drift and makes comparisons valid.

- In `ai-design-assistant/api/analyze.js`, route "improve" mode (the Ladder
  score) to runladder's canonical scoring, the same way "copy" mode was routed in
  #362 Chunk 1 (see `forwardCopyAudit` and the copy-mode branch). Remove the local
  `buildPrompt` + direct Anthropic `fetch` for the score.
- runladder side: `src/app/api/plugin/analyze/route.ts` already calls
  `scoreImage`. Confirm/extend it as the canonical plugin score endpoint. Ensure
  the frame image (and any ground-truth data we choose to send) flows through it.
- Done when: plugin improve-mode score is computed by runladder, and the Phase 0
  pair check shows a Figma export and its web upload scoring identically.

### Phase 2. Model measures, code computes

Objective: the score becomes a deterministic function of measurements.

- Add `scoreFromScreen(measurements)` to `src/lib/ladder-framework.ts`, a sibling
  to `scoreFromSentiments`, with an explicit weighted formula.
- Simplest first cut: the model already returns per-rung scores. Ignore the
  model's `score` total and compute it deterministically from the rungs (reuse
  `RUNG_WEIGHTS` / the `scoreFromSentiments` shape). Tune weights so results are
  not wildly different from the Phase 0 baseline.
- In `src/lib/scoring.ts`, stop trusting the model's `score`; set
  `result.score = scoreFromScreen(result.rungs)`.
- Bump `CURRENT_ENGINE_VERSION` (deliberate, announced change) and add a CHANGELOG
  entry.
- Done when: total score is computed by code, and the baseline comparison is
  within an acceptable band.

### Phase 3. Constrain the measurements

Objective: squeeze residual variance out of the measurements themselves.

- Convert the seven evaluation dimensions (already concrete yes/no criteria in
  `EVALUATION_DIMENSIONS`) into explicit discrete answers (yes / partial / no, or
  a 0 to 2 ordinal). Map criteria to dimension scores to rung scores to the final
  score, all deterministically.
- Temperature 0 everywhere (now includes Figma via Phase 1).
- If the harness still shows wobble on borderline criteria, add a "best of three,
  take the majority" measurement pass. Note the cost and latency tradeoff before
  turning it on.
- Done when: the harness shows near-zero spread across repeats.

### Phase 4. Input parity for the valid pairs

Objective: make the same artifact produce the same pixels across a valid pair.

- Align capture and resize so a Figma export, a URL screenshot, and a web upload
  of the same artifact match. Reconcile `resizeForScoring` in
  `src/app/score/page.tsx` with the plugin's export settings and the URL
  screenshot path in `src/app/api/screenshot/route.ts`.
- Be explicit in docs and UI copy that design vs live code is outside this
  promise.
- Done when: the Phase 0 pair checks pass within tolerance.

### Phase 5. Cache becomes a pure speed optimization

Objective: remove the illusion, keep the performance.

- Remove the 30-day TTL in `setCachedScore`. With a deterministic engine the
  cache returns exactly what would be recomputed, so it is memoization, not
  truth. Keep the engine version in the key so a version bump invalidates cleanly.
- Verify the prod KV binding actually hits. `getCachedScore` swallows errors and
  returns null, so a misconfigured binding silently misses and re-scores. This is
  a real risk given the KV migration history.
- Done when: no TTL, cache documented as perf-only, prod hit-rate confirmed.

## Open questions to resolve during execution

- The exact weight table for `scoreFromScreen`. Start from `RUNG_WEIGHTS` and tune
  against the Phase 0 baseline so scores are coherent with today's.
- Whether best-of-three (Phase 3) is needed. Decide from harness data, not upfront.
- The canonical plugin score endpoint shape (extend `/api/plugin/analyze` vs a new
  route), and what, if anything, beyond the raster image we send from Figma.

## Key file map

- `src/lib/scoring.ts` — screen scoring pipeline, cache, model call.
- `src/lib/ladder-framework.ts` — rubric, dimensions, `RUNG_WEIGHTS`,
  `scoreFromSentiments` (the deterministic pattern to reuse).
- `src/lib/app-version.ts` — `CURRENT_ENGINE_VERSION`.
- `src/app/api/score/route.ts`, `src/app/api/score/stream/route.ts` — web.
- `src/app/api/skill/score/route.ts` — Skill (already on the shared engine).
- `src/app/api/plugin/analyze/route.ts` — runladder plugin endpoint (calls
  `scoreImage`).
- `src/app/api/screenshot/route.ts` — URL capture + DOM text.
- `ai-design-assistant/api/analyze.js` — the plugin's separate scorer to retire.
- `ai-design-assistant/api/_ladder.js` — plugin's framework fetcher.

## Working-tree state at handoff

- `src/content/hq/architecture.mdx` has an uncommitted edit stating the
  score-vs-style-guide separation invariant, plus an `updatedAt` bump. Per the
  no-auto-commit workflow it is left uncommitted, to ship when work resumes.
- The separate Style Guide bug (the incoherent "Next ship date to Quantity"
  finding) is NOT part of this plan. It is a separate compliance-pass bug to
  triage on its own.
