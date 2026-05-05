# CSV Imports

## Goal

Let CPAs import client relationships and filing/tax profiles from TaxDome, Drake, Karbon, and QuickBooks CSV exports, preview rows, review field mapping, resolve likely duplicates, confirm suggested individual/business relationships, fix missing fields, and create official full-year deadline tasks only when imported profiles match Verified tax rules. The P0 migration target is a CPA completing a 30-client import within 30 minutes.

## User Flow

1. User opens `/import`.
2. User selects source system.
3. User uploads CSV.
4. System automatically recognizes field mapping for client name, EIN, state, and entity type where possible.
5. System previews field mapping.
6. System detects headers, validation issues, fuzzy or missing fields, and likely duplicate clients.
7. System suggests possible relationships between individuals and businesses, but does not auto-merge them.
8. System provides intelligent, non-blocking suggestions and sends uncertain rows to review.
9. User reviews uncertain rows, duplicate candidates, and relationship suggestions.
10. User commits import.
11. System creates client relationships and filing/tax profiles.
12. System generates each profile's full-year official deadline calendar/tasks only from verified tax rules.
13. User sees a profile/problem grouped import summary and can open dashboard.

## Flow Diagram

```mermaid
flowchart TD
  A[Select source] --> B[Upload CSV]
  B --> C[Parse with source adapter]
  C --> D[Detect headers and auto-map key fields]
  D --> E[Preview canonical client shape]
  E --> N{Likely duplicate?}
  N -- Yes --> O[Duplicate review]
  N -- No --> P[Validation review]
  O --> P
  P --> Q{Fuzzy or missing fields?}
  Q -- Yes --> F[Intelligent suggestions and review queue]
  F --> G[User accepts or fixes fields]
  Q -- No --> H[Preview summary]
  G --> H
  H --> R{Relationship suggestion?}
  R -- Yes --> S[CPA confirms or rejects]
  R -- No --> I[Commit import]
  S --> I
  I --> J[Create relationships and profiles]
  J --> K[Match verified tax rules]
  K --> L[Create full-year official deadline tasks]
  L --> M[Show grouped import result]
```

## Pages

- `/import`
  - Source selection.
  - File upload.
  - Header detection.
  - Mapping preview.
  - Duplicate review.
  - Relationship suggestion review.
  - Row review.
  - Commit summary grouped by filing/tax profile and problem.

## API

- `imports.preview`
  - Input: source system, CSV file or text.
  - Output: batch id, detected source profile, adapter version, header detection result, column mapping, automatically recognized key fields, unmapped source columns, mapping confidence, accepted profile rows, review rows, duplicate candidates, relationship suggestions, suggestions, validation messages.

- `imports.commit`
  - Input: batch id, reviewed row corrections, duplicate resolutions, and accepted/rejected relationship suggestions.
  - Output: ready profile count, created/updated client relationship count, updated/skipped duplicate count, created full-year deadline task count, profile review item count, needs-review obligation count, coverage-gap count, unsupported obligation count.

## Data Model

`import_batches`

- Source system.
- Status.
- Total rows.
- Accepted rows.
- Review rows.
- Duplicate rows.
- Header detected.
- Adapter version.

`client_relationships`

- Created from canonical import rows or CPA-confirmed relationship suggestions.

`filing_profiles`

- Created from canonical import rows.

`deadline_tasks`

- Generated from verified rules only.

Canonical filing/tax profile shape:

- Client name.
- EIN.
- SSN last four when present.
- Entity type.
- States.
- County.
- Fiscal year type.
- Source system.
- Source row id.

Relationship suggestion shape:

- Incoming profile row id.
- Suggested existing or new client relationship id.
- Reason.
- Suggested action: confirm relationship or keep separate.
- Status: pending, accepted, or rejected.

Duplicate candidate shape:

- Incoming row id.
- Existing client id.
- Matched fields.
- Differing fields.
- Suggested action: create, update existing, or skip.

## Source Adapter Profiles

Detailed research lives in `.trellis/tasks/05-05-due-date-hq-docs-specs/research/csv-source-export-format-research.md`.
Additional official-source profile research lives in `.trellis/tasks/05-05-due-date-hq-docs-specs/research/csv-export-import-profiles-taxdome-drake-karbon-quickbooks.md`.

