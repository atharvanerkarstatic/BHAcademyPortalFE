import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
  env: core.env,
  extends: [core, react, next, tanstack, cloudflare],
  ignorePatterns: [
    ...(cloudflare.ignorePatterns ?? []),
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
    "benchmarks/**",
  ],
  options: { typeAware: true },
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
      // Generic JSON serialization boundaries (`apiFetch<T>`, `portalGet<T>`) typed by caller contract
      files: ["src/lib/api.ts", "src/lib/portal-client.ts"],
      rules: {
        "typescript/no-unsafe-type-assertion": "off",
      },
    },
    {
      // AuthProvider synchronously reads/clears non-HttpOnly auth sync cookies across browsers
      files: ["src/lib/auth-context.tsx"],
      rules: {
        "unicorn/no-document-cookie": "off",
      },
    },
  ],
  rules: {
    // Allow console.warn / console.error for server diagnostics; keep console.log banned
    "no-console": ["error", { allow: ["warn", "error"] }],

    // Standard Web API & error class checks (`FormData`, `ApiError`, `HTMLElement`)
    "@nkzw/no-instanceof": "off",

    // Internal React Compiler unsupported-syntax notice (`finally` blocks), not a code bug
    "react/todo": "off",

    // Allow DataTable column `cell: (row) => <...>` render props while still catching real nested components
    "react/no-unstable-nested-components": ["error", { allowAsProps: true }],

    // Next.js `"use server"` actions and page exports idiomatically use function declarations
    "func-style": "off",

    // Dynamic backend/S3 thumbnail & blob URLs use `<img>` with `onError` fallback
    "nextjs/no-img-element": "off",

    // Empty strings `""` are intentionally falsy for form inputs and API fallback strings
    "typescript/strict-boolean-expressions": "off",
    "typescript/prefer-nullish-coalescing": "off",

    // Avoid conflict with `require-await` on Promise-returning pass-through helpers
    "typescript/promise-function-async": "off",

    // Allow `void` operator to explicitly mark intentionally unawaited promises (`no-floating-promises`)
    "no-void": ["error", { allowAsStatement: true }],

    // Allow complex form/page components without artificial splitting thresholds
    complexity: "off",
  },
});
