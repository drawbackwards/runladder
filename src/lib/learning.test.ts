import { describe, expect, it, vi } from "vitest";

// learning.ts imports Clerk + Redis for the storage half; the projection
// under test here is pure. Stub both so the import stays hermetic.
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));
vi.mock("@/lib/redis", () => ({ redis: {} }));

import { learningRecordFromScore, normalizeIndustry } from "./learning";
import type { StoredScoreEntry } from "./scores";

/**
 * The learning record is the de-identified aggregate the SOW lets us keep
 * forever (#398 §6.4, #422). These tests pin the projection's central
 * promise: NOTHING identifying survives it. If a field is added to the
 * record, it must be argued into the allowlist here, not slip through.
 */

const CUSTOMER_ENTRY: StoredScoreEntry = {
  id: "score_abc123",
  score: 3.4,
  label: "Comfortable",
  screenName: "Lumin Checkout — Payment Step",
  summary: "The Lumin checkout flow does X and Y with customer copy quoted.",
  next: "Fix the Lumin payment button",
  findings: [
    {
      title: "Lumin's CTA is ambiguous",
      impact: "Users on lumin.com hesitate",
      fix: "Rename to 'Pay now'",
      category: "Clarity",
      region: "bottom-right",
      uplift: 0.3,
      targetLevel: "Delightful",
      rung: "comfortable",
    },
    // Malformed finding (older engines) — must be dropped, not crash.
    { nonsense: true },
  ],
  rungs: { functional: 4.1, usable: 3.8, comfortable: 3.2 },
  styleGuide: { status: "checked", findings: [{ text: "Lumin voice rule" }] },
  source: "figma",
  frameId: "1234:5678",
  thumbnail: "data:image/jpeg;base64,AAAA",
  isPublic: false,
  timestamp: Date.UTC(2026, 6, 15, 13, 37, 42),
  sessionType: "design",
  screenKey: "figma::id:1234-5678",
  previousScore: 3.1,
  uplift: 0.3,
};

describe("learningRecordFromScore — de-identification", () => {
  it("carries no identifying content anywhere in the record", () => {
    const json = JSON.stringify(
      learningRecordFromScore(CUSTOMER_ENTRY, "Fintech"),
    ).toLowerCase();
    for (const leaked of [
      "lumin", // client name via screen name / summary / finding text
      "score_abc123", // score id
      "1234", // frame id / screenKey
      "checkout", // screen name fragments
      "base64", // thumbnail
      "pay now", // finding fix text
      "voice rule", // style-guide content
    ]) {
      expect(json, `record leaked "${leaked}"`).not.toContain(leaked);
    }
    // Exact timestamp is coarsened to a month bucket.
    expect(json).not.toContain(String(CUSTOMER_ENTRY.timestamp));
  });

  it("keeps the categorical/numeric facts and coarse month", () => {
    const rec = learningRecordFromScore(CUSTOMER_ENTRY, "Fintech");
    expect(rec).toEqual({
      v: 1,
      month: "2026-07",
      industry: "fintech",
      surface: "figma",
      sessionType: "design",
      score: 3.4,
      label: "comfortable",
      rungs: { functional: 4.1, usable: 3.8, comfortable: 3.2 },
      findings: [
        {
          category: "clarity",
          rung: "comfortable",
          uplift: 0.3,
          targetLevel: "delightful",
        },
      ],
      uplift: 0.3,
      engine: rec.engine, // pinned to whatever the current engine version is
    });
  });

  it("handles minimal entries (no findings, no rungs, first scan)", () => {
    const rec = learningRecordFromScore(
      {
        ...CUSTOMER_ENTRY,
        findings: undefined,
        rungs: undefined,
        uplift: null,
        previousScore: null,
      },
      "",
    );
    expect(rec.findings).toEqual([]);
    expect(rec.rungs).toBeNull();
    expect(rec.uplift).toBeNull();
    expect(rec.industry).toBe("unknown");
  });

  it("reads rung scores whether stored as numbers or {score} objects", () => {
    const rec = learningRecordFromScore(
      {
        ...CUSTOMER_ENTRY,
        rungs: { functional: { score: 2.5, note: "customer text" } },
      },
      "fintech",
    );
    expect(rec.rungs).toEqual({ functional: 2.5 });
    expect(JSON.stringify(rec)).not.toContain("customer text");
  });
});

describe("normalizeIndustry", () => {
  it("lowercases, trims, strips odd characters, caps length", () => {
    expect(normalizeIndustry("  FinTech ")).toBe("fintech");
    expect(normalizeIndustry("Health & Wellness")).toBe("health & wellness");
    expect(normalizeIndustry("a".repeat(100))).toHaveLength(60);
  });

  it("maps empty/non-string to 'unknown'", () => {
    expect(normalizeIndustry("")).toBe("unknown");
    expect(normalizeIndustry(undefined)).toBe("unknown");
    expect(normalizeIndustry(42)).toBe("unknown");
  });
});
