# Server Frontend Boundary Guidelines

`apps/server` has no React UI. Frontend-facing work here means keeping the HTTP
and tRPC boundary compatible with `apps/web`.

Before changing server responses consumed by the web app, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `.trellis/spec/server/backend/index.md`
- `.trellis/spec/api/backend/index.md`

Rules:

- Mount API functionality through tRPC rather than adding ad hoc JSON routes.
- Keep CORS and deployed URLs aligned with `@due-date-hq/env/web`.
- Do not expose internal monitoring/admin endpoints to the public web app
  unless the task PRD explicitly calls for it.
