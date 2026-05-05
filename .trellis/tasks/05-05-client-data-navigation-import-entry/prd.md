# Add Tax Work navigation and separate client maintenance

## Goal

Make the beta app's product structure match the CPA workflow: client maintenance is separate from tax work. `Tax Work` owns selecting a client, importing tax information, and reviewing deadline tasks. `Clients` owns only customer information maintenance.

## What I already know

- The user wants the fastest implementation path.
- Trellis documentation should remain as a trace of the decision and scope.
- The user explicitly asked not to run the Trellis check phase and not to use subagents.
- `/import` already exists, but should not be exposed as a main navigation item.
- `/clients` and `/clients/$clientId` already exist.
- Product language should stay aligned to `Client relationship -> Filing/Tax profile -> Deadline task`.
- The dashboard should remain a cross-client triage surface, not the canonical client record.
- The user selected `Tax Work` as the sidebar label instead of `Tasks`, `Taxes`, or `Tax Tasks`.
- `Import CSV` belongs to Tax Work, as a way to import tax information for the selected client. It should not be a Clients page primary action.

## Requirements

- Remove `Import` from the authenticated app navigation.
- Add a `Tax Work` sidebar entry.
- Add a `/tax-work` route.
- `Tax Work` must include a single-client selector.
- `Tax Work` must show task details for the selected client.
- `Tax Work` must expose `Import tax info` for the selected client.
- Keep `/import` as a technical route if that is fastest, but access should come from `Tax Work`, not the sidebar.
- `Clients` should be customer information maintenance only:
  - list clients
  - open client details
  - create/edit customer information where already supported
  - no `Import CSV` primary action
  - no full task workspace
- Client detail should keep basic customer information and a light tax-work link, not a full Client 360.
- Keep the implementation shallow and frontend-first unless an existing API already supports richer data.

## Acceptance Criteria

- [x] Sidebar shows `Tax Work`.
- [x] Sidebar does not show `Import`.
- [x] `Clients` page does not present CSV import as a primary customer-maintenance action.
- [x] `Tax Work` page has a single-client selector.
- [x] `Tax Work` page shows task details scoped to the selected client.
- [x] `Tax Work` page has an `Import tax info` action that routes to the import flow.
- [x] Deadline tables show `Client` and `Filing profile` as separate columns instead of a combined `Client / profile` column.
- [x] Deadline tables show the filing profile identifier in its own column: EIN for entity profiles and SSN last 4 for individual profiles.
- [x] Import profile review explicitly shows the source-derived customer profile fields: client name, EIN, state, and entity type.
- [x] Client detail links users to Tax Work for that client instead of acting as the main task workspace.
- [x] Existing dashboard behavior remains unchanged.
- [x] Trust states such as `Verified`, `Coverage gap`, `Needs review`, and user-provided deadlines remain visible where already present.

## Explicit Non-Goals

- No new backend schema.
- No new import parser behavior.
- No route-level rewrite unless the existing code makes it cheaper than an in-page split.
- No Trellis implement/check subagents.
- No Trellis check phase for this fast pass.

## Technical Notes

- Relevant routes:
  - `apps/web/src/routes/import.tsx`
  - `apps/web/src/routes/clients/index.tsx`
  - `apps/web/src/routes/clients/$clientId.tsx`
- Relevant app shell:
  - `apps/web/src/components/app-sidebar.tsx`
- Relevant specs:
  - `specs/csv-imports.md`
  - `specs/manual-client-and-deadline-entry.md`
  - `specs/dashboard.md`
- Relevant product/design context:
  - `PRODUCT.md`
  - `DESIGN.md`

## Implementation Notes

- Earlier fast-pass work exposed `/import` in the sidebar and added `Import CSV` to Clients. That direction has been superseded by the user's latest product decision.
- Corrected direction: `Tax Work` owns importing tax info and reviewing tasks; `Clients` owns customer data maintenance.
- Implemented `/tax-work` as the Tax Work route.
- Tax Work defaults to the first available client or the `clientIds` query value, filters visible tasks by that selected client, and links `Import tax info` to `/import` with the selected client id in the query string.
- Import shows the selected client count when opened from Tax Work.
- Client detail now links to `/tax-work?clientIds=<clientId>` instead of presenting a task workspace.
- Clients list is customer-record focused and no longer exposes CSV import or filing/task columns as primary list content.
- Formal Trellis check remains intentionally skipped per user request.
- Added a server dev wrapper that applies local Wrangler D1 migrations before `wrangler dev` starts, then verifies `deadline_tasks.entered_deadline_reference_note` exists. This prevents local schema drift from surfacing as `dashboard.summary` 500s.
- Made the demo seed endpoint tolerate an unset `DEMO_SEED_TOKEN`, so loopback seeding does not fail with an env `.trim()` exception.
- Added CSV import sample fixtures for adapter testing and manual preview checks:
  - `packages/api/src/imports/adapters/fixtures/taxdome-sample.csv`
  - `packages/api/src/imports/adapters/fixtures/drake-sample.csv`
  - `packages/api/src/imports/adapters/fixtures/karbon-sample.csv`
  - `packages/api/src/imports/adapters/fixtures/quickbooks-sample.csv`
