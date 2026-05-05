# CSV Imports

## Goal

Let CPAs import clients from TaxDome, Drake, Karbon, and QuickBooks CSV exports, preview rows, review field mapping, resolve likely duplicates, fix missing fields, and create official full-year deadline tasks only when imported clients match Verified tax rules. The P0 migration target is a CPA completing a 30-client import within 30 minutes.

## User Flow

1. User opens `/import`.
2. User selects source system.
3. User uploads CSV.
4. System automatically recognizes field mapping for client name, EIN, state, and entity type where possible.
5. System previews field mapping.
6. System detects headers, validation issues, fuzzy or missing fields, and likely duplicate clients.
7. System provides intelligent, non-blocking suggestions and sends uncertain rows to review.
8. User reviews uncertain rows and duplicate candidates.
9. User commits import.
10. System creates clients.
11. System generates each client's full-year official deadline calendar/tasks only from verified tax rules.
12. User sees import summary and can open dashboard.

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
  H --> I[Commit import]
  I --> J[Create clients]
  J --> K[Match verified tax rules]
  K --> L[Create full-year official deadline tasks]
  L --> M[Show import result]
```

## Pages

- `/import`
  - Source selection.
  - File upload.
  - Header detection.
  - Mapping preview.
  - Duplicate review.
  - Row review.
  - Commit summary.

## API

- `imports.preview`
  - Input: source system, CSV file or text.
  - Output: batch id, header detection result, column mapping, automatically recognized key fields, mapping confidence, accepted rows, review rows, duplicate candidates, suggestions, validation messages.

- `imports.commit`
  - Input: batch id, reviewed row corrections, and duplicate resolutions.
  - Output: created client count, updated/skipped duplicate count, created full-year deadline task count, needs-review obligation count, unsupported obligation count.

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

`clients`

- Created from canonical import rows.

`deadline_tasks`

- Generated from verified rules only.

Canonical client shape:

- Client name.
- EIN.
- Entity type.
- States.
- County.
- Fiscal year type.
- Source system.
- Source row id.

Duplicate candidate shape:

- Incoming row id.
- Existing client id.
- Matched fields.
- Differing fields.
- Suggested action: create, update existing, or skip.

## Competitor Parity Notes

File In Time treats import as a review workflow, not a blind upload. DueDateHQ must match preview, mapping, header handling, review before commit, and duplicate resolution. DueDateHQ should be better by using source-specific adapters that start from known TaxDome, Drake, Karbon, and QuickBooks exports instead of making every user map a generic delimited file from scratch.

## Acceptance Criteria

- TaxDome adapter supports representative TaxDome client export fields.
- Drake adapter supports representative Drake client export fields.
- Karbon adapter supports representative Karbon contact export fields.
- QuickBooks adapter supports representative QuickBooks customer export fields.
- A CPA migrating from TaxDome can complete import of 30 clients within 30 minutes.
- Import performance target is `P95 <= 30 minutes for a 30-client import`.
- System automatically recognizes field mapping for client name, EIN, state, and entity type.
- Fuzzy or missing fields receive intelligent, non-blocking suggestions and send uncertain rows to review instead of blocking the full import.
- Missing required fields are reviewable, not silently dropped.
- Header detection and mapping preview are visible before commit.
- Likely duplicate clients are shown with field differences and a user-selected resolution.
- Import commit creates clients.
- After import, matching Verified rules immediately generate each client's full-year deadline calendar/tasks.
- Only verified rules generate official deadline tasks.
- Needs-review and unsupported obligations remain visible but are not official confirmed deadlines.
- Related P0 capabilities include CSV import, field mapping, calendar/task auto-generation, entity type auto-recognition, and intelligent field matching.
- Import summary explains generated, needs-review, and unsupported obligations.

## Out of Scope

- Perfect compatibility with every historical export variant.
- Direct API integrations with source products.
- Storing raw CSV files permanently.
- Mail merge, labels, or client export formats unrelated to deadline onboarding.
