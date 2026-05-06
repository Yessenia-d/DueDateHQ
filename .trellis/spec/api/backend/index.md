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
- Keep `packages/api` enrolled in root verification with a `check-types`
  package script so router implementations and router tests are covered by
  `pnpm check-types`.

## Product Contract Reminders

- API responses that expose deadline tasks must carry trust state clearly:
  verified, needs review, source changed, unsupported, coverage gap, or
  entered deadline.
- Evidence responses for deadline tasks should expose field-level task update
  history for status, due-date fields, and task-table notes in addition to
  date-specific event history.
- Notice proposal APIs must expose before/after diffs and never apply workspace
  mutations until approval.
- IRS due-date adjustment logic must treat District of Columbia legal holidays
  as legal holidays, not only federal holidays. For example, if April 15 falls
  on a Saturday and DC Emancipation Day is observed on Monday, the adjusted
  deadline moves to Tuesday.

## Scenario: Notice Proposal Review and Source Monitor Controls

### 1. Scope / Trigger

- Trigger: code exposes official-source notices, human proposal decisions, or
  source-monitor controls across DB, API, and web UI.

### 2. Signatures

- `notices.list({ includeDecideLater?: boolean, limit?: number }): { notices }`.
- `notices.get({ noticeId: string }): NoticeDetailResponse`.
- `noticeProposals.listForNotice({ noticeId: string }): { proposals }`.
- `noticeProposals.approve|reject|decideLater({ proposalId: string })`.
- `noticeProposals.bulkApprove|bulkReject|bulkDecideLater({ proposalIds: string[] })`.
- `officialSources.list(): { sources }`.
- `officialSources.setActive({ sourceId: string, active: boolean })`.
- `officialSources.enqueueCheck({ sourceId: string })`.

### 3. Contracts

- CPA-facing notice APIs must require firm session and return only
  `workspace_alert` notices with `high | medium` confidence.
- Notice proposal rows are firm-owned and scoped by `firm_id`; actions must
  write audit logs before mutating tasks or profile coverage.
- `pending` and `decide_later` proposals remain reviewable. `approved` and
  `rejected` rows remain historical but should not drive top banner alerts.
- Monitor `active=false` preserves source history and blocks user-queued checks;
  it must not delete source, run, snapshot, notice, or proposal rows.
- Captured official links must remain visible in notice review surfaces.
- Notice review opens in contextual drawers from banners and the Notices page;
  standalone detail routes are secondary.

### 4. Validation & Error Matrix

- Missing firm session -> `UNAUTHORIZED`.
- Unknown notice/proposal/source id -> `NOT_FOUND`.
- Low-confidence or `internal_queue` notice -> `NOT_FOUND` from CPA-facing
  detail/action paths.
- Disabled official source passed to `enqueueCheck` -> `BAD_REQUEST`.
- Proposal action with invalid after-state fields -> Zod validation error before
  workspace mutation.

### 5. Good/Base/Bad Cases

- Good: a high-confidence IRS notice with a pending task update appears in the
  banner and Notices page, shows the captured official URL, and only mutates the
  task after approval with audit history.
- Base: a medium-confidence source-change notice creates a coverage review
  proposal and can be deferred without changing coverage state.
- Bad: a low-confidence internal notice appears in CPA UI, or a disabled source
  can still be queued from the UI.

### 6. Tests Required

- Router tests for firm scoping, low-confidence exclusion, active/inactive
  source behavior, individual decisions, bulk action ids, and audit writes.
- DB schema tests for notice proposal/action CHECK constraints and composite
  firm FKs.
- Web type-check for notice banner, Notices page, monitor toggles, and drawer
  review flows.

### 7. Wrong vs Correct

#### Wrong

```typescript
// Applies notice impact immediately when the monitor finds it.
await updateDeadlineTaskFromNotice(noticeImpact);
```

#### Correct

```typescript
// Persist a proposal and wait for explicit CPA approval.
await ctx.db.insert(noticeImpactProposals).values(proposal);
```

## Scenario: Tax Due-Date Calendar Adjustment

### 1. Scope / Trigger

- Trigger: code calculates official filing or extension due dates from stored
  tax rules.

### 2. Signatures

- `adjustForWeekendAndHoliday(date: Date): Date`.
- `calculateDueDates(rule: DueDateRule, taxYear: number): CalculatedDueDate[]`.

### 3. Contracts

