# Research: File In Time Competitor Manual

- Query: Analyze `/Users/yessy/Downloads/File-In-Time-Users-Guide.pdf` for DueDateHQ planning.
- Scope: mixed, with local PDF analysis and repo planning context from `.trellis/tasks/05-05-due-date-hq-docs-specs/prd.md`, `docs/product/due-date-hq-product-plan.md`, `docs/technical/due-date-hq-beta-technical-plan.md`, and relevant `specs/*.md`.
- Date: 2026-05-05
- Source path: `/Users/yessy/Downloads/File-In-Time-Users-Guide.pdf`
- Source analyzed: File In Time For Windows User's Guide, TimeValue Software, PDF metadata creation/modification date 2010-06-21, 106 pages.

## Findings

### Competitor Positioning Summary

File In Time positions itself as Windows desktop due-date tracking and workload/task management software for tax professionals. The manual frames the product around a local database of clients, services, employees, and tasks. Its core promise is practical firm operations: know what tasks are due, who is responsible, how work is progressing, and how to roll recurring work into the next period.

The product is operationally mature for a legacy desktop workflow: configurable task grids, saved views, batch changes, service-driven due-date calculation, client/service grouping, reports, Excel export, local/network database administration, backups, and employee rights. It does not appear to position around verified official source evidence, source monitoring, modern cloud collaboration, direct SaaS integrations, or transparent rule trust.

### End-to-End Workflow Map

1. Onboarding and installation
   - Install from CD on Windows, either single-user or network edition. Network setup requires shared program directory and per-workstation setup (manual pages 10-11).
   - Load a tutorial database for training without affecting real data (page 14).
   - Create or open a File In Time database. The database contains clients, services, employees, and tasks (pages 76-77).

2. Initial data setup
   - Add clients manually or import client data from comma/tab-delimited files. Imported fields are previewed, mapped by drag-and-drop, optionally combined, and duplicate clients are resolved during import (pages 15, 52, 78-83).
   - Create services, which represent work types such as tax forms, payroll, or financial statements. Services carry due dates, frequency, extension dates, and custom service definitions. The manual says the product ships with due-date and extension information for nearly 200 federal and state tax forms and related items (pages 16, 55-57).
   - Add employees/staff, assign them as key people, and configure rights/passwords in the network edition (pages 17, 58, 93).
   - Build client groups, service groups, and client types for assignment, filtering, and reporting (pages 53, 60-61).

3. Task creation and deadline calculation
   - A task is created by assigning a service to a client. The minimum task shape is client short name, service, and due date (page 38).
   - Due dates are generated from the selected service and client year-end. Services can be annual, quarterly, weekly, semi-monthly, and other frequencies; non-annual services can generate a year's worth of tasks in one operation (pages 41-43, 56-57).
   - Tasks can be created one at a time, for many clients using a shared service, or for one client using many services (pages 41-43, 70).

4. Daily use and task triage
   - The main working surface is a configurable task view. Default columns include client, service, due date, status, key person, extension flag, and notes (page 30).
   - Users filter and sort by date ranges, client, client type, year-end, client group, service, status, key person, and custom views. Saved views can become the default startup view (pages 19-21, 34-35, 71-72, 92).
   - Daily/weekly triage is supported by date filters such as "This Week," auto reminders on startup, and calendar view counts per day (pages 36-37, 71).
   - Task progress is tracked through status codes, status date stamps, key people, target dates, extension status, and notes. Status changes automatically record dates, creating a progress history (pages 33, 38-40).

5. Deadline tracking and recurrence
   - Tasks can be extended to allowable extension dates configured on the service. Extension forms can be printed for certain task types (page 39).
   - Completed tasks can be rolled forward to the next due date based on service frequency. Rollover can optionally delete old tasks, carry/clear selected fields, recompute target dates, and set a default status on new tasks (pages 24, 46-49, 73).
   - The manual recommends exporting prior-year completed tasks to Excel as an archive before rolling forward (page 73).

6. Document, client, and note management
   - Client records store address, contact, tax ID, year-end, client type, key staff, custom fields, and client notes (pages 52-53).
   - Task notes are unlimited, can be displayed inline or as an icon, can be bulk-added/cleared, and are distinct from client notes (page 40).
   - The manual does not describe document storage or document workflow. Document-adjacent features are export for mail merge/labels, Excel reports, printed reports, and extension form printing (pages 67-68, 88).

