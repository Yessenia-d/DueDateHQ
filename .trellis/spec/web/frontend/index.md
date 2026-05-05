# Web Frontend Guidelines

## Pre-Development Checklist

Before editing `apps/web`, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `.trellis/spec/ui/frontend/index.md` for shared component rules
- The relevant feature spec under `specs/`

## Package Responsibility

`apps/web` owns the React app shell, routes, route-level data loading, and
product-specific UI. Shared primitives come from `@due-date-hq/ui`; API data
comes through tRPC.

## Current Structure

```txt
apps/web/src/main.tsx
apps/web/src/routes/
apps/web/src/components/
apps/web/src/utils/trpc.ts
```

`main.tsx` creates the TanStack Router, injects `trpc` and `queryClient` into
router context, and wraps the app in `QueryClientProvider`.

## Implementation Rules

- Add pages as TanStack file routes under `src/routes`.
- Keep product-specific components under `src/components/<feature>/` when they
  are reused by multiple routes.
- Use `trpc.<procedure>.queryOptions()` with React Query for server state.
- Keep local component state local. Do not add global state unless a workflow
  truly spans unrelated routes.
- Import shared UI primitives through `@due-date-hq/ui/components/*`.
- Keep trust and verification state visible in deadline, coverage, import, and
  notice views.

## UX Rules

- The default product surface should be work-focused, dense, and scannable.
- Prefer explicit filters, badges, tables/lists, and action menus over
  marketing-style sections.
- Do not hide `Needs review`, `Coverage gap`, `Unsupported`, or user-provided
  status behind generic "warning" labels.
- For dashboards, keep due-date horizon, client/profile, jurisdiction, task
  status, and verification status easy to scan.

## Verification

- Run `pnpm check-types`.
- For route/layout changes, run a browser check against the dev server.
