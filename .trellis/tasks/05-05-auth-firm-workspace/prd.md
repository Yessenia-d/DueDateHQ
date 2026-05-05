# Build Auth and Firm Workspace Shell

## Type

AFK vertical slice.

## Goal

Implement the Beta authentication and firm workspace foundation so a CPA can register, log in, and access a firm-scoped session used by every later DueDateHQ feature.

## Blocked By

- `05-05-align-domain-glossary` for final domain vocabulary alignment.

## Owned Files

- `packages/env/src/server.ts`
- `packages/api/src/context.ts`
- `packages/api/src/routers/auth.ts`
- `packages/api/src/routers/index.ts` for router registration only
- `packages/db/src/schema/auth.ts`
- `packages/db/src/schema/firms.ts`
- `packages/db/src/schema/index.ts` for exports only
- `apps/server/src/index.ts`
- `apps/web/src/routes/login.tsx`
- `apps/web/src/routes/__root.tsx` only for session/layout wiring
- Auth-related tests near the files above

Avoid touching dashboard/import/monitor feature files.

## API Ownership

- Better Auth HTTP handlers for register, login, logout, and session.
- `auth.session` or equivalent tRPC session query if needed by the web app.
- Firm bootstrap behavior after first registration.

## Schema Ownership

- Better Auth required tables.
- `firms`
  - `id`
  - `name`
  - `ownerUserId`
  - `createdAt`
  - `updatedAt`

## Acceptance Criteria

- CPA can register with email/password.
- CPA can log in and log out.
- Authenticated requests include firm context.
- A first firm/workspace is created or resolved for the authenticated CPA.
- Unauthenticated business API access is rejected.
- OAuth, MFA, organizations, invitations, and password reset remain out of scope.

## Out of Scope

- Multi-user firm membership.
- Role-based permissions beyond any minimal internal guard needed for Beta.
- Business domain tables outside `firms`.
