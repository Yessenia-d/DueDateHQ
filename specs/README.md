# DueDateHQ SDD Specs

This directory contains Spec-Driven Development documents. Every major feature must have a spec before implementation begins.

## Documentation Language

English is the default documentation language. Every product, technical, and feature spec document must also have a Chinese counterpart for review.

- English: `<name>.md`
- Chinese: `<name>.zh.md`

## Required Spec Structure

Each spec must include:

- Goal
- User Flow
- Flow Diagram
- Pages
- API
- Data Model
- Acceptance Criteria
- Out of Scope

## Specs

- `auth.md`
- `csv-imports.md`
- `manual-client-and-deadline-entry.md`
- `tax-obligation-library.md`
- `tax-rule-verification.md`
- `official-source-monitoring.md`
- `coverage-matrix.md`
- `monday-triage-dashboard.md`
- `feature-progress-page.md`
- `gtm.md`
- `cloudflare-deployment.md`

## Development Rule

Implementation agents must read the relevant spec before modifying code. If the spec does not answer a product or technical decision, update the spec first, then implement.

## Product Invariant

```txt
Only Verified tax rules can create official system-generated deadline tasks.
User-provided deadlines can be shown as user tasks, but must be marked as not verified by DueDateHQ.
```

## Competitor Parity Baseline

Feature specs must preserve DueDateHQ's trust model while reaching parity or better with the useful File In Time core workflows:

- Client setup with tax-relevant profile fields, notes, entity type, jurisdiction context, and import/manual entry paths.
- CSV import preview, header handling, field mapping, row review, duplicate handling, and commit summary.
- Obligation/service setup that can generate tasks while distinguishing known obligations, Verified rules, Needs review, Source changed, Unsupported, and user-provided deadlines.
- Task generation from Verified rules only for official system deadlines.
- Monday triage with due today/this week/this month urgency, filters/sorting, task status, extension status, and evidence/trust badges.
- Recurrence/upcoming tasks from maintained Verified rules, with no manual rollover for official recurring deadlines.
- Basic dashboard/task exports for workload sharing and review.
- Admin/settings boundaries that avoid desktop database administration and option sprawl.

DueDateHQ should be better than File In Time through source evidence, verification status, source monitoring, rule versioning, cloud workflow, source-specific CSV adapters, and transparent coverage gaps.

Keep these desktop-era features out of Beta; revisit them only later if explicitly reprioritized: local DB admin, backup/restore UI, Crystal Reports-style reports, mail merge/labels, extension form printing, arbitrary field renaming, network-user maintenance, detailed rights matrices, and email/SMS/calendar reminders.
