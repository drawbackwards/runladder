# Contract-termination data lifecycle + de-identified learning store

Design for #398 (30-day Customer Content deletion / de-identification) and
#422 (structure scoring data for later insights). Per the 2026-07-30 decision
these are one system seen from two angles, so they are designed and built
together:

- **#422** defines the de-identified aggregate: what Ladder is allowed to keep
  forever and learn from.
- **#398** defines when the identified original must disappear, and uses the
  #422 extraction as its "de-identify" step (aggregate first, then delete).

Ward's call on the SOW question (recorded on #398): **de-identify works** as
the alternative to full deletion.

## 1. What counts as Customer Content (data inventory)

All customer data lives in Redis (Vercel KV) plus one Vercel Blob object.
Per member `userId` (current Clerk org members + the `team:{orgId}:archived`
set):

| Key | Contents |
| --- | --- |
| `user:{id}:scores` (zset) | Full score entries: screen names, findings text, summaries, style-guide results, base64 thumbnails |
| `user:{id}:lastscore:{screenKey}` | Last score per screen (uplift lookup) |
| `user:{id}:stats`, `user:{id}:lifetime_scans_used` | Aggregate stats/counters |
| `user:{id}:scans:{yyyy-mm}`(`:by-surface`), `user:{id}:cap_alert:*` | Usage counters (40d TTL, self-expire) |
| `usage:cost:{id}:{yyyy-mm}` | COGS counters |
| `score-annotations:{id}:{scoreId}`, `score-feedback:{scoreId}:{id}` | Human annotations + feedback |
| `user:{id}:skill` + `skill_token:{hash}`, `user:{id}:plugin` | Surface tokens/metadata |
| `leaderboard:global:avg` / `:scans` | zset members keyed by userId |

Per org:

| Key | Contents |
| --- | --- |
| `org:{orgId}:style-guide` (Redis) + Blob PDF (`publicMetadata.styleGuide.blobUrl`) | Uploaded writing style guide |
| `style:cache:{orgId}:{hash}` | Compliance cache (24h TTL, self-expires) |
| `org:{orgId}:pool_alert:*` | Alert dedupe flags (TTL) |
| `team:{orgId}:archived` | Archived-member userId set |

**Residual (flagged for legal review, not purged):** `score:cache:{hash}` is
the content-addressed score cache. It stores model-derived output (score,
findings, screen name) keyed by a SHA-256 of engine+model+prompt+image bytes.
There is no index from a client, org, or user to these keys; an entry is only
reachable by re-presenting the exact image. We treat it as de-identified by
construction, but it is listed here so legal review can confirm. A sweep of
old-engine keys on engine bumps is the eventual cleanup path (#343 note).

**Backups:** we run no backups of our own. Upstash/Vercel manage the KV
infrastructure backups; those are the "backups made in the ordinary course"
under SOW 7.4. Open item for Ward (only he has Upstash console access):
confirm the Upstash backup retention window and record it here.

## 2. The de-identified learning store (#422)

`src/lib/learning.ts`. A **one-way projection**: for each score we keep only
categorical/numeric facts, allowlisted field by field. Nothing free-text,
nothing visual, nothing identifying survives the projection, so
re-identification is prevented by construction rather than by masking.

Each `LearningRecord` keeps:

- `month` — coarse time bucket ("2026-07"); exact timestamps are dropped
- `industry` — from org `publicMetadata.industry`, else "unknown". Set from a
  dropdown (curated base list in `src/lib/industries.ts` + an add-only admin
  registry in `src/lib/industry-registry.ts`, Redis `industries:custom`),
  required at provisioning and editable on the admin Team Detail. No free
  text per org: additions go through "Add new industry" (slugified, deduped,
  admin-gated, no rename/delete). Slugs are stable forever (renaming one
  forks the aggregate). There is deliberately no "Other" bucket — records
  filed under a junk category could never be re-bucketed after the source
  data is purged; a missing industry is added instead.
- `surface` (web/figma/skill/…), `sessionType` (design/evaluation)
- `score`, `label` (rung), per-rung numeric breakdown
- per finding: `category`, `rung`, `uplift`, `targetLevel` (title/impact/fix
  text is DROPPED — model-written but derived from customer pixels)
- `uplift` vs the previous scan of the same screen (the improvement signal —
  the core purpose of Ladder is detecting improvement, so this is the single
  most valuable retained fact)
- `engine` version, record schema version `v`

Explicitly excluded: userId, orgId, emails, names, screen names, screenKeys,
frame IDs, thumbnails, summaries, finding text, style-guide anything, exact
timestamps.

Storage (retained indefinitely per SOW 6.4, independent of any deletion
clock):

- `learn:records:{yyyy-mm}` — list of record JSON, the flexible raw base for
  future analysis ("catalog it so Drawbackwards can analyze by topic")
- `learn:agg:{industry}:summary` — hash: count, sumScoreX10, upliftCount,
  upliftSumX10 (average score + average improvement per industry)
- `learn:agg:{industry}:findings` — hash: finding category → count (which
  problems each industry actually has)
- `learn:agg:{industry}:rungs` — hash: rung → sumX10/count (where each
  industry sits on the ladder)

Write paths:

1. **Live**: `persistScoreEntry` fire-and-forgets a capture for every new
   score. Industry is resolved from the user's Clerk org (cached in
   `learn:ctx:{userId}` for 24h so it costs ~zero Clerk calls).