7. Reporting and exports
   - Reports can be based on the current task view or predefined Crystal Reports formats. The task view report preserves the selected filters, sorts, and columns (pages 26-27, 64-67).
   - The current task view can be exported to Excel for workload sharing, special formatting, email, or archival records (pages 27, 35, 68, 73).
   - Client data can be exported for mail merge, labels, and use in other applications (pages 67-68, 88).
   - A common workflow is producing a weekly workload report by filtering to a key person and due date range, then printing a task view report (page 73).

8. Reminders
   - Startup auto reminder can alert for tasks due today, this week, or this month, excluding tasks marked Done. It can also include prior tasks that are not Done (page 37).
   - Calendar view shows number of tasks due on each day and drills back into the task view for that day (page 36).
   - The manual does not describe email, SMS, calendar sync, or external notification channels.

9. Admin and settings
   - Network edition includes current-user lists, supervisor messaging, and forced user logoff for maintenance (pages 84-85).
   - Database tools include database information, clients with no tasks, duplicate task detection/purge, check/optimize, restore deleted items, backup/restore, and import/export tools (pages 85-88).
   - Automatic daily backups are configurable by location and retention window, up to 120 days (page 86).
   - Options include last saved task view, day-of-week display, speed edit helper, century dates, daily backups, rollover behavior, automatic updates, automatic date setting, unsaved-view warnings, cache update behavior, and task-note display mode (page 92).
   - Employee passwords and rights exist for network edition, but the manual excerpt does not provide a detailed permission matrix (page 93).

### Feature Inventory

