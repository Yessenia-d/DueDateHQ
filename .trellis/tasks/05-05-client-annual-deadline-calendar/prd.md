# Add client annual deadline calendar

## Goal

Add an internal client annual deadline calendar view to DueDateHQ. The calendar shows one client relationship's official and entered deadline tasks for a selected calendar year, grouped by month, without adding external calendar sync.

## Requirements

- Add a backend query for a client/year deadline calendar.
- Read existing `deadline_tasks`; do not add a new task generation schema or recalculate tax rules for this view.
- Filter by firm, client relationship, and `currentDueDate` between `YYYY-01-01` and `YYYY-12-31`.
- Return client, profiles, selected year, available years, monthly buckets, and serialized deadline task items.
- Each calendar item must include profile display name, month, day, `isOverdue`, and `isOfficial`.
- Keep DueDateHQ trust boundaries explicit:
  - `verified_rule` means official system-generated deadline task.
  - `entered_deadline` means entered deadline, not verified by DueDateHQ.
  - Needs-review, source-changed, unsupported, and coverage-gap items must not be represented as official calendar deadlines.
- Add a compact annual calendar/list hybrid to the client detail page.
- Default year is the current calendar year. The selector offers current year, next year, and any years represented by the client's existing deadline tasks.
- Month sections show deadline count, date, title, filing profile, jurisdiction, tax category, status, trust label, and optional firm target date separated from official due date.
- Each deadline links back to Tax Work scoped to the current client.
- Empty state should guide the user to import tax info or open Tax Work.
- Do not imply Google/Apple/Outlook calendar sync.

## Acceptance Criteria

- API returns only the selected firm's selected client deadlines for the selected year.
- API excludes other clients, other firms, and other years.
- API returns 12 month buckets in calendar order.
- Items sort by current due date, then profile display name, then title.
- Entered deadlines keep their not-verified trust label and reference note fields.
- Verified-rule deadlines keep official serialized fields.
- Client detail page has loading, error, empty, and populated states for the annual calendar.
- Year switching refreshes the calendar.
- Long task titles, multiple filing profiles, and multi-state deadlines remain readable on mobile and desktop widths.

## Out of Scope

- External calendar sync.
- `.ics` export.
- New deadline generation rules.
- Bulk official due-date edits.
- Documentation/spec edits unless implementation reveals a conflict.

## Technical Notes

- Existing generation path: `packages/api/src/lib/profile-rule-matcher.ts`.
- Existing client API and serializers: `packages/api/src/routers/clients.ts`.
- Existing client detail route: `apps/web/src/routes/clients/$clientId.tsx`.
- Due dates are calendar-day strings; frontend date formatting must use `timeZone: "UTC"`.
