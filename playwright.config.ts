import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — smoke tests against the Vercel preview URL.
 *
 * The smoke suite is intentionally read-only and unauthenticated. It
 * runs against a real Vercel preview deployment (so real Clerk, real
 * Redis, real /api/me, real Next.js routing) but never writes or
 * authenticates. That keeps tests safe to run in any environment
 * and avoids needing a Clerk test-user token.
 *
 * BASE_URL is set by the workflow after the preview deployment is
 * ready (.github/workflows/playwright.yml uses
 * patrickedqvist/wait-for-vercel-preview to detect the URL). Locally,
 * set BASE_URL yourself or default to runladder.com production for a
 * quick spot-check:
 *
 *   BASE_URL=https://your-preview.vercel.app npx playwright test
 *   npx playwright test                       # defaults to prod
 */
const BASE_URL = process.env.BASE_URL || "https://runladder.com";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: process.env.CI ? "on-first-retry" : "off",
    screenshot: process.env.CI ? "only-on-failure" : "off",
    // Be polite — preview deployments are real Vercel deployments and
    // we don't want to slam Anthropic / Redis with concurrent calls.
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
