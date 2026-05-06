# Add CPA Achievement Page And Account Menu

## Goal

Add an authenticated account menu and CPA achievement page. The account menu should open from the current user information area, link to user-facing account pages, and expose logout without crowding the main work navigation. The achievement page should summarize how much work the current workspace has accumulated in DueDateHQ since the CPA began using it, helping the CPA quickly understand usage age, entered work volume, completed work, remaining work, average daily throughput, and the growing breadth of states, tax categories, and entity types they have handled. The page should make the CPA feel more capable over time while preserving DueDateHQ's audit-friendly product tone.

## What I Already Know

* The user wants a new achievement page for a logged-in CPA.
* The user wants the sidebar user information area to open a menu/popover when clicked.
* The user menu should support viewing current login user details, settings, achievements, and logout.
* Menu navigation entries should enter the corresponding user/account settings pages.
* The remaining interaction details may be supplemented conservatively.
* The page should record usage duration since the CPA started using DueDateHQ.
* The page should show total days used and identify what day today is in that usage period.
* The page should show total entered Deadline Tasks and Client Relationships.
* The page should show completed tasks, remaining tasks, and an average daily processing rate.
* The user wants richer demo data for `demo-triage@duedatehq.test` so the achievement page has more meaningful completed-work examples.
* The achievement page should add processed-state, tax-category, and entity-type breakdowns.
* The user suggested ring/donut charts where they improve comprehension.
* The desired emotional effect is professional momentum: the CPA should feel that they are getting stronger and handling a broader, more sophisticated book of work.
* DueDateHQ is an authenticated product UI for solo and independent CPAs.
* The design direction is `Verified Operations Console`: light-first, dense, calm, precise, and audit-friendly.
* The page should avoid decorative gamification, confetti, purple SaaS gradients, glassmorphism, oversized app heroes, and marketing-style card grids.

## Repo Context

* Authenticated app layout is owned by `apps/web/src/routes/__root.tsx`.
* Sidebar navigation is owned by `apps/web/src/components/app-sidebar.tsx`.
* The existing user block at the bottom of the sidebar currently shows firm name, email, and a direct `Log out` button.
* The new interaction should remove the standalone logout button and make `Log out` a dropdown menu item.
* `packages/ui/src/components/dropdown-menu.tsx` already provides dropdown menu primitives based on Base UI.
* Route files live under `apps/web/src/routes/`; `/` maps to the dashboard via `apps/web/src/routes/index.tsx`.
* Existing dashboard stats come from `packages/api/src/routers/dashboard.ts`.
* Existing client list counts come from `packages/api/src/routers/clients.ts`.
* Demo seed data for the triage test account lives under `packages/api/src/lib/demo-seed.ts` and corresponding tests under `packages/api/src/lib/demo-seed.test.ts`.
* `firms.createdAt` and `auth_users.createdAt` both exist in the database schema.
* `auth.session` currently serializes user id, email, name, firm id, firm name, and owner id, but not creation timestamps.
* `createContext` calls `ensureFirmForUser` when an auth session exists, so a solo/personal CPA still receives a one-person firm workspace record.
* If a user truly has no resolvable firm record, the existing authenticated business surface cannot load because `requireFirmSession` rejects the request.
* Deadline Task statuses are `not_started`, `in_progress`, `waiting_on_client`, and `done`.
* Existing task summary already computes total and done task counts from firm-scoped Deadline Tasks.

## Assumptions

