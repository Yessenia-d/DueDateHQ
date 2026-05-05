# Update Progress Page by Feature Completion Status

## Goal

Update the `/progress` reviewer surface so it reflects the current DueDateHQ Beta feature completion status instead of stale seed statuses.

## What I Already Know

- The user asked to update the progress page based on feature completion status.
- `/progress` is implemented in `apps/web/src/routes/progress.tsx`.
- Progress data comes from `packages/api/src/routers/progress.ts` via `progress.list`.
- Current progress data is a static seeded list named `seedFeatureProgressItems`.
- The feature progress spec requires only `Done`, `In progress`, `Blocked`, and `Not started`.
- `specs/feature-progress-page.md` says the page should show all major specs, mapped spec paths, overall progress derived from item status, and clearly visible completed/incomplete items.
- `DESIGN.md` requires a dense, light-first Verified Operations Console style with explicit status labels and no marketing-page treatment.

## Current Feature Status Snapshot

Use current Trellis task status as the source of truth for this update:

- `Auth and firm workspace`: `done` from completed task `05-05-auth-firm-workspace`.
- `CSV import with profile review`: `in_progress` from task `05-05-csv-import-profile-review`.
- `Manual client profile and deadline entry`: `not_started` from planning task `05-05-manual-client-profile-deadline-entry`.
- `Tax obligation library`: `done` from completed task `05-05-tax-obligation-coverage-matrix`.
- `Tax rule verification`: `done` as part of completed tax obligation/rule trust layer acceptance criteria.
- `Official source monitoring`: `in_progress` from task `05-05-official-notice-monitor-agent`.
- `Notice proposal review and audit workflow`: `not_started` from planning task `05-05-notice-proposal-review-audit`.
- `Coverage matrix`: `done` from completed task `05-05-tax-obligation-coverage-matrix`.
- `Dashboard`: `in_progress` from task `05-05-dashboard`.
- `Cloudflare beta deployment`: `not_started` from planning task `05-05-cloudflare-beta-deployment`.
- `GTM readiness`: `blocked` until product implementation/deployment readiness is closer.
- `Docs and specs`: `in_progress` from task `05-05-due-date-hq-docs-specs`.
- `Feature progress page`: `in_progress` during this task.

## Requirements

- Update the `progress.list` data so `/progress` reflects the current feature status snapshot above.
- Preserve the allowed status vocabulary: `done`, `in_progress`, `blocked`, `not_started`.
- Keep progress summary calculations derived from item statuses.
- Keep spec path mapping visible for every feature item.
- Keep the public UI read-only; do not add status editing from `/progress`.
- Keep the visual treatment aligned with `DESIGN.md`: compact reviewer surface, semantic badges, no marketing hero.

## Acceptance Criteria

- [ ] `/progress` shows completed items for Auth, Tax obligation library, Tax rule verification, and Coverage matrix.
- [ ] `/progress` shows in-progress items for CSV import, Official source monitoring, Dashboard, Docs/specs, and Feature progress page.
- [ ] `/progress` shows not-started items for Manual entry, Notice proposal review, and Cloudflare deployment.
- [ ] `/progress` keeps GTM readiness blocked.
- [ ] Overall and P0 readiness counts update automatically from the revised statuses.
- [ ] API tests cover the expected current status for representative features.
- [ ] UI remains readable at existing desktop table widths and keeps status text visible.

## Definition of Done

- Tests added or updated where appropriate.
- Lint and type-check pass for the touched packages.
- No unrelated dirty files are included.
- Documentation or spec updates are considered if the status source/contract changes.

## Out of Scope

- Project management or Trellis runtime integration.
- Editing feature status from the public UI.
- Reworking the feature progress data model into a database-backed feature item table.
- Changing unrelated progress page layout/navigation.

## Technical Notes

- Relevant files inspected:
  - `apps/web/src/routes/progress.tsx`
  - `packages/api/src/routers/progress.ts`
  - `packages/api/src/routers/progress.test.ts`
  - `apps/web/src/components/status-badge.tsx`
  - `specs/feature-progress-page.md`
  - `specs/feature-progress-page.zh.md`
  - `DESIGN.md`
- Existing test only checks seeded feature presence and derived counts; it does not assert current feature statuses.
- Static seed update is the conservative approach because the current spec explicitly excludes project management integrations and the deployed app should not depend on local `.trellis/tasks` files.
