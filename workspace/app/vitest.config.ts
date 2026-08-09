import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Scaffold has no tests yet (T-002 onwards add real ones); keep the
    // check green instead of failing on an empty suite.
    passWithNoTests: true,
  },
});
