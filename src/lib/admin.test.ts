import { describe, expect, it } from "vitest";
import { canRemoveAdmin, isSuperAdmin } from "./admin";

/**
 * Super admins are the unforgeable root-of-trust for /admin. Their
 * identity is hardcoded in src/lib/admin.ts (cannot be edited via
 * env var or UI) and removal is intentionally impossible. These tests
 * encode that contract so a "small refactor" that breaks it fails CI.
 *
 * Per the project rule: SUPER_ADMIN_EMAILS only changes via PR +
 * merge + deploy, plus an out-of-band passphrase from Ward.
 */

const WARD_PRIMARY = "ward@drawbackwards.com";
const WARD_PERSONAL = "ward.andrews@gmail.com";

describe("isSuperAdmin", () => {
  it("returns true for the hardcoded super admins (case-insensitive)", () => {
    expect(isSuperAdmin(WARD_PRIMARY)).toBe(true);
    expect(isSuperAdmin(WARD_PERSONAL)).toBe(true);
    expect(isSuperAdmin("WARD@DRAWBACKWARDS.COM")).toBe(true);
    expect(isSuperAdmin("Ward.Andrews@Gmail.com")).toBe(true);
  });

  it("returns false for env-list admins (they are removable)", () => {
    expect(isSuperAdmin("jordan@drawbackwards.com")).toBe(false);
    expect(isSuperAdmin("michael@drawbackwards.com")).toBe(false);
  });

  it("returns false for a non-admin", () => {
    expect(isSuperAdmin("random@example.com")).toBe(false);
  });

  it("returns false on null / undefined / empty (no auth context)", () => {
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(isSuperAdmin("")).toBe(false);
  });
});

describe("canRemoveAdmin", () => {
  it("blocks removal of super admins", () => {
    expect(canRemoveAdmin(WARD_PRIMARY)).toBe(false);
    expect(canRemoveAdmin(WARD_PERSONAL)).toBe(false);
  });

  it("allows removal of env-list admins", () => {
    expect(canRemoveAdmin("jordan@drawbackwards.com")).toBe(true);
    expect(canRemoveAdmin("michael@drawbackwards.com")).toBe(true);
  });

  it("allows removal of arbitrary emails (they aren't admins anyway)", () => {
    // canRemoveAdmin only blocks super admins; whether the target is
    // actually an admin is a separate concern (handled by the caller).
    expect(canRemoveAdmin("random@example.com")).toBe(true);
  });
});