* MVP scope uses the current firm workspace as the achievement boundary, not a cross-firm global user history.
* "Completed" means Deadline Task status is `done`.
* "Remaining" means total Deadline Tasks minus done Deadline Tasks, including `not_started`, `in_progress`, and `waiting_on_client`.
* "Average daily processing" means completed Deadline Tasks per inclusive usage day.
* "Handled states", "handled tax categories", and "handled entity types" should be derived from completed Deadline Tasks unless a specific metric states it is based on all entered tasks.
* A multi-state filing profile counts each state in its `states` array for state coverage; federal tasks may also contribute a `Federal` bucket when the task jurisdiction is federal.
* `Handled` metrics are work achievements, not daily usage metrics.
* Usage-period, current day, total clients, total tasks, done, remaining, and daily average are daily/workspace usage metrics.
* The UI must visually separate routine workspace usage from completed-work achievements.
* The usage start date is the firm workspace creation date, because DueDateHQ's core domain boundary is `Firm -> Client Relationship -> Filing Profile -> Deadline Task`.
* For a personal/solo CPA, `Firm` means the internal workspace and ownership boundary, not necessarily a multi-person accounting firm.
* The UI should prefer `workspace` language where this avoids confusing solo CPAs.
* MVP should not fall back to `auth_users.createdAt`; a missing firm workspace is a bootstrap/session integrity problem, not a separate personal-account mode.
* Achievement navigation should move from the main sidebar work/management sections into the account menu, because this is account/workspace context rather than daily tax work.
* Account Profile and Settings pages should be functional, but MVP can be read-only unless existing APIs already support safe updates.
* Logout remains an immediate menu action rather than a route, and it should not appear as a separate sidebar button.

## Product And UI Direction

* Register: product.
* Physical scene: a CPA opens the page during filing season to get a factual progress readout between operational work sessions.
* Theme: light-first, restrained product UI matching `DESIGN.md`.
* Tone: precise achievement ledger with professional progress, not playful badges.
* Layout concept:
  * Sidebar user block becomes a full-width account menu trigger with firm/user summary and a chevron or menu affordance.
  * Dropdown menu shows account identity first, then Profile, Settings, Achievements, and Log out.
  * Log out is visually separated from navigation entries, for example with a menu separator.
  * Account pages live under an account/settings area with consistent page chrome.
  * Achievement page header includes workspace name, usage day, and usage start date.
  * Daily usage section contains the usage-period card, compact usage metric strip, work balance, and processing rate.
  * Work achievements section contains only completed-work capability metrics and breakdowns.
  * `Handled jurisdiction buckets`, `Handled tax categories`, and `Handled entity types` should not appear in the daily usage metric strip.
  * Capability map section shows handled states/jurisdictions, tax categories, and entity types as completed-work achievements.
  * Donut/ring charts may be used for compact categorical breakdowns, with text labels and counts always visible.
  * Add a "professional momentum" narrative line, for example `You have handled work across 8 states, 5 tax categories, and 6 entity types.` Keep it factual and avoid hype.
  * Empty or early-use state for firms with zero tasks or first-day usage.
  * Profile and Settings pages should use compact read-only field groups at MVP, not modal-first editing.
* Copy should stay concrete, for example `Day 12 of this DueDateHQ workspace` and `18 done, 42 remaining`.
* Avoid making solo CPAs feel like they must belong to a separate firm entity; use the firm name when available, but frame the stats as workspace stats.

## Requirements

* Add an authenticated route for the achievement page.
* Replace the sidebar's direct user/logout block with a clickable account menu trigger.
* Account menu must include entries for current user details/Profile, Settings, Achievements, and Log out.
* Profile, Settings, and Achievements entries must navigate to authenticated account pages.
* Logout must stay available from the account menu and keep the existing sign-out behavior.
* The previous standalone sidebar `Log out` button must be removed.
* Do not add the achievement page to the main Work or Management sidebar navigation unless implementation constraints require a temporary fallback.
* The page must be firm-scoped and require an authenticated firm session.
* Add a Profile page that shows the current login user's name, email, and workspace identity.
* Add a Settings page for account/workspace settings context; MVP may be read-only if no safe mutation API exists.
* Show usage start date.
* Show total inclusive days since usage start.
* Show today as the same inclusive day number.
* Use `firm.createdAt` as the usage start date.
* Show total Client Relationships.
* Show total Deadline Tasks.
* Show completed Deadline Tasks.
* Show remaining Deadline Tasks.
* Show average completed tasks per day, rounded to a readable decimal.
* Show number of handled states from completed work.
* Show number of handled tax categories from completed work.
* Show number of handled entity types from completed work.
* Show breakdown rows or charts for handled states, tax categories, and entity types.
* Separate the page into at least two clearly labeled groups:
  * daily/workspace usage
  * completed-work achievements
