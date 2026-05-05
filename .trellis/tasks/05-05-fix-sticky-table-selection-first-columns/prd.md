# Fix sticky table selection and first columns

## Goal

Keep the dashboard task table's selection column, Client column, and Filing profile column pinned while the user scrolls horizontally through the wide deadline table.

## What I Already Know

- The user explicitly requested: "表格的多选按钮和第一第二列一定要固定住".
- `apps/web/src/components/task-table/task-table.tsx` renders the dashboard task table.
- The table already pins the right-side Actions column with `position: sticky`.
- Current left-side columns are:
  - selection checkbox column
  - Client
  - Filing profile
- DueDateHQ is an operational console; table scanning should stay dense and stable.

## Assumptions

- "第一第二列" means the first two data columns after the selection checkbox: Client and Filing profile.
- The sticky behavior is primarily for desktop and tablet horizontal scrolling, while mobile remains usable through the same table overflow behavior.

## Requirements

- Pin the selection checkbox column to the left edge.
- Pin the Client column immediately after selection.
- Pin the Filing profile column immediately after Client.
- Apply the same sticky offsets to header and body cells so columns stay aligned.
- Preserve the existing right-side sticky Actions column.
- Keep borders/shadows readable where pinned and scrollable columns meet.
- Use opaque sticky column backgrounds so scrolled content does not show through underneath.
- Do not change task data, filtering, status editing, evidence drawer, or extension dialog behavior.

## Acceptance Criteria

- [ ] While horizontally scrolling the dashboard table, the selection checkbox column remains visible.
- [ ] While horizontally scrolling the dashboard table, the Client column remains visible.
- [ ] While horizontally scrolling the dashboard table, the Filing profile column remains visible.
- [ ] Header and body sticky columns line up without overlap.
- [ ] Sticky columns visually cover scrolled content underneath with opaque backgrounds.
- [ ] Right-side Actions column remains sticky.
- [ ] `pnpm -F web check-types` passes.
- [ ] Browser verification confirms sticky left columns and right Actions behavior.

## Definition of Done

- Implementation stays scoped to the task table layout.
- Type/build checks pass.
- Browser check covers horizontal scroll behavior.

## Out of Scope

- Reworking table data model or API shape.
- Redesigning the dashboard route.
- Changing bulk actions, status editing, evidence drawer, or extension dialog workflows.

## Technical Notes

- Relevant product component: `apps/web/src/components/task-table/task-table.tsx`.
- Relevant specs read:
  - `.trellis/spec/guides/due-date-hq-project-conventions.md`
  - `.trellis/spec/web/frontend/index.md`
  - `.trellis/spec/ui/frontend/index.md`
  - `DESIGN.md`