- Fixed annual rules produce dates in `taxYear + 1`.
- Extension rules are adjusted with the same weekend/legal-holiday logic as the
  original due date.
- IRS legal-holiday adjustment includes legal holidays in the District of
  Columbia, including observed DC Emancipation Day.

### 4. Validation & Error Matrix

- Unsupported future `DueDateRule.type` -> throw through the exhaustive branch.
- Weekend due date -> next non-weekend, non-legal-holiday business day.
- Weekend followed by observed DC legal holiday -> skip both days.

### 5. Good/Base/Bad Cases

- Good: tax year 2027 Form 1040 April 15, 2028 adjusts to April 18, 2028
  because April 15 is Saturday and observed DC Emancipation Day is Monday,
  April 17.
- Base: tax year 2026 Form 1040 remains April 15, 2027.
- Bad: adjusting April 15, 2028 only to Monday, April 17, 2028.

### 6. Tests Required

- Unit test `adjustForWeekendAndHoliday` for weekend plus observed DC
  Emancipation Day.
- Unit test `calculateDueDates` for fixed rule original and extension dates
  across the same edge case.

### 7. Wrong vs Correct

#### Wrong

```typescript
while (isWeekend(adjusted) || isFederalHoliday(adjusted)) {
  adjusted.setDate(adjusted.getDate() + 1);
}
```

#### Correct

```typescript
while (isWeekend(adjusted) || isTaxDueDateLegalHoliday(adjusted)) {
  adjusted.setDate(adjusted.getDate() + 1);
}
```

## Scenario: Client Year Calendar Query

### 1. Scope / Trigger

- Trigger: code exposes a client-specific annual deadline calendar to the web app.
- Use this pattern for internal DueDateHQ calendar views. Do not use it to imply external Google, Apple, or Outlook calendar sync.

### 2. Signatures

- tRPC procedure: `clients.getYearCalendar({ clientId: string, year: number }): ClientYearCalendarResponse`.
- Response buckets: `CalendarMonthBucket[]` with exactly 12 month entries.
- Calendar items: `CalendarDeadlineItem = DeadlineTaskResponse & { profileDisplayName, month, day, isOverdue, isOfficial }`.

### 3. Contracts

- Require firm session with `requireFirmSession(ctx)`.
- Verify the `client_relationships` row belongs to the current firm before returning calendar data.
- Read from existing `deadline_tasks`; do not recalculate tax rules in this query.
- Filter `deadline_tasks` by `firm_id`, `client_relationship_id`, and `current_due_date` between `YYYY-01-01` and `YYYY-12-31`.
- Return `availableYears` from current year, next year, selected year, and years represented by the client's existing deadline tasks.
- Preserve trust state from `serializeDeadlineTask`: `verified_rule` is official; `entered_deadline` is not verified by DueDateHQ.
- Keep firm target date separate from official due date in the response and UI.

### 4. Validation & Error Matrix

- Missing session -> `UNAUTHORIZED` from `requireFirmSession`.
- Unknown or other-firm `clientId` -> `NOT_FOUND` with `Client relationship was not found.`
- `year` outside `2000..2100` or non-integer -> Zod validation error.
- No tasks for the selected year -> valid response with 12 empty month buckets.

### 5. Good/Base/Bad Cases

- Good: selected client has verified and entered deadlines in the year; response groups them by month and keeps entered deadlines not verified.
- Base: selected client has no deadlines in the year; UI renders an empty annual-calendar state.
- Bad: query includes another firm's task, another client's task, or uses unverified coverage data as an official calendar item.

### 6. Tests Required

- Router-level test for selected-year grouping and sorting.
- Assert entered deadlines retain reference note and not-verified trust label.
- Assert verified-rule deadlines set `isOfficial = true`.
- Assert other-client, other-firm, and other-year rows are excluded by the query contract.

### 7. Wrong vs Correct

#### Wrong

```typescript
// Builds an annual calendar by re-running rule matching in the read query.
const tasks = generateDeadlineTasks(profile, matchedRules, [year]);
```

#### Correct

```typescript
// Annual calendar reads the existing firm-owned task ledger.
const tasks = await ctx.db
  .select()
  .from(deadlineTasks)
  .where(and(eq(deadlineTasks.firmId, firmId), gte(deadlineTasks.currentDueDate, yearStart)));
```

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

## Scenario: Manual Client Profile and Deadline Entry

### 1. Scope / Trigger

