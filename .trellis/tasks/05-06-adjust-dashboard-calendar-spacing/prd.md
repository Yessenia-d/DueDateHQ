# Adjust dashboard calendar and import selector spacing

## Goal

Polish two small UI details from the editorial console pass: give the Dashboard workload calendar cells more breathing room, and remove the heavy internal border from the Import mode selected option.

## What I Already Know

- The Dashboard calendar currently uses very tight `gap-0.5` grid spacing, which makes adjacent day blocks feel crowded.
- The Import mode selector selected state has an internal border/ring that reads like an extra nested card.
- The user wants visual-only changes and will verify manually.
- No API, router, data model, or task behavior should change.

## Requirements

- Increase spacing between workload calendar day blocks slightly.
- Keep weekday headings aligned with the day grid.
- Remove the selected option's internal border in the Import mode selector.
- Preserve visible selected state through background and typography.
- Do not use subagents.

## Acceptance Criteria

- [ ] Dashboard workload calendar cells have more visual separation.
- [ ] Import mode selected option no longer shows an internal border.
- [ ] Existing interactions remain unchanged.

## Out of Scope

- Dashboard layout restructuring.
- Import workflow behavior changes.
- Browser verification, per user preference.

## Technical Notes

- Design system reviewed: `DESIGN.md`.
- Relevant files:
  - `apps/web/src/components/dashboard/dashboard-page.tsx`
  - `apps/web/src/routes/import.tsx`
