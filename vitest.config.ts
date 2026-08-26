import { defineConfig } from "vitest/config";

// Root config so a bare `vitest` / `bun run test` runs the same suites as CI
// (unit + integration), each with its own environment and aliases, instead of
// collecting every *.test/*.spec file with no config. Component/form tests run
// via `bun run test:form*` (vitest.config.form.ts) and Playwright e2e specs
// via `bun run test:e2e`.
export default defineConfig({
  test: {
    projects: [
      { extends: "./vitest.config.unit.ts", test: { name: "unit" } },
      { extends: "./vitest.config.integration.ts", test: { name: "integration" } },
    ],
  },
});
