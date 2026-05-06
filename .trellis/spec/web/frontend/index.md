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
- Do not hide `Needs review`, `Coverage gap`, `Unsupported`, or entered-deadline
  status behind generic "warning" labels.
- For dashboards, keep due-date horizon, client/profile, jurisdiction, task
  status, and verification status easy to scan.
- Empty workspaces should guide CPAs to `Import clients and tax profiles` as the
  primary first step. Manual client creation remains available as a secondary
  path, not a prerequisite.
- Keep `Import` as a first-level workflow entry when CSV import can create or
  match Client Relationships and Filing Profiles. Use narrower labels such as
  `Import tax info for this client` only in an existing-client context.
- Account pages belong in the account menu rather than the primary Work or
  Management navigation. The sidebar user area should open keyboard-accessible
  Profile, Settings, Achievements, and Log out menu actions.
- Account achievement pages are workspace ledgers, not gamified progress
  surfaces. Keep copy factual, do not show badges/streaks/confetti, and do not
  imply legal compliance or complete coverage.
- Achievement ring or donut charts must include accessible labels plus visible
  text rows with labels, counts, and percentages; chart color is secondary and
  must not be the only encoding.
- Zero-task account achievement states must use explicit empty language and must
  not display a misleading productivity average.
- When rendering official due dates received as ISO strings, format them with
  `timeZone: "UTC"` unless the API explicitly returns a local time event. Due
  dates are calendar-day facts, and browser-local timezone formatting can show
  them one day early.

## Verification

- Run `pnpm check-types`.
- For route/layout changes, run a browser check against the dev server.
