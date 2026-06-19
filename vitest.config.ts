import { defineConfig } from "vitest/config";
import path from "node:path";

// Two test "projects" share one config:
//   - node:       lib/ unit tests + API route-handler tests (Prisma is mocked)
//   - components: React form/UI tests in jsdom
// Playwright E2E lives separately in /e2e and is run via `npm run e2e`.
//
// JSX is handled by Vitest's built-in esbuild (tsconfig has jsx: "react-jsx",
// the automatic runtime), and the "@/..." alias is resolved below — so we need
// no extra Vite plugins (which would drag in a conflicting Babel chain).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    globals: true,
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    setupFiles: ["./test/setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["test/unit/**/*.test.ts", "test/api/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["test/components/**/*.test.tsx"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["lib/**", "app/api/**", "components/**", "auth.ts", "auth.config.ts"],
      exclude: ["lib/generated/**", "**/*.d.ts"],
    },
  },
});
