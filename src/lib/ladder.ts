/**
 * Ladder Framework — Single Source of Truth for runladder.com
 *
 * Mirrors the canonical definitions from api/_ladder.js in the plugin repo.
 * Every component, page, and API route on the site imports from here.
 * The plugin fetches the same data via its own _ladder.js.
 *
 * DO NOT duplicate level definitions, colors, or thresholds anywhere else.
 */

export type LadderLevel = {
  level: number;
  min: number;
  max: number;
  label: string;
  color: string;        // hex color
  cssText: string;       // Tailwind text color class
  cssBg: string;         // Tailwind bg color class
  tagline: string;
  description: string;
  experienceTest: string;
};

export const LEVELS: LadderLevel[] = [
  {
    level: 1,
    min: 0,
    max: 1.99,
    label: "Functional",
    color: "#ef4444",
    cssText: "text-ladder-red",
    cssBg: "bg-ladder-red",
    tagline: "It works. Barely.",
    description:
      "The user fights the product. Navigation is confusing, actions are unclear, and completing basic tasks requires trial and error. Built for engineering requirements, not human needs.",
    experienceTest:
      "Can the user complete their primary task without outside help?",
  },
  {
    level: 2,
    min: 2,
    max: 2.99,
    label: "Usable",
    color: "#f97316",
    cssText: "text-ladder-orange",
    cssBg: "bg-ladder-orange",
    tagline: "Tasks complete with effort.",
    description:
      "Basic structure exists. Users can accomplish goals, but it takes more effort than it should. The interface doesn't guide — it presents. Users tolerate it but would switch.",
    experienceTest:
      "Can the user complete their task without stopping to think about the interface?",
  },
  {
    level: 3,
    min: 3,
    max: 3.99,
    label: "Comfortable",
    color: "#eab308",
    cssText: "text-ladder-yellow",
    cssBg: "bg-ladder-yellow",
    tagline: "No thinking required. The modern minimum.",
    description:
      "Everything is where expected. The interface is intuitive — users feel their way through without conscious thought. Friction is removed. This is the modern minimum bar.",
    experienceTest:
      "Does the interface feel intuitive? Can users navigate by feel rather than by reading?",
  },
  {
    level: 4,
    min: 4,
    max: 4.99,
    label: "Delightful",
    color: "#22c55e",
    cssText: "text-ladder-delightful",
    cssBg: "bg-ladder-delightful",
    tagline: "Anticipates needs. Users refer others.",
    description:
      "The product actively helps. It adapts to context, surfaces the right information at the right moment, and turns complexity into quick decisions. Users tell others about it.",
    experienceTest:
      "Does the interface actively assist the user? Does it anticipate what they need next?",
  },
  {
    level: 5,
    min: 5,
    max: 5,
    label: "Meaningful",
    color: "#ffffff",
    cssText: "text-ladder-white",
    cssBg: "bg-ladder-white",
    tagline: "Irreplaceable.",
    description:
      "The experience changed how the user thinks, works, or lives. Switching is unthinkable. The user can't imagine going back. Level 5 is the ceiling.",
    experienceTest:
      "Has this experience become irreplaceable? Would the user feel genuine loss without it?",
  },
];

/** Get the full level definition for a numeric score */
export function getLevelForScore(score: number): LadderLevel {
  return LEVELS.find((l) => score >= l.min && score <= l.max) ?? LEVELS[0];
}

/** Get the hex color for a numeric score */
export function getScoreColor(score: number): string {
  return getLevelForScore(score).color;
}

/** Get the Tailwind text class for a numeric score */
export function getScoreCssText(score: number): string {
  return getLevelForScore(score).cssText;
}

/** Get the Tailwind bg class for a numeric score */
export function getScoreCssBg(score: number): string {
  return getLevelForScore(score).cssBg;
}

/** Get the level label for a numeric score */
export function getLevel(score: number): string {
  return getLevelForScore(score).label;
}

