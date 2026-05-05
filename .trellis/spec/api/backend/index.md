# API Backend Guidelines

## Pre-Development Checklist

Before editing `packages/api`, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- The task PRD
- The relevant feature spec in `specs/`

## Package Responsibility

`packages/api` owns the tRPC API surface, procedure definitions, request
context, and API-level validation. It should expose typed routers to both the
Hono server and the React web app.

## Current Structure

```txt
packages/api/src/index.ts
packages/api/src/context.ts
packages/api/src/routers/index.ts
```

`index.ts` creates shared tRPC helpers. `context.ts` adapts Hono request context
into tRPC context. `routers/index.ts` registers the app router and exports
`AppRouter`.

## Implementation Rules

- Keep all router registration centralized in `src/routers/index.ts`.
- Add feature routers under `src/routers/<feature>.ts` and register them from
  the app router.
- Validate all mutation input with Zod at the procedure boundary.
- Business procedures must require session and firm context after auth lands.
- Keep public procedures limited to health/status or unauthenticated auth flows.
- Return data shapes designed for the UI workflow, not raw database rows when a
  screen needs grouped or explained state.

## Product Contract Reminders

- API responses that expose deadline tasks must carry trust state clearly:
  verified, needs review, source changed, unsupported, coverage gap, or
  user-provided.
- Notice proposal APIs must expose before/after diffs and never apply workspace
  mutations until approval.

## Verification

- Run `pnpm check-types`.
- Add focused API tests near new routers once the test harness exists.
