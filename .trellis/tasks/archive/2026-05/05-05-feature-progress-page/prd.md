# Implement Feature Progress Page

## Type

AFK vertical slice.

## Goal

Implement an internal/reviewer-facing feature progress page so product, engineering, and Beta reviewers can see which DueDateHQ capabilities are done, in progress, blocked, or not started.

## Blocked By

None - can start after auth if the page is protected; otherwise can start with seed data and wire auth later.

## Owned Files

- `packages/db/src/schema/feature-progress.ts`
- `packages/db/src/schema/index.ts` for exports only
- `packages/api/src/routers/progress.ts`
- `packages/api/src/routers/index.ts` for router registration only
- `apps/web/src/routes/progress.tsx`
- Progress seed/tests near the files above

## API Ownership

- `progress.list`
- Optional internal-only `progress.updateStatus` if specs require editable status.

## Schema Ownership

- `feature_items`
  - `id`, `category`, `name`, `description`, `specPath`, `status`, `priority`, `updatedAt`

## Acceptance Criteria

- `/progress` groups feature items by product area.
- Each row links or references the relevant spec path.
- Status values are `done`, `in_progress`, `blocked`, and `not_started`.
- Seeded items cover Auth, CSV imports, manual entry, tax obligation library, source monitoring, verification queue/proposals, coverage matrix, dashboard, deployment, GTM, and docs/specs.
- Page is useful for Beta review without becoming a project-management system.

## Out of Scope

- Full issue tracker integration.
- Burndown charts or sprint planning.
- Public marketing roadmap.