- Trigger: manual entry crosses firm-session tRPC procedures, deadline-domain
  tables, verification request records, audit logs, and TanStack Router pages.
- Use this pattern when a CPA enters client/profile/deadline data that is useful
  operationally but is not verified official DueDateHQ rule output.

### 2. Signatures

- API procedures:
  `clients.createRelationship(input): { client }`,
  `clients.get({ clientId }): { client, profiles, deadlines }`,
  `filingProfiles.createManual(input): { profile }`,
  `deadlineTasks.createManual(input): { deadline }`, and
  `deadlineTasks.requestVerification(input): { success, requestId, status, message }`.
- Web routes:
  `/clients/new`, `/clients/:clientId`, and
  `/clients/:clientId/deadlines/new`.
- DB tables used:
  `client_relationships`, `filing_profiles`, `deadline_tasks`,
  `deadline_date_events`, `verification_requests`, and `audit_logs`.

### 3. Contracts

- Every procedure must resolve firm context through `requireFirmSession(ctx)`;
  client/profile/deadline lookups must be scoped by `firm_id`.
- Manual clients write `source_system = manual` and `created_via = manual`.
- Manual filing profiles write `created_via = manual`, normalize state codes to
  uppercase unique values, and start with `coverage_state = needs_review`.
- Manual deadlines must write `tax_rule_id = null`, `source_type =
  entered_deadline`, `created_via = manual`, and a required
  `entered_deadline_reference_note`.
- Manual deadline request payloads use `referenceNote`; responses expose
  `enteredDeadlineReferenceNote`, `referenceNote`, and the trust label
  `Entered deadline - Not verified by DueDateHQ`. The UI must display API trust
  labels/reference data instead of inferring trust from local route state.
- `firm_target_date` is optional planning data and must remain separate from
  `current_due_date`; writing a firm target may create a
  `deadline_date_events.firm_target_change` event, but the initial
  entered deadline must not be recorded as an official date event.
- `deadlineTasks.requestVerification` creates a
  `verification_requests.request_type = manual_deadline` row and an audit log;
  it must not mutate the original `deadline_tasks` row.

### 4. Validation & Error Matrix

- Missing session -> `UNAUTHORIZED` from `requireFirmSession`.
- `clients.get` with a client outside the firm -> `NOT_FOUND`.
- `filingProfiles.createManual` with a missing or cross-firm client ->
  `NOT_FOUND`.
- `deadlineTasks.createManual` with a profile that does not belong to the
  client and firm -> `NOT_FOUND`.
- Date input not in real `YYYY-MM-DD` form -> Zod validation failure before DB
  writes.
- Empty reference note for a manual deadline -> Zod validation failure.
- `deadlineTasks.requestVerification` for a missing task -> `NOT_FOUND`.
- `deadlineTasks.requestVerification` for an official/non-entered-deadline task ->
  `BAD_REQUEST`.

### 5. Good/Base/Bad Cases

- Good: create client -> create manual profile -> create entered deadline
  with a reference note -> request verification; the deadline still has
  `sourceType = entered_deadline`.
- Base: create a manual deadline with no firm target date; no firm-target date
  event is required.
- Base: create a manual recurring deadline; recurrence is visible as an entered
  deadline and not verified by DueDateHQ.
- Bad: request verification rewrites `tax_rule_id`, `source_type`, or
  `current_due_date` on the original deadline task.
- Bad: the UI labels a manual deadline as verified because it has a due date.

### 6. Tests Required

- API test covers manual client creation and firm-scoped `clients.get` detail
  response.
- API test covers manual filing profile creation with normalized states and
  `needs_review` coverage state.
- API test covers manual one-time and recurring deadline creation, including
  trust label, source type, required reference note, optional firm target, and
  audit/date-event behavior.
- API test covers verification request creation and asserts the original
  deadline task is unchanged.
- API test rejects verification requests for official/non-entered-deadline
  tasks.
- Route check verifies `/clients/new`, `/clients/:clientId`, and
  `/clients/:clientId/deadlines/new` render through the app router.

### 7. Wrong vs Correct

#### Wrong

```typescript
export const deadlineTasksRouter = router({
  requestVerification: publicProcedure.mutation(async ({ ctx, input }) => {
    await ctx.db
      .update(deadlineTasks)
      .set({ sourceType: "official_rule", taxRuleId: input.taxRuleId })
      .where(eq(deadlineTasks.id, input.deadlineTaskId));
  }),
});
```

#### Correct

