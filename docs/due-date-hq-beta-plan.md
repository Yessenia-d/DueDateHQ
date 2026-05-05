# DueDateHQ Beta Plan

## Purpose

DueDateHQ is a Beta SaaS product for solo and independent CPAs who manage roughly 30-100 mixed individual and small-business clients across one or more states. The product helps a CPA import or manually enter client relationships and filing/tax profiles, generate traceable deadline tasks from verified tax rules, and triage the work that matters this week.

The core product principle is:

```txt
Traceable tax deadlines, not black-box dates.
```

DueDateHQ maintains a transparent tax obligation and coverage library, monitors supported official sources within a 24-hour detection window, and clearly separates verified system rules from needs-review, coverage-gap, user-provided, or unsupported items. Beta does not promise complete 50-state verified coverage; it promises visible coverage status for supported sources and states.

Competitor framing: DueDateHQ Beta should reach parity or better with the useful core workflows from File In Time, while replacing desktop-era database, rollover, and reporting overhead with a cloud workflow and a verified-source trust model. Parity means CPAs can set up clients, import files, generate and triage deadline work, filter/sort tasks, handle extensions, export workload views, and see urgency without falling back to spreadsheets. Better means official tasks carry source evidence, verification status, source monitoring, rule versions, and no manual rollover for verified recurring deadlines.

## Current Delivery Goals

- Build a real Beta product, not a pure front-end demo.
- Support external users through hosted Cloudflare deployment.
- Use Spec-Driven Development: every major feature starts from `specs/<feature>.md`.
- Cover the two P0 user stories:
  - Import clients from TaxDome, Drake, Karbon, or QuickBooks CSV.
  - Let a CPA complete Monday triage in minutes from a clear deadline dashboard.
- Add manual entry for clients and custom deadlines.
- Add official source monitoring and a verification queue for tax rule maintenance.
- Add a feature progress page so product, engineering, and reviewers can see what is complete.
- Cover File In Time's useful core due-date workflow areas at parity or better: client setup, CSV import review, obligation/service setup, task generation, weekly triage, filters/sorting, task status, extension handling, recurrence/upcoming tasks, exports, urgency surfaces, and admin/settings boundaries.
- Keep the user-facing model simple while the data model distinguishes `Client relationship -> Filing/Tax profile -> Deadline task`.
- Add an Official Notice Monitor for the P0 source allowlist, with in-app CPA confirmation before any workspace state changes.

## P0 Story Acceptance Targets

Weekly filing-season triage:

- Persona: solo or independent CPA with about 80 mixed individual and small-business clients across multiple states.
- On login, the default dashboard opens to `Overdue`, `Due this week`, `This month`, and `Long range`.
- Within 30 seconds of opening after login, the CPA can see every deadline needing action this week.
- This-week rows show a specific countdown in days. Overdue rows show days past due.
- Fast core filters cover client, state, form/obligation type, entity type, tax type, task status, and verification status, with a `< 1 second` response target for Beta-sized solo CPA workspaces.
- Each deadline can be one-click marked `Done`, `Waiting on client`, or `In progress`. Extension is a separate date action that records a new due date.
- Task workflow also supports `Waiting on client`, without adding a client portal, document upload, document checklist automation, e-signature, or direct end-client notifications in Beta.
- The weekly triage flow is completable within 5 minutes versus the current 30-45 minute spreadsheet/calendar workflow.
- Smart priority sorting is P0 and may be deterministic rule-based priority in Beta.
- Optional firm target dates can be used for triage, but official due dates and firm target dates must remain visually and semantically distinct.
- Light bulk operations cover task status updates, firm target date updates, and export of the current filtered view; bulk official due-date edits are excluded.

TaxDome/import 30 clients:

- Persona: CPA migrating from TaxDome; Drake, Karbon, and QuickBooks CSV exports are also supported.
- User can complete import of 30 clients within 30 minutes; measurable target is `P95 <= 30 minutes for a 30-client import`.
- TaxDome, Drake, Karbon, and QuickBooks source CSV exports are supported for client/profile import through adapter profiles; exact fixed schemas are not promised where source docs do not publish them.
- Field mapping automatically recognizes client name, EIN, state, and entity type when present or confidently inferred; uncertain values go to review.
- Fuzzy or missing fields receive intelligent, non-blocking suggestions and uncertain rows go to review without blocking the full import.
- CSV import can suggest possible relationships between individuals and businesses, but must not auto-merge them; the CPA confirms relationship suggestions.
- Import review and result summaries are grouped by filing/tax profile and problem type, not by every generated task.
- After import, each ready filing/tax profile's deadline tasks for the current tax year plus the next tax year are generated immediately when matching Verified rules exist. Tasks with due dates before today are shown as overdue.
- Needs-review, coverage-gap, and unsupported obligations stay visible but are not official confirmed deadlines.
- Related P0 capabilities include CSV import, field mapping, calendar/task auto-generation, entity type auto-recognition, and intelligent field matching.

