import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      reporter: ["text", "html"],
      // NFR-13: the logic in lib/ is what we can unit test; keep it well covered.
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 90 },
    },
  },
});
