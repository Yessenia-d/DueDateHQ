# Add sortable dashboard task table columns

## Goal

Make the dashboard task table sortable by every column that has a stable, meaningful comparison value so CPAs can quickly reorder the current horizon by client, profile, due date, status, priority, trust state, and related triage fields.

## What I already know

- The user asked for table column sorting and said every sortable column should support sorting.
- The relevant component is `apps/web/src/components/task-table/task-table.tsx`.
- The dashboard spec already requires filters and sorting across dashboard task fields.
- Sorting should remain dense, scannable, and accessible with clear direction indicators.
- This task should not change official due-date semantics or hide verification/trust state.

## Requirements

- Add clickable sorting controls to all sortable task table headers:
  - Client
  - Filing profile
  - EIN / SSN last 4
  - Obligation
  - Jurisdiction
  - Official due date
  - Firm target
  - Trust
  - Priority
  - Countdown
  - Status
- Do not make Select or Actions sortable.
- Sorting applies to the currently visible table section/horizon.
- Clicking a sortable header cycles its state: unsorted -> ascending -> descending -> unsorted.
- Header controls must show a visible sort affordance and current direction.
- Null or missing values sort after present values.
- Existing row selection, sticky columns, status editing, extension dialog, evidence actions, and badges must continue to work.

## Acceptance Criteria

- [x] Each sortable header is keyboard-accessible and has an accessible label.
- [x] Active sorted column has a visible ascending/descending indicator.
- [x] Sorting works for text fields, dates, numeric countdown, status, priority, and trust/verification values.
- [x] Sorting does not reorder data outside the active table section.
- [x] `pnpm check-types` passes.

## Out of Scope

- Backend sorting API changes.
- Persisting sort preferences across page reloads.
- Changing CSV export order.
- Sorting Select or Actions columns.

## Technical Notes

- Use local component state in `TaskTable` per frontend guidelines.
- Preserve UTC formatting for official due dates.
- Relevant specs read:
  - `.trellis/spec/web/frontend/index.md`
  - `.trellis/spec/ui/frontend/index.md`
  - `.trellis/spec/guides/due-date-hq-project-conventions.md`
  - `specs/dashboard.md`
  - `specs/dashboard.zh.md`