| Area | File In Time capability | Workflow evidence/notes | Potential DueDateHQ use | Priority |
|---|---|---|---|---|
| Positioning | Due-date tracking plus workload/task management for tax professionals | Welcome and tutorial introduce tasks as client + service + due date; workload is tied to responsibility and status | Keep DueDateHQ positioned as a tax deadline operating system, but explicitly differentiate on source evidence and verification | Adapt |
| Platform | Windows desktop, local or network install | Requires Windows, CD installation, network workstation setup | Avoid desktop/network install model; use web app simplicity as a differentiator | Avoid |
| Tutorial onboarding | Sample/tutorial database | Users can load tutorial data without affecting real data | Seed demo data or sample workspace for beta onboarding | Later |
| Client management | Manual clients with address, contact, tax ID, year-end, client type, key people, custom fields, notes | Client Edit window tabs: general, key people, user-defined, notes | Include core client profile fields; defer broad custom fields unless beta users demand them | Adapt |
| Client import | Comma/tab-delimited import with preview, field mapping, field combining, header skip, duplicate resolution | Import flow previews records and maps fields into File In Time client fields | Strong validation for DueDateHQ CSV import preview/review; source-specific adapters can improve on generic mapping | Adopt |
| Client duplicate handling | Import detects existing records and asks user to resolve differences | Duplicate dialog shows field differences | Add duplicate detection to CSV import review to prevent silent duplicate clients | Adapt |
| Client groups | Groups for assignment, filtering, and reports | Example: payroll clients or state-based groups | Useful later for firm segmentation and bulk actions; beta can start with filters by state/entity/tax type | Later |
| Client types | Single classification such as corporation/individual/estate | Client type filters task view | DueDateHQ already has entity type; keep terminology tax-specific and avoid generic "type" ambiguity | Adopt |
| Service library | Services represent recurring work; includes due dates, frequency, extensions, and custom services | Ships with many federal/state form services; users can add services | Map concept to DueDateHQ tax obligations and deadline rules; distinguish known obligations from verified schedulable rules | Adapt |
| Custom services | Users can add services outside shipped list | Service Edit window creates custom services | Support manual user-provided deadlines, but do not let custom services masquerade as verified official rules | Adapt |
| Service frequency | Annual, quarterly, weekly, semi-monthly, and other frequencies drive due dates and rollover | Frequency controls new tasks and due-date recurrence | Recurrence support is valuable, but beta should only automate recurrence for verified rules or clearly user-provided manual tasks | Adapt |
| Extension dates | Up to five allowable extensions from original due date | Services store extension dates; tasks can be extended from task view | Include `extended` task status and extension due dates for verified rules where evidence supports them | Adapt |
| Extension forms | Prints IRS extension forms for certain services | Forms listed include individual/corporate extension forms and power of attorney | Exclude form printing from beta; users likely have tax prep systems for forms | Avoid |
| Task model | Task equals client + service + due date, with optional status/key person/notes | Task definition appears repeatedly in tutorial and database intro | DueDateHQ task rows should stay compact and deadline-centered | Adopt |
| Bulk task creation | Assign one service to many clients or many services to one client | Multiple Assignment and client/service groups | CSV import can generate tasks in bulk; manual bulk assignment can wait | Later |
| Year's worth generation | Non-annual services can create a year's worth of tasks | Quarterly and weekly examples | For verified recurring obligations, generate a visible horizon; avoid overwhelming beta users with long task floods | Adapt |
| Configurable task grid | Custom columns, widths, frozen columns, renamed fields, saved task views | Task View Setup controls fields and saved views | Borrow saved/filterable views; avoid full custom field/column rename complexity in beta | Adapt |
| Saved views | Save filters and selected columns; use last saved view on startup | Saved task view persists criteria and columns | DueDateHQ can default to dashboard triage; saved views are useful later | Later |
| Filters and sorting | Date range, client, client type, year-end, group, status, key person, sort hierarchy | Task Selection Filter and Sort fields | Adopt fast filters by client, state, entity, tax type, status, verification status, and due horizon | Adopt |
| Weekly triage | Display tasks due this week via date range filter | Practical workflow section shows Due Date + This Week | DueDateHQ should make this first-class instead of requiring manual filter setup | Adopt |
| Calendar view | Monthly calendar shows counts per day and drills into task view | Calendar button and day counts | Useful, but current DueDateHQ beta can focus on triage list and evidence drawer | Later |
| Auto reminder | Startup reminder for due today/this week/this month, excluding Done | Configurable on startup | DueDateHQ can initially use dashboard urgency; email/calendar reminders should remain out of beta unless specifically prioritized | Later |
| Status tracking | Custom status codes and status-date stamps | Status changes record dates for progress history | Adopt simple statuses from DueDateHQ specs; status history/audit can be useful after beta | Adapt |
| Key people | Assign staff to clients and tasks; filter reports by staff | Employees become key people and defaults | DueDateHQ beta specs exclude multi-user assignment; keep out until firm/team model exists | Later |
| Batch changes | Bulk status, due date, target date, key person, extension, rollover, notes | Change dialog operates on selected tasks | Borrow targeted bulk status updates after core beta; bulk rollover is less relevant if system-generated tasks are rule-based | Later |
| Rollover | Completed tasks roll to next due date based on service frequency | Rollover creates new tasks, can delete old tasks and retain/clear fields | DueDateHQ should generate upcoming tasks from rules rather than require user rollover; manual recurring deadlines may need controlled recurrence | Adapt |
| Target dates | Target date can roll forward relative to due date | Rollover options recompute target date | Consider later as an internal planning date separate from legal due date | Later |
| Task notes | Unlimited task notes, icon/text display, bulk add/clear | Notes are separate from client notes | Adopt simple per-task notes for beta only if needed; avoid rich note management | Later |
| Client notes | Client-specific notes shown in client information and reports | Notes tab on client record | Keep client notes if current specs include notes; do not expand into document management | Adapt |
| Reports | Task view reports and predefined reports | Report data follows current task view; Crystal Reports for predefined layouts | DueDateHQ beta should prioritize dashboard export/CSV over complex report builder | Adapt |
| Excel export | Current task view exported to Excel; used for email workload reports and archives | Excel export appears in tutorial, saved views, reporting, and archival workflows | Adopt CSV/XLSX export for trust, portability, and CPA habits | Adopt |
| Prior-year archive | Export completed prior-year tasks before rolling over | Practical workflow recommends Excel archive | DueDateHQ can preserve history in-app; export history later | Later |
| Mail merge/labels | Client export for merge letters, labels, and other print materials | Export client information tool | Exclude from beta; not core to verified deadline tracking | Avoid |
| Search | Find specific tasks by client, service, due date, key person, notes, or status | Toolbar Find description | Add basic dashboard/client search if cheap; advanced search later | Adapt |
| Database administration | Multiple databases, open/find database, check/optimize, restore deleted item | Database tools section | Avoid exposing database concepts in cloud app; internal admin observability only | Avoid |
| Backup/restore | Automatic daily backups, retention, manual backup/restore | Backup options and tools | Cloud backups should be platform/internal; no beta UI for database backup | Avoid |
| Network users | Current user list, messages, force logoff | Supervisor network maintenance tools | Not relevant to cloud beta; avoid | Avoid |
| Employee rights/passwords | Network edition password and rights setup through employee records | Employee Edit and security appendix | DueDateHQ beta auth is single-user/email-password; team roles later | Later |
| Options/settings | Last saved view, day of week, date display, backups, rollover, auto date setting, notes display | Options menu list | Borrow only user-facing settings that support workflow clarity; avoid option sprawl in beta | Adapt |
| Automatic updates | Desktop update option | Options menu | Cloud deployment makes this irrelevant to users | Avoid |
| Official source evidence | Not described as a user-visible capability | Manual focuses on bundled service due dates, not source lineage | Core DueDateHQ differentiator: evidence drawer, last checked/verified, rule version, source changed status | Adopt |
| Source monitoring | Not described | No workflow for official source checking or rule change review | Core DueDateHQ differentiator; keep 24h detect plus human verification | Adopt |
| Verification statuses | Not described | No `Verified`/`Needs review`/`Source changed`/`Unsupported` trust taxonomy | Core DueDateHQ differentiator and beta guardrail | Adopt |
| Direct SaaS integrations | Not described | Import is delimited-file based, not API-based | DueDateHQ beta can also start with CSV, but use named adapters for TaxDome, Drake, Karbon, QuickBooks | Adapt |

