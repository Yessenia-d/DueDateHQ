# Add AI assist messaging to homepage

## Goal

Update the public DueDateHQ website so prospects can see the main product workflows in a full-screen scrolling homepage, including restrained AI/source-change review cues, while keeping CPA approval, source evidence, and review safety clear.

Clarified requirement: ground the AI assist messaging in the product's actual current functionality. Do not exaggerate or make the homepage sound like a broader AI product than the login page.

Expanded scope from user clarification:

- Use a single full-screen scrolling homepage instead of separate feature pages.
- Present three or four full-screen workflow sections.
- Use minimal, easy-to-understand copy.
- Keep the language close to the login page.
- Order the public website around a CPA's daily workflow.
- Avoid a feature-switching navigation bar.
- Avoid repeated card grids.

## What I already know

- The user asked for the homepage to reflect `ai assist`.
- The current public homepage lives in `apps/web/src/routes/index.tsx`.
- The page uses the DueDateHQ restrained operational design system.
- Project conventions forbid implying AI can guarantee deadlines or mutate workspace data without CPA approval.
- The login page positions DueDateHQ as a CPA deadline risk control surface with verified IRS/state deadline evidence, one queue for client filings, and AI flags for source-change review.

## Assumptions

- AI assist should be positioned as source-change and notice-proposal review cues.
- The page should stay concise and not become an AI chat/productivity landing page.
- Homepage copy should stay close to login-page product language.

## Requirements

- Add explicit but restrained AI/source-change cue messaging to the public homepage.
- Replace separate public feature pages with direct full-screen scrolling sections.
- Keep the top chrome limited to brand, Log in, and Register.
- Follow the workday sequence: daily deadline queue, coverage/import review, then source changes and notice proposals.
- Keep the copy audit-friendly and precise.
- Preserve existing login and register links.
- Show that AI flags issues for CPA review instead of automatically changing official due dates.
- Prefer subtle, specific phrases such as `review cue`, `source-change cue`, `candidate review`, `proposal review`, and `CPA approval`.
- Do not imply AI guarantees deadlines, automatically applies changes, fully reviews all obligations, or mutates workspace data.
- Preserve protected `/dashboard` app behavior.

## Acceptance Criteria

- [ ] Public website uses one `/` homepage with 3-4 full-screen scrolling sections.
- [ ] Homepage follows CPA daily workflow order.
- [ ] Top public chrome does not switch between feature pages.
- [ ] Homepage avoids repeated card grids.
- [ ] Homepage includes visible review cues, source-change cues, or proposal cues.
- [ ] Copy stays aligned with `apps/web/src/routes/login.tsx` language.
- [ ] Homepage copy is short, concrete, and grounded in current project functionality.
- [ ] `/dashboard` remains protected app behavior after login.
- [ ] `pnpm -F web check-types` passes.

## Out of Scope

- No backend AI features.
- No auth flow changes.
- No new dependencies.
- No broad marketing site beyond the single scrolling homepage.

## Technical Notes

- Relevant specs:
  - `.trellis/spec/guides/due-date-hq-project-conventions.md`
  - `.trellis/spec/web/frontend/index.md`
  - `.trellis/spec/ui/frontend/index.md`
- Keep visual styling aligned with `DESIGN.md`.
