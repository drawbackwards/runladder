import { describe, expect, it } from "vitest";
import { isInternalOrg, isMultiIndustryOrg, orgMeta } from "./orgs";

/**
 * Account-type helpers that drive per-score tagging (#429). isMultiIndustryOrg
 * decides whether an org tags industry per score (agencies) or inherits one
 * fixed org industry (single-industry clients).
 */

describe("isMultiIndustryOrg", () => {
  it("is true for the internal Drawbackwards org (by name or flag)", () => {
    expect(isMultiIndustryOrg({ name: "Drawbackwards" })).toBe(true);
    expect(
      isMultiIndustryOrg({ name: "Acme", publicMetadata: { internal: true } }),
    ).toBe(true);
  });

  it("is true when industryMode is 'multiple'", () => {
    expect(
      isMultiIndustryOrg({
        name: "Some Agency",
        publicMetadata: { industryMode: "multiple" },
      }),
    ).toBe(true);
  });

  it("is false for a single-industry client (default or explicit)", () => {
    expect(
      isMultiIndustryOrg({
        name: "Fintech Co",
        publicMetadata: { industry: "fintech-banking" },
      }),
    ).toBe(false);
    expect(
      isMultiIndustryOrg({
        name: "Fintech Co",
        publicMetadata: { industry: "fintech-banking", industryMode: "single" },
      }),
    ).toBe(false);
    expect(isMultiIndustryOrg({ name: "Bare Org" })).toBe(false);
  });
});

describe("isInternalOrg + orgMeta still hold", () => {
  it("isInternalOrg matches name case-insensitively", () => {
    expect(isInternalOrg({ name: "  drawbackwards  " })).toBe(true);
    expect(isInternalOrg({ name: "Client Co" })).toBe(false);
  });

  it("orgMeta is safe on missing metadata", () => {
    expect(orgMeta({ name: "x" })).toEqual({});
    expect(orgMeta({ publicMetadata: { industryMode: "multiple" } })).toEqual({
      industryMode: "multiple",
    });
  });
});
