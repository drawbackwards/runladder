import { clerkClient } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { surfaceFromSource } from "@/lib/surface";
import { isInternalOrg, isMultiIndustryOrg, orgMeta } from "@/lib/orgs";
import { isValidIndustry } from "@/lib/industry-registry";
import { getUserTier } from "@/lib/tier";
import { CURRENT_ENGINE_VERSION } from "@/lib/app-version";
import type { StoredScoreEntry } from "@/lib/scores";

/**
 * De-identified learning store (#422) — the aggregate Ladder is allowed to
 * keep indefinitely and learn from (SOW 6.4), and the "de-identify" target
 * the #398 termination purge projects Customer Content into before deleting
 * it. Design: docs/data-lifecycle-and-learning.md.
 *
 * A record is a ONE-WAY projection of a score: categorical/numeric facts
 * only, copied field-by-field off an allowlist. No userId, orgId, screen
 * name, screenKey, frame ID, thumbnail, summary, finding text, or exact
 * timestamp survives, so re-identification is prevented by construction.
 *
 * Key schema (never touched by the #398 purge):
 *   learn:records:{yyyy-mm}        list of LearningRecord JSON (raw base)
 *   learn:agg:{industry}:summary   hash: count, sumScoreX10, upliftCount, upliftSumX10
 *   learn:agg:{industry}:findings  hash: finding category -> count
 *   learn:agg:{industry}:rungs     hash: {rung}:sumX10, {rung}:count
 *   learn:industries               set of industries seen (rollup enumeration)
 *   learn:captured:{userId}        set of score ids already captured live, so
 *                                  the termination backfill doesn't double-count
 *                                  (deleted with the user's keys after backfill)
 *   learn:ctx:{userId}             cached industry lookup, 24h TTL
 */

export type LearningFinding = {
  category: string;
  rung: string | null;
  uplift: number | null;
  targetLevel: string | null;
};

export type LearningRecord = {
  /** Record schema version. */
  v: 1;
  /** Coarse time bucket ("2026-07") — exact timestamps are dropped. */
  month: string;
  /** Org industry (normalized lowercase) or "unknown". */
  industry: string;
  surface: string;
  sessionType: "design" | "evaluation";
  score: number;
  label: string;
  /** Per-rung numeric scores when the entry has them. */
  rungs: Record<string, number> | null;
  findings: LearningFinding[];
  /** Delta vs the previous scan of the same screen — the improvement signal. */
  uplift: number | null;
  engine: string;
};

const RECORDS_KEY = (yyyymm: string) => `learn:records:${yyyymm}`;
const AGG_SUMMARY_KEY = (industry: string) => `learn:agg:${industry}:summary`;
const AGG_FINDINGS_KEY = (industry: string) => `learn:agg:${industry}:findings`;
const AGG_RUNGS_KEY = (industry: string) => `learn:agg:${industry}:rungs`;
const INDUSTRIES_KEY = "learn:industries";
const CAPTURED_KEY = (userId: string) => `learn:captured:${userId}`;
const CTX_KEY = (userId: string) => `learn:ctx:${userId}`;
const MODE_KEY = (userId: string) => `learn:mode:${userId}`;

export function normalizeIndustry(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return s.replace(/[^a-z0-9 &/-]+/g, "").slice(0, 60) || "unknown";
}

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Project a stored score entry into a de-identified learning record.
 * Pure + allowlist-only: every field the record carries is named here
 * explicitly; unknown fields on the entry can never leak through.
 */
export function learningRecordFromScore(
  entry: StoredScoreEntry,
  industry: string,
): LearningRecord {
  const ts = new Date(entry.timestamp);
  const month = `${ts.getUTCFullYear()}-${String(ts.getUTCMonth() + 1).padStart(2, "0")}`;

  const findings: LearningFinding[] = Array.isArray(entry.findings)
    ? entry.findings.flatMap((f) => {
        if (!f || typeof f !== "object") return [];
        const o = f as Record<string, unknown>;
        const category = toStr(o.category);
        if (!category) return [];
        return [
          {
            category: category.toLowerCase(),
            rung: toStr(o.rung)?.toLowerCase() ?? null,
            uplift: toNum(o.uplift),
            targetLevel: toStr(o.targetLevel)?.toLowerCase() ?? null,
          },
        ];
      })
    : [];

  let rungs: Record<string, number> | null = null;
  if (entry.rungs && typeof entry.rungs === "object") {
    for (const [rung, val] of Object.entries(
      entry.rungs as Record<string, unknown>,
    )) {
      const score =
        toNum(val) ??
        toNum((val as Record<string, unknown> | null)?.score ?? null);
      if (score !== null) {
        rungs ??= {};
        rungs[rung.toLowerCase()] = score;
      }
    }
  }

  return {
    v: 1,
    month,
    industry: normalizeIndustry(industry),
    surface: surfaceFromSource(entry.source),
    sessionType: entry.sessionType === "evaluation" ? "evaluation" : "design",
    score: entry.score,
    label: (entry.label || "").toLowerCase(),
    rungs,
    findings,
    uplift: toNum(entry.uplift),
    engine: CURRENT_ENGINE_VERSION,
  };
}

