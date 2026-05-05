# Land DueDateHQ Product, Technical, and SDD Specs

## Goal

Land the complete DueDateHQ planning documents in the repository before implementation starts.

This task is documentation-only. Do not modify application code, database schema, generated route files, package manifests, or deployment configuration in this task.

## Scope

Create durable repo documents for:

- Complete product plan
- Complete technical plan
- Spec-Driven Development feature specs
- Official source monitoring and rule update design
- Verification status taxonomy
- Manual client and deadline entry
- Go-to-market plan
- Feature progress tracking plan
- Competitor-informed feature decisions where they affect Beta scope
- Core competitor capability parity, with DueDateHQ-specific improvements where the competitor workflow is dated or weaker

## Deliverables

- `.trellis/tasks/05-05-due-date-hq-docs-specs/research/file-in-time-competitor-research.md`
- `docs/due-date-hq-beta-plan.md`
- `docs/product/due-date-hq-product-plan.md`
- `docs/technical/due-date-hq-beta-technical-plan.md`
- `specs/README.md`
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

## Research Inputs

- File In Time user manual competitor research: `.trellis/tasks/05-05-due-date-hq-docs-specs/research/file-in-time-competitor-research.md`

## Product Direction Update

The product target is not to cherry-pick a few competitor ideas. For core CPA due-date operations, DueDateHQ should cover the useful File In Time capabilities and make them better through a modern web workflow, verified source evidence, rule monitoring, and lower operational overhead.

Core competitor capabilities that must be represented in product/spec planning:

- Client records with tax-relevant profile fields, notes, entity/client type, jurisdiction context, and import/manual entry paths.
- CSV import with preview, field mapping, review before commit, header handling, and duplicate detection/resolution.
- A service/obligation library that can generate client deadline tasks, while preserving DueDateHQ's distinction between known obligations, verified schedulable rules, unsupported obligations, and user-provided deadlines.
- Compact task rows centered on client, obligation, jurisdiction, due date, days remaining, status, and evidence/trust state.
- First-class weekly triage, plus filters/sorting by date horizon, client, jurisdiction/state, entity type, tax type, task status, and verification status.
- Deadline extension handling where verified rule evidence supports extension dates, with extension status visible in task workflow.
- Recurring/upcoming task generation from verified rules or clearly user-provided recurring deadlines, without requiring manual rollover for official deadlines.
- Basic operational exports for dashboard/task views so CPAs can preserve, share, or review workload data outside the app.
- Simple reminder/urgency surfaces for due today/this week/this month, preferably integrated into the dashboard before adding external email/SMS/calendar channels.
- Clear exclusion or later-stage treatment for heavy desktop-era features: local database administration, backup/restore UI, Crystal Reports-style report builders, mail merge/labels, extension form printing, arbitrary field renaming, network-user maintenance, and detailed rights matrices.

DueDateHQ must be better than File In Time in these areas:

- Trust: every official task has source evidence, verification status, versioning, and source-change visibility.
- Automation: official recurring deadlines are generated from maintained rules, not manual rollover.
- Transparency: unsupported, needs-review, source-changed, and user-provided deadlines are visible without pretending to be verified official deadlines.
- Cloud workflow: users should not manage desktop installs, shared drives, database files, optimization, or backups.
- Onboarding: source-specific CSV adapters should improve on generic delimited-file mapping.

## P0 Story Acceptance Criteria

### Weekly filing-season triage

- Persona is a solo or independent CPA serving about 80 clients across multiple states.
- On login, the default dashboard groups deadlines into `Due this week`, `This month`, and `Long range`.
- Within 30 seconds of opening the product after login, the CPA can see all deadlines needing action this week.
- This-week items show a specific countdown in days.
- Fast filters cover client, state, form/obligation type, entity type, tax type, task status, and verification status.
- Core dashboard filters target `< 1 second` response for Beta-sized solo CPA workspaces.
- Each deadline supports one-click status marking for `Done`, `Extended`, and `In progress`.
- The whole weekly triage flow can be completed within 5 minutes, compared with the current 30-45 minute spreadsheet/calendar workflow.
- Intelligent priority sorting is included as a P0 dashboard capability; Beta can satisfy this with deterministic rule-based priority rather than live AI.

### TaxDome/import 30 clients

- Persona is a CPA migrating from TaxDome; Drake, Karbon, and QuickBooks CSV exports are also supported.
- The user can complete import of 30 clients within 30 minutes, with `P95 <= 30 minutes for a 30-client import` as the measurable criterion.
- The system supports TaxDome, Drake, Karbon, and QuickBooks exported CSVs.
- The system automatically recognizes field mapping for client name, EIN, state, and entity type.
- For fuzzy or missing fields, the system gives intelligent, non-blocking suggestions and sends uncertain rows to review instead of blocking the whole import.
- After import, the system immediately generates each client's full-year deadline calendar/tasks when matching Verified rules exist.
- Needs-review and unsupported obligations remain visible but are not official confirmed deadlines.
- Related P0 features include CSV import, field mapping, calendar/task auto-generation, entity type auto-recognition, and intelligent field matching.

## Constraints

- Do not implement code.
- Do not change TypeScript, TSX, schema, API, package, or deployment files.
- Keep Beta product wording transparent: DueDateHQ can monitor and verify sources, but unverified rules must not be presented as official deadlines.

## Acceptance Criteria

- Product plan and technical plan exist and are linked from a top-level beta plan.
- Each major feature has a corresponding SDD spec.
- Each spec includes goal, user flow, Mermaid flow diagram, pages/API, data model, acceptance criteria, and out-of-scope.
- Verification status rules include `Verified`, `Needs review`, `Source changed`, `Unsupported`, and user-provided manual deadlines.
- Official source monitoring design includes 24h detection, change candidates, verification queue, and manual approval before publishing verified rules.
- Product and feature specs reflect the File In Time competitor research where relevant, especially CSV import review, Monday triage, task filters, exports, and beta exclusions.
- Product and feature specs explicitly show how DueDateHQ reaches parity or better for each core File In Time workflow area: client setup, import, obligation/service setup, task generation, triage, filtering, status/extension handling, recurrence/upcoming tasks, exports, reminders/urgency, and admin/settings boundaries.
