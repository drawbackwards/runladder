import {
  redis,
  lifetimeScansKey,
  monthlyScansKey,
  surfaceScansKey,
  currentYearMonth,
} from "@/lib/redis";
import { surfaceFromSource } from "@/lib/surface";
import { maybeAlertCapCrossed, maybeAlertPoolCrossed, ANY_TIER_CAP_THRESHOLD } from "@/lib/usage";
import { captureLearningForScore } from "@/lib/learning";

/**
 * Single source of truth for persisting a Ladder score to a user's
 * runladder.com history. Used by every surface — web (/api/score),
 * Skill (/api/skill/score), and Figma plugin (/api/plugin/persist-score)
 * — so dashboard rows look the same regardless of where the score came
 * from, and per-user stats stay consistent.
 *
 * Side effects per call:
 *   - user:{userId}:scores         zset add (timestamp -> JSON entry)
 *   - user:{userId}:lifetime_scans_used  incr
 *   - user:{userId}:lastscore:{screenKey}  set (last-score lookup for uplift)
 *   - user:{userId}:stats           hash update (totalScans, sumScores, bestScore, lastScoreAt)
 *   - leaderboard:global:avg / :scans  zadd (powers future leaderboard surfaces)
 */

/**
 * Session bucketing — captures user intent at score time.
 *
 *   "design"     — they're working on their own design (Figma plugin
 *                  scores auto-tag as this; web/Skill prompt the user).
 *                  Counts toward designer performance metrics.
 *   "evaluation" — they're scoring someone else's UI for audit / research
 *                  / comparison. Tracked separately from performance.
 */
export type SessionType = "design" | "evaluation";

export type ScoreEntryInput = {
  id: string;
  score: number;
  label: string;
  screenName?: string;
  summary?: string;
  next?: string;
  findings?: unknown[];
  rungs?: unknown;
  /**
   * Advisory team style-guide outcome (StyleGuideResult: status + findings).
   * Stored so the dashboard score detail can re-render it. Never affects the score.
   */
  styleGuide?: unknown;
  /**
   * Advisory Design System Compliance outcome (#400), computed in the Figma
   * plugin sandbox from the libraries enabled in the scored file. Stored so
   * the dashboard score detail can re-render it. Never affects the score.
   */
  designSystem?: unknown;
  source: string;
  /**
   * Stable frame/node ID from the origin surface (Figma), when available. Used
   * ONLY for the screen-match key so same-named-but-distinct frames don't
   * collide (#416). Never rendered. Absent for web/Skill.
   */
  frameId?: string | null;
  thumbnail?: string;
  isPublic?: boolean;
  timestamp: number;
  /** Optional at write-time; defaults to "design" if omitted. */
  sessionType?: SessionType;
};

export type StoredScoreEntry = Omit<ScoreEntryInput, "sessionType"> & {
  /** Always present on stored entries (the persist step fills in the default). */
  sessionType: SessionType;
  /** Canonical identifier for "the same screen, scored across time". */
  screenKey: string;
  /** Score from the most recent prior scan of the same screen, or null if first time. */
  previousScore: number | null;
  /** entry.score - previousScore, rounded to 1 decimal. Null on first scan. */
  uplift: number | null;
};

export type UserStats = {
  totalScans: number;
  avgScore: number | null;
  bestScore: number | null;
  lastScoreAt: number | null;
};

const SCORE_HISTORY_KEY = (userId: string) => `user:${userId}:scores`;
const LASTSCORE_KEY = (userId: string, screenKey: string) =>
  `user:${userId}:lastscore:${screenKey}`;
/** Set of screenKeys this user has scored under one source (#430) — powers
 * the lineage tiebreak. Grows by one member per distinct screen name, so it
 * stays tiny; deleted with the user's other keys on a termination purge. */
const LINEAGES_KEY = (userId: string, srcSlug: string) =>
  `user:${userId}:screens:${srcSlug}`;
const STATS_KEY = (userId: string) => `user:${userId}:stats`;
const LEADERBOARD_AVG = "leaderboard:global:avg";
const LEADERBOARD_SCANS = "leaderboard:global:scans";

/**
 * Canonical "this is the same screen across scans" key.
 *
 * We prefix with source so a Figma frame named "Login" and a web URL
 * "/login" track separately even if their normalized names collide —
 * different journeys, different deltas.
 */
