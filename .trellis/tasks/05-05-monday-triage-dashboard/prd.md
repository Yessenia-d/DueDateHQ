# Implement Monday Triage Dashboard

## Type

AFK vertical slice.

## Goal

Implement the CPA working surface for due today/this week/this month triage, with task status updates, firm target dates, evidence access, light bulk operations, and current-view export.

## Blocked By

- `05-05-auth-firm-workspace`
- `05-05-core-deadline-domain-schema`
- `05-05-tax-obligation-coverage-matrix`

## Owned Files

- `packages/api/src/routers/dashboard.ts`
- `packages/api/src/routers/tasks.ts`
- `packages/api/src/routers/index.ts` for router registration only
- `apps/web/src/routes/index.tsx`
- `apps/web/src/components/dashboard/*`
- `apps/web/src/components/evidence/*`
- `apps/web/src/components/task-table/*`
- Dashboard/task tests near the files above

## API Ownership

- `dashboard.summary`
- `dashboard.export`
- `tasks.updateStatus`
- `tasks.bulkUpdateStatus`
- `tasks.updateFirmTargetDate`
- `tasks.bulkUpdateFirmTargetDate`
- `tasks.getEvidence`

## Schema Ownership

Uses existing schema:

- `deadline_tasks`
- `deadline_date_events`
- `tax_rules`
- `tax_rule_versions`
- `official_sources`
- `source_check_runs`
- `audit_logs`

No new schema tables unless reflected in specs first.

## Acceptance Criteria

- Default dashboard groups tasks into `Due this week`, `This month`, and `Long range`.
- Due today/this week/this month urgency is visible in-product.
- Task rows show client relationship, filing profile, obligation, jurisdiction, current due date, original due date when relevant, optional firm target date, days remaining, status, priority, and verification badge.
- CPA can mark `Not started`, `Waiting on client`, `In progress`, and `Done`.
- Extension/date-change history is visible through evidence, not silently overwritten.
- Filters cover horizon, client, state/jurisdiction, entity type, tax type, task status, and verification status.
- Light bulk operations support task status update, firm target date update, and current-filter export.
- Bulk official due-date edits are not supported.
- Core filters target sub-second response for Beta-sized solo CPA workspaces.

## Out of Scope

- Calendar sync.
- Email/SMS/Slack push.
- Multi-user assignment workflow.
- Heavy report builder.
