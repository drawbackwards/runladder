/**
 * Shared storage for per-score "thumbs" feedback, written by every surface so it
 * all lands in one place (the Admin → Feedback tab). Centralized in #330.
 *
 * Writers:
 *   - Web widget:    POST /api/feedback/score   (Clerk session auth)
 *   - Figma plugin:  POST /api/plugin/feedback   (service-token auth, forwarded
 *                    by the ai-design-assistant backend with the runladder scoreId)
 * Reader:
 *   - Admin:         GET  /api/admin/feedback
 *
 * Keys:
 *   score-feedback:{scoreId}:{userId}  → JSON record (upsert, one per user/score)
 *   score-feedback:index               → zset (ts → "{scoreId}:{userId}")
 *
 * The surface (Web / Figma / …) is NOT stored here — it's derived from the score
 * name suffix (see surfaceParts in ./surface), so there is one source of truth.
 */
import type { Redis } from "@upstash/redis";

export const FEEDBACK_INDEX_KEY = "score-feedback:index";

export type ScoreFeedbackRating = "up" | "down";

export type StoredFeedback = {
  scoreId: string;
  userId: string;
  orgId: string | null;
  rating: ScoreFeedbackRating;
  note: string;
  ts: number;
};

export function recordKey(scoreId: string, userId: string): string {
  return `score-feedback:${scoreId}:${userId}`;
}

export function indexMember(scoreId: string, userId: string): string {
  return `${scoreId}:${userId}`;
}

/**
 * Upsert one user's feedback for one score and index it by time. Returns the
 * stored record. `note` is trimmed to 1000 chars.
 */
export async function writeScoreFeedback(
  redis: Redis,
  input: {
    scoreId: string;
    userId: string;
    orgId?: string | null;
    rating: ScoreFeedbackRating;
    note?: string;
    ts?: number;
  },
): Promise<StoredFeedback> {
  const feedback: StoredFeedback = {
    scoreId: input.scoreId,
    userId: input.userId,
    orgId: input.orgId ?? null,
    rating: input.rating,
    note: typeof input.note === "string" ? input.note.slice(0, 1000) : "",
    ts: input.ts ?? Date.now(),
  };

  await Promise.all([
    redis.set(recordKey(feedback.scoreId, feedback.userId), JSON.stringify(feedback)),
    redis.zadd(FEEDBACK_INDEX_KEY, {
      score: feedback.ts,
      member: indexMember(feedback.scoreId, feedback.userId),
    }),
  ]);

  return feedback;
}
