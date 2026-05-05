# DueDateHQ Beta Plan

## Purpose

DueDateHQ is a Beta SaaS product for solo and small-firm CPAs who manage multi-state small business tax obligations. The product helps a CPA import or manually enter clients, generate traceable deadline tasks from verified tax rules, and triage the work that matters this week.

The core product principle is:

```txt
Traceable tax deadlines, not black-box dates.
```

DueDateHQ maintains a 50-state tax obligation library, monitors official sources within a 24-hour detection window, and clearly separates verified system rules from unverified, user-provided, or unsupported obligations.

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

## P0 Story Acceptance Targets

Weekly filing-season triage:

- Persona: solo or independent CPA with about 80 clients across multiple states.
- On login, the default dashboard opens to `Due this week`, `This month`, and `Long range`.
- Within 30 seconds of opening after login, the CPA can see every deadline needing action this week.
- This-week rows show a specific countdown in days.
- Fast core filters cover client, state, form/obligation type, entity type, tax type, task status, and verification status, with a `< 1 second` response target for Beta-sized solo CPA workspaces.
- Each deadline can be one-click marked `Done`, `Extended`, or `In progress`.
- The weekly triage flow is completable within 5 minutes versus the current 30-45 minute spreadsheet/calendar workflow.
- Smart priority sorting is P0 and may be deterministic rule-based priority in Beta.

TaxDome/import 30 clients:

- Persona: CPA migrating from TaxDome; Drake, Karbon, and QuickBooks CSV exports are also supported.
- User can complete import of 30 clients within 30 minutes; measurable target is `P95 <= 30 minutes for a 30-client import`.
- TaxDome, Drake, Karbon, and QuickBooks exported CSVs are supported.
- Field mapping automatically recognizes client name, EIN, state, and entity type.
- Fuzzy or missing fields receive intelligent, non-blocking suggestions and uncertain rows go to review without blocking the full import.
- After import, each client's full-year deadline calendar/tasks are generated immediately when matching Verified rules exist.
- Needs-review and unsupported obligations stay visible but are not official confirmed deadlines.
- Related P0 capabilities include CSV import, field mapping, calendar/task auto-generation, entity type auto-recognition, and intelligent field matching.

## Key Product Rule

```txt
Only Verified tax rules can create official system-generated deadline tasks.
User-provided deadlines can appear in the user's workspace, but must be marked as not verified by DueDateHQ.
Needs review, Source changed, and Unsupported rules must be transparent but cannot be treated as confirmed deadlines.
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
- Client import from four CSV sources using representative adapters.
- Manual client and deadline entry.
- Verified tax rules generating official tasks.
- 50-state obligation coverage matrix with verification status.
- Official source monitoring design and API surface.
- Verification queue for rule review and publishing.
- Cloudflare deployment plan.
- Source-specific CSV adapters with preview, mapping, review, and duplicate handling.
- CSV import field mapping for client name, EIN, state, and entity type, with non-blocking suggestions for uncertain rows.
- P0 workflow targets: 30-client import within 30 minutes at `P95 <= 30 minutes for a 30-client import`, weekly triage within 5 minutes, and core dashboard filters responding in `< 1 second` for Beta-sized solo CPA workspaces.
- Dashboard/task exports and in-product urgency surfaces for due today, this week, and this month.
- Deterministic smart priority sorting for dashboard triage.

Out of scope for Beta:

- Production-grade tax liability guarantee.
- Full OAuth, MFA, organizations, invitations, and role-based permissions.
- Automatic publishing of rule changes without verification.
- Complete city/county/industry-specific tax automation.
- Live AI interpretation without human review.
- Desktop-era File In Time features: local database administration, backup/restore UI, Crystal Reports-style reports, mail merge/labels, extension form printing, arbitrary field renaming, network-user maintenance, and detailed rights matrices.
- Email, SMS, and calendar reminders unless later discovery reprioritizes them after the in-product urgency surfaces are proven.

## GTM Summary

First users are solo multi-state CPAs. Pricing target is Pro at `$49/month`, with the first 20 Beta users free in exchange for onboarding calls, redacted CSV samples, and weekly feedback.

The initial acquisition motion is a practical lead magnet: a public "50-State Tax Deadline Coverage Tracker" backed by the same obligation library and verification statuses used inside the product.
