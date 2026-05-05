# Polish actions column buttons

## Goal

Improve the Coverage matrix `Actions` column and Coverage filter selects so controls have appropriate radius and visually stable spacing consistent with DueDateHQ's operational UI.

## What I Already Know

- The screenshot shows the Coverage matrix `Actions` column with square `Evidence`, `Request`, `User deadline`, and `Dismiss` buttons.
- The impacted UI is in `apps/web/src/routes/coverage.tsx`.
- The shared `Button` primitive in `packages/ui/src/components/button.tsx` currently uses `rounded-none` in the base and size variants, so `outline` buttons are intentionally square unless locally overridden.
- The Coverage matrix actions cell uses `flex flex-wrap gap-1` in a narrow `w-[12%]` table column, so rows with multiple actions wrap into a visually uneven vertical cluster.
- `DESIGN.md` positions DueDateHQ as a dense, calm, audit-friendly operations console. Tables should stay stable, controls should be explicit, and product UI should be keyboard-friendly.
- Follow-up screenshots show Coverage filter `Select` triggers also render square, and the open Select dropdown has an unintended left-side whitespace gutter before the highlighted item background.

## Assumptions

- Scope should stay focused on the Coverage matrix actions column unless the user confirms a broader shared-button style change.
- The UI should preserve explicit labels for auditability rather than hiding every action behind icon-only controls.
- `Evidence` should remain visually available for rows with a rule, while gap remediation actions should be easier to scan when there are several of them.

## Open Questions

- None.

## Requirements

- Actions in the Coverage matrix must not render as square-corner boxes.
- Rows with multiple actions must use a deliberate grouped layout instead of accidental wrapping.
- Button styling must remain compact enough for table scanning.
- Focus, disabled, and loading states must remain accessible.
- Scope is local to the Coverage matrix actions column. Do not change the global `Button` primitive radius.
- Preferred layout: a compact action stack/group in the action cell, with consistent width/alignment and button radius around 6px.
- Coverage filter `Select` triggers must have a visible compact radius consistent with the updated actions buttons.
- Coverage filter dropdown content must not show an unintended blank vertical strip on the left side of highlighted/selected options.
- Select trigger/content fixes may use the shared `Select` primitive only if the change is consistent with `DESIGN.md` and does not create broad layout churn. Otherwise, prefer local Coverage filter class overrides.
- The Coverage matrix `Actions` column must be slightly wider than the original narrow column so action labels do not feel cramped.
- Action buttons must read clearly as clickable buttons, not passive status tags. Use subtle control affordances such as stronger border/background/hover/focus treatment while preserving the calm operations-console style.

## Acceptance Criteria

- [ ] Coverage `Actions` buttons have visible radius consistent with the app's compact product UI.
- [ ] A row with `Evidence`, `Request`, `User deadline`, and `Dismiss` looks intentional in the narrow actions column.
- [ ] A row with only `Evidence` still looks balanced.
- [ ] The action controls do not expand the table width unexpectedly or overlap text at desktop and mobile-review widths.
- [ ] Existing action behavior is preserved.
- [ ] Coverage filter selects have visible compact radius.
- [ ] Open Coverage filter dropdowns align option backgrounds cleanly with no left-side whitespace gutter.
- [ ] The `Actions` column is wide enough for the stacked action buttons to feel deliberate.
- [ ] Action buttons have enough visual affordance that they are not mistaken for tags or badges.

## Definition of Done

- Tests added or updated where appropriate for changed behavior.
- Lint and type-check pass.
- UI verified in a browser or with a screenshot if a dev server is available.
- Spec/docs updated only if this uncovers a reusable component convention.

## Out of Scope

- Reworking Coverage matrix data, statuses, or backend mutations.
- Changing bilingual docs under `docs/` or `specs/` unless the implementation changes documented product behavior.
- Adding a new global action menu pattern unless selected during requirements confirmation.

## Technical Notes

- Relevant UI file: `apps/web/src/routes/coverage.tsx`.
- Relevant shared primitives: `packages/ui/src/components/button.tsx`, `packages/ui/src/components/select.tsx`.
- Similar single-action table pattern: `apps/web/src/components/task-table/task-table.tsx`.
- Design reference: `DESIGN.md`, especially Buttons, Tables, Responsive Behavior, Accessibility, and Implementation Notes.
- Skill used: `trellis-brainstorm` for requirements capture and `frontend-design` for UI polish direction, constrained by `DESIGN.md`.

## Decision (ADR-lite)

Context: The shared `Button` and `Select` primitives currently use square corners globally, but the immediate visual problems are in the Coverage matrix: several small outline action buttons wrap in a narrow table cell, filter selects render square, and the Select dropdown shows an unintended left gutter.

Decision: Use a focused Coverage matrix polish. Keep shared `Button` untouched, and style the actions cell so multi-action rows render as a compact, intentional stack with rounded compact buttons. For Select, fix the Coverage filter appearance with the smallest appropriate change, either local trigger/content classes or a narrow shared primitive adjustment if the primitive itself causes the dropdown gutter.

Consequences: This avoids broad visual churn while fixing the reported issues. If rounded compact controls become a recurring pattern, a later task can promote the local pattern into shared table-action or form-control variants.

## Spec Update Judgment

No `.trellis/spec/` update is required for this task. The work is a local Coverage matrix UI polish and accessibility adjustment, with no API signatures, database schema, cross-layer contracts, or new reusable component convention.
