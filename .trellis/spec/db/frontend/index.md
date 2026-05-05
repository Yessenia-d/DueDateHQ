# Database Frontend Boundary Guidelines

`packages/db` has no React UI. Frontend-facing work here means preserving data
contracts that eventually flow through `packages/api` into `apps/web`.

Before changing schema used by UI workflows, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `.trellis/spec/db/backend/index.md`
- The relevant feature spec under `specs/`

Rules:

- Do not import database modules directly into `apps/web`.
- Keep verification, coverage, audit, and date-event fields explicit enough for
  UI evidence displays.
- When a UI needs grouped status, expose it through API response shapes rather
  than making React components reconstruct database relationships.
