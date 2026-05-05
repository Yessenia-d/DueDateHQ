# DueDateHQ Product Plan

## Product Positioning

DueDateHQ is a tax deadline operating system for solo and small-firm CPAs serving multi-state small business clients.

It replaces scattered spreadsheets, calendars, manual state website checks, and uncertain deadline notes with:

- A 50-state tax obligation library.
- Traceable deadline evidence.
- CSV and manual client onboarding.
- A Monday triage dashboard.
- A verification workflow for official source changes.

Product promise:

```txt
Know what is due, why it is due, and whether the source is verified.
```

## Target User

Primary ICP:

- Solo CPA or 1-3 person firm.
- Serves 30-100 small business clients.
- Handles clients across multiple states.
- Uses Excel, Outlook/Google Calendar, TaxDome, Drake, Karbon, QuickBooks, or a mix.
- Has high fear of missed deadlines and low tolerance for expensive enterprise practice-management tools.

Primary persona:

- Sarah Mitchell, CPA.
- 80 clients, multi-state.
- Every Monday during filing season, she spends 30-45 minutes figuring out what must be done this week before actual tax work starts.

## Core User Stories

### Story 1: Monday Triage

As a solo CPA serving 80 clients across multiple states, I want to see all deadlines requiring action this week within 30 seconds of opening the product so that I can prioritize the week without cross-checking spreadsheets, calendars, and notes.

Acceptance:

- Dashboard defaults to `Due this week`, `This month`, and `Long range`.
- Each task shows countdown, client, state, form/obligation, verification status, and source evidence access.
- Filters respond by client, state, entity type, tax type, status, and verification status.
- Tasks can be marked `Not started`, `In progress`, `Extended`, or `Done`.

### Story 2: CSV Import

As a CPA moving from TaxDome, Drake, Karbon, or QuickBooks, I want to import clients from CSV and generate a usable calendar without manual setup so that I can start using the product during a busy season.

Acceptance:

- Four CSV source adapters exist.
- Field mapping is shown before commit.
- Missing or uncertain fields enter a review step.
- Verified tax rules generate official tasks after import.
- Unsupported and needs-review obligations are visible but not scheduled as confirmed deadlines.

### Story 3: Manual Entry

As a CPA adding a new client or special obligation outside CSV, I want to manually create a client and deadline so that DueDateHQ can still be my single working surface.

Acceptance:

- CPA can add a client manually.
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

## Product Modules

### Auth

Beta users register and log in with email and password. Auth is needed because uploaded CSVs and client deadlines are user-specific. OAuth, MFA, organization membership, and password reset are later-stage features.

### Client Onboarding

Two entry points:

- CSV import for migration and bulk setup.
- Manual entry for new clients, edge cases, and quick additions.

CSV import supports TaxDome, Drake, Karbon, and QuickBooks through source-specific adapters that normalize records into a shared client shape.

### Tax Obligation Library

DueDateHQ maintains a library of tax obligations across federal and 50-state jurisdictions. The library tracks known obligations separately from verified deadline rules.

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

Manual deadline source status:

| Source type | Meaning | Dashboard behavior |
|---|---|---|
| `User provided` | User entered the deadline manually | Appears as user's task, clearly marked not verified by DueDateHQ |

### Evidence Drawer

Every official deadline task opens a Deadline Evidence drawer.

It shows:

- Client.
- Rule name.
- Computed due date.
- Explanation of date calculation.
- Official source name and URL.
- Verification status.
- Source last checked time.
- Source last changed time.
- Current rule version.
- Previous rule version when applicable.
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
- Coverage request action.

### Official Source Monitoring

DueDateHQ monitors official sources using a 24-hour detection SLA.

Product principle:

```txt
24h detect, not blindly auto-verify.
```

The system can detect changes, create candidates, and route them for verification. It cannot automatically publish new verified tax rules without review.

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

- Client.
- Obligation.
- Jurisdiction.
- Due date.
- Days remaining.
- Task status.
- Verification badge.
- Source evidence action.

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

- Solo multi-state CPAs.
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

Public "50-State Tax Deadline Coverage Tracker".

This uses the same product model:

- State.
- Tax category.
- Verification status.
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
- Explicit unsupported states and tax categories.
- User request coverage action.

### Trust Risk

Mitigation:

- Show source evidence in context.
- Do not overclaim "all deadlines verified".
- Separate official system-generated tasks from user-provided tasks.

### Onboarding Risk

Mitigation:

- Four CSV adapters.
- Manual entry fallback.
- Review queue for uncertain fields.

## Beta Acceptance Criteria

- A CPA can register, import or manually enter clients, and see deadline tasks.
- A CPA can understand why a verified deadline exists and where it came from.
- The product clearly marks unverified, source-changed, unsupported, and user-provided items.
- The system design supports 24h official source change detection without auto-publishing unreviewed rules.
- The product has a clear GTM motion for the first 20 Beta users.
