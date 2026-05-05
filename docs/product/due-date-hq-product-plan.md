# DueDateHQ Product Plan

## Product Positioning

DueDateHQ is a tax deadline operating system for solo and independent CPAs serving mixed individual and small-business clients across one or more states.

It replaces scattered spreadsheets, calendars, manual state website checks, and uncertain deadline notes with:

- A transparent obligation coverage library for supported federal and state sources.
- Traceable deadline evidence.
- CSV and manual client onboarding.
- A Monday triage dashboard.
- A verification workflow for official source changes.

Product promise:

```txt
Know what is due, why it is due, and whether the source is verified.
```

## Competitor Parity and Better Target

DueDateHQ should not merely borrow isolated ideas from File In Time. For core CPA due-date operations, Beta planning targets parity or better with the workflows tax professionals already understand, then improves them with verified source evidence, source monitoring, rule versioning, and a cloud workflow.

| Workflow area | File In Time baseline | DueDateHQ Beta direction |
|---|---|---|
| Client setup | Client records with tax-relevant fields, notes, client/entity type, jurisdiction context, and manual/import paths | Match the practical filing/tax profile fields needed for scheduling while modeling `Client relationship -> Filing/Tax profile -> Deadline task`; keep primary UI language CPA-friendly and avoid internal tax-subject jargon |
| CSV import | Delimited-file preview, header handling, drag/drop mapping, review before commit, duplicate resolution | Better with source-specific adapters for TaxDome, Drake, Karbon, and QuickBooks, automatic recognition for client name/EIN/state/entity type, non-blocking review suggestions, CPA-confirmed relationship suggestions, and duplicate handling |
| Obligation/service setup | Services define work type, frequency, due dates, and extension dates | Map services to tax obligations and verified tax rules while separating known, verified, needs-review, unsupported, and user-provided items |
| Task generation | Assign services to clients to create due-date tasks | Generate official tasks only from Verified rules; show unsupported or needs-review obligations without pretending they are official deadlines |
| Monday triage | Task view can be filtered to this week | Better with first-class `Due this week`, `This month`, and `Long range` sections by default, all this-week work visible within 30 seconds after login, and a 5-minute triage target |
| Filters and sorting | Date, client, type, service, status, key person, and saved views | Match core filters by horizon, client, jurisdiction/state, form/obligation type, entity type, tax type, task status, and verification status; advanced saved views can wait |
| Task status | Status codes, dates, notes, extension flag | Match simple operational status with `Not started`, `In progress`, `Waiting on client`, `Extended`, and `Done`, plus source/trust badges |
| Extensions and date changes | Service-supported extension dates and extension state | Track current due date, original due date, optional firm target date, and date event history for official extensions, official relief/change, user-provided adjustments, and firm target changes; keep extension form printing out |
| Recurrence/upcoming tasks | Manual rollover creates the next period's tasks | Better by generating upcoming official tasks from maintained Verified rules, with no manual rollover for official recurring deadlines |
| Exports | Excel/task view export and printed reports | Match practical dashboard/task export for workload sharing and review; skip Crystal Reports-style builders |
| Bulk operations | Batch status, due date, target date, extension, and notes changes | Support light bulk task status updates, firm target date updates, and current-filter export; do not support bulk official due-date edits |
| Reminders/urgency | Startup reminder and calendar counts for due today/this week/month | Start with in-dashboard urgency surfaces for due today, this week, and this month; external email/SMS/calendar reminders are later-stage |
| Admin/settings | Desktop database tools, backups, network users, rights, display options | Better by hiding cloud database operations from users and limiting Beta settings to account/workflow clarity |

Where DueDateHQ must be better:

- Official tasks show source evidence, verification status, source last checked/changed times, and rule version.
- Source monitoring creates transparent `Source changed` review work instead of silently trusting stale bundled dates.
- Rule publishing requires human approval before a rule becomes `Verified`.
- Source-specific CSV adapters reduce manual mapping compared with a generic delimited-file importer.
- Official recurring deadlines come from maintained rules, not user-run rollover.
- Unsupported, needs-review, source-changed, and user-provided items are visible without being represented as verified official deadlines.
- Users do not manage desktop installs, shared database files, check/optimize tools, or backup/restore screens.

