import { describe, expect, it } from "vitest";
import { ANON_LIMIT, FREE_LIFETIME_LIMIT, isPaidTier } from "./plans";

/**
 * plans.ts is the single source of truth for tier gating across every
 * surface. A wrong answer here turns a paid team member into a free
 * user (or vice versa) silently. Tests are tiny but catch the high-cost
 * regression of "we changed the tier list and forgot to update gating."
 */

describe("isPaidTier", () => {
  it.each([
    ["pro", true],
    ["team", true],
    ["pulse", true],
    ["free", false],
  ] as const)("%s is paid=%s", (tier, expected) => {
    expect(isPaidTier(tier)).toBe(expected);
  });
});

describe("free quota constants", () => {
  // Lifetime cap is the actual product offer on /pricing — any future
  // change should be conscious and visible in a PR diff, not a silent
  // bump.
  it("FREE_LIFETIME_LIMIT is 5", () => {
    expect(FREE_LIFETIME_LIMIT).toBe(5);
  });

  it("ANON_LIMIT is 1 per IP per 24h", () => {
    expect(ANON_LIMIT).toBe(1);
  });
});
