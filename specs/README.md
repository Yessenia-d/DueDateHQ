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