Desktop-era features intentionally excluded from Beta and only revisited later if explicitly reprioritized:

- Local database administration, multiple database files, backup/restore UI, and network workstation maintenance.
- Crystal Reports-style reports, mail merge, labels, and extension form printing.
- Arbitrary field renaming, broad custom task fields, detailed rights matrices, employee network-user maintenance, and supervisor messaging.
- Email, SMS, and calendar reminders until the in-product urgency surfaces are validated.
- Client portal, document upload, document checklist automation, e-signature, direct end-client notifications, and email/SMS/Slack/calendar push in Beta.

## Target User

Primary ICP:

- Solo CPA or 1-3 person firm.
- Serves 30-100 mixed individual and small-business clients.
- Often handles clients across multiple states.
- Uses Excel, Outlook/Google Calendar, TaxDome, Drake, Karbon, QuickBooks, or a mix.
- Has high fear of missed deadlines and low tolerance for expensive enterprise practice-management tools.

Primary persona:

- Sarah Mitchell, CPA.
- 80 mixed individual and small-business clients, multi-state.
- Every Monday during filing season, she spends 30-45 minutes figuring out what must be done this week before actual tax work starts.

## Core User Stories

### Story 1: Monday Triage

As a solo or independent CPA serving about 80 mixed individual and small-business clients across multiple states, I want to see all deadlines requiring action this week within 30 seconds of opening the product so that I can prioritize the week without cross-checking spreadsheets, calendars, and notes.

Acceptance:

- Persona is a solo or independent CPA serving about 80 mixed individual and small-business clients across multiple states.
- After login, the default dashboard groups deadlines into `Due this week`, `This month`, and `Long range`.
- Within 30 seconds of opening after login, the CPA can see all deadlines needing action this week.
- This-week items show a specific countdown in days.
- Fast filters respond by client, state, form/obligation type, entity type, tax type, task status, and verification status.
- Core dashboard filters target `< 1 second` response for Beta-sized solo CPA workspaces.
- Each deadline supports one-click status marking for `Done`, `Extended`, `Waiting on client`, and `In progress`; `Not started` remains the default unworked state.
- Optional firm target dates help triage but are never presented as official due dates.
- Smart priority sorting highlights the most urgent this-week work first; Beta can use deterministic rule-based priority rather than live AI.
- The full weekly triage flow can be completed within 5 minutes, compared with the current 30-45 minute spreadsheet/calendar workflow.

### Story 2: CSV Import

As a CPA moving from TaxDome, Drake, Karbon, or QuickBooks, I want to import clients from CSV and generate a usable calendar without manual setup so that I can start using the product during a busy season.

Acceptance:

- Four CSV source adapters exist.
- A CPA migrating from TaxDome can complete import of 30 clients within 30 minutes; the measurable target is `P95 <= 30 minutes for a 30-client import`.
- TaxDome, Drake, Karbon, and QuickBooks exported CSVs are supported.
- Header handling, field mapping, duplicate candidates, and import preview are shown before commit.
- Field mapping automatically recognizes client name, EIN, state, and entity type.
- Fuzzy or missing fields receive intelligent, non-blocking suggestions and uncertain rows enter review instead of blocking the whole import.
- Import can suggest likely relationships between individuals and businesses, but never auto-merges them; the CPA confirms.
- Import review and final summary are grouped by filing/tax profile and problem type, with plain-language counts for ready profiles, generated verified tasks, profile review items, and coverage gaps.
- After import, matching Verified tax rules immediately generate each ready filing/tax profile's full-year deadline calendar/tasks.
- Unsupported, coverage-gap, and needs-review obligations are visible but not scheduled as official confirmed deadlines.
- Related P0 capabilities include CSV import, field mapping, calendar/task auto-generation, entity type auto-recognition, and intelligent field matching.

### Story 3: Manual Entry

As a CPA adding a new client or special obligation outside CSV, I want to manually create a client and deadline so that DueDateHQ can still be my single working surface.

Acceptance:

- CPA can add a client manually.
- CPA can add one or more filing/tax profiles under the client relationship.
- CPA can add a one-time or recurring custom deadline.
- Manually added deadlines appear on the dashboard.
- Manual deadlines are labeled `User provided · Not verified by DueDateHQ`.
- User can request DueDateHQ verification for a manual deadline.