## Key Product Rule

```txt
Only Verified tax rules can create official system-generated deadline tasks.
User-provided deadlines can appear in the user's workspace, but must be marked as not verified by DueDateHQ.
Needs review, Source changed, and Unsupported rules must be transparent but cannot be treated as confirmed deadlines.
Coverage gaps must be visible and actionable: request DueDateHQ verification, add a user-provided deadline, or ignore/dismiss for now.
Firm target dates are planning metadata, not official due dates.
Extension is a date state derived from date events, not a work-progress status. A task can be extended and have any work-progress status simultaneously.
```

## Documents

- Product journey map: `docs/due-date-hq-user-journey.html`
- Product plan: `docs/product/due-date-hq-product-plan.md`
- Technical plan: `docs/technical/due-date-hq-beta-technical-plan.md`
- SDD specs index: `specs/README.md`

## SDD Specs

- `specs/auth.md`
- `specs/csv-imports.md`
- `specs/manual-client-and-deadline-entry.md`
- `specs/tax-obligation-library.md`
- `specs/tax-rule-verification.md`
- `specs/official-source-monitoring.md`
- `specs/coverage-matrix.md`
- `specs/monday-triage-dashboard.md`
- `specs/feature-progress-page.md`
- `specs/gtm.md`
- `specs/cloudflare-deployment.md`

## Beta Scope Boundaries

In scope:

- Email/password registration and login.
- Client/profile import from four CSV sources using representative adapters.
- Manual client and deadline entry.
- Verified tax rules generating official tasks.
- Filing/tax profiles under client relationships.
- Transparent obligation coverage matrix with supported, needs-review, coverage-gap, source-changed, unsupported, and verified status.
- Official source and notice monitoring design and API surface for the P0 allowlist: IRS, California FTB, New York Tax Department, Texas Comptroller, and Florida Department of Revenue.
- Verification queue for rule review and publishing.
- Cloudflare deployment plan.
- Source-specific CSV adapters with preview, mapping, review, and duplicate handling.
- CSV import field mapping for client name, EIN, state, and entity type when present or confidently inferred, with non-blocking suggestions for uncertain rows.
- CPA-confirmed relationship suggestions during import.
- In-app notice surfaces: dashboard banner, notice inbox/alert center, and affected review page.
- P0 workflow targets: 30-client import within 30 minutes at `P95 <= 30 minutes for a 30-client import`, weekly triage within 5 minutes, and core dashboard filters responding in `< 1 second` for Beta-sized solo CPA workspaces.
- Dashboard/task exports and in-product urgency surfaces for due today, this week, and this month.
- Deterministic smart priority sorting for dashboard triage.
- Light bulk task status updates, firm target date updates, and current-filter export.

Out of scope for Beta:

- Production-grade tax liability guarantee.
- Full OAuth, MFA, organizations, invitations, and role-based permissions.
- Automatic publishing of rule changes without verification.
- Complete city/county/industry-specific tax automation.
- Live AI interpretation without human review.
- Customer PII sent to the AI model by default.
- Automatic workspace mutation from official notice monitoring.
- Bulk official due-date edits.
- Client portal, document upload, document checklist automation, e-signature, direct end-client notifications, and email/SMS/Slack/calendar push.
- Desktop-era File In Time features: local database administration, backup/restore UI, Crystal Reports-style reports, mail merge/labels, extension form printing, arbitrary field renaming, network-user maintenance, and detailed rights matrices.
- Email, SMS, Slack, and calendar push reminders/notifications in Beta; reconsider only after in-product urgency and notice surfaces are validated.

## GTM Summary

First users are solo and independent CPAs managing mixed individual and small-business clients across one or more states. Pricing target is Pro at `$49/month`, with the first 20 Beta users free in exchange for onboarding calls, redacted CSV samples, and weekly feedback.

The initial acquisition motion is a practical lead magnet: a public "50-State Tax Deadline Coverage Tracker" backed by the same obligation library and verification statuses used inside the product.
