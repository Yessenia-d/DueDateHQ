# Improve Coverage Matrix Information Architecture

## Goal

Rework `/coverage` so it behaves less like an internal coverage inventory and more like a CPA-facing risk and trust surface. The page should still expose supported sources and all obligation coverage states, but the first scan should answer which obligations affect verified task generation and what action is safe next.

## What I Already Know

- DueDateHQ product register is a light-first Verified Operations Console for solo and independent CPAs.
- Coverage Matrix must make supported coverage explicit without implying complete verified 50-state coverage.
- Current `/coverage` order is header, status counts, P0 sources, jurisdiction/status filters, jurisdiction-grouped table, evidence drawer.
- Existing API exposes obligation name, jurisdiction, tax category, entity types, verification status, rule id, source fields, verification timestamps, and supported sources.
- Existing spec expects filtering by state, entity type, tax category, and verification status.
- Existing spec expects monitor/source status fields such as last checked, last changed, last verified, source agency, and supported source/scope.

## Requirements

- Reorder the top of `/coverage` around action/risk scanning:
  - Keep a short Beta limitation statement visible.
  - Make non-verified states the primary summary order: Source changed, Needs review, Coverage gap, Unsupported, then Verified.
  - Let summary counts act as status filter shortcuts.
  - Move P0 supported official sources out of the primary reading path into a lower-priority expandable or metadata section.
- Add filters for:
  - Jurisdiction.
  - Entity type.
  - Tax category.
  - Verification status.
- Improve the table scanning layer:
  - Preserve jurisdiction grouping.
  - Keep obligation, tax category, entity types, verification status, and actions visible.
  - Add source/monitor scan data, including source agency/name where present, last checked, last changed, and last verified.
  - Do not present unverified, unsupported, or coverage-gap entries as verified official deadlines.
- Make row actions status-specific:
  - Verified rules: evidence is primary.
  - Source changed / needs review: review evidence and request review are primary.
  - Coverage gap: request verification, add entered deadline, and dismiss for now are available.
  - Unsupported: explain unsupported state and allow request verification/add entered deadline where applicable, without implying scheduling support.
- Add a detail path for non-verified rows:
  - Explain the state.
  - Show obligation metadata and available source/monitor fields.
  - Show safe next actions.
  - Keep evidence drawer for rows with a rule.

## Acceptance Criteria

- [ ] `/coverage` prioritizes actionable non-verified states above verified inventory.
- [ ] Status summary counts can filter the matrix.
- [ ] Entity type and tax category filters exist and combine with jurisdiction/status filters.
- [ ] P0 supported official sources remain visible but no longer dominate the top scan.
- [ ] The table shows source/monitor scan fields instead of hiding them only in the drawer.
- [ ] Non-verified row actions differ by state and use precise copy.
- [ ] Gap/unsupported/non-verified rows can open a detail drawer even without a verified rule.
- [ ] Existing coverage API tests pass or are updated for the new response shape.
- [ ] `pnpm check-types` passes.

## Out of Scope

- New database tables or migrations.
- Public SEO coverage page.
- Complete 50-state seed coverage.
- Changing task generation rules.
- Creating official Deadline Tasks from non-verified data.

## Technical Notes

- Main route: `apps/web/src/routes/coverage.tsx`.
- API route: `packages/api/src/routers/coverage.ts`.
- Relevant spec: `specs/coverage-matrix.md`.
- Design context: `PRODUCT.md` and `DESIGN.md`.
- User explicitly requested implementation of the prior critique points.
