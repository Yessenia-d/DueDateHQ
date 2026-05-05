<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

## Subagents

- ALWAYS wait for all subagents to complete before yielding.
- Spawn subagents automatically when:
  - Parallelizable work (e.g., install + verify, npm test + typecheck, multiple tasks from plan)
  - Long-running or blocking tasks where a worker can run independently.
  - Isolation for risky changes or checks

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## Agent skills

This repo uses project-scoped skills from `mattpocock/skills`.

Before using engineering skills such as `diagnose`, `tdd`, `to-prd`, `to-issues`, `triage`, `grill-with-docs`, `improve-codebase-architecture`, or `zoom-out`, read the repo-specific configuration in:

- `docs/agents/issue-tracker.md` — where issues and PRDs are published.
- `docs/agents/triage-labels.md` — how canonical triage roles map to tracker labels.
- `docs/agents/domain.md` — where to find domain glossary and ADRs.

Use `CONTEXT.md` vocabulary when naming domain concepts in issues, PRDs, tests, architecture notes, and debugging hypotheses. Respect ADRs in `docs/adr/` when proposing or implementing architecture changes.

## DueDateHQ Project Rules

### Bilingual Documentation Sync

This project maintains bilingual documentation. Every `.md` file under `docs/` and `specs/` has a corresponding `.zh.md` Chinese translation.

**Rule: When any English documentation file is modified, its corresponding `.zh.md` file must be updated in the same change set.**

- `docs/due-date-hq-beta-plan.md` ↔ `docs/due-date-hq-beta-plan.zh.md`
- `docs/product/due-date-hq-product-plan.md` ↔ `docs/product/due-date-hq-product-plan.zh.md`
- `docs/technical/due-date-hq-beta-technical-plan.md` ↔ `docs/technical/due-date-hq-beta-technical-plan.zh.md`
- `specs/*.md` ↔ `specs/*.zh.md`

When updating Chinese translations, preserve the bilingual style used in this project: domain terms (e.g., `Verified`, `Coverage gap`, `filing/tax profile`) stay in English; explanatory text is in Chinese.
