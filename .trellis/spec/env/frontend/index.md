# Web Environment Guidelines

## Pre-Development Checklist

Before editing frontend environment contracts, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `.trellis/spec/web/frontend/index.md`

## Package Responsibility

`@due-date-hq/env/web` validates browser-exposed environment values. It is the
only supported import for frontend env access.

## Current Contract

The web env schema currently requires:

```ts
VITE_SERVER_URL: z.url()
```

The client prefix is `VITE_`, and runtime values come from `import.meta.env`.

## Implementation Rules

- Add new browser env keys to `packages/env/src/web.ts`.
- Every browser-exposed key must start with `VITE_`.
- Never read `import.meta.env` directly in route or component code.
- Never expose server-only secrets to the web env package.

## Verification

- Run `pnpm check-types`.
- For deployment changes, confirm `packages/infra/alchemy.run.ts` provides the
  same binding name expected by the web env schema.