```typescript
export const deadlineTasksRouter = router({
  requestVerification: publicProcedure.mutation(async ({ ctx, input }) => {
    const session = requireFirmSession(ctx);
    const deadline = await getFirmScopedDeadline(ctx.db, session.firm.id, input.deadlineTaskId);

    if (deadline.sourceType !== "entered_deadline") {
      throw new TRPCError({ code: "BAD_REQUEST" });
    }

    return createManualDeadlineVerificationRequest(ctx.db, deadline.id);
  }),
});
```

## Scenario: Client Relationship List Read Model

### 1. Scope / Trigger

- Trigger: a client index surface crosses firm-scoped tRPC reads, deadline-domain
  tables, TanStack Router navigation, and React Query consumers.
- Use this pattern when adding a browsable relationship list before create or
  detail workflows.

### 2. Signatures

- API procedure: `clients.list(): { clients: ClientListItemResponse[] }`.
- List item fields: all `ClientRelationshipResponse` fields plus
  `filingProfileCount: number` and `deadlineTaskCount: number`.
- Web route: `/clients` consumes `trpc.clients.list.queryOptions()`.
- Related routes: `/clients/new` creates a relationship and
  `/clients/:clientId` shows detail.
- DB tables used: `client_relationships`, `filing_profiles`, and
  `deadline_tasks`.

### 3. Contracts

- `clients.list` must call `requireFirmSession(ctx)` and must scope every DB
  read by `firm_id = session.firm.id`.
- The response must be ordered by `client_relationships.display_name`
  ascending for stable scan order.
- Count fields are non-negative integers derived from firm-scoped
  `filing_profiles` and `deadline_tasks`; missing counts return `0`.
- The `/clients` route is the sidebar destination. Creation remains an
  explicit action to `/clients/new`.
- Row navigation must target `/clients/:clientId`; the list route must not
  inline the detail or creation forms.

### 4. Validation & Error Matrix

- Missing session -> `UNAUTHORIZED` from `requireFirmSession`.
- No firm-owned relationships -> return `{ clients: [] }`, not an error.
- Relationships, profiles, or deadline tasks from another firm -> excluded by
  the firm-scoped query.
- Future filter/search input with invalid shape -> Zod validation failure at
  the procedure boundary before querying.

### 5. Good/Base/Bad Cases

- Good: a firm with two relationships sees both rows sorted by display name
  with profile and deadline counts.
- Base: a new firm sees an empty list state with a create action.
- Bad: clicking `Clients` opens `/clients/new` and bypasses the relationship
  list.
- Bad: counts are computed from all firms and leak cross-firm totals.

### 6. Tests Required

- API test asserts `clients.list` returns firm-owned relationships with profile
  and deadline counts.
- API test or mock setup should cover the empty response path.
- Typecheck must cover the API response type consumed by `/clients`.
- Route/browser check verifies sidebar `Clients` opens `/clients`, row links
  open detail, and the create action opens `/clients/new`.

### 7. Wrong vs Correct

#### Wrong

```typescript
export const clientsRouter = router({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.select().from(clientRelationships);
  }),
});
```

#### Correct

```typescript
export const clientsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const session = requireFirmSession(ctx);

    const clients = await ctx.db
      .select()
      .from(clientRelationships)
      .where(eq(clientRelationships.firmId, session.firm.id))
      .orderBy(asc(clientRelationships.displayName));

    return { clients: clients.map(serializeClientRelationship) };
  }),
});
```

## Scenario: Dashboard

### 1. Scope / Trigger

- Trigger: the dashboard surface crosses deadline-domain tables, tRPC
  read/write procedures, TanStack React Query consumers, task-table UI,
  evidence drawer UI, CSV export, and audit/date-event history.
- Use this pattern for deadline task work surfaces. Do not add bulk official
  due-date editing to the dashboard API.

### 2. Signatures

- API procedures:
  `dashboard.summary(input?): DashboardSummaryResponse`,
  `dashboard.export(input?): DashboardExportResponse`,
  `dashboard.bulkExportCurrentFilteredView(input?): DashboardExportResponse`,
  `tasks.updateStatus(input): { taskId, status }`,
  `tasks.bulkUpdateStatus(input): { updatedCount }`,
  `tasks.updateFirmTargetDate(input): { taskId, firmTargetDate }`,
  `tasks.bulkUpdateFirmTargetDate(input): { updatedCount }`, and
  `tasks.getEvidence(input): TaskEvidenceResponse`.
