import { describe, expect, it } from "vitest";
import { parseImageDataUrl } from "./scoring";

/**
 * parseImageDataUrl is the security boundary between user-supplied
 * input and the scoring engine. Anything other than a well-formed
 * image data URL must return null. Tests focus on the malformed +
 * adversarial cases since that's where input-validation regressions
 * hurt most.
 */

describe("parseImageDataUrl — valid inputs", () => {
  it.each([
    ["image/png", "data:image/png;base64,iVBORw0KGgo="],
    ["image/jpeg", "data:image/jpeg;base64,/9j/4AAQ"],
    ["image/webp", "data:image/webp;base64,UklGRiQA"],
    ["image/gif", "data:image/gif;base64,R0lGODlh"],
  ])("accepts %s data URL", (mediaType, url) => {
    const result = parseImageDataUrl(url);
    expect(result).not.toBeNull();
    expect(result?.mediaType).toBe(mediaType);
    expect(result?.base64Data.length).toBeGreaterThan(0);
  });

  it("accepts image/jpg as well as image/jpeg (alias tolerance)", () => {
    const r = parseImageDataUrl("data:image/jpg;base64,/9j/AAA");
    expect(r).not.toBeNull();
  });
});

describe("parseImageDataUrl — adversarial inputs", () => {
  it.each([
    null,
    undefined,
    0,
    42,
    {},
    [],
    true,
    false,
  ])("rejects non-string input: %s", (input) => {
    expect(parseImageDataUrl(input)).toBeNull();
  });

  it("rejects plain string with no data URL prefix", () => {
    expect(parseImageDataUrl("hello world")).toBeNull();
  });

  it("rejects unsupported media types", () => {
    expect(parseImageDataUrl("data:image/svg+xml;base64,PHN2Zw==")).toBeNull();
    expect(parseImageDataUrl("data:image/bmp;base64,Qk0")).toBeNull();
    expect(parseImageDataUrl("data:text/plain;base64,aGVsbG8=")).toBeNull();
  });

  it("rejects data URLs missing the base64 marker", () => {
    expect(parseImageDataUrl("data:image/png,iVBORw0KGgo")).toBeNull();
    expect(
      parseImageDataUrl("data:image/png;charset=utf-8,raw"),
    ).toBeNull();
  });

  it("rejects empty data segment", () => {
    expect(parseImageDataUrl("data:image/png;base64,")).toBeNull();
  });

  it("rejects scheme injection attempts", () => {
    expect(
      parseImageDataUrl("javascript:alert(1)//data:image/png;base64,foo"),
    ).toBeNull();
    expect(parseImageDataUrl("https://evil.example/x.png")).toBeNull();
  });
});
