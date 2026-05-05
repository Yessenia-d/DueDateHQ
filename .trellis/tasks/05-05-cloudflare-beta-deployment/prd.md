# Prepare Cloudflare Beta Deployment

## Type

AFK deployment slice, with final HITL verification for account/secrets if local credentials are unavailable.

## Goal

Prepare DueDateHQ for hosted Beta deployment on Cloudflare using the existing Better-T-Stack/Alchemy structure, with Worker API, Vite frontend, D1 database, required secrets, and optional queues for monitor jobs.

## Blocked By

- `05-05-auth-firm-workspace`
- `05-05-core-deadline-domain-schema`
- `05-05-official-notice-monitor-agent` for queue/cron/env requirements if included in the first deploy

## Owned Files

- `packages/infra/alchemy.run.ts`
- `packages/env/src/server.ts`
- `packages/env/src/web.ts`
- `apps/server/src/index.ts` only for deployment wiring
- `apps/web/vite.config.ts` only for deployment wiring
- Root/package scripts if needed for deployment commands
- Deployment docs updates if needed

Do not change product feature logic in this task.

## API Ownership

None. This task wires deployment/runtime access for APIs owned by feature tasks.

## Schema Ownership

- D1 database binding and migration application flow.
- No new domain tables.

## Environment Ownership

- Better Auth secrets and base URL.
- D1 binding/config.
- API/frontend URLs.
- Platform-managed AI provider key for monitor task if monitor ships in the same Beta environment.
- Queue/cron bindings for source monitoring if enabled.

## Acceptance Criteria

- Worker API deploys to Cloudflare.
- Frontend deploys and can call the API.
- D1 migrations can be applied.
- Auth/session works against deployed URLs.
- Required env vars are documented and validated.
- If monitor queues/cron are enabled, source check jobs can be enqueued and observed.
- External URL smoke test covers login, dashboard load, and one implemented feature path.

## Out of Scope

- Production incident response.
- Multi-environment promotion pipeline.
- Full observability suite beyond basic deployment checks.