- Dashboard filters:
  `horizon`, `clientRelationshipId`, `filingProfileId`, `obligation`,
  `jurisdiction`, `entityType`, `taxCategory`, `taskStatus`,
  `verificationStatus`, and `sort`.
- Web consumer: `/` uses `trpc.dashboard.summary.queryOptions(filters)` and
  dashboard/task mutations from the typed router.

### 3. Contracts

- `dashboard.summary` returns `Overdue`, `Due this week`, `This month`, and
  `Long range` sections by default, plus `allTasks`, `summary`,
  `filterOptions`, `today`, and `generatedAt`.
- Task rows expose client relationship, filing profile, obligation,
  jurisdiction, entity type, tax category, current official due date, optional
  firm target date, countdown/days overdue, work-progress status, priority,
  extension state, verification badge data, and evidence availability.
- Row UI must show only the current due date inline; original due date and date
  event history belong in `tasks.getEvidence`.
- Firm target dates are planning metadata. Updating them must not mutate
  `current_due_date` or represent the target as an official due date.
- `dashboard.export` and `dashboard.bulkExportCurrentFilteredView` export the
  current filtered task view with official due date, original due date, firm
  target date, verification status, source evidence, priority, extension state,
  and notes in separate columns.
- Evidence responses include current due date, original due date, optional firm
  target date, source details, verification status, current and previous rule
  version context, and date events with source names/URLs when present.

### 4. Validation & Error Matrix

- Missing session on dashboard/task business procedures -> `UNAUTHORIZED` from
  `requireFirmSession`.
- Task ID outside the firm -> `NOT_FOUND`.
- Status outside `not_started | in_progress | waiting_on_client | done` -> Zod
  validation failure.
- Firm target date outside real `YYYY-MM-DD` form -> Zod validation failure.
- Bulk mutation with no task IDs -> Zod validation failure.
- Evidence request for a missing task -> `NOT_FOUND`.
- Attempt to add a bulk official due-date edit endpoint under dashboard/tasks
  -> invalid implementation for Beta.

### 5. Good/Base/Bad Cases

- Good: filter by `obligation`, jurisdiction, entity type, tax category,
  status, and verification; the API returns updated sections and export uses
  the same filtered rows.
- Good: a source-changed task remains visible with warning trust state and
  evidence explaining source/version lineage.
- Base: a new firm with no tasks sees all four dashboard sections with zero
  counts and empty-state rows.
- Bad: firm target date update rewrites `current_due_date`.
- Bad: original due date is displayed inline in the task row instead of only in
  the evidence drawer.

### 6. Tests Required

- API test asserts dashboard rows group into the four default horizons,
  including `Overdue`.
- API test asserts filters cover horizon, client, filing profile, obligation,
  jurisdiction, entity type, tax category, task status, verification status,
  and deterministic sorting.
- API test asserts export keeps official due date, firm target date,
  verification status, and source evidence in separate columns.
- API tests assert status and firm-target mutations write audit/date-event
  records without mutating official due dates.
- API test asserts evidence returns date-event history and source/version
  lineage.
- Browser check verifies authenticated `/` renders the four sections and core
  filters through the app shell.

### 7. Wrong vs Correct

#### Wrong

```typescript
export const tasksRouter = router({
  bulkUpdateDueDate: publicProcedure.mutation(({ ctx, input }) => {
    return ctx.db.update(deadlineTasks).set({ currentDueDate: input.date });
  }),
});
```

#### Correct

```typescript
export const tasksRouter = router({
  bulkUpdateFirmTargetDate: publicProcedure
    .input(bulkFirmTargetDateSchema)
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);

      return updateFirmScopedPlanningDates(ctx.db, session.firm.id, input);
    }),
});
```

## Verification

- Run `pnpm check-types`.
- Add focused API tests near new routers once the test harness exists.

## Scenario: Official Notice Monitor Backend

### 1. Scope / Trigger

- Trigger: official source monitoring crosses tRPC write procedures, platform
  monitor authentication, AI extraction helpers, Drizzle monitoring tables, and
  Cloudflare runtime env keys.
- Use this pattern for monitor jobs that record official source checks and
  notice candidates. The monitor may create source runs, snapshots, and notice
  records, but it must not mutate CPA workspace deadline tasks or coverage
  state.

### 2. Signatures

