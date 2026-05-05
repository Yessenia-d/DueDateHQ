# Add Dashboard Reset Filters Button

## Goal

Add a compact reset control to the dashboard filter area so a CPA can quickly return the dashboard task table to the default filter state after narrowing the work queue.

## What I Already Know

- The user asked to add a reset filter button in an appropriate place.
- The reset belongs near the existing dashboard filter controls, not in the charts or table body.
- The dashboard filter row already shows active filter count and includes the `Filters` toggle plus `Export view`.
- Non-default filter values are already visually highlighted in filter selects.
- Current horizon card selection should remain under user control and should not be reset by clearing filters.

## Assumptions

- `Reset filters` should clear client, filing profile, jurisdiction, entity type, tax type, status, and verification.
- `Reset filters` should restore sort to `Smart priority`.
- `Reset filters` should reset section pagination to page 1.
- The control should be disabled or hidden when there is nothing to reset; disabled is preferable for stable layout.

## Requirements

- Add a reset filter button in the filter row near the active filter count.
- Button is enabled only when at least one filter or sort is non-default.
- Clicking the button restores default dashboard filters and resets section pages.
- Clicking the button does not change the selected horizon card.
- Keep styling restrained and consistent with the existing product UI.

## Acceptance Criteria

- [ ] With default filters and default sort, reset control is visible but disabled or otherwise clearly inactive.
- [ ] With any non-default filter selected, reset control is enabled.
- [ ] With non-default sort selected, reset control is enabled.
- [ ] Clicking reset clears active filters, restores `Smart priority`, and returns active filter count to default.
- [ ] Current horizon card remains selected after reset.
- [ ] Type-check passes.

## Definition of Done

- Type-check passes.
- No backend/API changes.
- No unrelated UI additions.

## Out of Scope

- Saved filter presets.
- Resetting selected horizon cards.
- Resetting selected table rows.
- Changing filter menu options or query semantics.

## Technical Notes

- Main implementation file: `apps/web/src/components/dashboard/dashboard-page.tsx`.
- Relevant specs: `.trellis/spec/web/frontend/index.md`, `.trellis/spec/ui/frontend/index.md`.
