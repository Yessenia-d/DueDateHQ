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
* Demo data should clearly preserve DueDateHQ trust language: `Verified`, `Needs review`, `Coverage gap`, `Unsupported`, `Source changed`, and `Entered deadline`.
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
  * Entered deadlines with a clear reference/basis note.
  * CSV import/review states and duplicate/relationship review where supported.
  * Multiple clients, filing profiles, entity types, jurisdictions, statuses, and firm target dates.
* Seed data must be firm-scoped and must not leak between accounts.
* Keep the core actor model clear: authenticated `user` means CPA operator; imported business data means the CPA firm's clients and filing/tax profiles.
* Audit any visible copy or demo data naming that could make end-clients look like app users.
* Replace CPA-facing `User provided` deadline language with the clearer `Entered deadline` concept.
* CPA-facing labels should communicate: entered by the CPA firm, reference recorded, not verified by DueDateHQ.
* An entered deadline must show or store what it references, such as client source data, prior-year workpaper, CPA judgment, engagement-specific tracking, or an official/client notice that is not yet modeled as a verified DueDateHQ rule.
* Rename CPA-facing manual deadline flows:
  * Action labels should use `Add entered deadline`.
  * Status/trust labels should use `Entered deadline`.
  * Explanation labels should use `Reference`.
  * Trust copy should include `Not verified by DueDateHQ`.
* Migrate internal database and API semantics to match entered-deadline terminology:
  * `deadline_tasks.source_type` should use `entered_deadline` instead of `user_provided` for firm-entered/manual deadlines.
  * The source/reference note field should use entered-deadline/reference naming instead of user-provided naming in current schema/API code.
  * Date event naming should use entered-deadline adjustment terminology where current code/database schema exposes user-provided adjustment terminology.
  * A forward migration must convert existing `user_provided` rows and related reference/note fields to the new terminology.
  * Historical migration files should not be manually rewritten unless the project migration tooling explicitly requires snapshot regeneration; add a new migration for the transition.

## Acceptance Criteria

* [ ] Dashboard and shared select controls no longer show an unexplained left-side gap in trigger text or selected menu rows.
* [ ] Select controls remain keyboard accessible and visually stable.
* [ ] Three CPA test accounts can log in with documented credentials.
* [ ] Each CPA account lands in its own firm workspace.
* [ ] Each CPA account has a visibly different client dataset.
* [ ] Across the three accounts, the app can demonstrate the major workflows listed in Requirements.
* [ ] Re-running the seed path does not create duplicate demo users or duplicate firm demo records.
* [ ] CPA-facing UI no longer uses `User provided` as the primary manual deadline label.
* [ ] Entered deadline surfaces show the recorded reference/source note.
* [ ] Lint and type-check pass.
* [ ] Browser verification covers the dashboard select controls and at least one login/demo-account path.

## Definition Of Done

* Tests added or updated for seed/data behavior where practical.
* Lint and type-check pass.
* Browser verification is completed for affected UI.
* Demo account credentials and data intent are documented in the task or project docs if exposed to users.
* Any docs under `docs/` or `specs/` modified in English are updated with corresponding `.zh.md` translations.

## Demo CPA Accounts

The MVP should use three CPA accounts split by workflow coverage:

* `demo-triage@duedatehq.test` — Greenfield CPA firm with enough verified official deadlines to show dashboard horizons, overdue/due-this-week/this-month/long-range sections, statuses, firm target dates, evidence, and export.
* `demo-coverage@duedatehq.test` — Multi-state CPA firm with client profiles that produce coverage gaps, unsupported obligations, needs-review items, verification requests, and entered deadlines with references.
* `demo-notices@duedatehq.test` — Review-heavy CPA firm with source-changed rules, notice impact proposals, audit trail examples, and mixed deadline statuses.

Use a shared documented demo password unless the implementation has an existing safer local convention.

## Concept Decision

The product user is the CPA. The CPA imports or manually enters data about the CPA firm's clients. End-clients do not log into the product in Beta and should not be modeled as `user` records.

CPA-facing "User provided deadline" language is ambiguous because it can sound like the client supplied the deadline. `Custom deadline` is also too vague because it does not answer what the CPA used as the reference.

The product should instead express the concept as an entered deadline: a deadline the CPA firm enters when DueDateHQ does not have a verified official rule or when the deadline depends on client-specific information. The UI should pair the trust label with a reference note so the CPA can tell whether it came from client source data, a client notice, prior-year workpapers, CPA judgment, or another firm-defined reference.

## Logic Impact Assessment

Core domain logic should not need a broad rewrite because the existing model already matches this concept:

* Better Auth `auth_users` represent authenticated CPA operators.
* `firms` represent CPA firm workspaces.
* Business data is scoped by `firmId`.
* `client_relationships` and `filing_profiles` represent the CPA firm's clients and tax profiles.
* Internal enum/source fields must be migrated from `user_provided` to `entered_deadline` so code and database semantics match the product concept.
* CPA-facing UI, exports, demo data, and documentation should not rely on `User provided` as the primary label.
* The entered-deadline reference field should become the CPA-facing explanation for the reference behind the entered deadline.

Implementation should still review and tighten:

* Visible copy: avoid "user data" when the intended meaning is "client data" or "firm client data".
* Demo/test data: create CPA accounts and CPA firm datasets, not end-client accounts.
* Authorization boundaries: business procedures must continue to scope by `session.firm.id`, not only `session.user.id`.
* Labels around manual deadlines: use wording such as `Entered deadline` and `Reference recorded - Not verified by DueDateHQ`.

## Out Of Scope

* Multi-user firm membership or role permissions.
* Production self-service demo reset UI.
* External email/SMS/calendar notification integrations.
* Replacing Better Auth.

## Technical Approach

* Update shared select spacing in `packages/ui` and verify dashboard filters.
* Migrate DB schema, migration snapshots, API types, and code paths from `user_provided`/`userProvidedSourceNote` naming to entered-deadline/reference naming.
* Centralize entered deadline labels where practical so storage/API/UI copy remain consistent.
* Update dashboard, task table, evidence drawer, manual client/deadline pages, coverage actions, and export copy that currently says `User provided`.
* Add or update tests around API labels/export output so `Entered deadline` and reference notes are covered.
* Add an idempotent demo seed path for the three CPA accounts and firm-scoped datasets.
* Prefer deterministic demo IDs and cleanup/upsert behavior over append-only seeding.

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
