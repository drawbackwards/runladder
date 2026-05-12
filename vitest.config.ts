import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest config — fast, no-jsdom, pure Node.
 *
 * Tests live next to the lib they cover (src/lib/foo.test.ts) so the
 * unit + the test are co-located and easy to find. `@/...` import
 * alias matches the Next.js tsconfig so test files can use the same
 * import paths as production code.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Tests should never reach a real network or Redis. If something
    // tries to, vitest will surface the import in a stack trace.
    globals: false,
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts", "src/lib/**/types.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
