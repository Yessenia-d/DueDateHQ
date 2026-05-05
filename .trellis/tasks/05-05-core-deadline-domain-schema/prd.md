# Implement Core Deadline Domain Schema

## Type

AFK foundation slice.

## Goal

Create the shared database/domain contract for DueDateHQ's core work model: Firm -> Client Relationship -> Filing Profile -> Deadline Task, with official due dates, firm target dates, date event history, and audit logging.

## Blocked By

- `05-05-align-domain-glossary`
- `05-05-auth-firm-workspace` for `firms` and authenticated ownership

## Owned Files

- `packages/db/src/schema/deadline-domain.ts`
- `packages/db/src/schema/audit.ts`
- `packages/db/src/schema/index.ts` for exports only
- `packages/db/src/index.ts` if schema exports require it
- Drizzle migration files generated for this schema
- Domain model tests near `packages/db`

Avoid owning feature routers or web routes in this task.

## API Ownership

None, except optional internal test helpers. Feature APIs are owned by later tasks.

## Schema Ownership

- `client_relationships`
  - `id`, `firmId`, `displayName`, `notes`, `createdVia`, timestamps
- `filing_profiles`
  - `id`, `firmId`, `clientRelationshipId`, `displayName`, `entityType`, `states`, `county`, `fiscalYearType`, `sourceSystem`, `sourceRowId`, `createdVia`, timestamps
- `deadline_tasks`
  - `id`, `firmId`, `clientRelationshipId`, `filingProfileId`, nullable `taxRuleId`, `title`, `jurisdiction`, `taxCategory`, `currentDueDate`, nullable `originalDueDate`, nullable `firmTargetDate`, `status`, `priority`, `sourceType`, `createdVia`, `userProvidedSourceNote`, timestamps
- `deadline_date_events`
  - official original due date, official extension, official relief/change, user-provided adjustment, firm target change
- `audit_logs`
  - shared actor/action/before/after/source metadata for user-visible state changes

## Acceptance Criteria

- Schema can represent individual and business filing profiles under the same client relationship.
- Official due date and firm target date are separate fields.
- Date event history supports multiple official or user-provided date changes without silently overwriting history.
- Audit log can be reused by task status changes and notice proposal decisions.
- Migrations apply cleanly.
- Type checks pass.

## Out of Scope

- CSV import parsing.
- Dashboard UI.
- Official source monitoring.
- Tax rule seed data beyond minimal fixtures needed for tests.
