# Add Clients List Page

## Goal

When a user clicks `Clients` in the workspace sidebar, they should land on a clients list page instead of the `New client relationship` form. The list page should make existing client relationships discoverable and keep new relationship creation one explicit action away.

## Requirements

- Add a `/clients` page to the web app.
- Change the sidebar `Clients` navigation target from `/clients/new` to `/clients`.
- Add an API query that lists firm-owned client relationships for the signed-in firm.
- Show a dense, operational clients table using the existing DueDateHQ design system.
- Each client row should link to the existing `/clients/$clientId` detail page.
- Provide a clear `New client relationship` action from the list page.
- Preserve the existing `/clients/new` page and post-create redirect to the client detail page.
- Include loading, empty, and error states.

## Acceptance Criteria

- [ ] Clicking `Clients` in the sidebar opens `/clients`.
- [ ] `/clients` displays existing client relationships for the current firm.
- [ ] The list excludes client relationships from other firms.
- [ ] A user can click a listed client and reach its detail page.
- [ ] A user can click `New client relationship` and reach `/clients/new`.
- [ ] Empty state explains that no client relationships exist yet and offers the create action.
- [ ] Lint and type-check pass.

## Definition of Done

- Tests added or updated for the new backend list query.
- Frontend uses shared UI primitives from `packages/ui`.
- UI follows `DESIGN.md`: light-first, dense, table-based, no marketing hero/card treatment.
- No unrelated dirty files are reverted or folded into this task.

## Technical Approach

- Add `clients.list` in `packages/api/src/routers/clients.ts`, ordered by client display name.
- Include lightweight rollup counts for filing profiles and deadline tasks if practical within the existing Drizzle patterns; otherwise ship the list first with relationship metadata only.
- Add `apps/web/src/routes/clients/index.tsx` for TanStack Router file routing.
- Use the existing `Table`, `Button`, `StatusBadge`, `trpc`, and app shell patterns.
- Update `apps/web/src/components/app-sidebar.tsx` to point `Clients` at `/clients`.

## Decision (ADR-lite)

**Context**: The current sidebar `Clients` link targets `/clients/new`, so users cannot browse existing clients before creating a new relationship.

**Decision**: Add a dedicated `/clients` index route and make it the sidebar destination. Keep `/clients/new` as a secondary create action.

**Consequences**: The navigation becomes predictable and leaves room for future search/filtering without changing the create flow.

## Out of Scope

- Editing or deleting client relationships.
- Search, filters, sorting controls, pagination, or bulk actions.
- Changing the existing client detail page workflows.
- Creating docs under `docs/` or `specs/`.

## Technical Notes

- `apps/web/src/components/app-sidebar.tsx` currently links `Clients` to `/clients/new`.
- Existing routes: `/clients/new`, `/clients/$clientId`, `/clients/$clientId/deadlines/new`.
- Existing API router: `packages/api/src/routers/clients.ts` has `createRelationship` and `get`, but no list query.
- Existing manual-entry tests live in `packages/api/src/routers/manual-entry.test.ts`.
- `DESIGN.md` requires dense operational tables, semantic colors only, shared UI primitives, and browser verification for user-facing pages.
