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
- Preserve the invariant that only verified tax rules create official deadline
  tasks.
- Store event/audit history for official due-date changes, firm target date
  changes, task status changes, import commits, and notice proposal decisions.
- Do not silently overwrite current due-date state without a corresponding date
  event.

## Migration Rules

- Use `pnpm db:generate` for schema migration files.
- Verify migrations through the task-specific database command before claiming
  schema work complete.
- Do not edit generated migration SQL by hand unless the task explicitly calls
  out a D1/SQLite limitation and the reason is documented.

## Verification

- Run `pnpm check-types`.
- Run the relevant Drizzle generation/apply check for schema tasks.