### Story 4: Official Source Monitoring

As a CPA relying on DueDateHQ, I want the platform to monitor official tax sources so that changed deadlines and new policies are detected quickly and do not silently become stale.

Acceptance:

- Every official source has monitor status and last checked time.
- Source changes create a rule change candidate.
- Affected rules become `Source changed`.
- Source changed rules cannot generate new official tasks.
- Human verification is required before publishing updated verified rules.
- Proposed notice impacts never mutate the CPA workspace until the CPA confirms clear before/after diffs.
- Beta notice notifications are in-app only.

## Product Modules

### Auth

Beta users register and log in with email and password. Auth is needed because uploaded CSVs and client deadlines are user-specific. OAuth, MFA, organization membership, and password reset are later-stage features.

### Client Onboarding

Two entry points:

- CSV import for migration and bulk setup.
- Manual entry for new clients, edge cases, and quick additions.

CSV import supports TaxDome, Drake, Karbon, and QuickBooks through source-specific adapters that normalize records into a shared client shape. The adapters should automatically recognize client name, EIN, state, and entity type where possible, use intelligent deterministic matching suggestions for fuzzy fields, and send uncertain rows to review without blocking the whole import.

The import workflow should meet or exceed File In Time's practical import flow: preview rows, detect headers, map columns, flag missing or uncertain data, surface likely duplicates before commit, and summarize created client relationships, ready filing/tax profiles, generated verified tasks, profile review items, needs-review obligations, and coverage gaps. It may suggest likely relationships between individuals and businesses, but must not auto-merge them; the CPA confirms. Beta success requires a CPA to complete a 30-client import within 30 minutes at `P95 <= 30 minutes for a 30-client import`.

The data model has three levels:

- `Client relationship`: the CPA's relationship with a person, business, household, or related group.
- `Filing profile` / `Tax profile`: the specific individual or business tax context used to match obligations and rules.
- `Deadline task`: a filing/payment/extension task generated from a verified rule or created by the user.

### Tax Obligation Library

DueDateHQ maintains a library of tax obligations across federal and state jurisdictions. The library tracks known obligations separately from verified deadline rules, and Beta coverage is explicit about supported sources/states rather than promising complete verified 50-state coverage.

Important distinction:

```txt
Known obligation does not mean verified deadline.
```

The library stores:

- Jurisdiction.
- Agency.
- Tax category.
- Entity type applicability.
- Filing/payment/extension obligation.
- Official source.
- Verification status.
- Rule version.
- Last checked and last verified timestamps.

### Verification Status System

Rule verification statuses:

| Status | Meaning | Can generate official tasks? | Primary location |
|---|---|---:|---|
| `Verified` | Official source and rule have been reviewed and are safe to use | Yes | Dashboard, Coverage, Evidence |
| `Needs review` | Candidate rule exists, but review is incomplete | No | Verification Queue, Coverage |
| `Source changed` | Previously verified source changed and needs re-verification | No new tasks | Dashboard warning, Verification Queue |
| `Unsupported` | Obligation is known but not schedulable by DueDateHQ yet | No | Coverage Matrix |
| `Coverage gap` | DueDateHQ has not verified or does not yet support this source/state/category combination | No | Coverage Matrix |

Manual deadline source status:

| Source type | Meaning | Dashboard behavior |
|---|---|---|
| `User provided` | User entered the deadline manually | Appears as user's task, clearly marked not verified by DueDateHQ |

### Evidence Drawer

Every official deadline task opens a Deadline Evidence drawer.

It shows:

- Client relationship and filing/tax profile.
- Rule name.
- Current official due date.
- Original due date.
- Optional firm target date, clearly separated from official due dates.
- Explanation of date calculation.
- Official source name and URL.
- Verification status.
- Source last checked time.
- Source last changed time.
- Current rule version.
- Previous rule version when applicable.
- Date event history for official extensions, official relief/change, user-provided adjustments, and firm target changes.
- Audit trail.
- Actions: `Mark reviewed`, `Report issue`, `Request re-verification`.

### Coverage Matrix

The coverage matrix is the product's transparency layer. It shows all states and major tax categories with verification and monitoring status.

Columns include:

