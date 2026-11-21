import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "learning/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: { globals: { ...globals.browser, chrome: "readonly" } },
    rules: {
      // NFR-7: note text is rendered as plain text only, never parsed as HTML.
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
          message: "Use textContent: notes must never be parsed as HTML (NFR-7).",
        },
        {
          selector: "CallExpression[callee.property.name=/^(insertAdjacentHTML|write)$/]",
          message: "Do not inject HTML: notes must never be parsed as HTML (NFR-7).",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
