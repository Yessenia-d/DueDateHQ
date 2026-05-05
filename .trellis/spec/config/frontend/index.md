# Shared Config Guidelines

`@due-date-hq/config` owns shared tool configuration. It is not a runtime
frontend package.

Before editing config, read:

- `.trellis/spec/guides/due-date-hq-project-conventions.md`

Rules:

- Keep strict TypeScript defaults in `tsconfig.base.json`.
- Do not relax `noUnusedLocals`, `noUnusedParameters`, or
  `noUncheckedIndexedAccess` for convenience.
- Package-level tsconfigs should extend the shared base unless a tool requires
  a local override.
- Any broad compiler-option change must be verified with `pnpm check-types`.
