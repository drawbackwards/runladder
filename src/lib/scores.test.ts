import { describe, expect, it } from "vitest";
import { screenKeyFor, screenNamesSimilar } from "./scores";

/**
 * screenKeyFor is the canonical "same screen across time" identifier.
 * Uplift tracking, deduplication, and trend computation all depend on
 * two scans of the same screen producing the SAME key. If this
 * function changes its normalization rules without thought, every
 * historical screen forks into two trend lines.
 */

describe("screenKeyFor — basic shape", () => {
  it("namespaces the screen by source so /login on web ≠ Login in Figma", () => {
    const web = screenKeyFor("web", "Login");
    const figma = screenKeyFor("figma", "Login");
    expect(web).not.toBe(figma);
    expect(web.startsWith("web::")).toBe(true);
    expect(figma.startsWith("figma::")).toBe(true);
  });

  it("falls back to 'unknown' when source is empty", () => {
    expect(screenKeyFor("", "Settings")).toBe("unknown::settings");
  });

  it("falls back to 'untitled' when screen name is empty", () => {
    expect(screenKeyFor("web", undefined)).toBe("web::untitled");
    expect(screenKeyFor("web", "")).toBe("web::untitled");
  });
});

describe("screenKeyFor — normalization", () => {
  it("lowercases source and screen name", () => {
    expect(screenKeyFor("Web", "DASHBOARD")).toBe("web::dashboard");
  });

  it("strips redundant surface suffixes that callers may add", () => {
    expect(screenKeyFor("figma", "Login (Figma)")).toBe("figma::login");
    expect(screenKeyFor("web", "Cart (web)")).toBe("web::cart");
    expect(screenKeyFor("skill", "Onboarding (Skill)")).toBe(
      "skill::onboarding",
    );
  });

  it("collapses unsafe characters to dashes", () => {
    expect(screenKeyFor("web", "Sign Up Page!")).toBe("web::sign-up-page");
  });

  it("collapses runs of dashes to a single dash", () => {
    expect(screenKeyFor("web", "foo - - bar")).toBe("web::foo-bar");
  });

  it("trims leading/trailing dashes", () => {
    expect(screenKeyFor("web", "-leading-")).toBe("web::leading");
  });

  it("preserves dots, slashes, colons, underscores (URL-ish names)", () => {
    expect(screenKeyFor("web", "/dashboard/scores/123")).toBe(
      "web::/dashboard/scores/123",
    );
  });

  it("caps the cleaned name at 120 characters", () => {
    const long = "x".repeat(200);
    const key = screenKeyFor("web", long);
    const [, name] = key.split("::");
    expect(name.length).toBeLessThanOrEqual(120);
  });
});

describe("screenKeyFor — same screen on multiple scans", () => {
  // The whole point of the function: two scans of the same screen
  // should produce identical keys so uplift math finds the prior one.
  it("two scans of 'Login' on web produce the same key", () => {
    expect(screenKeyFor("web", "Login")).toBe(screenKeyFor("web", "Login"));
  });

  it("whitespace / case variations resolve to the same key", () => {
    expect(screenKeyFor("web", "Login")).toBe(screenKeyFor("web", "  LOGIN  "));
  });
});

describe("screenNamesSimilar — the #430 lineage-tiebreak gate", () => {
  // The tiebreak must catch MODEL NAMING WOBBLE for the same screen while
  // refusing to merge a genuinely different screen that a lazy designer
  // exported under a reused filename. Both failure modes corrupt uplift:
  // a false fork loses the chain, a false merge invents a bogus delta.

  it("accepts the observed real-world wobble (same screen, shorter phrasing)", () => {
    expect(
      screenNamesSimilar(
        "hyper-tracking-dark.png::hyper-shipment-tracking-detail",
        "hyper-tracking-dark.png::hyper-shipment-detail",
      ),
    ).toBe(true);
  });

  it("rejects a different screen under a reused filename", () => {
    expect(
      screenNamesSimilar(
        "hyper-tracking-dark.png::hyper-shipment-tracking-detail",
        "hyper-tracking-dark.png::settings-page",
      ),
    ).toBe(false);
  });

  it("accepts identical names and a contained shorter name", () => {
    expect(screenNamesSimilar("web::checkout", "web::checkout")).toBe(true);
    expect(screenNamesSimilar("web::checkout-flow", "web::checkout")).toBe(true);
  });

  it("rejects when overlap is below half the combined vocabulary", () => {
    // one shared token out of four distinct → 0.25, well under the bar
    expect(
      screenNamesSimilar("web::checkout-payment-step", "web::checkout-history"),
    ).toBe(false);
  });

  it("never matches on empty name halves", () => {
    expect(screenNamesSimilar("web::", "web::checkout")).toBe(false);
    expect(screenNamesSimilar("web::", "web::")).toBe(false);
  });
});
