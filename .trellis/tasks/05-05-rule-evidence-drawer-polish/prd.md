# Polish Rule Evidence Drawer And Verify Due Date Calculations

## Goal

Improve the `/coverage` Rule evidence drawer so a CPA can quickly distinguish evidence section labels from values, scan separate content blocks without cramped spacing, and trust that the displayed calculated due dates match IRS weekend and District of Columbia legal-holiday rules.

## Requirements

- Make Rule evidence drawer section labels visually distinct from section content through stronger size, color, weight, and spacing hierarchy.
- Increase vertical spacing between evidence content groups while keeping the drawer dense and operational.
- Keep official source URLs and timestamp/version fields readable as evidence metadata.
- Correct calculated due dates so fixed and extension dates adjust for weekends and legal holidays observed in the District of Columbia, not only federal holidays.
- Keep the "Calculated due dates" table visible but label/space it as evidence metadata rather than blending into the surrounding content.

## Acceptance Criteria

- [ ] In the Rule evidence drawer, labels like `Rule summary`, `Official source`, and `Calculated due dates` are visually distinguishable from their values at a glance.
- [ ] Adjacent evidence groups have enough vertical separation that content blocks do not feel merged.
- [ ] Form 1040 tax year 2026 displays `Apr 15, 2027` and extension `Oct 15, 2027`.
- [ ] Form 1040 tax year 2027 displays `Apr 18, 2028` and extension `Oct 16, 2028`.
- [ ] A regression test covers April 15, 2028 falling on a weekend followed by observed DC Emancipation Day on Monday, April 17, 2028.
- [ ] `pnpm check-types` passes.
- [ ] `/coverage` drawer is browser-checked after the UI change.

## Definition of Done

- Tests added or updated for due-date calculation behavior.
- Type-check passes.
- Browser/manual verification confirms the drawer hierarchy and spacing are improved.
- Trellis spec update reviewed; record "no spec update needed" if no new durable convention emerges.

## Technical Approach

- Update the shared due-date adjustment logic in `packages/api/src/lib/due-date-engine.ts` so every calculation path that already calls `adjustForWeekendAndHoliday` benefits from DC legal holidays.
- Add the 2028 observed DC Emancipation Day edge case to `packages/api/src/lib/due-date-engine.test.ts`.
- Polish only the product-specific drawer markup/classes in `apps/web/src/routes/coverage.tsx`; do not change shared UI primitives unless the existing classes cannot express the needed hierarchy.

## Decision (ADR-lite)

**Context**: The screenshot shows the evidence drawer content blending together, and the current 2027 tax year 1040 example misses the observed DC Emancipation Day after an April 15 weekend.

**Decision**: Treat this as a focused coverage evidence polish plus due-date engine correctness fix. Keep dates as examples, but make them accurate under the same official-source rules used for generated deadlines.

**Consequences**: The fix improves all rules that use `adjustForWeekendHoliday`, not only Form 1040. Future years beyond the current supported calendar range may still require adding holiday coverage or generating it from rules.

## Out of Scope

- Reworking the whole `/coverage` page layout.
- Adding new evidence fields or changing API response shape.
- Adding complete 50-state legal holiday support.
- Replacing seeded official source data with live IRS scraping.

## Research References

- [`research/irs-1040-due-date-rules.md`](research/irs-1040-due-date-rules.md) — IRS and DC sources confirming April 15, weekend/legal-holiday adjustment, automatic six-month extension, and DC Emancipation Day observation.

## Technical Notes

- Relevant frontend route: `apps/web/src/routes/coverage.tsx`.
- Relevant calculation logic: `packages/api/src/lib/due-date-engine.ts`.
- Relevant tests: `packages/api/src/lib/due-date-engine.test.ts`, `packages/api/src/routers/coverage.test.ts`.
- Relevant specs/guides: `.trellis/spec/web/frontend/index.md`, `.trellis/spec/api/backend/index.md`, `.trellis/spec/ui/frontend/index.md`, `specs/coverage-matrix.md`, `specs/tax-rule-verification.md`, `DESIGN.md`.
