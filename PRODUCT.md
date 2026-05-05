# DueDateHQ Product Context

## Register

product

## Product

DueDateHQ is a tax deadline operating system for solo and independent CPAs managing mixed individual and small-business client books.

It helps CPAs import client/profile data, generate verified Deadline Tasks from trusted Tax Rules, triage weekly work, review coverage gaps, and decide whether official notice impacts should update their workspace.

Product promise:

```txt
Know what is due, why it is due, and whether the source is verified.
```

## Audience

Primary users are solo or independent CPAs serving roughly 30 to 100 clients across multiple states. Their client book can include individual 1040 clients, households, LLCs, S corps, partnerships, C corps, and other small-business filing profiles.

They use the product under time pressure during filing season. A typical Monday session is about quickly answering:

- What needs action this week?
- Which deadlines are official and verified?
- Which clients are waiting on me, waiting on the client, or already done?
- Which imported profiles need review before tasks can be generated?
- Which official notice proposals might affect my clients, and what exactly would change?

## Core Domain Language

Use this model consistently:

```txt
Firm
  -> Client Relationship
    -> Filing Profile / Tax Profile
      -> Deadline Task
```

Important concepts:

- `Verified Tax Rule`: a reviewed rule with official source evidence. Only this can create official system-generated Deadline Tasks.
- `User-Provided Deadline`: a CPA-entered deadline. It can appear in the workspace but must be marked as not verified by DueDateHQ.
- `Coverage Gap`: a known area where DueDateHQ does not yet have verified support.
- `Firm Target Date`: a planning date set by the CPA. It must never replace or obscure the official due date.
- `Official Notice`: a monitored government notice that may affect tax deadlines.
- `Notice Impact Proposal`: a before/after diff suggested by the system. It cannot mutate CPA workspace data until the CPA approves it.

## Trust Rules

- Only Verified Tax Rules can create official DueDateHQ Deadline Tasks.
- Needs review, Source changed, Unsupported, Coverage gap, and User-provided states must remain visible.
- Unverified data must never look official.
- Official source evidence must stay close to every official deadline.
- Monitor agents can detect and summarize notices, but CPAs control whether proposed workspace changes are applied.
- AI analyzes official notices by default. Customer PII should not be sent to AI models unless a future explicit privacy decision changes that.

## Product Personality

Voice:

- calm
- precise
- accountable

DueDateHQ should sound like a trusted operations system, not a marketing assistant. Copy should be short, concrete, and audit-friendly.

Good copy:

- "6 profiles need review before deadlines can be generated."
- "Source changed. Review before applying this update."
- "User provided. Not verified by DueDateHQ."
- "Apply selected updates"
- "Reject selected updates"

Avoid:

- hype
- vague confidence language
- playful tax jokes
- legal guarantees
- phrases that imply complete 50-state verified coverage

## Visual References

Use these as directional references, not as templates to copy:

- Stripe Dashboard for trustworthy operational polish.
- Linear issue tables for dense, fast scanning.
- Raycast and Notion for restrained command surfaces.
- Bloomberg-style information density, made lighter and more approachable.
- Official government source/evidence presentation, modernized for a web app.

## Anti-References

Do not make DueDateHQ look like:

- purple SaaS gradient dashboards
- glassmorphism
- playful consumer finance apps
- legacy beige or brown tax software
- marketing-card-heavy landing pages
- dark-blue enterprise dashboards by default
- overly editorial magazine layouts
- decorative hero pages inside the product app

## Design Priority

Prioritize:

- fast scanning
- low cognitive load
- dense but readable tables
- explicit status badges
- trustworthy source evidence
- clear before/after diffs
- obvious primary actions
- visible uncertainty
- keyboard and screen-reader accessible controls

De-prioritize:

- decorative motion
- large hero sections
- oversized cards
- marketing illustrations
- complex personalization
- generic "AI assistant" UI

## Primary Surfaces

- Login and registration.
- CSV import preview/review.
- Client relationship and filing profile setup.
- Monday triage dashboard.
- Evidence drawer.
- Coverage matrix.
- Official notice inbox and notice detail.
- Notice impact proposal diff review.
- Feature progress page.

## Success Criteria

A CPA should be able to open the product during filing season and trust the screen within seconds. The interface should make clear:

- what is due
- why it exists
- what changed
- what is verified
- what needs review
- what action the CPA can safely take next
