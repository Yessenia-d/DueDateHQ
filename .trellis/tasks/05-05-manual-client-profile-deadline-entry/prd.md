# Implement Manual Client Profile and Deadline Entry

## Type

AFK vertical slice.

## Goal

Let a CPA manually create a client relationship, filing/tax profile, and user-provided deadline, then request DueDateHQ verification without labeling the manual deadline as official.

## Blocked By

- `05-05-auth-firm-workspace`
- `05-05-core-deadline-domain-schema`
- `05-05-tax-obligation-coverage-matrix` for verification request integration

## Owned Files

- `packages/api/src/routers/clients.ts`
- `packages/api/src/routers/filingProfiles.ts`
- `packages/api/src/routers/deadlineTasks.ts`
- `packages/api/src/routers/index.ts` for router registration only
- `apps/web/src/routes/clients/new.tsx`
- `apps/web/src/routes/clients/$clientId.tsx`
- `apps/web/src/routes/clients/$clientId/deadlines/new.tsx`
- Manual-entry tests near the files above

## API Ownership

- `clients.createRelationship`
- `clients.get`
- `filingProfiles.createManual`
- `deadlineTasks.createManual`
- `deadlineTasks.requestVerification`

## Schema Ownership

Uses existing schema from:

- `client_relationships`
- `filing_profiles`
- `deadline_tasks`
- `deadline_date_events`
- `verification_requests`
- `audit_logs`

No new schema tables unless a missing contract is identified and reflected in the relevant spec first.

## Acceptance Criteria

- CPA can create a client relationship manually.
- CPA can add one or more filing/tax profiles to that relationship.
- CPA can create one-time or recurring user-provided deadlines.
- Manual deadlines appear as `User provided - Not verified by DueDateHQ`.
- Firm target date is optional and clearly separate from official/current due date.
- CPA can request DueDateHQ verification for a manual deadline.
- Verification request does not mutate the original user-provided task.

## Out of Scope

- Client portal.
- Document upload/checklists.
- Automatic verification of user-entered dates.
- Bulk spreadsheet-style manual entry.
