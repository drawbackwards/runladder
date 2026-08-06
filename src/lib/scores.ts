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
import { uploadScoreThumbnail } from "@/lib/thumbnail";

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
  /**
   * Transport-only screenshot thumbnail as a `data:image/...;base64,...` URL.
   * NEVER stored inline in the history zset (#442): `persistScoreEntry`
   * offloads it to Vercel Blob and records only a pointer key + `hasThumbnail`
   * on the stored entry. Kept on the *input* because that's what every writer
   * already produces via `makeThumbnail`.
   */
  thumbnail?: string;
  isPublic?: boolean;
  timestamp: number;
  /** Optional at write-time; defaults to "design" if omitted. */
  sessionType?: SessionType;
};

export type StoredScoreEntry = Omit<ScoreEntryInput, "sessionType" | "thumbnail"> & {
  /** Always present on stored entries (the persist step fills in the default). */
  sessionType: SessionType;
  /**
   * True when this score has an externalized thumbnail in Vercel Blob, resolved
   * via the `user:{id}:thumb:{scoreId}` pointer key and served through
   * `/api/dashboard/scores/[id]/thumbnail` (#442). The bytes are NOT in this
   * entry. Absent/false means no screenshot was captured.
   */
  hasThumbnail?: boolean;
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

/** Build the auth-gated proxy URL for a score's externalized thumbnail (#442).
 * Pass `memberId` when a Team Lead is viewing a member's score so the proxy
 * authorizes the same `?member=` way the score-detail route does. */
export function scoreThumbnailUrl(
  scoreId: string,
  memberId?: string | null,
): string {
  const base = `/api/dashboard/scores/${scoreId}/thumbnail`;
  return memberId ? `${base}?member=${encodeURIComponent(memberId)}` : base;
}

/**
 * Normalize a parsed history entry's `thumbnail` field for a client reader.
 * Migrated entries (#442) carry `hasThumbnail` and no inline bytes → we hand
 * back the proxy URL. Legacy entries still carrying an inline `data:` URL are
 * returned untouched (the read-through until the backfill runs). No-thumbnail
 * entries are unchanged. `<img src>` works with either an URL or a data URL.
 */
export function withThumbnailUrl<
  T extends { id?: string; hasThumbnail?: boolean; thumbnail?: string },
>(entry: T, memberId?: string | null): T {
  if (entry.hasThumbnail && entry.id) {
    return { ...entry, thumbnail: scoreThumbnailUrl(entry.id, memberId) };
  }
  return entry;
}

const SCORE_HISTORY_KEY = (userId: string) => `user:${userId}:scores`;
/** Pointer key: score id -> Vercel Blob URL of its externalized thumbnail
 * (#442). Tiny string, no TTL (scores are permanent, #343). Lives under the
 * `user:{id}:*` namespace so the termination purge sweeps it with everything
 * else; the purge additionally deletes the referenced blob. */
export const SCORE_THUMB_KEY = (userId: string, scoreId: string) =>
  `user:${userId}:thumb:${scoreId}`;
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
 * True when two screenKeys' name halves plausibly describe the SAME screen
 * with different phrasing (#430 follow-up). The lineage tiebreak must catch
 * naming wobble ("hyper-shipment-tracking-detail" vs "hyper-shipment-detail")
 * WITHOUT merging a genuinely different screen a lazy designer exported
 * under a reused filename ("settings-page"). Rule: token-set Jaccard ≥ 0.5.
 */
export function screenNamesSimilar(keyA: string, keyB: string): boolean {
  const tokens = (key: string): Set<string> => {
    const name = key.includes("::") ? key.slice(key.indexOf("::") + 2) : key;
    return new Set(name.split("-").filter(Boolean));
  };
  const a = tokens(keyA);
  const b = tokens(keyB);
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  const union = a.size + b.size - shared;
  return shared / union >= 0.5;
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
  // (for uploads, the filename) AND its name plausibly describes the same
  // screen (screenNamesSimilar — so a different screen exported under a
  // reused filename starts its own lineage instead of merging), continue
  // that lineage. Several candidates: never guess. Best-effort: any Redis
  // hiccup falls through to the computed key.
  if (!prev && !hasFrameId) {
    try {
      const lineages = await redis.smembers(LINEAGES_KEY(userId, srcSlug));
      const candidates = [...new Set((lineages ?? []).map(String))].filter(
        (k) => k !== screenKey && screenNamesSimilar(k, screenKey),
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

  // Externalize the screenshot thumbnail (#442). Writers hand us a data URL;
  // we offload the bytes to Vercel Blob and store only a pointer key + a
  // boolean on the entry, so the history zset never carries image weight. The
  // upload must finish before the zadd (its success decides `hasThumbnail`),
  // but the pointer-key write folds into the batch below. Best-effort: a
  // failed upload degrades to "no thumbnail" and never blocks the score.
  const { thumbnail: inlineThumbnail, ...inputSansThumb } = input;
  const thumbBlobUrl = inlineThumbnail
    ? await uploadScoreThumbnail(userId, input.id, inlineThumbnail)
    : null;

  const entry: StoredScoreEntry = {
    ...inputSansThumb,
    sessionType: input.sessionType ?? "design",
    screenKey,
    previousScore,
    uplift,
    hasThumbnail: !!thumbBlobUrl,
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
    // Thumbnail pointer: score id -> blob URL (#442). Only when the upload
    // above succeeded; readers/purge key off the same `user:{id}:thumb:*`.
    ...(thumbBlobUrl
      ? [redis.set(SCORE_THUMB_KEY(userId, input.id), thumbBlobUrl)]
      : []),
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
