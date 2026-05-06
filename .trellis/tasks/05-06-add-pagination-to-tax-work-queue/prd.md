# Add pagination to Tax Work queue

## Goal

Add pagination to the Tax Work `Task work queue` so CPA users can review large client task lists in manageable pages without losing the existing client, horizon, filter, bulk action, and evidence drawer workflows.

## What I Already Know

- The user wants `tax-work` `Task work queue` to support pagination.
- `apps/web/src/routes/tax-work.tsx` currently builds queue sections with `pageSize` equal to the full section length and `totalPages: 1`.
- Dashboard already has a compact pagination pattern using `@due-date-hq/ui/components/pagination`.
- `TaskTable` consumes a `DashboardSection`, so Tax Work can pass only the current page rows while preserving section count metadata.
- Existing selected task cleanup already keeps selection only for currently visible rows.

## Requirements

- Add client-side pagination to each Tax Work queue horizon.
- Use a fixed page size consistent with Dashboard unless local layout requires a different value.
- Keep QueueTab counts as total filtered tasks per horizon, not current-page counts.
- Reset to page 1 when selected client, horizon, or filters change.
- `TaskTable` should receive only current-page tasks.
- Bulk selection should apply only to visible page rows, matching current `TaskTable` behavior.
- Evidence drawer and row actions must continue to work.

## Acceptance Criteria

- [ ] `Task work queue` shows pagination controls when the active horizon has more than one page.
- [ ] The footer displays the visible row range and total row count.
- [ ] Prev/Next and page number clicks update visible rows without changing client/filter state.
- [ ] Switching client, horizon, or filters resets the queue to page 1.
- [ ] Queue tab counts remain the full filtered counts for each horizon.
- [ ] Typecheck passes.

## Out of Scope

- Backend pagination/API changes.
- New filtering behavior.
- Changing Dashboard pagination behavior.
- Redesigning Tax Work layout beyond adding pagination controls.

## Technical Notes

- Main file: `apps/web/src/routes/tax-work.tsx`.
- Reuse pagination primitives from `@due-date-hq/ui/components/pagination`.
- Existing Dashboard pagination implementation is in `apps/web/src/components/dashboard/dashboard-page.tsx`.
