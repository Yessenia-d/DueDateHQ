# Update User Journey HTML from Latest Product Design

## Goal

Refresh `docs/due-date-hq-user-journey.html` so it matches the latest
DueDateHQ product design and planning documents.

## What I Already Know

- The user asked to update the user journey HTML from the latest product design
  docs.
- The target artifact is `docs/due-date-hq-user-journey.html`.
- Source material likely includes `docs/product/*`, `docs/technical/*`,
  `docs/due-date-hq-beta-plan*.md`, `specs/*`, and current working design docs
  such as `design.md` / `PRODUCT.md` if they contain newer product decisions.

## Requirements

- Reflect the latest product positioning, ICP, core workflows, trust model, and
  Beta scope.
- Show the CPA-facing journey from onboarding through weekly triage, import,
  manual entry, coverage gaps, official notice review, and progress/deployment
  confidence.
- Preserve a polished standalone HTML presentation suitable for product review.
- Do not modify application code.

## Acceptance Criteria

- [x] The HTML reflects the latest product/design docs.
- [x] The journey includes onboarding, CSV/manual setup, rule trust/coverage,
      dashboard triage, notice proposal review, and feature progress visibility.
- [x] The document can be opened as standalone HTML.
- [x] `pnpm check-types` passes.

## Out of Scope

- TypeScript, API, DB, deployment, or runtime app changes.
- Rewriting product specs themselves.
