# Server Environment Guidelines

## Pre-Development Checklist

Before editing server environment contracts, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `.trellis/spec/infra/frontend/index.md` for Cloudflare binding ownership

## Package Responsibility

`@due-date-hq/env/server` exposes Cloudflare Worker bindings to server-side
code. It is the only supported import for server runtime env access.

## Current Contract

```ts
export { env } from "cloudflare:workers";
```

The actual binding types come from `packages/env/env.d.ts` and the Cloudflare
resource declarations in `packages/infra/alchemy.run.ts`.

## Implementation Rules

- Add server binding types before using a new binding in app code.
- Keep runtime modules free of `dotenv` calls.
- Do not read `process.env` directly in server request handling.
- Secrets such as Better Auth secrets and AI provider keys should be platform
  bindings, not hardcoded literals.

## Verification

- Run `pnpm check-types`.
- For new bindings, verify the infra task updates `alchemy.run.ts` and
  deployment documentation.