- State.
- Tax category.
- Source agency.
- Verification status.
- Monitor status.
- Last checked.
- Last changed.
- Last verified.
- Available actions: request DueDateHQ verification, add user-provided deadline, or ignore/dismiss for now.

It must make coverage gaps visible instead of implying complete 50-state coverage. The P0 official source allowlist is IRS, California FTB, New York Tax Department, Texas Comptroller, and Florida Department of Revenue.

### Official Source and Notice Monitoring

DueDateHQ monitors official sources and official notices using a 24-hour detection SLA.

Product principle:

```txt
24h detect, not blindly auto-verify.
```

The system can detect changes, create candidates, and route them for verification. It cannot automatically publish new verified tax rules or mutate a CPA workspace without review and confirmation.

Official Notice Monitor Beta rules:

- DueDateHQ configures the AI provider and API key at the platform level, not per CPA.
- AI analyzes official notices only. Customer PII is not sent to the model by default.
- DueDateHQ matches affected clients and filing/tax profiles locally.
- Auto-detected likely relevant notices can create in-app alerts, but proposed changes require CPA confirmation.
- Proposed changes can be task updates or coverage/review status updates.
- CPA sees before/after diffs and can approve, reject, or decide later individually or in bulk.
- Proposed change statuses are `pending`, `approved`, `rejected`, and `decide_later`; `rejected` means the CPA explicitly refuses the proposed change.
- Every operation is audit logged.
- Notifications are in-app only: dashboard banner, notice inbox/alert center, and affected review page.
- Confidence labels are explainable gates, not fake percentage scores. High or medium confidence plus a local workspace match alerts the CPA, with medium labeled AI-detected/needs review; low confidence stays in an internal queue.
- Notice UI is two-layer: notice detail first, then affected task/profile diffs.

P0 monitor scope:

- IRS: federal individual and small-business filing/payment/extension/estimated tax deadlines, plus IRS disaster/tax relief deadline changes; not all IRS tax-law news.
- California FTB: personal income, business/franchise, and disaster/tax relief.
- New York Tax Department: personal income, business/corporate, and disaster/tax relief.
- Texas Comptroller: franchise, sales/use, and disaster/tax relief.
- Florida Department of Revenue: corporate income, sales/use, reemployment, and disaster/tax relief.

### Verification Queue

Internal workflow for maintaining the obligation library.

Queues:

- `Needs review`: new or uncertain rules.
- `Source changed`: official source changed after verification.
- `User requested`: user requested verification for manual deadline or missing coverage.

Reviewers can approve or reject candidates. Approval publishes a new tax rule version and restores `Verified` status.

### Monday Triage Dashboard

The main working surface for CPAs.

Sections:

- `Due this week`.
- `This month`.
- `Long range`.

Each task row includes:

- Client relationship and filing/tax profile.
- Obligation.
- Jurisdiction.
- Due date.
- Days remaining.
- Task status.
- Current official due date, original due date, and optional firm target date.
- Extension status when supported by verified evidence.
- Verification badge.
- Source evidence action.

Dashboard controls must support filters and sorting by due horizon, client relationship, filing/tax profile, jurisdiction/state, form/obligation type, entity type, tax type, task status, and verification status. Dashboard urgency surfaces should make due today, due this week, and due this month visible without adding external reminder channels in Beta. A basic dashboard/task export supports CPA workload sharing and review outside the app.

Core filters should update in `< 1 second` for Beta-sized solo CPA workspaces. The default priority sort should place this-week work first using deterministic factors such as official due date, firm target date, days remaining, verification warning state, extension state, and unfinished task status; Beta does not require live AI to satisfy smart priority sorting.

Beta task statuses include `Not started`, `In progress`, `Waiting on client`, `Extended`, and `Done`. Light bulk operations support bulk task status updates, bulk firm target date updates, and bulk export of the current filtered view. Bulk official due-date edits are out of scope.

### Feature Progress Page

Internal and reviewer-facing page showing product readiness.

Groups:

- Auth.
- CSV imports.
- Manual entry.
- Tax obligation library.
- Source monitoring.
- Verification queue.
- Coverage matrix.
- Dashboard.
- Deployment.
- GTM.
- Docs/specs.

Statuses:

