/**
 * Smoke tests against the Vercel preview deployment.
 *
 * Design rule: this suite catches CATASTROPHIC failures — page returns
 * 5xx, JS error blocks the body, auth gate is missing — not UI text
 * regressions. Content-specific tests belong in a separate UI suite
 * once we set up authenticated test fixtures.
 *
 * Every test in this file is safe to run against any environment, in
 * any order, repeatedly. Read-only, no mutations.
 */
import { expect, test } from "@playwright/test";

/**
 * Asserts a page navigates, returns sub-400, and has non-trivial body
 * content (so we know it didn't render a blank error page).
 */
async function expectPageRenders(page, url: string, minBodyChars = 200) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  const status = response?.status() ?? 0;
  expect(status, `${url} status`).toBeLessThan(400);

  // Give client-side hydration a moment without going full networkidle
  // (preview URLs sometimes have analytics that prevent idle).
  await page.waitForLoadState("load");
  const body = await page.locator("body").textContent();
  expect((body || "").trim().length, `${url} body should not be empty`).toBeGreaterThan(
    minBodyChars,
  );
}

test.describe("Marketing surfaces render", () => {
  test("homepage", async ({ page }) => {
    await expectPageRenders(page, "/");
    await expect(page).toHaveTitle(/Ladder/i);
  });

  test("framework page", async ({ page }) => {
    await expectPageRenders(page, "/framework");
  });

  test("pricing page", async ({ page }) => {
    await expectPageRenders(page, "/pricing");
  });

  test("top-100 page", async ({ page }) => {
    await expectPageRenders(page, "/top-100");
  });

  test("teams page", async ({ page }) => {
    await expectPageRenders(page, "/teams");
  });

  test("products page", async ({ page }) => {
    await expectPageRenders(page, "/products");
  });
});

test.describe("Product surfaces gate correctly when unauthenticated", () => {
  test("/score page loads for anonymous users (anon scoring allowed)", async ({
    page,
  }) => {
    await expectPageRenders(page, "/score");
  });

  test("/dashboard redirects anonymous users to a sign-in surface", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    // Clerk either redirects to /login or renders an inline sign-in
    // component. We accept any signal that the unauthenticated visitor
    // can't reach the dashboard's actual content.
    const url = page.url();
    const body = (await page.locator("body").textContent()) || "";
    const onAuthSurface =
      /\/login|\/sign-up|sign[- ]?in|continue/i.test(url) ||
      /sign in|continue with|email|password|magic|verify/i.test(body);
    expect(onAuthSurface, `Expected sign-in surface from /dashboard, got ${url}`).toBe(true);
  });

  test("/dashboard/team redirects anonymous users to a sign-in surface", async ({
    page,
  }) => {
    await page.goto("/dashboard/team", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    const url = page.url();
    const body = (await page.locator("body").textContent()) || "";
    const onAuthSurface =
      /\/login|\/sign-up|sign[- ]?in|continue/i.test(url) ||
      /sign in|continue with|email|password|magic|verify/i.test(body);
    expect(onAuthSurface).toBe(true);
  });

  test("/login renders an auth form with at least one input", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    const inputs = page.locator("input");
    await expect(inputs.first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("API gates behave correctly for anonymous callers", () => {
  test("/api/dashboard rejects anonymous callers", async ({ request }) => {
    const res = await request.get("/api/dashboard");
    expect([401, 403]).toContain(res.status());
  });

  test("/api/admin/users rejects anonymous callers", async ({ request }) => {
    const res = await request.get("/api/admin/users");
    expect([401, 403]).toContain(res.status());
  });

  test("/api/dashboard/team rejects anonymous callers", async ({ request }) => {
    const res = await request.get("/api/dashboard/team");
    expect([401, 403, 404]).toContain(res.status());
  });

  test("/api/admin/feedback rejects anonymous callers", async ({
    request,
  }) => {
    const res = await request.get("/api/admin/feedback");
    expect([401, 403]).toContain(res.status());
  });
});