### Specific Recommendations for DueDateHQ

#### Borrow

- Make weekly triage the first-class landing state. File In Time makes users configure "This Week"; DueDateHQ should open directly to Due this week / This month / Long range.
- Keep task rows compact: client, obligation, jurisdiction, due date, days remaining, status, and a trust/evidence badge.
- Treat CSV import preview and field mapping as a serious workflow, not just an upload button. Borrow preview, header handling, field mapping, duplicate detection, and review before commit.
- Support operational filters CPAs already expect: client, state/jurisdiction, entity type, tax type, due horizon, task status, and verification status.
- Preserve CPA-friendly portability with exportable task views or summaries, at least CSV for beta.
- Support a simple equivalent of File In Time's service groups later: reusable obligation bundles or onboarding templates for common client profiles.

#### Differentiate

- Lead with trust, not just task volume. File In Time appears to bundle due-date/service data but does not explain official sources or verification lineage. DueDateHQ should show source URL, last checked, last verified, version, and whether a source changed.
- Do not let user-created or unreviewed deadlines look official. File In Time allows custom services and manual due-date edits; DueDateHQ should keep the current invariant that only verified tax rules create official system-generated deadlines.
- Replace desktop database maintenance with cloud reliability. Users should not think about local databases, mapped drives, check/optimize routines, backup retention, or merge limitations.
- Replace rollover as user labor with rule-generated future tasks. Users should not need to remember to roll completed tasks forward for official verified obligations.
- Use transparent coverage gaps as product trust. Show unsupported/needs-review obligations visibly without scheduling them as confirmed tasks.

#### Exclude for Beta

- IRS/state extension form printing.
- Desktop/network database concepts: multiple database files, mapped-drive installs, database optimization, forced user logoff, manual backups/restores.
- Crystal Reports-style custom reporting and mail-merge/label workflows.
- Broad custom field renaming, arbitrary custom task fields, and heavy saved-view configuration.
- Multi-user staff assignment, rights matrices, and internal messaging until organization/team support exists.
- Calendar sync, email/SMS reminders, and document management unless user discovery makes them beta-blocking.

### Related Specs

- `.trellis/tasks/05-05-due-date-hq-docs-specs/prd.md`: documentation-only task and beta wording constraints.
- `docs/product/due-date-hq-product-plan.md`: product positioning, dashboard triage, CSV/manual onboarding, obligation library, verification status system, evidence drawer, coverage matrix, source monitoring.
- `docs/technical/due-date-hq-beta-technical-plan.md`: data model, API surface, frontend pages, source monitoring architecture, implementation guardrails.
- `specs/csv-imports.md`: CSV source adapters, mapping preview, row review, commit summary.
- `specs/manual-client-and-deadline-entry.md`: manual clients and user-provided deadlines.
- `specs/tax-obligation-library.md`: known obligations vs verified schedulable rules.
- `specs/tax-rule-verification.md`: verified/needs-review/source-changed/unsupported trust model.
- `specs/official-source-monitoring.md`: 24h source change detection and human approval.
- `specs/dashboard.md`: triage dashboard task grouping, evidence drawer, filtering, statuses.

## Caveats / Not Found

- The manual is from 2010 and describes a Windows desktop product; current File In Time capabilities may differ.
- PDFKit local extraction was used because `pdftotext`, `pdfinfo`, `pypdf`, `PyPDF2`, and `pdfplumber` were not available in this environment.
- The manual did not expose current pricing, market positioning, support status, security model details beyond network passwords/rights, or current product roadmap.
- The manual did not describe official-source evidence, rule verification workflows, source monitoring, direct integrations, cloud sync, email/SMS reminders, calendar sync, or document storage.
- Permission details are summarized only at a high level because the extracted manual text references rights/passwords but does not enumerate a full rights matrix in the analyzed pages.
