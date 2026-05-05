# Implement CSV Import with Profile Review

## Type

AFK vertical slice.

## Goal

Implement source-specific CSV import for TaxDome, Drake, Karbon, and QuickBooks with preview, mapping, profile/problem grouped review, duplicate handling, CPA-confirmed relationship suggestions, and commit summaries.

## Blocked By

- `05-05-auth-firm-workspace`
- `05-05-core-deadline-domain-schema`
- `05-05-tax-obligation-coverage-matrix` for Verified-rule task generation and coverage-gap summaries

## Owned Files

- `packages/db/src/schema/imports.ts`
- `packages/db/src/schema/index.ts` for exports only
- `packages/api/src/routers/imports.ts`
- `packages/api/src/imports/adapters/*`
- `packages/api/src/imports/review/*`
- `packages/api/src/routers/index.ts` for router registration only
- `apps/web/src/routes/import.tsx`
- CSV fixtures/tests for TaxDome, Drake, Karbon, and QuickBooks

## API Ownership

- `imports.preview`
- `imports.commit`

## Schema Ownership

- `import_batches`
- `import_review_items`
- `relationship_suggestions`
- `duplicate_candidates` if persisted separately

Uses but does not own:

- `client_relationships`
- `filing_profiles`
- `deadline_tasks`
- `tax_rules`

## Acceptance Criteria

- User selects source system and uploads CSV.
- Preview detects headers and maps client name, EIN/SSN-last-four where present, state, entity type, county, and fiscal year fields where possible.
- Review is grouped by filing/tax profile and problem type, not by every generated task.
- Relationship suggestions are never auto-merged; CPA confirms accepted/rejected suggestions.
- Commit creates client relationships and filing profiles.
- Verified rules generate official tasks only when profile data is sufficient and rule coverage exists.
- Import summary explains ready profiles, generated verified tasks, profiles needing review, and coverage gaps in plain language.
- Missing/fuzzy fields do not block the whole batch.

## Out of Scope

- Direct API integrations with source products.
- Permanent raw CSV storage.
- Perfect compatibility with every historical export variant.
