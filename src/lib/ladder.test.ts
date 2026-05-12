import { describe, expect, it } from "vitest";
import {
  LEVELS,
  RUNG_NAMES,
  RUNG_DISPLAY_ORDER,
  analyzeRungs,
  computeTotalFromRungs,
  getGapToNext,
  getLevel,
  getLevelColor,
  getLevelForScore,
  getNextLevel,
  getRungLevel,
  getScoreColor,
  type RungScores,
} from "./ladder";

/**
 * The Ladder framework lives at the center of every surface — web app,
 * Figma plugin, Skill, Pulse, MCP. A regression in any of these
 * functions silently shifts every score on every screen ever scored.
 * Tests focus on boundary conditions (1.99 vs 2.00, etc.) since those
 * are the historical source of "this should be Comfortable but reads
 * as Usable" bugs.
 */

describe("getLevelForScore", () => {
  // Boundary exactness matters: a 1.99 must stay Functional, a 2.00
  // must flip to Usable. Off-by-one here changes the meaning of every
  // score in the dashboard.
  it.each([
    [0, "Functional"],
    [1.0, "Functional"],
    [1.99, "Functional"],
    [2.0, "Usable"],
    [2.5, "Usable"],
    [2.99, "Usable"],
    [3.0, "Comfortable"],
    [3.99, "Comfortable"],
    [4.0, "Delightful"],
    [4.99, "Delightful"],
    [5.0, "Meaningful"],
  ])("score %f returns level %s", (score, expected) => {
    expect(getLevelForScore(score).label).toBe(expected);
  });

  it("returns Functional for out-of-range negative input (defensive)", () => {
    expect(getLevelForScore(-1).label).toBe("Functional");
  });
});

describe("getLevel", () => {
  it("matches getLevelForScore.label", () => {
    expect(getLevel(3.4)).toBe("Comfortable");
    expect(getLevel(4.8)).toBe("Delightful");
    expect(getLevel(5.0)).toBe("Meaningful");
  });
});

describe("level colors (neutralized)", () => {
  // Per Ward 2026-05-11: every level's color is uniform white. If a
  // future change reintroduces per-level coloring without removing
  // this test, this is the alarm that fires.
  it("every level's color is uniform white", () => {
    for (const level of LEVELS) {
      expect(level.color).toBe("#ffffff");
      expect(level.cssText).toBe("text-foreground");
      expect(level.cssBg).toBe("bg-foreground");
    }
  });

  it("getScoreColor returns white for every score", () => {
    expect(getScoreColor(0)).toBe("#ffffff");
    expect(getScoreColor(2.4)).toBe("#ffffff");
    expect(getScoreColor(5.0)).toBe("#ffffff");
  });

  it("getLevelColor returns white for every known label", () => {
    for (const level of LEVELS) {
      expect(getLevelColor(level.label)).toBe("#ffffff");
    }
  });
});

describe("getNextLevel", () => {
  it.each([
    [0, "Usable"],
    [1.99, "Usable"],
    [2, "Comfortable"],
    [2.99, "Comfortable"],
    [3, "Delightful"],
    [3.99, "Delightful"],
    [4, "Meaningful"],
    [4.99, "Meaningful"],
    [5, "Meaningful"],
  ])("score %f advances to %s", (score, expected) => {
    expect(getNextLevel(score)).toBe(expected);
  });
});

describe("getGapToNext", () => {
  it("computes the gap from current score to the next whole level", () => {
    expect(getGapToNext(2.4)).toBeCloseTo(0.6, 5);
    expect(getGapToNext(3.99)).toBeCloseTo(0.01, 5);
    expect(getGapToNext(4)).toBe(0);
  });

  it("returns 0 at the ceiling (already at the next whole number)", () => {
    expect(getGapToNext(5)).toBe(0);
  });
});

describe("RUNG_NAMES + RUNG_DISPLAY_ORDER", () => {
  it("has exactly five rungs", () => {
    expect(RUNG_NAMES).toHaveLength(5);
    expect(RUNG_DISPLAY_ORDER).toHaveLength(5);
  });

  it("display order is top-down (Meaningful → Functional)", () => {
    expect(RUNG_DISPLAY_ORDER[0]).toBe("meaningful");
    expect(RUNG_DISPLAY_ORDER.at(-1)).toBe("functional");
  });

  it("display order contains every rung exactly once", () => {
    const sorted = [...RUNG_DISPLAY_ORDER].sort();
    const expected = [...RUNG_NAMES].sort();
    expect(sorted).toEqual(expected);
  });
});

describe("getRungLevel", () => {
  it("maps each rung name to its level definition by index", () => {
    expect(getRungLevel("functional").label).toBe("Functional");
    expect(getRungLevel("usable").label).toBe("Usable");
    expect(getRungLevel("comfortable").label).toBe("Comfortable");
    expect(getRungLevel("delightful").label).toBe("Delightful");
    expect(getRungLevel("meaningful").label).toBe("Meaningful");
  });
});

describe("computeTotalFromRungs", () => {
  it("clamps between 1.0 and 5.0", () => {
    const allFives = computeTotalFromRungs({
      functional: 5,
      usable: 5,
      comfortable: 5,
      delightful: 5,
      meaningful: 5,
    });
    const allOnes = computeTotalFromRungs({
      functional: 1,
      usable: 1,
      comfortable: 1,
      delightful: 1,
      meaningful: 1,
    });
    expect(allFives).toBeGreaterThanOrEqual(1);
    expect(allFives).toBeLessThanOrEqual(5);
    expect(allOnes).toBeGreaterThanOrEqual(1);
    expect(allOnes).toBeLessThanOrEqual(5);
  });

  it("a perfect Five-across scores at the ceiling", () => {
    const total = computeTotalFromRungs({
      functional: 5,
      usable: 5,
      comfortable: 5,
      delightful: 5,
      meaningful: 5,
    });
    expect(total).toBeCloseTo(5.0, 1);
  });

  it("a Functional failure outweighs Delightful strength", () => {
    // Asserts the weighting principle: a 1 on Functional drags the total
    // harder than a 5 on Delightful can rescue. This is the entire
    // reason for the weighted averaging — guard against silent flatten.
    const total = computeTotalFromRungs({
      functional: 1,
      usable: 5,
      comfortable: 5,
      delightful: 5,
      meaningful: 5,
    });
    expect(total).toBeLessThan(3.5);
  });
});

describe("analyzeRungs", () => {
  const rungs: RungScores = {
    functional: { score: 4.5, summary: "" },
    usable: { score: 3.0, summary: "" },
    comfortable: { score: 4.0, summary: "" },
    delightful: { score: 2.0, summary: "" },
    meaningful: { score: 3.5, summary: "" },
  };

  it("identifies strongest and weakest rungs", () => {
    const { strongest, weakest } = analyzeRungs(rungs);
    expect(strongest.rung).toBe("functional");
    expect(strongest.score).toBe(4.5);
    expect(weakest.rung).toBe("delightful");
    expect(weakest.score).toBe(2.0);
  });

  it("handles a tie at the top (returns first match)", () => {
    const tied: RungScores = {
      functional: { score: 5, summary: "" },
      usable: { score: 5, summary: "" },
      comfortable: { score: 3, summary: "" },
      delightful: { score: 3, summary: "" },
      meaningful: { score: 3, summary: "" },
    };
    const { strongest } = analyzeRungs(tied);
    expect(strongest.score).toBe(5);
  });
});
