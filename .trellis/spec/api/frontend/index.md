# API Frontend Boundary Guidelines

`packages/api` has no React UI. Frontend-facing work in this package means
preserving typed contracts consumed by `apps/web`.

Before changing exported router types, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `.trellis/spec/api/backend/index.md`
- `.trellis/spec/web/frontend/index.md`

Rules:

- Keep `AppRouter` exported from `packages/api/src/routers/index.ts`.
- Do not return raw database-only shapes when the UI needs explained status or
  grouped workflow data.
- Prefer stable response fields over UI-side inference for verification and
  notice proposal state.
