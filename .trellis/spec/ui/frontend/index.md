# UI Package Guidelines

## Pre-Development Checklist

Before editing `packages/ui`, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`
- `.trellis/spec/web/frontend/index.md` if the change is driven by a product
  screen

## Package Responsibility

`@due-date-hq/ui` owns reusable UI primitives, global styles, and shared UI
utilities. Product-specific layouts and workflow components stay in `apps/web`.

## Current Structure

```txt
packages/ui/src/components/*
packages/ui/src/lib/utils.ts
packages/ui/src/styles/globals.css
```

Components export through package subpath exports such as
`@due-date-hq/ui/components/button`.

## Implementation Rules

- Build primitives with Base UI where available.
- Use `cva` for variants and `cn()` for class merging.
- Keep primitive props compatible with the underlying primitive props.
- Keep icon-only controls accessible with visible tooltips or `sr-only` labels.
- Do not move product workflow state into the UI package.
- Preserve the operational product aesthetic: compact, scannable, restrained,
  and status-forward.

## Verification

- Run `pnpm --filter @due-date-hq/ui check-types` or repo-level
  `pnpm check-types`.
- For visual changes consumed by `apps/web`, verify the relevant route in a
  browser.
