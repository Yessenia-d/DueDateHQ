# Polish TaskTable fixed actions and status editing

## Goal

Improve the dashboard/tax work task table so row actions remain reachable during horizontal scrolling, extension entry moves behind an explicit `Extend` popup, and task status defaults to a readable label until the user chooses to edit it.

## What I Already Know

- The requested UI is in `apps/web/src/components/task-table/task-table.tsx`.
- `TaskTable` currently renders a wide table with `Actions` as the final non-sticky column.
- The current `Actions` cell always includes a `date` input plus `Extend` and `Evidence` buttons.
- The current `Status` cell always renders a `Select`, which makes every row look editable by default.
- Existing mutations already cover the required data changes: `tasks.markExtended` and `tasks.updateStatus`.
- `DESIGN.md` calls for a dense, calm, audit-friendly operations console where status and actions stay visually stable.

## Requirements

- Add a horizontal scroll container for the task table and make the `Actions` header/cells sticky on the right.
- Style the sticky `Actions` cells with stable width, background, border/shadow, and layering so the column stays readable while scrolling.
- Keep the `Actions` column focused on action buttons only.
- Move extension date entry into a compact popup/modal opened by clicking `Extend`.
- The extension popup must include a date input plus save and cancel controls.
- Do not allow extension save without a selected date.
- On successful extension save, close the popup and clear that row's temporary date input.
- Render task `Status` as a label/badge by default, with a small accessible edit button on the right side of the status cell.
- When status edit is active for a row, show the status selector and replace the edit button area with `Save` and `Cancel`.
- `Save` must call `tasks.updateStatus`; `Cancel` must exit edit mode without mutating.
- Only the selected row should enter status editing at a time.
- Preserve existing selection, evidence, priority, trust, countdown, toast, and query invalidation behavior.
- When the `Due this week` horizon is selected, every visible task row must show its remaining day count in the Countdown column rather than replacing some rows with generic status text such as `Due today`.
- The `Due this week` horizon card should use orange/review highlighting when selected by default, matching its near-term deadline semantics instead of the generic blue selected treatment.

## Acceptance Criteria

- [ ] Horizontally scrolling the table keeps the `Actions` column visible.
- [ ] The `Actions` column does not contain a persistent date input.
- [ ] Clicking `Extend` opens the date-entry popup.
- [ ] Extension save is disabled until a date is selected.
- [ ] Extension success closes the popup and clears temporary input state.
- [ ] `Status` defaults to a status label rather than a selector.
- [ ] Clicking the status edit button switches only that row to selector mode.
- [ ] Status `Save` updates via the existing mutation and exits edit mode on success.
- [ ] Status `Cancel` exits edit mode without calling the mutation.
- [ ] Pending mutation states prevent duplicate submissions.
- [ ] In the `Due this week` task list, every row's Countdown cell displays remaining days.
- [ ] The selected `Due this week` horizon card renders with orange/review highlight styling.

## Definition of Done

- Web type-check passes.
- UI behavior is verified in a browser if the dev server is available.
- No backend API, database schema, or route changes are introduced.
- Spec/docs are updated only if a reusable convention is discovered.

## Out of Scope

- Backend API changes.
- Database schema changes.
- Route-level behavior changes.
- Changing global shared UI primitive defaults.
- Reworking task data, evidence drawer, bulk actions, or dashboard filters.

## Technical Notes

- Primary files: `apps/web/src/components/task-table/task-table.tsx`, `apps/web/src/routes/tax-work.tsx`.
- Relevant app spec: `.trellis/spec/web/frontend/index.md`.
- Relevant shared UI spec: `.trellis/spec/ui/frontend/index.md`.
- Shared project conventions: `.trellis/spec/guides/due-date-hq-project-conventions.md`.
- Use `DESIGN.md` for table, button, badge, and operational UI direction.

## Assumptions

- The user's `extentend` wording refers to the existing `Extend` action.
- "Popup" may be implemented with the existing shared `Sheet`/Base UI dialog pattern or the smallest local modal approach that fits current primitives.
- The status edit button belongs inside the `Status` cell, not in the sticky `Actions` column.

## Spec Update Judgment

No `.trellis/spec/` update is expected. This is a focused TaskTable interaction polish using existing mutations and product UI conventions, not a new cross-cutting frontend pattern.
