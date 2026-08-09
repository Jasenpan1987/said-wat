import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.cts"],
    // Sandboxed Electron preloads must be CommonJS; require is required there
    // even though the rest of the project is ESM.
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // `release/` is electron-builder's output (packaged apps and compiled
    // bundles), not source. Same reason dist/ is here.
    ignores: ["dist/", "release/", "node_modules/", "*.config.*"],
  }
);
