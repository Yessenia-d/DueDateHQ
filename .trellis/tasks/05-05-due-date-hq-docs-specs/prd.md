# Land DueDateHQ Product, Technical, and SDD Specs

## Goal

Land the complete DueDateHQ planning documents in the repository before implementation starts.

This task is documentation-only. Do not modify application code, database schema, generated route files, package manifests, or deployment configuration in this task.

## Scope

Create durable repo documents for:

- Complete product plan
- Complete technical plan
- Spec-Driven Development feature specs
- Official source monitoring and rule update design
- Verification status taxonomy
- Manual client and deadline entry
- Go-to-market plan
- Feature progress tracking plan

## Deliverables

- `docs/due-date-hq-beta-plan.md`
- `docs/product/due-date-hq-product-plan.md`
- `docs/technical/due-date-hq-beta-technical-plan.md`
- `specs/README.md`
- `specs/auth.md`
- `specs/csv-imports.md`
- `specs/manual-client-and-deadline-entry.md`
- `specs/tax-obligation-library.md`
- `specs/tax-rule-verification.md`
- `specs/official-source-monitoring.md`
- `specs/coverage-matrix.md`
- `specs/monday-triage-dashboard.md`
- `specs/feature-progress-page.md`
- `specs/gtm.md`
- `specs/cloudflare-deployment.md`

## Constraints

- Do not implement code.
- Do not change TypeScript, TSX, schema, API, package, or deployment files.
- Keep Beta product wording transparent: DueDateHQ can monitor and verify sources, but unverified rules must not be presented as official deadlines.

## Acceptance Criteria

- Product plan and technical plan exist and are linked from a top-level beta plan.
- Each major feature has a corresponding SDD spec.
- Each spec includes goal, user flow, Mermaid flow diagram, pages/API, data model, acceptance criteria, and out-of-scope.
- Verification status rules include `Verified`, `Needs review`, `Source changed`, `Unsupported`, and user-provided manual deadlines.
- Official source monitoring design includes 24h detection, change candidates, verification queue, and manual approval before publishing verified rules.
