/**
 * Auth-gate contract tests.
 *
 * One test per protected route. Each test imports the route handler,
 * exercises every HTTP method it exports, and asserts the response
 * status is 401 or 403 when the caller is anonymous (no Clerk session).
 *
 * The auth gate is the most important code path in the codebase — a
 * single forgotten `auth()` check leaks team data, admin tooling, or
 * scoring history to the public internet. This file makes that
 * forgetfulness loud at PR time.
 *
 * If you add a new route under /api/admin/* or /api/dashboard/team/*,
 * the meta-test at the bottom of this file will fail until you:
 *   1. Add the route's path to PROTECTED_ROUTES below.
 *   2. (Optional, recommended) verify the test passes — it will, if
 *      your handler checks auth before any side effects.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ─── Module mocks ────────────────────────────────────────────────────────────
// Mock Clerk so auth() returns "no signed-in user" by default. Each test
// can override with vi.mocked(auth).mockResolvedValueOnce(...) if needed.
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({
    userId: null,
    sessionId: null,
    orgId: null,
    orgRole: null,
  })),
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(),
      getUserList: vi.fn(),
      getOrganizationMembershipList: vi.fn(),
      updateUser: vi.fn(),
    },
    organizations: {
      getOrganization: vi.fn(),
      getOrganizationInvitationList: vi.fn(),
      createOrganizationInvitation: vi.fn(),
      revokeOrganizationInvitation: vi.fn(),
    },
  })),
}));

// Redis is touched by some routes before the auth check (importing the
// module is side-effectful). Stub everything to no-ops so tests stay
// hermetic.
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    hget: vi.fn(),
    hset: vi.fn(),
    hgetall: vi.fn(),
    hdel: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn(),
    zadd: vi.fn(),
    zrange: vi.fn(),
    zrem: vi.fn(),
    lpush: vi.fn(),
    ltrim: vi.fn(),
  },
  lifetimeScansKey: vi.fn((userId: string) => `user:${userId}:lifetime_scans_used`),
}));

// ─── Route manifest ──────────────────────────────────────────────────────────
/**
 * Every route under /api/admin/* and /api/dashboard/team/* must be
 * listed here. The meta-test at the bottom of this file scans the
 * filesystem and fails if it finds a route not in this list — that
 * way "I added a new admin endpoint and forgot to gate it" doesn't
 * ship.
 *
 * To add a new entry: add the file path AND add a `describe()` block
 * below that calls expectAllMethodsRejectAnon(<importPath>).
 */
const PROTECTED_ROUTES = [
  // /api/admin/*
  "src/app/api/admin/clients/[orgId]/route.ts",
  "src/app/api/admin/clients/route.ts",
  "src/app/api/admin/comps/route.ts",
  "src/app/api/admin/debug-log/route.ts",
  "src/app/api/admin/evaluations/[id]/analyze/route.ts",
  "src/app/api/admin/evaluations/[id]/route.ts",
  "src/app/api/admin/evaluations/route.ts",
  "src/app/api/admin/feedback/route.ts",
  "src/app/api/admin/invites/route.ts",
  "src/app/api/admin/persist-log/route.ts",
  "src/app/api/admin/users/route.ts",
  // /api/dashboard/team/*
  "src/app/api/dashboard/team/invitations/[id]/reinvite/route.ts",
  "src/app/api/dashboard/team/members/[userId]/archive/route.ts",
  "src/app/api/dashboard/team/members/[userId]/delete/route.ts",
  "src/app/api/dashboard/team/members/[userId]/route.ts",
  "src/app/api/dashboard/team/route.ts",
];

/**
 * Routes under /api/admin that are intentionally PUBLIC (no auth gate) and
 * therefore exempt from the protected-route coverage check below. Keep this
 * list tiny and obvious.
 *
 * - status: returns `{ admin: false }` (200) to anonymous callers so the
 *   client UI can decide whether to show admin nav without exposing the
 *   ADMIN_EMAILS allowlist. It leaks nothing.
 */
const PUBLIC_ADMIN_ROUTES = ["src/app/api/admin/status/route.ts"];

// ─── Helper: exercise every HTTP method on a route handler ───────────────────
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Imports the route module, finds every exported HTTP-method handler,
 * and asserts each rejects an anonymous request with 401 or 403.
 *
 * Dynamic-segment params are stubbed — most handlers' auth check fires
 * before any body parsing or param validation. If a handler 400s
 * before 401/403ing, that's a real finding: it's wasting work
 * (parsing inputs) before rejecting the unauthorized caller.
 */
