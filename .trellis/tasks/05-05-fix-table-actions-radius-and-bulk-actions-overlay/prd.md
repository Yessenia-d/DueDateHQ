# fix table actions radius and bulk actions overlay

## Goal

Fix the table action column visual defects and make the bulk action popover reliably sit above the task table without changing the user's recent layout direction.

## What I Already Know

* The user reported the sticky `Actions` column has incorrect rounded/cutoff corners.
* The user reported the `批量操作` popover renders behind or at the same layer as the table.
* `TaskTable` uses a sticky right-side actions column inside a rounded table wrapper.
* `BulkTaskActions` is shared by dashboard and tax-work and reserves a fixed-height row to avoid layout shift.
* `DESIGN.md` asks for restrained product UI, stable controls, subtle borders, and no layout jump.

## Requirements

* Keep the single `批量操作` button.
* Keep the hidden-but-layout-reserved bulk action slot when no rows are selected.
* Ensure the opened bulk action panel overlays the table.
* Fix sticky `Actions` column corners without creating obvious clipping, double borders, or mismatched backgrounds.
* Do not move `Export view`.

## Acceptance Criteria

* [x] Dashboard and Tax Work tables show a clean right edge and action-column corners.
* [x] The bulk action popover appears above table header/rows when opened.
* [x] Selecting and deselecting rows does not shift the table vertically.
* [x] Web typecheck/build passes.

## Technical Notes

* Files: `apps/web/src/components/task-table/task-table.tsx`, `apps/web/src/components/task-table/bulk-task-actions.tsx`.
* Relevant specs: `.trellis/spec/web/frontend/component-guidelines.md`, `.trellis/spec/web/frontend/quality-guidelines.md`, `.trellis/spec/web/frontend/type-safety.md`.
