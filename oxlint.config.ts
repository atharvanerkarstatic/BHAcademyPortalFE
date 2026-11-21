import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...cloudflare,
  ignorePatterns: [
    ...(cloudflare.ignorePatterns ?? []),
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
    "benchmarks/**",
  ],
  overrides: [
    ...(cloudflare.overrides ?? []),
    {
      files: ["**/*.tsx"],
      rules: {
        "@typescript-eslint/no-misused-promises": [
          "error",
          { checksVoidReturn: { attributes: false } },
        ],
      },
    },
    {
      // Generated shadcn/Radix UI primitives use `import * as React`
      files: ["src/components/ui/**/*.{ts,tsx}"],
      rules: {
        "import/no-namespace": "off",
      },
    },
    {
      // Next.js statically parses `export const config = { matcher: [...] }` and requires string literals
      files: ["proxy.ts"],
      rules: {
        "unicorn/prefer-string-raw": "off",
      },
    },
    {
      // Temporarily disabled on legacy edit/detail pages during incremental migration
      files: ["app/**/*.{ts,tsx}"],
      rules: {
        "typescript/no-floating-promises": "off",
      },
    },
  ],
  rules: {
    ...cloudflare.rules,

    // Allow console.warn / console.error for server diagnostics; keep console.log banned
    "no-console": ["error", { allow: ["warn", "error"] }],

    // Standard Web API & error class checks (`FormData`, `ApiError`, `HTMLElement`)
    "@nkzw/no-instanceof": "off",

    // Temporarily disabled during incremental legacy-page migration (enable one rule at a time)
    "no-unused-vars": "off",
    "react-hooks/exhaustive-deps": "off",
    "react/preserve-manual-memoization": "off",
    "typescript/array-type": "off",
    "typescript/no-floating-promises": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "unicorn/catch-error-name": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/prefer-number-properties": "off",
    "unicorn/prefer-string-slice": "off",
    "quality/no-known-value-widening": "off",
    "quality/no-unsafe-dictionary-type": "off",
  },
});
