# DueDateHQ Project Rules

## AGENTS.md Sync

`CLAUDE.md` project rules and `AGENTS.md` "DueDateHQ Project Rules" section must stay in sync. When project rules are added or modified in either file, update the other.

`AGENTS.md` also contains Trellis instructions and Agent skills sections that are not duplicated here.

## Bilingual Documentation Sync

This project maintains bilingual documentation. Every `.md` file under `docs/` and `specs/` has a corresponding `.zh.md` Chinese translation.

**Rule: When any English documentation file is modified, its corresponding `.zh.md` file must be updated in the same change set.**

- `docs/due-date-hq-beta-plan.md` ↔ `docs/due-date-hq-beta-plan.zh.md`
- `docs/product/due-date-hq-product-plan.md` ↔ `docs/product/due-date-hq-product-plan.zh.md`
- `docs/technical/due-date-hq-beta-technical-plan.md` ↔ `docs/technical/due-date-hq-beta-technical-plan.zh.md`
- `specs/*.md` ↔ `specs/*.zh.md`

When updating Chinese translations, preserve the bilingual style used in this project: domain terms (e.g., `Verified`, `Coverage gap`, `filing/tax profile`) stay in English; explanatory text is in Chinese.

## Design System

Before building or modifying frontend UI, read `DESIGN.md` for color tokens, typography, layout, component patterns, and forbidden patterns.
