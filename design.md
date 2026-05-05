# DueDateHQ Design System

## Creative North Star

Verified Operations Console.

DueDateHQ should feel like a precise, calm control surface for tax deadline risk. It is not a marketing site and not a legacy tax desktop app. The design should help a CPA scan dense information quickly, trust the evidence behind each deadline, and make reversible, auditable decisions.

Physical scene:

```txt
A solo CPA opens DueDateHQ on a 27-inch monitor at 7:40am during filing season, coffee nearby, with client calls starting in 20 minutes. The room is bright, the task is urgent, and the interface must reduce risk without demanding interpretation.
```

This points to a light-first product interface with restrained color, high information density, and very clear status language.

## Register

product

Design serves the work. Product surfaces should be familiar, scannable, and trustworthy. Distinctiveness comes from evidence, diff review, and calm precision, not decoration.

## Color Strategy

Restrained product palette.

Use OKLCH tokens. Neutrals are lightly warmed and tinted, never pure black or pure white. Accent colors carry state meaning only.

### Core Tokens

```css
:root {
  --ddhq-bg: oklch(0.985 0.006 92);
  --ddhq-surface: oklch(0.998 0.004 92);
  --ddhq-surface-muted: oklch(0.962 0.008 92);
  --ddhq-border-subtle: oklch(0.88 0.012 92);
  --ddhq-border-strong: oklch(0.76 0.018 92);

  --ddhq-ink: oklch(0.22 0.018 78);
  --ddhq-ink-muted: oklch(0.46 0.016 78);
  --ddhq-ink-soft: oklch(0.62 0.014 78);

  --ddhq-accent: oklch(0.56 0.105 205);
  --ddhq-accent-soft: oklch(0.92 0.04 205);

  --ddhq-verified: oklch(0.55 0.115 150);
  --ddhq-verified-soft: oklch(0.93 0.045 150);
  --ddhq-review: oklch(0.66 0.13 78);
  --ddhq-review-soft: oklch(0.94 0.055 78);
  --ddhq-risk: oklch(0.57 0.16 28);
  --ddhq-risk-soft: oklch(0.94 0.055 28);
  --ddhq-gap: oklch(0.53 0.045 240);
  --ddhq-gap-soft: oklch(0.93 0.025 240);
}
```

### Role Meanings

- Background: warm near-white, calm and paper-like.
- Surface: almost white, used for panels and table backgrounds.
- Accent blue: navigation focus, selected controls, links, and active filters.
- Verified green: only for verified source or successful accepted action.
- Review amber: needs review, source changed, waiting on client, medium confidence.
- Risk red: overdue, destructive actions, failed source checks.
- Gap slate-blue: coverage gaps and unsupported states.

Do not use color as decoration. A colored element must answer "what state is this?" or "what action is selected?"

## Typography

Use a neutral sans for product text and a mono font for evidence metadata.

Recommended stack:

```css
--font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

If Inter or Geist are not installed, use system fallbacks. Do not block product work on font procurement.

### Type Scale

| Role | Size | Weight | Line height | Use |
|---|---:|---:|---:|---|
| Page title | 24px | 650 | 1.2 | Dashboard or page-level title |
| Section title | 16px | 650 | 1.3 | Table groups and panels |
| Table header | 12px | 600 | 1.2 | Column labels |
| Body | 14px | 400 | 1.45 | Primary UI text |
| Body strong | 14px | 600 | 1.45 | Client names and task titles |
| Small | 12px | 400 | 1.35 | Secondary metadata |
| Badge | 11px | 600 | 1.1 | Status badges |
| Mono metadata | 12px | 500 | 1.35 | source URLs, versions, IDs, timestamps |

Rules:

- Letter spacing is 0 by default.
- Use positive tracking only for very small mono labels.
- No negative letter spacing in app UI.
- Keep line length under 75 characters for explanatory text.
- Avoid hero-scale type inside the application.

## Layout

DueDateHQ is an operational tool. Layout should emphasize repeated scanning.

### App Shell

- Left navigation or compact top navigation, depending on implementation scope.
- Main content max width can be wide, up to 1440px for tables.
- Use full-width bands and split panels, not nested cards.
- Keep page chrome quiet so status and task data stand out.

### Dashboard

Preferred structure:

```txt
Top alert/banner area
Filter and search row
Due this week
This month
Long range
Right-side evidence or notice drawer
```

Tables should be dense but not cramped:

- Row height: 44 to 56px.
- Sticky or persistent filter controls where useful.
- Right-align dates and numeric countdowns when it improves comparison.
- Keep status/actions visually stable so rows do not jump.

### Import Review

Use a review queue layout:

```txt
Import summary
Ready profiles
Needs review grouped by problem
Coverage gaps
Relationship suggestions
Commit action
```

Do not force CPAs to inspect every generated task during import. Group review by filing profile and problem type.

### Notice Review

Use two layers:

```txt
Notice detail first
Affected item diffs second
```

Every proposed workspace change must show before/after values. Bulk actions must still preserve row-level audit logs.

## Components

### Status Badges

Badges are compact, semantic, and text-first.

Recommended badge shapes:

- Border radius: 6px.
- Padding: 2px 6px.
- Font: 11px, 600.
- Optional icon only when it reduces ambiguity.

Badge meanings:

- Verified: green soft background, green text.
- Needs review: amber soft background, amber text.
- Source changed: amber soft background, amber text, stronger border.
- Unsupported: gap slate soft background, slate text.
- Coverage gap: gap slate soft background, slate text.
- Entered deadline: neutral soft background, muted text.
- Waiting on client: amber soft background, amber text.
- Done: green soft background, green text.

### Buttons

Use clear command labels.

Primary:

- Filled accent background.
- White or near-white text with accessible contrast.
- Use for one dominant action per area, such as `Commit import` or `Apply selected`.

Secondary:

- Surface background, subtle border.
- Use for regular actions.

Destructive or rejecting action:

- Use restrained red border/text or red-soft background.
- Labels should be explicit, such as `Reject selected`.

Icon-only buttons require accessible names and visible focus states.

### Tables

- Use subtle horizontal dividers.
- Avoid heavy grid borders.
- Client relationship and filing profile should be easy to distinguish.
- Official due date and firm target date must be separate columns or stacked labels.
- Never hide verification state behind hover-only UI.

### Drawers

Use drawers for evidence and notice details when preserving list context matters.

Evidence drawer sections:

- Task summary.
- Current official due date.
- Original due date.
- Firm target date.
- Source evidence.
- Verification status.
- Date event history.
- Audit log.

### Diff Panels

Diffs are central to notice proposals.

Structure:

```txt
Current
Official due date: Apr 15
Status: Not started

