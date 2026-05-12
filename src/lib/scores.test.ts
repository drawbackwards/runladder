import { describe, expect, it } from "vitest";
import { screenKeyFor } from "./scores";

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
