# Align DueDateHQ Domain Glossary

## Type

AFK docs/setup task.

## Goal

Update the repo-level domain vocabulary so future implementation agents use the current DueDateHQ product model: mixed individual and small-business CPA books, client relationships, filing/tax profiles, CPA-controlled notice proposals, and transparent verified coverage.

## Blocked By

None - can start immediately.

## Owned Files

- `CONTEXT.md`
- `docs/agents/domain.md` if the domain-doc routing needs clarification

Do not modify application code.

## API Ownership

None.

## Schema Ownership

None.

## Required Updates

- Replace small-business-only ICP language with solo/independent CPAs managing mixed individual and small-business clients.
- Add or update glossary terms for:
  - Client Relationship
  - Filing Profile / Tax Profile
  - Firm Target Date
  - Deadline Date Event
  - Official Notice
  - Notice Impact Proposal
  - Coverage Gap
  - Waiting on client
- Clarify that `Extended` is date/extension handling, not the only work-progress concept.
- Preserve the invariant that only Verified Tax Rules create official system-generated Deadline Tasks.
- Clarify that Official Notice Monitor analysis must not mutate CPA workspace data without CPA confirmation.

## Acceptance Criteria

- `CONTEXT.md` matches the latest specs vocabulary.
- Future issue/task titles can use `Client Relationship`, `Filing Profile`, `Deadline Task`, `Official Notice`, and `Notice Impact Proposal` without ambiguity.
- No product overclaim remains in the glossary around complete 50-state verified coverage.
- No implementation code changes are included.

## Out of Scope

- Implementing schema, API, or UI.
- Rewriting product specs beyond terminology alignment.
