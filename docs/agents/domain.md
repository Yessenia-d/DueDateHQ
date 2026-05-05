# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before Exploring, Read These

- `CONTEXT.md` at the repo root for DueDateHQ domain vocabulary.
- `docs/adr/` for architecture decisions relevant to the area being touched.
- Product plan: `docs/product/due-date-hq-product-plan.md`
- Technical plan: `docs/technical/due-date-hq-beta-technical-plan.md`
- Beta plan: `docs/due-date-hq-beta-plan.md`

## Layout

DueDateHQ currently uses a single-context domain layout:

```txt
/
├── CONTEXT.md
├── docs/adr/
├── docs/product/
└── docs/technical/
```

If the repo later grows separate bounded contexts with distinct domain languages, add `CONTEXT-MAP.md` and update this file.

## Use the Glossary Vocabulary

When output names a domain concept in an issue title, PRD, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`.

If a needed concept is missing, note it for `grill-with-docs` rather than inventing a synonym.

## Flag ADR Conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it.
