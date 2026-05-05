import { LEVELS, type LadderLevel } from "@/lib/ladder";

/**
 * Designer letter grade — derived from the percentage of recent scores
 * that hit a Ladder threshold. Default threshold is Comfortable (3.0+),
 * which is the modern minimum.
 *
 * Bands (proportion of scores ≥ threshold):
 *   A: 90%+
 *   B: 75-89%
 *   C: 60-74%
 *   D: 40-59%
 *   F: <40%
 *   —: no scores in window
 */

export type LetterGrade = "A" | "B" | "C" | "D" | "F" | "—";

export const LETTER_GRADE_THRESHOLD = 3.0;
export const LETTER_GRADE_WINDOW_DAYS = 30;

export function computeLetterGrade(
  scores: number[],
  threshold: number = LETTER_GRADE_THRESHOLD,
): LetterGrade {
  if (scores.length === 0) return "—";
  const passing = scores.filter((s) => s >= threshold).length;
  const pct = passing / scores.length;
  if (pct >= 0.9) return "A";
  if (pct >= 0.75) return "B";
  if (pct >= 0.6) return "C";
  if (pct >= 0.4) return "D";
  return "F";
}

/**
 * Map a letter grade to a Ladder level so the grade's color treatment
 * echoes the rung level the designer typically reaches.
 *
 *   A → Meaningful (white)
 *   B → Delightful (green)
 *   C → Comfortable (yellow)
 *   D → Usable (orange)
 *   F → Functional (red)
 */
export function letterGradeLevel(grade: LetterGrade): LadderLevel | null {
  switch (grade) {
    case "A":
      return LEVELS[4];
    case "B":
      return LEVELS[3];
    case "C":
      return LEVELS[2];
    case "D":
      return LEVELS[1];
    case "F":
      return LEVELS[0];
    default:
      return null;
  }
}

export function letterGradeColor(grade: LetterGrade): string {
  return letterGradeLevel(grade)?.color ?? "#666666";
}
