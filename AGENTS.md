# Repository guide

## Commands

- Prefer `bun` over `npm` for package management and running scripts (update `bun.lock` with `bun install`).
- Use `bun install --frozen-lockfile` for reproducible installs from `bun.lock`.
- Run `bun run dev` for development; run `bun run build` before `bun run start` for production.
- Run `bun run lint` (`oxlint` with Ultracite + `@cloudflare/oxlint-config`); scope it with `bun run lint -- 'app/(portal)/categories/page.tsx'`.
- Run `bun run check` (`ultracite check`) to verify formatting (`oxfmt`) and linting together; run `bun run fix` (`ultracite fix`) to format and auto-fix.
- Run `bunx next typegen` before `bunx tsc --noEmit` so generated route types exist.
- There is no test runner or test script configured.

## App and API boundaries

- Routes live in root `app/`, but `@/*` resolves to `src/*`, not the repository root.
- `app/(portal)/layout.tsx` gates the authenticated shell and initializes `AuthProvider`.
- Keep feature API calls in `src/features/<feature>/action.ts` (`"use server"`) with payload/response types in the adjacent `types.ts`.
- Use server-side `apiFetch` from `src/lib/api.ts` for authenticated backend requests. It adds bearer tokens, disables caching, retries after token refresh, and throws `ApiError`. Pass paths relative to the API base, such as `/v1/category`; the base already includes `/api`.
- UI pagination is 1-based; existing list actions convert it to the backend's 0-based `page`.
- `src/config/env.ts` selects the backend with `APP_ENV` (`dev` by default). `uat` and `prod` contain invalid placeholder URLs; configure them before use. The default connects to a hosted development backend, not a local service.

## Authorization

- Root `proxy.ts` handles session refresh and route authorization; do not add a parallel `middleware.ts`.
- When adding protected routes, update `src/lib/route-permissions.ts` and `src/components/layout/nav-items.ts`. Route rules are first-match: put specific create/edit rules before broad list rules. Unmatched routes are allowed for users with any accessible app route.
- Check permissions inside server actions as well as in navigation. Use `hasPermission` with combined roles and permissions; arrays mean OR, and `system.all` / `ROLE_ADMINISTRATOR` bypass individual checks.
- Reuse `refreshTokens` in `src/lib/auth-api.ts` and cookie builders in `src/lib/auth-cookies.ts`; refresh requests are deduplicated, and token cookies are HTTP-only.

## UI configuration

- Tailwind v4 theme tokens and imports live in `app/globals.css`; there is no Tailwind config file.
- Follow `components.json` for shadcn generation: `radix-nova`, the unified `radix-ui` package, Lucide icons, and `src/components/ui`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
