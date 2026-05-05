# Database Backend Guidelines

## Pre-Development Checklist

Before editing `packages/db`, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `specs/tax-rule-verification.md`
- Any feature spec that introduces or changes tables

## Package Responsibility

`packages/db` owns Drizzle schema, migrations, and database construction for
Cloudflare D1. Other packages consume exported schema and `createDb()`; they do
not define tables locally.

## Current Structure

```txt
packages/db/src/index.ts
packages/db/src/schema/index.ts
packages/db/drizzle.config.ts
```

`createDb()` uses `drizzle(env.DB, { schema })`. Drizzle Kit reads schema from
`./src/schema` and writes migrations to `./src/migrations`.

## Implementation Rules

- Split new domain schema by topic under `src/schema/`, then export from
  `src/schema/index.ts`.
- Prefer snake_case table and column names for D1/SQLite.
- Keep firm ownership columns on workspace-owned data.
- Workspace-owned child tables must enforce the firm boundary with composite
  unique indexes and composite foreign keys, not just independent `firm_id` and
  child-id references.
- Preserve the invariant that only verified tax rules create official deadline
  tasks.
- Store event/audit history for official due-date changes, firm target date
  changes, task status changes, import commits, and notice proposal decisions.
- Do not silently overwrite current due-date state without a corresponding date
  event.

## Scenario: Core Deadline Domain Schema

### 1. Scope / Trigger

- Trigger: Adding or changing deadline-domain tables, migrations, or schema
  exports under `packages/db`.
- Applies to the firm-owned chain:
  `client_relationships -> filing_profiles -> deadline_tasks ->
  deadline_date_events`, plus reusable `audit_logs`.

### 2. Signatures

- `client_relationships`: `id`, `firm_id`, `display_name`,
  `relationship_type`, `notes`, `source_system`, `created_via`, timestamps.
- `filing_profiles`: `id`, `firm_id`, `client_relationship_id`,
  `display_name`, identity fields, `entity_type`, `states`, `county`,
  `fiscal_year_type`, `coverage_state`, source fields, timestamps.
- `deadline_tasks`: `id`, `firm_id`, `client_relationship_id`,
  `filing_profile_id`, nullable `tax_rule_id`, title/jurisdiction/category,
  `current_due_date`, nullable `original_due_date`, nullable
  `firm_target_date`, status, priority, source fields, timestamps.
- `deadline_date_events`: `id`, `firm_id`, `deadline_task_id`, `event_type`,
  previous/new current due-date fields, previous/new firm target fields,
  source evidence fields, nullable `audit_log_id`, actor, timestamp, notes.
- `audit_logs`: `id`, `firm_id`, actor/action/entity fields, before/after JSON,
  source metadata, timestamp.

### 3. Contracts

- Every workspace-owned table has a `firm_id`.
- Child rows that point to another workspace-owned row must include a
  firm-scoped composite FK. Example: `deadline_tasks(firm_id,
  client_relationship_id, filing_profile_id)` references
  `filing_profiles(firm_id, client_relationship_id, id)`.
- Parent tables used by composite FKs must expose matching composite unique
  indexes, e.g. `(firm_id, id)` or `(firm_id, client_relationship_id, id)`.
- `deadline_tasks.current_due_date` is the current official or user-provided
  planning date. `deadline_tasks.original_due_date` preserves the first
  official date where one exists. `deadline_tasks.firm_target_date` is firm
  planning metadata and is never official.
- `deadline_date_events` is the append-only history for official original dates,
  official extensions, official relief changes, user-provided adjustments, and
  firm target changes.
- `audit_logs` must be reusable by task status changes, notice proposal
  decisions, import commits, and date-event changes.

### 4. Validation & Error Matrix

- `source_type = verified_rule` without `tax_rule_id` -> reject by CHECK.
- `source_type = verified_rule` with `created_via != system_rule` -> reject by
  CHECK.
- `source_type = user_provided` without `user_provided_source_note` -> reject by
  CHECK.
- `source_type = user_provided` with `created_via != manual` -> reject by CHECK.
- Official date event without new current due date -> reject by CHECK.
- Official date event without any source evidence -> reject by CHECK.
- Firm target event that also mutates current due-date fields -> reject by CHECK.
- Current due-date event that also mutates firm target fields -> reject by CHECK.
- Child row referencing a parent row from another firm -> reject by composite FK.

### 5. Good/Base/Bad Cases

- Good: a verified-rule task has `tax_rule_id`, `source_type = verified_rule`,
  `created_via = system_rule`, separate `current_due_date` and optional
  `firm_target_date`, and official changes recorded in
  `deadline_date_events`.
- Base: a manual task has `source_type = user_provided`,
  `created_via = manual`, a user source note, nullable `tax_rule_id`, and can
  appear on the dashboard as not verified.
- Bad: a deadline task stores a `filing_profile_id` from another firm while
  carrying the current firm's `firm_id`.

### 6. Tests Required

- Assert every owned table exposes required contract columns.
- Assert enum arrays include individual and business entity types, task statuses,
  source types, date-event types, and coverage states.
- Assert CHECK constraint names exist for trust-boundary, date-event separation,
  and source evidence rules.
- Assert composite unique index and FK names exist for the firm-owned chain.
- Apply generated migrations to SQLite/D1-compatible storage and run
  `PRAGMA foreign_key_check`.
- Run `pnpm check-types` and the focused db schema tests.

### 7. Wrong vs Correct

#### Wrong

```ts
clientRelationshipId: text("client_relationship_id").references(() => clientRelationships.id);
filingProfileId: text("filing_profile_id").references(() => filingProfiles.id);
```

This allows a child row to carry `firm_id = A` while pointing at a parent row
owned by `firm_id = B`.

#### Correct

```ts
foreignKey({
  columns: [table.firmId, table.clientRelationshipId, table.filingProfileId],
  foreignColumns: [filingProfiles.firmId, filingProfiles.clientRelationshipId, filingProfiles.id],
});
```

The database enforces that the whole relationship chain stays inside the same
firm workspace.

## Migration Rules

- Use `pnpm db:generate` for schema migration files.
- Verify migrations through the task-specific database command before claiming
  schema work complete.
- Do not edit generated migration SQL by hand unless the task explicitly calls
  out a D1/SQLite limitation and the reason is documented.

## Verification

- Run `pnpm check-types`.
- Run the relevant Drizzle generation/apply check for schema tasks.