/** Append a record to the raw monthly list + the per-industry rollups. */
export async function recordLearning(record: LearningRecord): Promise<void> {
  const { industry } = record;
  const ops: Promise<unknown>[] = [
    redis.rpush(RECORDS_KEY(record.month), JSON.stringify(record)),
    redis.sadd(INDUSTRIES_KEY, industry),
    redis.hincrby(AGG_SUMMARY_KEY(industry), "count", 1),
    redis.hincrby(
      AGG_SUMMARY_KEY(industry),
      "sumScoreX10",
      Math.round(record.score * 10),
    ),
  ];
  if (record.uplift !== null) {
    ops.push(
      redis.hincrby(AGG_SUMMARY_KEY(industry), "upliftCount", 1),
      redis.hincrby(
        AGG_SUMMARY_KEY(industry),
        "upliftSumX10",
        Math.round(record.uplift * 10),
      ),
    );
  }
  for (const f of record.findings) {
    ops.push(redis.hincrby(AGG_FINDINGS_KEY(industry), f.category, 1));
  }
  if (record.rungs) {
    for (const [rung, score] of Object.entries(record.rungs)) {
      ops.push(
        redis.hincrby(AGG_RUNGS_KEY(industry), `${rung}:sumX10`, Math.round(score * 10)),
        redis.hincrby(AGG_RUNGS_KEY(industry), `${rung}:count`, 1),
      );
    }
  }
  await Promise.all(ops);
}

/**
 * Resolve the industry to attribute a user's scores to:
 *   - "internal" for Drawbackwards (internal-org) members — dogfood data is
 *     captured but stays separable from real client data in the aggregate
 *   - the `industry` field on their client org's publicMetadata
 *   - "unknown" for individuals with no org
 * Cached for 24h so the per-score capture path costs ~zero Clerk calls.
 */
export async function industryForUser(userId: string): Promise<string> {
  try {
    const cached = await redis.get<{ industry: string }>(CTX_KEY(userId));
    if (cached?.industry) return cached.industry;
  } catch {
    // cache is best-effort
  }
  let industry = "unknown";
  try {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
      limit: 10,
    });
    for (const m of memberships.data) {
      if (isInternalOrg(m.organization)) {
        industry = "internal";
        break;
      }
      const found = orgMeta(m.organization).industry;
      if (found) {
        industry = normalizeIndustry(found);
        break;
      }
    }
  } catch {
    // Clerk hiccup — record as unknown rather than dropping the capture
  }
  try {
    await redis.set(CTX_KEY(userId), { industry }, { ex: 60 * 60 * 24 });
  } catch {
    // cache is best-effort
  }
  return industry;
}

/**
 * Whether a user's account tags industry per score (#429) rather than
 * inheriting one fixed org industry. True for agencies/consultancies
 * (industryMode "multiple"), the internal Drawbackwards org, and individual
 * paid (Pro) accounts with no org (freelancers work across industries). Cached
 * 24h under MODE_KEY, busted alongside CTX_KEY when the account changes.
 */
export async function isMultiIndustryUser(userId: string): Promise<boolean> {
  try {
    const cached = await redis.get<{ multi: boolean }>(MODE_KEY(userId));
    if (cached && typeof cached.multi === "boolean") return cached.multi;
  } catch {
    // cache is best-effort
  }
  let multi = false;
  try {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
      limit: 10,
    });
    if (memberships.data.length === 0) {
      // No org: individual. Paid (Pro) individuals are treated as agencies.
      multi = (await getUserTier(userId)) === "pro";
    } else {
      for (const m of memberships.data) {
        if (isMultiIndustryOrg(m.organization)) {
          multi = true;
          break;
        }
      }
    }
  } catch {
    // Clerk hiccup — default to single-industry (safe: keeps today's behavior)
    multi = false;
  }
  try {
    await redis.set(MODE_KEY(userId), { multi }, { ex: 60 * 60 * 24 });
  } catch {
    // cache is best-effort
  }
  return multi;
}

/**
 * Live capture for a just-persisted score. Fire-and-forget from
 * persistScoreEntry — must never throw into the scoring path. Also called from
 * the tag endpoint when a score is tagged. Idempotent: a score contributes to
 * the aggregate exactly once, so calling it twice (score time then tag time) is
 * safe. Marks the score id captured so a later termination backfill skips it.
 *
 * Industry resolution (#429):
 *   1. the score's own tag, when set (multi-industry accounts) — validated;
 *   2. else, for a multi-industry account, DEFER — do not stamp a placeholder,
 *      since records are immutable and could never be re-bucketed once tagged;
 *   3. else the org-level industry (single-industry accounts, unchanged).
 */
export async function captureLearningForScore(
  userId: string,
  entry: StoredScoreEntry,
): Promise<void> {
  try {
    if (await redis.sismember(CAPTURED_KEY(userId), entry.id)) return;
  } catch {
    // best-effort dedupe; fall through rather than drop the capture
  }

  let industry: string;
  if (entry.industry && (await isValidIndustry(entry.industry))) {
    industry = entry.industry;
  } else if (await isMultiIndustryUser(userId)) {
    return; // defer until the score is tagged (see rule 2 above)
  } else {
    industry = await industryForUser(userId);
  }

  await recordLearning(learningRecordFromScore(entry, industry));
  await redis.sadd(CAPTURED_KEY(userId), entry.id);
}

/**
 * Termination-time backfill (#398 step 2a): replay a user's full score
 * history through the projection, skipping live-captured ids. Returns how
 * many records were written. The caller deletes learn:captured:{userId}
 * along with the user's other keys afterwards.
 */
export async function backfillLearningForUser(
  userId: string,
  entries: StoredScoreEntry[],
  industry: string,
): Promise<number> {
  let captured: Set<string>;
  try {
    const ids = await redis.smembers(CAPTURED_KEY(userId));
    captured = new Set((ids ?? []).map(String));
  } catch {
    captured = new Set();
  }
  let written = 0;
  for (const entry of entries) {
    if (entry.id && captured.has(entry.id)) continue;
    // Prefer the score's own industry tag when present (#429); fall back to the
    // org-level industry the caller resolved (which is "unknown" for a
    // multi-industry account, the correct bucket for anything still untagged).
    await recordLearning(
      learningRecordFromScore(entry, entry.industry || industry),
    );
    written++;
  }
  return written;
}