/** Get the hex color for a level label */
export function getLevelColor(label: string): string {
  return LEVELS.find((l) => l.label === label)?.color ?? LADDER_GREEN;
}

/** Get the next level label above the current score */
export function getNextLevel(score: number): string {
  if (score < 2) return "Usable";
  if (score < 3) return "Comfortable";
  if (score < 4) return "Delightful";
  return "Meaningful";
}

/** Get the gap (points) to the next whole level */
export function getGapToNext(score: number): number {
  return Math.ceil(score) - score;
}

/** Brand green — used for Ladder branding, not level scoring */
export const LADDER_GREEN = "#6AC89B";

// ─── Per-Rung Scoring ────────────────────────────────────────────────────────

export const RUNG_NAMES = [
  "functional",
  "usable",
  "comfortable",
  "delightful",
  "meaningful",
] as const;

/** Display order: always show rungs top-down from Meaningful to Functional */
export const RUNG_DISPLAY_ORDER: RungName[] = [
  "meaningful",
  "delightful",
  "comfortable",
  "usable",
  "functional",
];

export type RungName = (typeof RUNG_NAMES)[number];

export type RungScore = {
  score: number;   // 1.0–5.0
  summary: string; // one sentence from user's perspective
};

export type RungScores = Record<RungName, RungScore>;

/** Map each rung to its level definition (for colors, labels, etc.) */
export function getRungLevel(rung: RungName): LadderLevel {
  const idx = RUNG_NAMES.indexOf(rung);
  return LEVELS[idx] ?? LEVELS[0];
}

/**
 * Rung influence weights — mirrors _ladder.js RUNG_WEIGHTS.
 * Functional failures are amplified. Absent delight is penalized less.
 * Keys: rung name → { [answerValue 1-5]: weight multiplier }
 */
const RUNG_WEIGHTS: Record<RungName, Record<number, number>> = {
  functional:  { 1: 5.0, 2: 4.0, 3: 3.0, 4: 1.0, 5: 0.5 },
  usable:      { 1: 4.0, 2: 3.0, 3: 2.0, 4: 1.0, 5: 0.75 },
  comfortable: { 1: 3.0, 2: 2.0, 3: 1.5, 4: 1.0, 5: 1.0 },
  delightful:  { 1: 3.0, 2: 1.5, 3: 1.0, 4: 1.0, 5: 1.0 },
  meaningful:  { 1: 3.0, 2: 1.5, 3: 1.0, 4: 1.0, 5: 1.0 },
};

function getRungWeight(rung: RungName, value: number): number {
  const map = RUNG_WEIGHTS[rung];
  if (value <= 1.5) return map[1];
  if (value <= 2.5) return map[2];
  if (value <= 3.5) return map[3];
  if (value <= 4.5) return map[4];
  return map[5];
}

/**
 * Compute total Ladder score from per-rung scores.
 * Uses weighted averaging where functional failures weigh more.
 * Returns 1.0–5.0.
 */
export function computeTotalFromRungs(
  rungs: Record<RungName, number>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const rung of RUNG_NAMES) {
    const value = rungs[rung];
    const baseWeight = 6 - value; // low scores get more weight
    const rungInfluence = getRungWeight(rung, value);
    const weight = baseWeight * rungInfluence;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 1.0;
  return Math.max(1.0, Math.min(5.0, weightedSum / totalWeight));
}

/**
 * Find the strongest and weakest rungs from a RungScores object.
 */
export function analyzeRungs(rungs: RungScores): {
  strongest: { rung: RungName; score: number };
  weakest: { rung: RungName; score: number };
} {
  let strongest: { rung: RungName; score: number } = { rung: "functional", score: 0 };
  let weakest: { rung: RungName; score: number } = { rung: "functional", score: 6 };

  for (const rung of RUNG_NAMES) {
    const s = rungs[rung].score;
    if (s > strongest.score) strongest = { rung, score: s };
    if (s < weakest.score) weakest = { rung, score: s };
  }

  return { strongest, weakest };
}