export function screenKeyFor(
  source: string,
  screenName: string | undefined,
  frameId?: string | null,
): string {
  const src = (source || "unknown").toLowerCase().trim();
  // When a stable frame/node ID is available (Figma), key on it instead of the
  // name — designers often leave multiple distinct frames with the SAME name
  // (e.g. two states of one screen), and a name-only key would treat them as
  // re-scores of one screen and invent a bogus uplift (#416). The frame ID is
  // stable across edits, so re-scoring the same (edited) frame still compares
  // to its own prior score.
  const fid = (frameId || "").trim();
  if (fid) {
    return `${src}::id:${fid.replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 120)}`;
  }
  // No frame ID (web URLs, Skill, older plugin builds): fall back to the
  // normalized name. Strip the "(Figma)" / "(Skill)" surface suffix if a caller
  // already added one, since the source prefix already encodes that.
  const cleaned = (screenName || "untitled")
    .replace(/\s*\((figma|skill|web|claude|pulse)\)\s*$/i, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.\-_/:]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return `${src}::${cleaned || "untitled"}`;
}

/**
 * Persist a single score entry. Returns the enriched entry that ended up
 * in the user's history (with uplift + previousScore filled in).
 */
export async function persistScoreEntry(
  userId: string,
  input: ScoreEntryInput,
): Promise<StoredScoreEntry> {
  let screenKey = screenKeyFor(input.source, input.screenName, input.frameId);
  const hasFrameId = !!(input.frameId || "").trim();
  const srcSlug = (input.source || "unknown").toLowerCase().trim();

  // Look up the previous score for the same screen (if any) before writing.
  let prev = await redis.get<{ score: number; ts: number; id: string }>(
    LASTSCORE_KEY(userId, screenKey),
  );

  // Lineage tiebreak (#430). Without a stable frame ID, the key's name half
  // is MODEL-authored — a scan that phrases the screen name differently
  // would fork a parallel lineage and break the uplift chain. If this key is
  // new but this user has exactly ONE existing lineage under the same source
  // (for uploads, the filename), continue that lineage instead of forking.
  // Generic sources with several lineages keep today's behavior — never
  // guess between candidates. Best-effort: any Redis hiccup falls through to
  // the computed key.
  if (!prev && !hasFrameId) {
    try {
      const lineages = await redis.smembers(LINEAGES_KEY(userId, srcSlug));
      const candidates = [...new Set((lineages ?? []).map(String))].filter(
        (k) => k !== screenKey,
      );
      if (candidates.length === 1) {
        screenKey = candidates[0];
        prev = await redis.get<{ score: number; ts: number; id: string }>(
          LASTSCORE_KEY(userId, screenKey),
        );
      }
    } catch {
      // fall through to the computed key
    }
  }
  const previousScore =
    prev && typeof prev.score === "number" ? prev.score : null;
  const uplift =
    previousScore !== null
      ? Math.round((input.score - previousScore) * 10) / 10
      : null;

  const entry: StoredScoreEntry = {
    ...input,
    sessionType: input.sessionType ?? "design",
    screenKey,
    previousScore,
    uplift,
  };

  // Aggregate stats. We update via HINCRBY/HSET so concurrent scores don't
  // clobber each other. avgScore is derived (sumScores / totalScans).
  //
  // The monthlyScansKey counter is set with a ~40-day TTL — enough that
  // querying "this month's usage" mid-month always hits a live key, and
  // a buffer past month-end so a late-arriving query during the next
  // month's first day still finds the prior month for trend graphs.
  //
  // The monthly increment is awaited standalone so we can capture the
  // post-increment count and drive the soft-cap-crossed alert from it.
  // One extra Redis round-trip is fine; the cap-alert path needs the
  // value and the rest of the writes don't.
  const yyyymm = currentYearMonth(new Date(entry.timestamp));
  const monthlyKey = monthlyScansKey(userId, yyyymm);
  const newMonthlyCount = await redis.incr(monthlyKey);

  // Per-surface breakdown counter (#401) — a sibling HASH to the pool meter,
  // NOT a replacement. The combined `monthlyKey` above is still the single
  // source for the 25K cap; this only records which surface each score came
  // from so a rollup can answer "web vs Figma vs Skill" without scanning the
  // raw history. Same 40-day TTL so it lives exactly as long as the meter.
  const surfaceKey = surfaceScansKey(userId, yyyymm);

  const ops: Promise<unknown>[] = [
    redis.zadd(SCORE_HISTORY_KEY(userId), {
      score: entry.timestamp,
      member: JSON.stringify(entry),
    }),
    redis.incr(lifetimeScansKey(userId)),
    // Forty-day TTL: month length (max 31) + 9-day buffer for late reads.
    redis.expire(monthlyKey, 60 * 60 * 24 * 40),
    redis.hincrby(surfaceKey, surfaceFromSource(entry.source), 1),
    redis.expire(surfaceKey, 60 * 60 * 24 * 40),
    redis.set(LASTSCORE_KEY(userId, screenKey), {
      score: entry.score,
      ts: entry.timestamp,
      id: entry.id,
    }),
    // Register this lineage for the #430 tiebreak (frameId sources have a
    // stable identity already and don't need it).
    ...(hasFrameId
      ? []
      : [redis.sadd(LINEAGES_KEY(userId, srcSlug), screenKey)]),
    redis.hincrby(STATS_KEY(userId), "totalScans", 1),
    // Multiply by 10 + integer-store so we can recover via integer math without floats.
    redis.hincrby(STATS_KEY(userId), "sumScoresX10", Math.round(entry.score * 10)),
    redis.hset(STATS_KEY(userId), { lastScoreAt: entry.timestamp }),
  ];
  await Promise.all(ops);

  // Soft-cap crossing alert. Cheap integer compare against the lowest
  // paid cap (Pro) gatekeeps this — only run the alert pipeline when
  // there's a chance the user has actually crossed. Fire-and-forget so
  // a slow email send never blocks the score response.
  if (newMonthlyCount > ANY_TIER_CAP_THRESHOLD) {
    maybeAlertCapCrossed(userId, newMonthlyCount).catch((err) => {
      console.error("[LADDER:CAP-ALERT] background failure:", err);
    });
  }

  // Workspace pool-crossing alert (#402). Fire-and-forget; self-gates to the
  // team tier, so non-team scores cost only one cheap subscription read. Not
  // gated on the individual's count — the pool can cross while any one member
  // is low.
  maybeAlertPoolCrossed(userId).catch((err) => {
    console.error("[LADDER:POOL-ALERT] background failure:", err);
  });

  // De-identified learning capture (#422). Fire-and-forget — the projection
  // keeps categorical/numeric facts only (see src/lib/learning.ts) and must
  // never block or fail a score persist.
  captureLearningForScore(userId, entry).catch((err) => {
    console.error("[LADDER:LEARNING] background failure:", err);
  });

  // Update bestScore only if the new score beats the current best.
  const currentBestRaw = await redis.hget<number | string>(
    STATS_KEY(userId),
    "bestScore",
  );
  const currentBest =
    typeof currentBestRaw === "number"
      ? currentBestRaw
      : parseFloat(String(currentBestRaw ?? "0"));
  if (!Number.isFinite(currentBest) || entry.score > currentBest) {
    await redis.hset(STATS_KEY(userId), { bestScore: entry.score });
  }

  // Materialize the leaderboard zsets for fast read later. Best-effort.
  try {
    const stats = await getUserStats(userId);
    if (stats.avgScore !== null) {
      await redis.zadd(LEADERBOARD_AVG, {
        score: stats.avgScore,
        member: userId,
      });
    }
    await redis.zadd(LEADERBOARD_SCANS, {
      score: stats.totalScans,
      member: userId,
    });
  } catch {
    // never fail a persist over leaderboard maintenance
  }

  return entry;
}

/** Read the user's aggregate stats for dashboard display. */
export async function getUserStats(userId: string): Promise<UserStats> {
  const hash = await redis.hgetall<Record<string, string | number>>(
    STATS_KEY(userId),
  );
  if (!hash) {
    return {
      totalScans: 0,
      avgScore: null,
      bestScore: null,
      lastScoreAt: null,
    };
  }
  const totalScans = toInt(hash.totalScans) ?? 0;
  const sumScoresX10 = toInt(hash.sumScoresX10) ?? 0;
  const bestScore = toNum(hash.bestScore);
  const lastScoreAt = toInt(hash.lastScoreAt);
  const avgScore =
    totalScans > 0
      ? Math.round((sumScoresX10 / totalScans) * 10) / 100 // /10 to undo, then 1-decimal
      : null;
  return {
    totalScans,
    avgScore,
    bestScore,
    lastScoreAt,
  };
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}
