import { redis } from "@/lib/redis";
import type { AnnotationFinding } from "@/lib/evaluation";

/**
 * Per-user, per-score redline annotations. Layered on top of evaluation-
 * session scores so a designer can call out specific issues with pins on
 * the screenshot they audited. Stored separately from the score record
 * (which is immutable inside its zset) so annotations can be edited
 * freely without rewriting the history entry.
 */
export type ScoreAnnotations = {
  findings: AnnotationFinding[];
  updatedAt: number;
};

const key = (userId: string, scoreId: string) =>
  `score-annotations:${userId}:${scoreId}`;

export async function getScoreAnnotations(
  userId: string,
  scoreId: string,
): Promise<ScoreAnnotations | null> {
  const raw = await redis.get<string | ScoreAnnotations>(key(userId, scoreId));
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ScoreAnnotations;
    } catch {
      return null;
    }
  }
  return raw;
}

export async function setScoreAnnotations(
  userId: string,
  scoreId: string,
  findings: AnnotationFinding[],
): Promise<ScoreAnnotations> {
  const value: ScoreAnnotations = {
    findings,
    updatedAt: Date.now(),
  };
  await redis.set(key(userId, scoreId), JSON.stringify(value));
  return value;
}
