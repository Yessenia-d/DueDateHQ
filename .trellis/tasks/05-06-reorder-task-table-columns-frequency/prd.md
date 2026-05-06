# Reorder Task Table Columns By Viewing Frequency

## Goal

Reorder the task table columns so CPAs see high-frequency deadline triage information first and lower-frequency reference information later. This should improve scan speed without removing any existing columns or changing task data behavior.

## What I Already Know

- User wants high-frequency task columns before low-frequency columns.
- Current `TaskTable` columns are:
  - selection checkbox
  - Client
  - Filing profile
  - Obligation
  - Official due date
  - Firm target
  - Trust
  - Countdown
  - Status
  - EIN / SSN last 4
  - Jurisdiction
  - Notes
  - Actions
- `TaskTable` is implemented in `apps/web/src/components/task-table/task-table.tsx`.
- The table already has sticky selection, client, filing profile, and actions columns.

## Column Frequency Classification

High-frequency scan columns:

- Client: relationship identity, especially on dashboard views.
- Filing profile: tax profile context and entity/state summary.
- Obligation: what work is due.
- Official due date: primary deadline date.
- Countdown: urgency signal for triage.
- Status: workflow state and inline status editing.
- Trust: verification status, including entered deadline and source review states.

Medium-frequency columns:

- Actions: used often, but already sticky on the right as a command area.
- Firm target: useful planning date, but secondary to official due date and status.

Low-frequency reference columns:

- Jurisdiction: important metadata but usually inferred from profile or obligation context.
- EIN / SSN last 4: identity confirmation, not needed for most scan passes.
- Notes: useful when present, but long text disrupts the primary scan path.

## Requirements

- Keep every existing column.
- Reorder visible columns so high-frequency scan columns appear before lower-frequency reference columns.
- Preserve sticky selection, client, filing profile, and actions behavior.
- Preserve existing sort controls and sort keys.
- Preserve status editing, notes editing, evidence, and extension actions.
- Keep table readable at the current minimum width.

## Proposed Column Order

1. Selection
2. Client
3. Filing profile
4. Obligation
5. Official due date
6. Countdown
7. Status
8. Trust
9. Firm target
10. Jurisdiction
11. EIN / SSN last 4
12. Notes
13. Actions

## Acceptance Criteria

- [ ] Header order matches the proposed column order.
- [ ] Row cell order matches the header order exactly.
- [ ] Sorting still works for moved sortable columns.
- [ ] Sticky columns still behave as before.
- [ ] `pnpm -F web build` passes.
- [ ] `tsc` output has no `task-table.tsx` errors.

## Out Of Scope

- Hiding columns.
- Adding column visibility settings.
- Changing task data shape or API responses.
- Changing mobile table behavior beyond preserving current layout.

## Technical Notes

- Main affected file: `apps/web/src/components/task-table/task-table.tsx`.
- Relevant specs: `.trellis/spec/web/frontend/index.md`, `.trellis/spec/ui/frontend/index.md`.
