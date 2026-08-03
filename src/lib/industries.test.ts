import { describe, expect, it } from "vitest";
import { INDUSTRIES, industryTokens, matchExistingIndustry } from "./industries";

/**
 * Near-duplicate convergence for "Add new industry" (#422). A synonym or
 * fragment of an existing category must land on that category, not mint a
 * parallel bucket the de-identified aggregate can never merge back.
 */

describe("matchExistingIndustry", () => {
  it("converges fragments onto their existing category", () => {
    expect(matchExistingIndustry("Fintech", INDUSTRIES)?.value).toBe(
      "fintech-banking",
    );
    expect(matchExistingIndustry("Banking", INDUSTRIES)?.value).toBe(
      "fintech-banking",
    );
    expect(matchExistingIndustry("Retail", INDUSTRIES)?.value).toBe(
      "ecommerce-retail",
    );
    expect(matchExistingIndustry("SaaS", INDUSTRIES)?.value).toBe("saas-b2b");
  });

  it("treats hyphenation and single-letter fragments as the same word", () => {
    expect(industryTokens("E-commerce")).toEqual(["ecommerce"]);
    expect(matchExistingIndustry("Ecommerce", INDUSTRIES)?.value).toBe(
      "ecommerce-retail",
    );
    expect(matchExistingIndustry("e-Commerce", INDUSTRIES)?.value).toBe(
      "ecommerce-retail",
    );
  });

  it("requires whole-word matches, not substrings", () => {
    // "Tech" is inside "Fintech" but is not the same word — genuinely new.
    expect(matchExistingIndustry("Tech", INDUSTRIES)).toBeNull();
  });

  it("returns null for genuinely new industries", () => {
    expect(matchExistingIndustry("Boating & Marine", INDUSTRIES)).toBeNull();
    expect(matchExistingIndustry("Agriculture", INDUSTRIES)).toBeNull();
  });

  it("matches case-insensitively and ignores '&'/'and'", () => {
    expect(
      matchExistingIndustry("banking and fintech", INDUSTRIES)?.value,
    ).toBe("fintech-banking");
  });
});
