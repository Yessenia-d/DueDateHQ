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

## Scenario: Auth and Firm Workspace Session

### 1. Scope / Trigger

- Trigger: email/password auth crosses Hono HTTP handlers, Better Auth, D1
  schema, tRPC context, and the React app shell.
- Use this pattern for the Beta firm workspace boundary. Do not add multi-user
  firm membership, invitations, OAuth, MFA, or password reset until those have
  their own task and spec.

### 2. Signatures

- HTTP auth base path: `/api/auth/*`, mounted by `apps/server/src/index.ts`.
- Auth factory:
  `createDueDateAuth({ corsOrigin, db, request, secret }): DueDateAuth`.
- Firm bootstrap:
  `ensureFirmForUser(db, firmOwner, firmName?): Promise<Firm>`.
- tRPC context:
  `createContext({ context }): { auth, firm, session }`.
- Session guard:
  `requireFirmSession(ctx): SessionContext`.
- API procedures:
  `auth.session(): SerializedFirmSession | null` and
  `auth.workspace(): SerializedFirmSession`.
- DB tables: `auth_users`, `auth_sessions`, `auth_accounts`,
  `auth_verifications`, and `firms`.

### 3. Contracts

- Server env/bindings required for auth: `DB`, `CORS_ORIGIN`, and
  `BETTER_AUTH_SECRET`.
- Web env required for local/API calls: `VITE_SERVER_URL`.
- Register accepts Better Auth email/password input plus optional `firmName`.
  The user create hook must create or resolve exactly one firm for the owner.
- `firms.owner_user_id` is unique and references `auth_users.id`; later Beta
  business data must attach to the firm context, not only the user.
- `auth.session` is public so the app shell can discover login state. It must
  return only serialized user, firm, and session expiry fields needed by the UI.
- `auth.workspace` and later business procedures must call
  `requireFirmSession` before returning firm-owned data.
- Local development must allow equivalent loopback origins with the same port
  (`localhost`, `127.0.0.1`, `::1`) for both CORS and Better Auth trusted
  origins.

### 4. Validation & Error Matrix

- Missing session on a protected procedure -> `UNAUTHORIZED` with
  `Sign in to access this firm workspace.`
- Existing user without a firm -> call `ensureFirmForUser` in context and
  resolve/create the firm before exposing a session.
- Concurrent firm bootstrap insert collision -> re-read by `owner_user_id`;
  only throw if the firm still cannot be resolved.
- Browser origin is a configured loopback alias -> allow it.
- Browser origin is not configured and not an allowed loopback alias -> reject
  through CORS/Better Auth origin checks.
- Missing `BETTER_AUTH_SECRET` in production-like deployment -> invalid config;
  do not ship with an implicit production secret.

### 5. Good/Base/Bad Cases

- Good: register with `firmName`, receive a session cookie, and
  `auth.session` returns `{ user, firm, session.expiresAt }`.
- Base: register without `firmName`; the firm defaults to
  `<user name>'s firm`.
- Bad: a React route reads workspace data from user email or local storage
  instead of calling a firm-session-backed API.
- Bad: `localhost:3001` works but `127.0.0.1:3001` fails in local dev.

### 6. Tests Required

- API test asserts `auth.session` returns `null` without a session.
- API test asserts protected workspace access rejects unauthenticated callers.
- API or integration test asserts firm bootstrap is idempotent per owner user.
- Browser/manual check covers register or login -> logged-in home -> logout.
- Typecheck must cover API, DB, server, and web packages.

### 7. Wrong vs Correct

#### Wrong

```typescript
export const businessRouter = router({
  list: publicProcedure.query(({ ctx }) => {
    return listRowsForUser(ctx.session?.user.id);
  }),
});
```

#### Correct

```typescript
export const businessRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    const session = requireFirmSession(ctx);
    return listRowsForFirm(session.firm.id);
  }),
});
```

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