* Keep handled-work summary metrics inside the completed-work achievements group.
* Chart segments must have accessible labels and visible text equivalents; do not rely on color alone.
* Use semantic DueDateHQ colors deliberately. Charts may use a restrained full palette for data visualization, but must avoid purple SaaS gradients, glass, and decorative blobs.
* Expand the `demo-triage@duedatehq.test` seed data with enough completed Deadline Tasks across states, tax categories, and entity types to make the achievement page visually meaningful.
* Demo seed tests should assert the richer completed-work coverage exists.
* Handle zero tasks without division errors or misleading success language.
* Keep status and metric labels readable on desktop and mobile.
* Menu trigger and menu items must be keyboard accessible and screen-reader labeled.
* Use existing DueDateHQ design tokens and component patterns.

## Acceptance Criteria

* [ ] A logged-in CPA can click the user information area to open an account menu.
* [ ] Account menu shows Profile, Settings, Achievements, and Log out.
* [ ] Logout appears as a menu item, not as a separate button below the user details.
* [ ] Profile, Settings, and Achievements menu items navigate to authenticated account pages.
* [ ] Log out still signs the user out and redirects to login.
* [ ] A logged-in CPA can navigate to the achievement page from the account menu.
* [ ] The page loads only for authenticated firm sessions.
* [ ] Profile shows current user name, email, and workspace identity.
* [ ] Settings page exists and does not present editable controls unless they are wired to real APIs.
* [ ] The page displays usage start date, total usage days, and current usage day number.
* [ ] Usage start is calculated from `firm.createdAt`.
* [ ] The page displays total clients, total tasks, completed tasks, remaining tasks, and average completed tasks per day.
* [ ] The page displays handled states, tax categories, and entity types based on completed firm-scoped Deadline Tasks.
* [ ] Handled states/jurisdictions, tax categories, and entity types are visually grouped under work achievements, not mixed into daily usage metrics.
* [ ] Daily usage metrics and completed-work achievements have distinct headings and layout sections.
* [ ] Handled-state, tax-category, and entity-type visualizations have text labels/counts and are not color-only.
* [ ] `demo-triage@duedatehq.test` has richer completed demo data across multiple states, tax categories, and entity types.
* [ ] Demo seed tests assert the richer completed-work coverage.
* [ ] Counts are calculated from firm-scoped records only.
* [ ] `done` tasks count as completed; all non-done statuses count as remaining.
* [ ] First-day usage reports day `1`, not day `0`.
* [ ] Zero-task state is explicit and does not show a misleading average.
* [ ] Existing dashboard and client flows continue to work.
* [ ] API tests cover the metric calculation.
* [ ] Sidebar/account menu interaction works on desktop and inside the mobile navigation sheet.
* [ ] Frontend uses the established product visual system from `DESIGN.md`.

## Out Of Scope

* Public sharing or printable achievement reports.
* Badges, streaks, rankings, confetti, or social gamification.
* Claims that imply legal/tax competence, guaranteed compliance, or complete coverage.
* Full editable account management beyond routes and safe read-only account/workspace information.
* Team member management, billing, password management, email change, or notification preferences.
* Historical daily time series charts unless already derivable without new tables.
* Cross-account or multi-firm aggregation.
* Recording analytics events beyond existing database rows.

## Open Question

* None. The usage clock starts from the Firm workspace creation date. Solo/personal CPAs are represented by a one-person workspace. Account Profile and Settings can be supplemented as read-only MVP pages unless an existing API makes mutation safe.

## Definition Of Done

* PRD confirmed by the user.
* `implement.jsonl` and `check.jsonl` contain relevant spec context.
* Task status is moved to `in_progress`.
* Implementation is handled through the Trellis implement agent.
* Trellis check verifies spec compliance, lint, typecheck, and focused tests.
* Spec update judgment is completed during finish.
