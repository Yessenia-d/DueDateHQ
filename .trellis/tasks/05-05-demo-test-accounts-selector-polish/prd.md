# Polish selector spacing and add demo test accounts

## Goal

Make the product easier to demo end to end by tightening the select control visual spacing and providing three stable CPA test accounts, each with distinct firm client data that exercises the major DueDateHQ workflows.

## What I Already Know

* The screenshot shows consistent blank space on the left side of select controls. This does not appear to be a deliberate product behavior; it is most likely inherited spacing from the shared select component and dashboard select usage.
* The dashboard uses `@due-date-hq/ui/components/select` through `apps/web/src/components/dashboard/dashboard-page.tsx`.
* The shared select trigger currently applies left padding, and select menu items use fixed left/right padding with the selected check indicator on the right.
* `DESIGN.md` calls for dense, scannable operational UI with stable controls and no decorative spacing.
* Auth is powered by Better Auth, with one firm workspace per owner user.
* Business data is firm-scoped across client relationships, filing profiles, deadline tasks, audit logs, imports, coverage, and notices.
* Existing seed helpers cover tax obligations and tax rules, but there is no obvious runtime seed entry for three full demo accounts.
* The product user is always a CPA. A CPA logs into DueDateHQ and imports or manually enters that CPA firm's client/customer data.
* Demo accounts must represent CPA users/firms, not end-client users.

## Assumptions

* Test accounts should be real CPA login accounts, not a front-end-only demo mode.
* Seed data should be repeatable/idempotent so local development and beta demos can reset or re-run it without duplicate records.
* Demo data should clearly preserve DueDateHQ trust language: `Verified`, `Needs review`, `Coverage gap`, `Unsupported`, `Source changed`, and `Custom deadline`.
* The select spacing fix should apply to the shared select component unless browser testing shows it breaks another screen.

## Requirements

* Tighten or normalize select left spacing so selected values and menu options do not look unintentionally indented.
* Preserve clear affordances for open state, selected state, focus, and the dropdown chevron.
* Provide three stable CPA test accounts with known credentials for demo/testing.
* Give each CPA account a distinct firm workspace and client dataset.
* Model imported data as the CPA firm's client relationships, filing/tax profiles, and related deadline tasks.
* Ensure the combined three-account dataset can demonstrate:
  * Dashboard triage horizons and summary metrics.
  * Verified official deadlines.
  * Source changed and notice-review/audit behavior.
  * Coverage gaps, unsupported items, and verification requests.
  * Custom firm-defined manual deadlines.
  * CSV import/review states and duplicate/relationship review where supported.
  * Multiple clients, filing profiles, entity types, jurisdictions, statuses, and firm target dates.
* Seed data must be firm-scoped and must not leak between accounts.
* Keep the core actor model clear: authenticated `user` means CPA operator; imported business data means the CPA firm's clients and filing/tax profiles.
* Audit any visible copy or demo data naming that could make end-clients look like app users.
* Replace CPA-facing `User provided` deadline language with a clearer custom-deadline concept.
* CPA-facing labels should communicate: firm/custom deadline, defined by the CPA firm, not verified by DueDateHQ.

## Acceptance Criteria

* [ ] Dashboard and shared select controls no longer show an unexplained left-side gap in trigger text or selected menu rows.
* [ ] Select controls remain keyboard accessible and visually stable.
* [ ] Three CPA test accounts can log in with documented credentials.
* [ ] Each CPA account lands in its own firm workspace.
* [ ] Each CPA account has a visibly different client dataset.
* [ ] Across the three accounts, the app can demonstrate the major workflows listed in Requirements.
* [ ] Re-running the seed path does not create duplicate demo users or duplicate firm demo records.
* [ ] Lint and type-check pass.
* [ ] Browser verification covers the dashboard select controls and at least one login/demo-account path.

## Definition Of Done

* Tests added or updated for seed/data behavior where practical.
* Lint and type-check pass.
* Browser verification is completed for affected UI.
* Demo account credentials and data intent are documented in the task or project docs if exposed to users.
* Any docs under `docs/` or `specs/` modified in English are updated with corresponding `.zh.md` translations.

## Open Questions

* Which three CPA firm personas/client data splits should be used for the MVP?

## Concept Decision

The product user is the CPA. The CPA imports or manually enters data about the CPA firm's clients. End-clients do not log into the product in Beta and should not be modeled as `user` records.

CPA-facing "User provided deadline" language is ambiguous because it can sound like the client supplied the deadline. The product should instead express the concept as a custom or firm-defined deadline: a deadline the CPA firm adds for planning/tracking when DueDateHQ does not have a verified official rule.

## Logic Impact Assessment

Core domain logic should not need a broad rewrite because the existing model already matches this concept:

* Better Auth `auth_users` represent authenticated CPA operators.
* `firms` represent CPA firm workspaces.
* Business data is scoped by `firmId`.
* `client_relationships` and `filing_profiles` represent the CPA firm's clients and tax profiles.
* Internally, existing `user_provided` enum/source fields can remain for now if a broad schema migration is not needed.
* CPA-facing UI, exports, demo data, and documentation should not rely on `User provided` as the primary label.

Implementation should still review and tighten:

* Visible copy: avoid "user data" when the intended meaning is "client data" or "firm client data".
* Demo/test data: create CPA accounts and CPA firm datasets, not end-client accounts.
* Authorization boundaries: business procedures must continue to scope by `session.firm.id`, not only `session.user.id`.
* Labels around custom/manual deadlines: use wording such as `Custom deadline` and `Defined by firm - Not verified by DueDateHQ`.

## Out Of Scope

* Multi-user firm membership or role permissions.
* Production self-service demo reset UI.
* External email/SMS/calendar notification integrations.
* Replacing Better Auth.

## Technical Notes

* Relevant UI files inspected:
  * `packages/ui/src/components/select.tsx`
  * `apps/web/src/components/dashboard/dashboard-page.tsx`
  * `DESIGN.md`
* Relevant auth/data files inspected:
  * `packages/api/src/auth.ts`
  * `packages/db/src/schema/auth.ts`
  * `packages/db/src/schema/firms.ts`
  * `packages/db/src/schema/deadline-domain.ts`
  * `packages/api/src/lib/seed-tax-data.ts`
* Likely implementation direction:
  * Adjust shared select component spacing and verify dashboard filters.
  * Add an idempotent demo data seed path that creates or reuses three Better Auth users, their firms, and scoped business records.
  * Prefer generated or deterministic IDs for demo records so cleanup/reseed can be reliable.
