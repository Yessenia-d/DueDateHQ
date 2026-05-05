# Infra Guidelines

## Pre-Development Checklist

Before editing `packages/infra`, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `specs/cloudflare-deployment.md`

## Package Responsibility

`packages/infra` owns the Alchemy Cloudflare resource graph for the beta
deployment. It should declare platform resources and bindings, not product
business logic.

## Current Structure

```txt
packages/infra/alchemy.run.ts
```

The current graph creates:

- A D1 database with migrations from `../../packages/db/src/migrations`
- A Worker for `apps/server`
- A Vite deployment for `apps/web`
- Bindings from the database/server URL into the runtime apps

## Implementation Rules

- Keep resource names stable unless the task explicitly handles migration.
- Add new Worker bindings in infra and the env package together.
- Keep local `dotenv` loading in the infra entrypoint or tool scripts only.
- Do not put customer PII or secrets in checked-in config.
- Monitor queues, cron, and AI provider settings belong here when those tasks
  are implemented.

## Verification

- Run `pnpm check-types`.
- Use the task-specific deploy/smoke-test commands before declaring deployment
  changes complete.