async function expectAllMethodsRejectAnon(importPath: string): Promise<void> {
  const mod = (await import(importPath)) as Partial<
    Record<HttpMethod, (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>>
  >;
  const exportedMethods = HTTP_METHODS.filter(
    (m) => typeof mod[m] === "function",
  );
  expect(exportedMethods.length, `${importPath} exports no HTTP methods`).toBeGreaterThan(0);

  for (const method of exportedMethods) {
    const handler = mod[method]!;
    const req = new NextRequest("http://localhost/test", {
      method,
      // Send valid empty JSON for body-accepting methods so the auth
      // gate fires before any body validation.
      ...(method === "GET" || method === "DELETE"
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
    });
    const params = Promise.resolve({
      id: "stub-id",
      userId: "stub-user",
      token: "stub-token",
    });
    const res = await handler(req, { params });
    expect(
      [401, 403],
      `${method} ${importPath} should reject anonymous callers (got ${res.status})`,
    ).toContain(res.status);
  }
}

// ─── Per-route gate tests ────────────────────────────────────────────────────

describe("auth gate: /api/admin/*", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clients", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/clients/route"));
  it("clients/[orgId]", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/clients/[orgId]/route"));
  it("comps", () => expectAllMethodsRejectAnon("@/app/api/admin/comps/route"));
  it("debug-log", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/debug-log/route"));
  it("evaluations", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/evaluations/route"));
  it("evaluations/[id]", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/evaluations/[id]/route"));
  it("evaluations/[id]/analyze", () =>
    expectAllMethodsRejectAnon(
      "@/app/api/admin/evaluations/[id]/analyze/route",
    ));
  it("feedback", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/feedback/route"));
  it("invites", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/invites/route"));
  it("persist-log", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/persist-log/route"));
  it("users", () =>
    expectAllMethodsRejectAnon("@/app/api/admin/users/route"));
});

describe("auth gate: /api/dashboard/team/*", () => {
  beforeEach(() => vi.clearAllMocks());

  it("team root", () =>
    expectAllMethodsRejectAnon("@/app/api/dashboard/team/route"));
  it("invitations/[id]/reinvite", () =>
    expectAllMethodsRejectAnon(
      "@/app/api/dashboard/team/invitations/[id]/reinvite/route",
    ));
  it("members/[userId]", () =>
    expectAllMethodsRejectAnon(
      "@/app/api/dashboard/team/members/[userId]/route",
    ));
  it("members/[userId]/archive", () =>
    expectAllMethodsRejectAnon(
      "@/app/api/dashboard/team/members/[userId]/archive/route",
    ));
  it("members/[userId]/delete", () =>
    expectAllMethodsRejectAnon(
      "@/app/api/dashboard/team/members/[userId]/delete/route",
    ));
});

// ─── Meta-test: ensure manifest covers every route on disk ───────────────────

function findRouteFilesUnder(rootDir: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      const s = statSync(full);
      if (s.isDirectory()) {
        walk(full);
      } else if (name === "route.ts" || name === "route.tsx") {
        found.push(full);
      }
    }
  };
  walk(rootDir);
  return found;
}

describe("meta: protected-route coverage", () => {
  it("every route under /api/admin and /api/dashboard/team has a gate test", () => {
    const projectRoot = process.cwd();
    const adminRoot = join(projectRoot, "src/app/api/admin");
    const teamRoot = join(projectRoot, "src/app/api/dashboard/team");

    const onDisk = [
      ...findRouteFilesUnder(adminRoot),
      ...findRouteFilesUnder(teamRoot),
    ]
      .map((p) => p.slice(projectRoot.length + 1)) // make relative
      // Intentionally-public routes (e.g. /api/admin/status) aren't gated and
      // are exempt from the protected-route coverage check.
      .filter((p) => !PUBLIC_ADMIN_ROUTES.includes(p))
      .sort();

    const inManifest = [...PROTECTED_ROUTES].sort();

    const missing = onDisk.filter((p) => !inManifest.includes(p));
    const stale = inManifest.filter((p) => !onDisk.includes(p));

    if (missing.length || stale.length) {
      const msg = [
        missing.length
          ? `\nNew protected routes WITHOUT gate-test coverage:\n  ${missing.join("\n  ")}\n\nAdd these paths to PROTECTED_ROUTES in src/test/auth-gate.test.ts AND add a describe()/it() that calls expectAllMethodsRejectAnon().`
          : "",
        stale.length
          ? `\nManifest entries that no longer exist on disk:\n  ${stale.join("\n  ")}\n\nRemove them from PROTECTED_ROUTES.`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      throw new Error(msg);
    }

    expect(missing).toEqual([]);
    expect(stale).toEqual([]);
  });
});
