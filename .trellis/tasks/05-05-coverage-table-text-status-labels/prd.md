# Fix coverage table text overflow and status labels

## Goal

Fix the coverage matrix table so long obligation copy remains readable without pushing into neighboring columns, and make verification status explicit with visible text instead of relying on an icon alone.

## What I already know

- The user reported a visual issue in the coverage table: long obligation descriptions overflow into the `Tax category` column.
- The user also reported that `Status` must include clear copy; icon-only status is not explicit enough.
- The user additionally requested matching status icons in the table header with tooltip copy explaining the statuses.
- The user clarified that the header should use one generic help/info icon, not five status icons.
- The user reported the status tooltip overflows table content and needs contained layout.
- The user requested status names inside the tooltip/header treatment to use the same visual language as row status badges instead of plain text.
- The user requested the Jurisdiction and Status filters be placed inside the table surface instead of outside the table.
- The affected UI is in `apps/web/src/routes/coverage.tsx`.
- The shared status badge component already supports text-first status labels in `apps/web/src/components/status-badge.tsx`.
- `DESIGN.md` says DueDateHQ tables must support dense scanning, and status badges should be compact, semantic, and text-first.

## Requirements

- Keep obligation names and summaries contained inside the `Obligation` column.
- Prevent long summaries from visually colliding with `Tax category`, `Entity types`, `Status`, dates, or actions.
- Preserve table density and scanability on wide desktop.
- Update the coverage table status display so each row shows explicit status copy such as `Verified` or `Coverage gap`.
- Icons may remain as secondary visual reinforcement, but they must not be the only visible status cue.
- Add one generic explanatory icon to the `Status` table header with tooltip or accessible hover copy explaining all five status meanings.
- Do not show five separate status icons in the header; the header should stay compact with one help/info affordance next to `STATUS`.
- Keep the status tooltip contained within the table/page viewport; tooltip copy must wrap and must not visually cover neighboring table cells in a broken way.
- Present status labels in the header/tooltip using the same compact badge visual language as row status labels where practical.
- Move the Jurisdiction and Status filters into the table surface as an integrated toolbar, not as standalone controls above/outside the table.
- Keep existing actions and evidence behavior unchanged.

## Acceptance Criteria

- [ ] Long obligation summaries wrap or clamp inside the first column and do not overlap the next column.
- [ ] Status cells show readable text in addition to any icon.
- [ ] The `Status` column header includes one generic help/info icon next to the `STATUS` label, with tooltip copy explaining all five status meanings.
- [ ] Tooltip content wraps inside a bounded panel and does not overflow across the table.
- [ ] Tooltip status names are shown with compact status badge styling rather than plain bold text.
- [ ] Jurisdiction and Status filters appear inside the table surface, not as a separate external section.
- [ ] The status label remains visually stable and scannable across all coverage statuses.
- [ ] The page still passes type-check/build validation for the affected web workspace.

## Definition of Done

- Implementation follows `DESIGN.md` table and status badge guidance.
- Lint/type-check or equivalent validation is run for the affected package.
- No unrelated files are changed.

## Out of Scope

- Changing API data shape.
- Redesigning the coverage page layout beyond the affected table cells.
- Changing evidence drawer behavior or coverage request behavior.

## Technical Notes

- Likely files: `apps/web/src/routes/coverage.tsx` and possibly `apps/web/src/components/status-badge.tsx`.
- The existing `StatusBadge` is text-first and should be reused if it fits the table status model.
