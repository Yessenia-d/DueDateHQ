# Refine dashboard task table priority, countdown, and status display

## Goal

Make the dashboard task table more decision-focused by removing the redundant `Priority` column, using graded due-this-week yellow styling for deadlines due within three days, and replacing the current status label with a cleaner operational status treatment.

## What I already know

- The user wants `Priority` hidden from the dashboard table.
- The user wants countdown values at three days or fewer to use the due-this-week yellow theme, not risk red.
- The user wants 0 days to be the strongest yellow, with 1-2 days slightly lighter.
- The user wants fixed/sticky column backgrounds deeper and more opaque so horizontally scrolled content does not show through.
- The user dislikes the current status label styling and asked for a redesign using `frontend-design`.
- `Priority` is still useful as stored task metadata and for smart-priority sorting, but it does not need to be visible in the table.
- The affected UI is `apps/web/src/components/task-table/task-table.tsx`.

## Requirements

- Remove the visible `Priority` column from the dashboard task table.
- Remove local column sorting for the hidden `Priority` column.
- Keep underlying API/task priority data unchanged.
- Render countdowns with graded due-this-week yellow styling when `daysRemaining <= 3`, including due today.
- Give rows with near countdown urgency (`daysRemaining <= 3` or due today) a subtle graded yellow background tint.
- Use the strongest yellow tint for 0 days, a slightly lighter yellow for 1-2 days, and a lighter yellow for 3 days.
- Keep sticky/fixed column cell backgrounds opaque enough to cover scrolled content underneath while preserving the row urgency tint.
- Keep non-near-term due-this-week countdowns in review/amber styling.
- Add a dashboard `Notes` column using client relationship notes.
- Let users edit client notes from the dashboard table and persist them.
- Redesign the dashboard status display so it reads as compact table data, not a bulky badge.
- Keep status labels visible by default and keep the edit affordance close to the label.
- Preserve semantic color meaning: in progress uses accent, waiting on client uses review, done uses verified, not started stays neutral.

## Acceptance Criteria

- [ ] Dashboard task table no longer displays a `Priority` header or priority badges.
- [ ] Countdown shows due-this-week yellow styling for due today and 1-3 days remaining.
- [ ] Due today / 0 days uses the strongest yellow label and row tint.
- [ ] 1-2 days remaining uses a slightly lighter yellow label and row tint.
- [ ] 3 days remaining uses a lighter yellow label and row tint.
- [ ] Rows with near countdown urgency have a subtle yellow background tint, including sticky cells.
- [ ] Sticky/fixed columns are opaque enough to cover horizontally scrolled content underneath.
- [ ] Countdown for 4+ days in the due-this-week horizon remains amber/review.
- [ ] Status display is redesigned away from the current boxed chip treatment.
- [ ] Status edit button remains adjacent to the default status label.
- [ ] Dashboard table shows a `Notes` column near the right side of the table.
- [ ] Users can edit notes inline, save them, cancel edits, and see updated notes after refresh.
- [ ] Empty notes can be cleared and persist as no note.
- [ ] Web type check passes.

## Out of Scope

- Removing the `priority` database/API field.
- Changing smart-priority scoring.
- Changing manual deadline priority input.
- Redesigning all app-wide status badges.

## Technical Notes

- Read `DESIGN.md`; dashboard tables should stay dense, scannable, and status-forward.
- Read `.trellis/spec/web/frontend/index.md`; keep dashboard due-date horizon, task status, and verification easy to scan.
- Read `.trellis/spec/ui/frontend/index.md`; keep UI compact and accessible.