Proposed
Official due date: Oct 15
Reason: IRS disaster relief notice
Source: irs.gov/...
```

Use side-by-side layout on desktop and stacked layout on mobile.

## Motion

Motion is restrained and functional.

Allowed:

- 120 to 180ms hover/focus transitions.
- 180 to 240ms drawer entrance.
- Subtle row highlight after status update.
- Progress indication during import preview and source checks.

Avoid:

- decorative page transitions
- bouncing
- elastic easing
- animated gradients
- parallax
- confetti

Use ease-out-quart or similar exponential easing.

## Copy Rules

- Be specific.
- Name the object being changed.
- Say when data is not verified.
- Keep action labels imperative and concrete.
- Avoid legal guarantees.
- Avoid em dashes.

Good:

- "7 filing profiles need review"
- "Apply selected updates"
- "Reject selected updates"
- "Decide later"
- "Entered deadline, not verified by DueDateHQ"
- "Source changed, review before applying"

Avoid:

- "Everything is covered"
- "AI found the answer"
- "Fully compliant"
- "Guaranteed deadline"
- "Smart automation handled this"

## Responsive Behavior

Desktop is the primary work surface. Mobile must remain usable for review, not become a separate simplified product.

Breakpoints:

- Mobile: below 768px.
- Tablet: 768px to 1024px.
- Desktop: above 1024px.

Rules:

- Tables can become stacked rows on mobile.
- Filters collapse into a sheet or compact group.
- Evidence and notice drawers become full-screen panels on mobile.
- Diff panels stack vertically on mobile.
- Touch targets should be at least 40px tall.

## Accessibility

- All status colors need text labels.
- Controls need visible focus states.
- Bulk actions require clear selection counts.
- Diff views must not rely on color alone.
- Icon-only controls need accessible labels.
- Error messages should explain how to recover.

## Forbidden Patterns

- Purple or blue-purple SaaS gradients.
- Glassmorphism.
- Decorative orbs, blobs, or bokeh.
- Nested cards.
- Side-stripe borders as status decoration.
- Gradient text.
- Hero sections as the first screen of the app.
- Generic AI chat panels as the main workflow.
- Hiding official source evidence behind unclear icons.
- Treating firm target date as the official due date.
- Showing unverified data with verified styling.

## Implementation Notes

- Prefer shared UI primitives from `packages/ui`.
- Keep product UI dense, stable, and keyboard-friendly.
- Favor tables, segmented controls, filter bars, badges, drawers, and diff panels.
- Use lucide icons where icons clarify repeated controls.
- Add visual states for loading, empty, error, review required, source changed, and no coverage.
- Verify user-facing pages in a browser before shipping.

## Agent Prompt Guide

When using Impeccable or another frontend agent, summarize the design direction as:

```txt
DueDateHQ uses product register. Build a light-first Verified Operations Console for solo CPAs. The UI should be dense, calm, and audit-friendly, with explicit trust badges, clear official-source evidence, and before/after diff review. Use restrained OKLCH neutrals, semantic status colors only, neutral sans typography, mono metadata, compact tables, drawers, and stable bulk actions. Avoid SaaS gradients, glassmorphism, marketing cards, and playful consumer-finance styling.
```