- `Done`.
- `In progress`.
- `Blocked`.
- `Not started`.

## GTM Plan

### First Users

Target first users:

- Solo and independent CPAs managing mixed individual and small-business clients.
- CPA owners who use spreadsheets or basic calendars.
- CPAs active in professional communities.

Why this segment:

- Strongest pain.
- Shortest buying path.
- Most likely to provide real CSV samples.
- Most likely to feel value from verified source evidence.

### Pricing

Beta:

- First 20 users free.
- Requires onboarding call.
- Requires redacted CSV sample or manual entry walkthrough.
- Requires weekly feedback during Beta.

Paid:

- Pro: `$49/month`.
- Annual option later with 20% discount.

Pricing rationale:

- Low enough for solo CPA.
- High enough to signal professional compliance value.
- Directly comparable to the cost of one missed deadline or one hour of CPA time.

### Channels

- Reddit communities such as r/taxpros and r/Accounting.
- LinkedIn posts targeting CPA firm owners.
- State CPA Society groups.
- AICPA and CPA conference communities.
- CPA Practice Advisor content and product listings.
- Search content around state filing deadlines and PTE election deadlines.

### Lead Magnet

Public "Tax Deadline Coverage Tracker".

This uses the same product model:

- State.
- Tax category.
- Verification status.
- Coverage gap status.
- Last checked.
- Last verified.
- Request coverage.

### Early Metrics

First milestone:

- 20 waitlist signups.
- 10 onboarding calls.
- 5 real CSV imports.
- 3 paid conversion intents.

Activation metric:

```txt
User imports or manually enters at least 10 clients and completes one Monday triage session.
```

## Product Risks

### Tax Accuracy Risk

Mitigation:

- Verification statuses.
- Official source links.
- Evidence drawer.
- Manual review before publishing.
- No official task generation from unverified rules.

### Coverage Risk

Mitigation:

- Coverage matrix.
- Explicit needs-review, unsupported, and coverage-gap states and tax categories.
- User actions to request DueDateHQ verification, add a user-provided deadline, or ignore/dismiss for now.

### Trust Risk

Mitigation:

- Show source evidence in context.
- Do not overclaim "all deadlines verified".
- Separate official system-generated tasks from user-provided tasks.
- Separate official due dates from firm target dates.
- Require CPA confirmation before applying official notice impacts.

### Onboarding Risk

Mitigation:

- Four CSV adapters.
- Manual entry fallback.
- Review queue for uncertain fields.

## Beta Acceptance Criteria

- A CPA can register, import or manually enter clients, and see deadline tasks.
- A solo or independent CPA serving about 80 mixed individual and small-business clients can open the product after login and see all deadlines needing action this week within 30 seconds.
- A CPA can complete weekly triage within 5 minutes using `Due this week`, `This month`, `Long range`, countdowns in days, one-click `Done`/`Extended`/`Waiting on client`/`In progress` status marking, fast filters, and smart deterministic priority sorting.
- A CPA migrating from TaxDome can import 30 clients within 30 minutes at `P95 <= 30 minutes for a 30-client import`, with Drake, Karbon, and QuickBooks CSV exports also supported.
- Import automatically recognizes client name, EIN, state, and entity type; fuzzy or missing fields get non-blocking suggestions and review rows.
- A CPA can understand why a verified deadline exists and where it came from.
- After import, matching Verified rules generate full-year deadline calendar/tasks immediately; needs-review, coverage-gap, and unsupported obligations stay visible but not official confirmed deadlines.
- The product clearly marks unverified, source-changed, unsupported, and user-provided items.
- The system design supports 24h official source/notice change detection without auto-publishing unreviewed rules or automatically mutating CPA workspace data.
- Official Notice Monitor supports the P0 source allowlist, explainable confidence gates, in-app-only alerts, before/after diffs, CPA confirmation, proposal statuses, and audit logging.
- The product supports optional firm target dates without confusing them with official due dates.
- The product supports light bulk status updates, firm target date updates, and current-filter export, but not bulk official due-date edits.
- The product covers File In Time core workflow parity or better for client setup, import, obligation setup, task generation, triage, filters, status, extensions, recurrence, exports, urgency, and admin/settings boundaries.
- The product has a clear GTM motion for the first 20 Beta users.
