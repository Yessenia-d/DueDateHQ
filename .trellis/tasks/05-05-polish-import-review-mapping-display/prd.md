# Polish import review mapping display

## Goal

Make the import preview workflow prioritize row-level review. The mapping diagnostic should be available as a compact summary above the filing profile table, while fields that were confidently recognized should be visually marked in the row review surface.

## What I already know

- The user wants `Mapping preview` collapsed by default and placed directly above `Filing profile review`.
- The user wants correctly identified fields in `Filing profile review` to use a light green background.
- The current import route is `apps/web/src/routes/import.tsx`.
- The import preview response includes `columnMapping` with canonical fields and confidence values.
- Previous inline changes already removed the right-side review column and moved duplicate/relationship decisions into the table.

## Requirements

- `Mapping preview` renders as a compact collapsed summary by default.
- The summary sits immediately above `Filing profile review`.
- Users can expand the summary to inspect the full source-column to canonical-field mapping table.
- Filing profile review cells corresponding to high-confidence mapped canonical fields use a subtle green background.
- The green background must be restrained and status-oriented, not decorative.
- Existing row edits, duplicate decisions, relationship decisions, and commit behavior remain unchanged.

## Acceptance Criteria

- [ ] Import preview shows the mapping summary above the filing profile review table.
- [ ] The full mapping table is hidden on initial preview.
- [ ] Clicking the mapping control expands/collapses the full mapping table.
- [ ] High-confidence mapped review columns are visibly highlighted in light green.
- [ ] `pnpm -F web check-types` passes.

## Out of Scope

- Backend import parsing changes.
- Changing the meaning of mapping confidence.
- Adding filters for mapping or review problems.
- Redesigning the import metrics strip.

## Technical Notes

- Relevant spec: `.trellis/spec/web/frontend/index.md`.
- Relevant design guidance: `DESIGN.md`, especially status-forward, dense import review UI.
