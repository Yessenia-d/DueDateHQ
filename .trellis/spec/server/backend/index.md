# Server Backend Guidelines

## Pre-Development Checklist

Before editing `apps/server`, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `docs/technical/due-date-hq-beta-technical-plan.md` for cross-service scope
- The task PRD and any referenced feature spec under `specs/`

## Package Responsibility

`apps/server` is the Cloudflare Worker HTTP boundary. It owns the Hono app,
middleware, CORS, request logging, the root health response, and tRPC mounting.
It must not own domain routers, database schema, or business logic that belongs
in `packages/api` or `packages/db`.

## Current Structure

```txt
apps/server/src/index.ts
```

The file currently wires:

- `logger()` from Hono
- CORS using `env.CORS_ORIGIN`
- `/trpc/*` through `@hono/trpc-server`
- `createContext` from `@due-date-hq/api/context`
- `appRouter` from `@due-date-hq/api/routers/index`
- `GET /` returning `OK`

## Implementation Rules

- Add server-wide middleware in `apps/server/src/index.ts`.
- Add tRPC procedures in `packages/api`; only mount the router here.
- Read server env through `@due-date-hq/env/server`.
- Keep CORS explicit. Do not hardcode production origins in feature code.
- Preserve Cloudflare Worker compatibility. Do not introduce Node-only runtime
  APIs into request handling.

## Verification

- Run `pnpm check-types`.
- For deployment-sensitive changes, also verify the Cloudflare/Alchemy path
  through the relevant infra task.
