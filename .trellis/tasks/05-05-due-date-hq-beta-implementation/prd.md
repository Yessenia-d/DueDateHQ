# DueDateHQ Beta Implementation

## Type

Parent implementation epic.

## Goal

Coordinate the DueDateHQ Beta build from the completed product/spec planning docs into independently executable Trellis implementation tasks.

The Beta product serves solo/independent CPAs managing mixed individual and small-business client books. It must preserve DueDateHQ's trust model:

```txt
Only Verified Tax Rules can create official system-generated Deadline Tasks.
User-provided deadlines can appear in a firm's workspace, but must be marked as not verified by DueDateHQ.
Official Notice Monitor proposals cannot mutate CPA workspace data until the CPA confirms the specific diff.
```

## Source Specs

- `docs/due-date-hq-beta-plan.md`
- `docs/product/due-date-hq-product-plan.md`
- `docs/technical/due-date-hq-beta-technical-plan.md`
- `specs/README.md`
- Feature specs under `specs/*.md`

## Child Tasks

Recommended execution order:

1. `05-05-align-domain-glossary`
2. `05-05-auth-firm-workspace`
3. `05-05-core-deadline-domain-schema`
4. `05-05-tax-obligation-coverage-matrix`
5. `05-05-manual-client-profile-deadline-entry`
6. `05-05-csv-import-profile-review`
7. `05-05-dashboard`
8. `05-05-official-notice-monitor-agent`
9. `05-05-notice-proposal-review-audit`
10. `05-05-feature-progress-page`
11. `05-05-cloudflare-beta-deployment`

Parallelization guidance:

- `align-domain-glossary`, `auth-firm-workspace`, and `core-deadline-domain-schema` are the foundation path.
- After the core schema is stable, `tax-obligation-coverage-matrix`, `manual-client-profile-deadline-entry`, and `csv-import-profile-review` can proceed in parallel if write scopes remain disjoint.
- `dashboard` can start after core task/query contracts are stable.
- `official-notice-monitor-agent` can start after tax rule/source contracts are stable; it must not mutate workspace data.
- `notice-proposal-review-audit` starts after monitor proposals and dashboard/evidence UI contracts exist.
- `feature-progress-page` is mostly independent.
- `cloudflare-beta-deployment` can begin early for environment wiring but final smoke testing depends on implemented feature paths.

## Owned Files

This parent task owns coordination only:

- `.trellis/tasks/05-05-due-date-hq-beta-implementation/task.json`
- `.trellis/tasks/05-05-due-date-hq-beta-implementation/prd.md`
- `.trellis/tasks/05-05-due-date-hq-beta-implementation/implement.jsonl`
- `.trellis/tasks/05-05-due-date-hq-beta-implementation/check.jsonl`

Implementation files are owned by the child tasks.

## API Ownership

None directly. API ownership is defined by child task PRDs.

## Schema Ownership

None directly. Schema ownership is defined by child task PRDs.

## Acceptance Criteria

- Every Beta implementation slice has a child Trellis task with PRD, owned files, API ownership, schema ownership, dependencies, and acceptance criteria.
- Child tasks are attached to this implementation parent, not to the docs/specs task.
- The docs/specs parent can be finished and archived without implying implementation is complete.
- Future implementation work can start from an individual child task without re-reading unrelated feature specs.

## Out of Scope

- Implementing product code directly in the parent task.
- Rewriting the completed docs/specs task into an implementation epic.