- API procedures:
  `officialSources.list(): { sources }`,
  `officialSources.getCheckRuns({ sourceId, limit? }): { checkRuns }`,
  `officialSources.enqueueCheck({ sourceId }): { accepted, queued }`,
  `officialSources.recordCheckResult(input): { checkRun, snapshot, notices }`,
  and `officialNotices.listInternal(input?): { notices }`.
- Monitor service:
  `recordSourceCheckResult(db, input): Promise<SourceCheckResult>`.
- Extraction service:
  `extractOfficialNoticeImpactConditions(input): OfficialNoticeExtraction`.
- DB tables:
  `official_sources`, `source_snapshots`, `source_check_runs`, and
  `official_notices`.
- Env keys:
  `OFFICIAL_SOURCE_MONITOR_TOKEN`, `OFFICIAL_NOTICE_AI_PROVIDER`,
  `OFFICIAL_NOTICE_AI_MODEL`, and `OFFICIAL_NOTICE_AI_API_KEY`.

### 3. Contracts

- `officialSources.list` may be public because it exposes only the P0 official
  source allowlist and monitor status metadata.
- `officialSources.enqueueCheck` and `officialNotices.listInternal` require a
  firm session via `requireFirmSession`.
- `officialSources.recordCheckResult` requires the configured platform monitor
  token from `x-official-source-monitor-token` or `Authorization: Bearer ...`.
- `recordCheckResult` accepts only allowlisted source IDs and `success |
  failed | skipped` statuses.
- Successful check results require `contentHash` or `contentText`; failed or
  skipped results require an error message.
- Notice candidates are accepted only for successful checks.
- High/medium confidence notices with local workspace-match hints become
  `workspace_alert`; low confidence or unmatched notices stay
  `internal_queue`.
- AI extraction input is limited to official source metadata and official notice
  title/summary/text; customer PII is not sent to the model by default.

### 4. Validation & Error Matrix

- Unknown `sourceId` -> `NOT_FOUND` with
  `Official source is not in the supported allowlist.`
- Missing firm session on `enqueueCheck` or `listInternal` -> `UNAUTHORIZED`.
- Missing configured monitor token -> `FORBIDDEN`.
- Wrong monitor request token -> `UNAUTHORIZED`.
- `status = success` without `contentHash` or `contentText` -> `BAD_REQUEST`.
- `status != success` with notice candidates -> `BAD_REQUEST`.
- Failed/skipped check without `errorMessage` -> DB CHECK/test failure.
- Duplicate `(source_id, notice_url)` notice -> update the notice while
  preserving the existing `source_snapshot_id` unless the current check created
  a new snapshot.

### 5. Good/Base/Bad Cases

- Good: a successful IRS check with changed content records a check run, source
  snapshot, extracted notice conditions, confidence reasons, and alert
  visibility without touching deadline tasks.
- Good: a monitor worker calls `recordCheckResult` with a bearer token matching
  `OFFICIAL_SOURCE_MONITOR_TOKEN`.
- Base: a source check fails with an HTTP status and error message; the source
  status updates and no notice is recorded.
- Bad: a public caller can record check results without the platform token.
- Bad: monitor code marks a tax rule `Verified` or edits a workspace deadline
  task directly.

### 6. Tests Required

- API tests assert P0 allowlist listing and unsupported source rejection.
- API tests assert `enqueueCheck` and `listInternal` reject unauthenticated
  callers.
- API tests assert monitor-token enforcement for `recordCheckResult`.
- Service tests assert successful checks can create snapshots/notices and
  failed/skipped checks cannot record notices.
- DB tests assert monitoring tables, enum values, indexes, and CHECK
  constraints exist.
- Extraction tests assert explainable `high | medium | low` confidence labels
  without percentage scores.
- Schema work must run `pnpm check-types`, focused monitor/db tests, and
  Drizzle generation against an isolated output directory when parallel schema
  work is dirty.

### 7. Wrong vs Correct

#### Wrong

```typescript
export const officialSourcesRouter = router({
  recordCheckResult: publicProcedure.mutation(({ ctx, input }) => {
    return recordSourceCheckResult(ctx.db, input);
  }),
});
```

#### Correct

```typescript
export const officialSourcesRouter = router({
  recordCheckResult: publicProcedure
    .input(recordCheckResultSchema)
    .mutation(({ ctx, input }) => {
      requireOfficialSourceMonitorToken(ctx);

      return recordSourceCheckResult(ctx.db, input);
    }),
});
```