2. **At termination**: the #398 purge replays a user's full score history
   through the same projection before deleting it, so historical scores
   aren't lost to the aggregate. Records carry the score entry's own month.
   Double-count guard: live-captured months are recorded in
   `learn:captured:{userId}` (a set of score ids, deleted with the user's
   other keys after the backfill skips them).

**k-anonymity caveat (for the legal-review acceptance criterion):** while
Ladder has a single client in an industry, "industry = X" effectively names
that client even though no identifier is stored. The stored data still cannot
be traced to any individual, and nothing in a record reveals which screens or
what content produced it. Legal review should confirm whether industry-level
labeling with one client per industry meets the SOW's "does not identify
Lumin" bar, or whether industry rollups must stay internal until N≥2 clients
share an industry (they are internal-only today; nothing renders them).

## 3. Termination lifecycle (#398)

New org status: **`terminated`** (`publicMetadata.status`), set by an admin
via a Danger-zone action on `/admin/clients/[orgId]` alongside
`terminatedAt`/`terminatedBy`. Distinct from `suspended` (pause, reversible,
no clock). `reactivate` clears either state, cancelling the clock.

Daily Vercel cron (`vercel.json` → `GET /api/cron/data-lifecycle`, gated by
`CRON_SECRET` Bearer): finds orgs with `status === "terminated"`,
`terminatedAt` ≥ 30 days ago, and no `purgedAt`, and runs the purge:

1. Enumerate member userIds: current Clerk memberships + the
   `team:{orgId}:archived` set, minus the provisioning service account.
2. Per user — **skip anyone who is also a member of a different, non-purged
   org** (their history isn't only this client's Customer Content; logged in
   the cron result for manual review):
   a. Read the full `user:{id}:scores` history, project every entry into the
      learning store (skipping already-live-captured ids).
   b. Delete all per-user keys from the inventory above (SCAN by prefix for
      the wildcard families), and `ZREM` them from both leaderboards.
3. Delete org keys: style-guide Redis entry, style-guide Blob PDF,
   `team:{orgId}:archived`, pool-alert flags, `style:cache:{orgId}:*`.
4. Stamp `purgedAt` on the org and drop the `styleGuide` metadata pointer.
   The org record itself (name + metadata) is kept as the audit trail that
   the purge happened; deleting the Clerk org afterwards is a manual admin
   choice.

**Org deletion cascades** (AC 2): the existing admin DELETE
`/api/admin/clients/[orgId]` now runs the same purge before
`deleteOrganization`, so hard-deleting an org can no longer strand its
members' content.

**Not in scope / deliberately manual:** deleting the members' Clerk user
accounts (a user account is not Customer Content per se, and deletion would
break sign-in mid-conversation with the client about offboarding). The purge
result lists the affected userIds so an admin can delete the accounts in
Clerk if the engagement terms require it.

## 4. Acceptance-criteria map

| #398 criterion | Where |
| --- | --- |
| Scheduled 30-day delete/de-identify | `vercel.json` cron → `/api/cron/data-lifecycle` |
| Org deletion cascades | purge wired into admin DELETE route |
| Aggregation pipeline, no re-identification path | `src/lib/learning.ts` allowlist projection (+ caveats above for review) |
| Aggregate retained independently | `learn:*` keys never touched by purge |
| Legal/privacy sign-off | **Human step.** This doc is the review artifact; see §1 residual, §2 k-anonymity, §3 backups open item |

| #422 criterion | Where |
| --- | --- |
| De-identified | allowlist projection, tested in `src/lib/learning.test.ts` |
| Categorized/cataloged for later analysis | monthly record lists + per-industry summary/findings/rungs rollups |
