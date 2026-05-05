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

## Scenario: Feature Progress Read Model

### 1. Scope / Trigger

- Trigger: a route-level feature progress surface crosses DB schema, tRPC API,
  and web route boundaries.
- Use this pattern for internal/reviewer read models that summarize Beta feature
  status without becoming a project-management system.

### 2. Signatures

- DB table: `feature_items(id, category, name, description, spec_path, status,
  priority, updated_at)`.
- Status enum: `done | in_progress | blocked | not_started`.
- Priority enum: `p0 | p1 | p2`.
- API procedure: `progress.list(): FeatureProgressList`.
- Web consumer: `trpc.progress.list.queryOptions()` from `/progress`.

### 3. Contracts

- `FeatureProgressList.generatedAt` is an ISO timestamp for the response build
  time.
- `statuses` and `priorities` return the canonical enum order used by the UI.
- `overall` and `p0Readiness` include `totalCount`, `completedCount`, and
  integer `percentComplete`.
- `groups[]` is grouped by product area and each group includes status counts
  plus sorted `items[]`.
- Each item must include a repo-relative `specPath` under `specs/*.md`.
- Until auth/session enforcement and persisted admin updates exist, the Beta
  implementation may serve seeded progress data through a public read
  procedure; do not expose write procedures as public.

### 4. Validation & Error Matrix

- Unknown status -> reject at the schema/type boundary before it reaches the UI.
- Unknown priority -> reject at the schema/type boundary before it reaches the
  UI.
- Empty item set -> return `0` percent complete, not `NaN`.
- Missing or non-spec path -> test failure; progress rows must stay traceable to
  an SDD spec.
- Future write/update route without session and firm/admin guard -> invalid
  implementation.

### 5. Good/Base/Bad Cases

- Good: a P0 item marked `done` increments both overall and P0 readiness.
- Base: a seeded `not_started` item appears in its category with a valid spec
  path and contributes to totals.
- Bad: a UI-only hardcoded row exists on `/progress` that is absent from
  `progress.list`.

### 6. Tests Required

- API test asserts all required Beta feature names are present.
- API test asserts every item status is one of the exported canonical statuses.
- API test asserts every `specPath` matches `specs/<name>.md`.
- API test asserts derived totals and percentages match the returned items.
- Route/browser check verifies `/progress` renders grouped data from the API.

### 7. Wrong vs Correct

#### Wrong

```typescript
export const progressRouter = router({
  list: publicProcedure.query(() => [{ name: "Auth", status: "working" }]),
});
```

#### Correct

```typescript
export const progressRouter = router({
  list: publicProcedure.query(() => listFeatureProgress()),
});
```

## Verification

- Run `pnpm check-types`.
- Add focused API tests near new routers once the test harness exists.
