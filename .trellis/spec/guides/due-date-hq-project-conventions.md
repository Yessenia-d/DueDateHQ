# DueDateHQ Project Conventions

This guide is the bootstrap baseline for implementation agents. It records the
project as it exists today, not an idealized future architecture.

## Product Invariants

- DueDateHQ is for solo and independent CPAs managing mixed individual and
  small-business client deadline work.
- Model product language as `Client relationship -> Filing/Tax profile ->
  Deadline task`.
- Only a `Verified` tax rule can create official system-generated deadline
  tasks.
- `Needs review`, `Source changed`, `Unsupported`, `Coverage gap`, and
  user-provided deadlines must stay visible without being represented as
  verified official deadlines.
- Firm target dates are planning metadata. They must never replace or obscure
  official due dates.
- Official notice monitoring can create candidates and proposals, but it must
  not mutate CPA workspace data without CPA approval.

## Monorepo Layout

- Use `pnpm` workspaces with apps under `apps/*` and shared packages under
  `packages/*`.
- Run repo-wide verification with `pnpm check-types`; it delegates to Turbo.
- Keep package dependencies explicit in each package `package.json`. Prefer
  workspace imports such as `@due-date-hq/api`, `@due-date-hq/db`,
  `@due-date-hq/env`, and `@due-date-hq/ui`.
- Shared TypeScript defaults live in `packages/config/tsconfig.base.json`.
  Preserve `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, and
  `noUnusedParameters`; do not silence these settings to make code compile.

## Backend Boundary

- `apps/server/src/index.ts` owns the Hono app, CORS, request logging, health
  check, and tRPC HTTP mounting.
- `packages/api` owns tRPC routers, procedures, and request context.
- `packages/db` owns Drizzle schema and database construction.
- `packages/env` owns typed environment access.
- Do not put domain routers or database schema in `apps/server`; wire them
  through the shared packages.

Example Hono/tRPC boundary:

```ts
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => createContext({ context }),
  }),
);
```

## API Conventions

- Define tRPC primitives in `packages/api/src/index.ts`.
- Register routers through `packages/api/src/routers/index.ts`.
- Keep `publicProcedure` only for truly public endpoints such as health checks.
  Business procedures must require session and firm context once auth exists.
- Context currently returns `auth: null` and `session: null`; auth work should
  extend `createContext` rather than bypassing it.
- Validate external input at the procedure boundary with Zod before writing to
  the database.

Example router shape:

```ts
export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
});
export type AppRouter = typeof appRouter;
```

## Database Conventions

- Use Drizzle with Cloudflare D1. `createDb()` returns `drizzle(env.DB, {
  schema })`.
- Put schema definitions under `packages/db/src/schema/` and export them from
  `packages/db/src/schema/index.ts`.
- Generate migrations under `packages/db/src/migrations` with
  `pnpm db:generate`; apply with the repo's D1/Cloudflare flow.
- Prefer snake_case table and column names in SQLite/D1. Keep TypeScript names
  descriptive and explicit.
- Record audit/event history for changes that affect official due dates, firm
  target dates, notice proposal decisions, import commits, and task status.
- Do not silently overwrite official due-date history; append a date event.

## Frontend Conventions

- The web app uses Vite, React 19, TanStack Router, React Query, and tRPC.
- File routes live under `apps/web/src/routes`; shared app components live
  under `apps/web/src/components`.
- Keep router context typed through `RouterAppContext` and pass `trpc` plus
  `queryClient` from `apps/web/src/main.tsx`.
- Use `useQuery(trpc.<procedure>.queryOptions())` for tRPC query data.
- Use the `@/` alias inside `apps/web`; import shared UI from
  `@due-date-hq/ui/components/*`.

Example data-fetching shape:

```tsx
const healthCheck = useQuery(trpc.healthCheck.queryOptions());
```

## UI Conventions

- Shared primitives live in `packages/ui/src/components`.
- Use Base UI primitives, `class-variance-authority`, and the local `cn`
  helper from `@due-date-hq/ui/lib/utils`.
- Keep reusable primitive APIs small: `variant`, `size`, `className`, and the
  underlying primitive props.
- Preserve the current restrained operational UI direction for the product:
  dense, scannable information, explicit trust/status badges, and clear
  filters/actions over marketing-style hero layouts.
- Use accessible labels for icon-only controls, as in the theme toggle's
  `sr-only` label.

Example component pattern:

```tsx
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

## Environment Conventions

- Server-side environment values come from Cloudflare bindings via
  `@due-date-hq/env/server`.
- Frontend environment values come from `@due-date-hq/env/web` and must use the
  `VITE_` prefix.
- Do not read `process.env` or untyped `import.meta.env` directly in app code.
  Add keys to the env package first.

Example web env validation:

```ts
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
```

## Infra Conventions

- `packages/infra/alchemy.run.ts` owns the Cloudflare resource graph.
- Use Alchemy resources for D1, Worker, and Vite deployment.
- Keep bindings explicit. The server Worker currently receives `DB` and
  `CORS_ORIGIN`; the web Vite deployment receives `VITE_SERVER_URL`.
- Load local `.env` files only in the infra entrypoint or package-specific
  tooling, not in runtime application modules.

## Documentation and Spec Conventions

- Product/technical/feature specs live under `docs/` and `specs/`.
- English is the primary implementation spec language; Chinese counterparts
  (`*.zh.md`) are maintained for review where present.
- Feature work should read the relevant `specs/*.md` before coding. If the spec
  does not answer a product or technical decision, update the spec before
  implementing.

## Verification

- Always run `pnpm check-types` before claiming implementation completion.
- For database work, also run migration generation/apply checks relevant to the
  task.
- For frontend UI work, run a browser check when a user-facing route or layout
  changes.
- Treat Vite chunk-size warnings as warnings unless the task is specifically
  about bundle size.

## Forbidden Patterns

- Do not generate official deadline tasks from unverified, needs-review,
  source-changed, unsupported, coverage-gap, or user-provided data.
- Do not send customer PII to AI models by default for official notice
  monitoring.
- Do not let monitor jobs mutate customer workspace data directly.
- Do not bypass tRPC context for business APIs.
- Do not add raw database access to React components.
- Do not create duplicate local copies of shared skills; project skills are
  maintained under `.agents/skills` with `.claude/skills` and `skills` as
  symlink entrypoints.
