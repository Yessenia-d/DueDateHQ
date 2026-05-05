# Implement Tax Obligation Library and Coverage Matrix

## Type

AFK vertical slice.

## Goal

Implement the tax obligation/rule trust layer and coverage matrix so CPAs can see supported sources, Verified rules, Needs review, Source changed, Unsupported, and Coverage gap states without mistaking gaps for official deadlines.

## Blocked By

- `05-05-core-deadline-domain-schema`

## Owned Files

- `packages/db/src/schema/tax-rules.ts`
- `packages/db/src/schema/index.ts` for exports only
- `packages/api/src/routers/coverage.ts`
- `packages/api/src/routers/taxRules.ts`
- `packages/api/src/routers/index.ts` for router registration only
- `apps/web/src/routes/coverage.tsx`
- Coverage/tax-rule tests near the files above

## API Ownership

- `coverage.matrix`
- `coverage.getRule`
- `coverage.requestCoverage`
- `taxRules.getEvidence` if not owned by the dashboard task

## Schema Ownership

- `tax_obligations`
- `tax_rules`
- `tax_rule_versions`
- `verification_requests`

## Acceptance Criteria

- Coverage matrix lists federal and supported state coverage without claiming complete verified 50-state coverage.
- P0 supported official source scope is visible: IRS, CA FTB, NY Tax Department, TX Comptroller, FL DOR.
- Verified rules are linked to official source evidence.
- Needs review, Source changed, Unsupported, and Coverage gap states are visible and cannot generate official Deadline Tasks.
- Coverage gaps expose actions: request DueDateHQ verification, add user-provided deadline, ignore/dismiss for now.
- Rule evidence includes current due date, original due date, source URL, status, timestamps, and version.

## Out of Scope

- Source crawling/AI analysis.
- CPA notice proposal approval workflow.
- Direct tax/legal guarantees.