| Source | P0 adapter profiles | Strong fields | Review-first fields and caveats |
|---|---|---|---|
| TaxDome | `taxdome_accounts_v1`, `taxdome_contacts_v1` | Account name, contact name, first/last name, company name, state/province, email, phone, linked accounts/contacts, tags, custom fields | EIN, SSN, filing entity type, fiscal year, and tax-state fields usually depend on firm-defined custom fields. Linked accounts/contacts create relationship suggestions only; they must not auto-merge records. |
| Drake | `drake_client_export_v1` | Public docs confirm Drake Tax can export client data files to CSV, but do not publish a stable public field list | Treat Drake as sample-driven. Support likely aliases such as client id, SSN/EIN, taxpayer/company name, address, state, return type, and entity, but require mapping review when headers are missing or weak. |
| Karbon | `karbon_import_file_v1`, `karbon_bulk_update_v1` | Organization name, first/last name, client identifier, fiscal year end, email, phone, address, client group, belongs-to/associated-organization fields | Bulk update data may arrive as multi-tab XLSX rather than single CSV. Business Number is not always a US EIN. Belongs-to and associated organization fields create relationship suggestions only. |
| QuickBooks | `quickbooks_online_customer_contact_v1`, `quickbooks_desktop_customer_vendor_v1` | Customer/name, company/full name, first/last name, email, phone, billing address, billing state, customer/entity type when selected | QuickBooks customer exports are contact/accounting data, not tax-profile data. EIN/SSN is usually absent unless stored in custom, notes, or other user-selected columns. Bank transaction CSVs are not valid client import files. |

All adapters must:

- Preserve identifiers as strings, including ZIP, SSN, EIN, phone numbers, and source IDs with leading zeros.
- Use header-based mapping when possible and require user mapping when no reliable headers exist.
- Show detected source profile, adapter version, recognized columns, unmapped columns, and review-required fields before commit.
- Surface source custom fields in the mapping preview rather than discarding them.
- Send uncertain entity type, tax ID, tax state, fiscal year, and relationship fields to review instead of blocking the whole import.
- Keep adapter versions on import batches so source-format changes are auditable.

## Export Compatibility Boundary

DueDateHQ's P0 CSV compatibility primarily means importing client/profile data from CSVs exported by TaxDome, Drake, Karbon, and QuickBooks. Dashboard/task CSV export is a separate operational feature.

Outbound CSV exports must not imply two-way product compatibility unless a target product's official import schema is documented and supported:

- The default DueDateHQ task export is a generic current task view CSV for workload sharing and review.
- Product-specific task export is only plausible for a Karbon work-item profile, and should stay optional until exact template requirements are confirmed.
- TaxDome, Drake, and QuickBooks task-import compatibility is not a Beta promise; their supported P0 role is source client/profile import.

## Competitor Parity Notes

File In Time treats import as a review workflow, not a blind upload. DueDateHQ must match preview, mapping, header handling, review before commit, and duplicate resolution. DueDateHQ should be better by using source-specific adapters that start from known TaxDome, Drake, Karbon, and QuickBooks exports instead of making every user map a generic delimited file from scratch. It should also group review by filing/tax profile and problem type so CPAs are not forced to reason through every generated task.

## Acceptance Criteria

- TaxDome adapter supports account and contact export profiles, including linked accounts/contacts and custom fields.
- Drake adapter supports sample-driven Drake client exports and requires mapping review when public-header confidence is low.
- Karbon adapter supports import/contact-list exports and bulk-contact-update organization/person data when provided as CSV.
- QuickBooks adapter supports QBO customer/contact-list exports and QuickBooks Desktop customer/vendor list exports; bank transaction CSVs are rejected as the wrong source type.
- A CPA migrating from TaxDome can complete import of 30 clients within 30 minutes.
- Import performance target is `P95 <= 30 minutes for a 30-client import`.
- System automatically recognizes field mapping for client name, EIN, state, and entity type when present or confidently inferred; uncertain values go to review.
- Fuzzy or missing fields receive intelligent, non-blocking suggestions and send uncertain rows to review instead of blocking the full import.
- Possible relationships between individuals and businesses are suggested but never auto-merged.
- CPA must explicitly confirm or reject relationship suggestions.
- User-facing copy says `Filing profile` or `Tax profile` and avoids internal tax-subject jargon.
- Missing required fields are reviewable, not silently dropped.
- Header detection and mapping preview are visible before commit.
- Likely duplicate clients are shown with field differences and a user-selected resolution.
- Import commit creates client relationships and filing/tax profiles.
- After import, matching Verified rules immediately generate each filing/tax profile's full-year deadline calendar/tasks.
- Only verified rules generate official deadline tasks.
- Needs-review, coverage-gap, and unsupported obligations remain visible but are not official confirmed deadlines.
- Related P0 capabilities include CSV import, field mapping, calendar/task auto-generation, entity type auto-recognition, and intelligent field matching.
- Import summary explains ready profiles, generated verified tasks, profile review items, needs-review items, coverage gaps, and unsupported obligations in plain language.

## Out of Scope

- Perfect compatibility with every historical export variant.
- Direct API integrations with source products.
- Storing raw CSV files permanently.
- Mail merge, labels, or client export formats unrelated to deadline onboarding.
