# Add Source Row Comparison to CSV Import Review

## Goal

Make CSV import review safe enough for CPA migration work by replacing the low-value raw CSV text display with row-level and field-level comparison between the source file and the DueDateHQ canonical filing/tax profile that will be committed.

The user must be able to answer, for every reviewed row: what did the source file say, what will DueDateHQ save, what changed, what needs review, and whether the row is safe to commit.

## What I Already Know

- CSV import is a high-trust workflow. A wrong import can create incorrect Client Relationships, Filing Profiles, and generated Deadline Tasks.
- The current import page already parses source CSV text, previews field mapping, shows accepted/review rows, handles duplicate candidates, relationship suggestions, corrections, and commit.
- The current large CSV textarea mostly shows raw input. It is useful for paste fallback but not useful for row-level review.
- The API preview response already includes `rowIndex`, `sourceRowId`, `canonicalProfile`, `sourceFields`, mapping metadata, accepted rows, and review rows.
- Project rules require imported source IDs to remain external source IDs, never DueDateHQ internal IDs.
- Raw CSV files must not be stored permanently. Existing import metadata is intended to be auditable without storing the whole raw CSV.
- DueDateHQ product design favors dense, calm, audit-friendly tables, explicit status badges, drawers, and before/after diffs.
- User requested bilingual documentation for this task. Keep this PRD and `prd.zh.md` synchronized.

## Requirements

### Upload and Preview Entry

- Keep file upload and paste/manual CSV text as input methods.
- After preview succeeds, reduce the raw CSV text area to an input-only affordance instead of a primary review surface.
- Show import source metadata prominently: file name when available, detected source profile, adapter version, total rows, header detection, recognized/unmapped columns, and mapping confidence.
- Keep validation messages visible before commit.

### Row-Level Source Comparison

- Every accepted and review row must expose its source row evidence.
- The primary review table should continue to show the DueDateHQ canonical profile values that will be committed.
- Each row must make `sourceRowId` and source row number visible.
- Opening a row should show a source comparison panel or drawer with:
  - source row id and row index
  - canonical profile values
  - original source fields as key/value pairs
  - mapped fields highlighted or grouped separately from unmapped fields
  - review messages and problem types
  - duplicate and relationship suggestion context when present

### Field-Level Comparison

- For high-risk or review-required fields, the UI must show the original source column/value close to the editable DueDateHQ value.
- Fields in scope:
  - client name
  - filing profile name
  - entity type
  - state/states
  - EIN
  - SSN last four
  - source client id
- If a user edits a field, the UI must make the edited value distinguishable from the original source value.
- If a field was not mapped from a source column, the UI must say so instead of implying the source confirmed it.

### Duplicate and Relationship Review

- Duplicate candidate review should compare incoming source row values against the existing DueDateHQ client relationship values.
- Relationship suggestions should remain explicit CPA decisions. The comparison view must not imply automatic merge.
- Bulk actions may remain available, but selected rows must still preserve row-level evidence.

### Commit Safety

- Commit remains disabled until required duplicate and relationship decisions are resolved.
- Commit copy should refer to reviewed rows/profiles, not raw CSV text.
- Commit result should continue to summarize created/matched clients, filing profiles, verified tasks, review items, coverage gaps, and unsupported obligations.
- Only Verified Tax Rules can generate official Deadline Tasks after commit.

### Data and Privacy Boundaries

- Do not permanently store the raw CSV file or full raw CSV text.
- It is acceptable to persist row-level `sourceFields`, mapping metadata, adapter version, detected profile, and review decisions needed for audit and row comparison.
- Preserve identifiers as strings, including leading zeros.
- Do not send customer PII to AI services as part of this task.

### Documentation

- Keep `prd.md` and `prd.zh.md` synchronized for this task.
- If this task updates English markdown under `docs/` or `specs/`, update the corresponding `.zh.md` file in the same change set.
- If implementation changes the CSV import product contract, update `specs/csv-imports.md` and `specs/csv-imports.zh.md`.

## Proposed UX Approach

Use an "A plus targeted B" model:

- Primary pattern: row evidence drawer. The review table stays dense, and each row can open a source comparison drawer.
- Targeted inline evidence: for low-confidence, needs-review, unmapped, or user-edited fields, show the original source value directly near the input.
- Avoid a full side-by-side raw CSV grid for MVP. It is heavier to implement and pushes CPAs back into manually reading source columns instead of reviewing decisions.

## Acceptance Criteria

- [ ] After a successful preview, the raw CSV textarea no longer dominates the review step.
- [ ] Every review row has a visible way to open source row comparison.
- [ ] Source comparison shows canonical profile values and original source fields for the same row.
- [ ] Mapped and unmapped source fields are visually distinguishable.
- [ ] Low-confidence, review-required, unmapped, or edited fields show source evidence close to the editable field.
- [ ] Duplicate rows show incoming vs existing differences in the review flow.
- [ ] Relationship suggestions remain explicit accept/reject decisions.
- [ ] Raw CSV is not permanently stored.
- [ ] Existing import preview/commit tests are updated or extended for any API shape changes.
- [ ] Web route changes pass type-check.
- [ ] Browser verification confirms the import review remains scannable on desktop and usable on mobile.

## Out of Scope

- Perfect spreadsheet-style full CSV diffing.
- Permanent raw CSV file storage.
- Direct API integrations with TaxDome, Drake, Karbon, or QuickBooks.
- AI-based import correction.
- Creating official deadlines from imported CSV data directly.
- Reworking the entire import adapter system.

## Technical Notes

- Likely frontend file: `apps/web/src/routes/import.tsx`.
- Likely API file if response shape changes: `packages/api/src/routers/imports.ts`.
- Existing API row shape already includes `sourceFields`, `rowIndex`, and `sourceRowId`, so the MVP may be mostly frontend work.
- Existing feature spec: `specs/csv-imports.md`.
- Product design source: `DESIGN.md`, especially Import Review, Tables, Drawers, Diff Panels, and Accessibility.
