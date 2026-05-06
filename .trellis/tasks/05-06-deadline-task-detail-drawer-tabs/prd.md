# Deadline Task Detail Drawer Tabs

## Summary

Rename the row action for deadline task supporting information from `Evidence` to `Detail`, then reorganize the existing drawer into tabs so frequently changing information is easier to reach than static source evidence.

The drawer remains the right-side contextual panel opened from dashboard and tax-work task rows. It continues to use the existing `tasks.getEvidence` response and does not require backend API or database changes.

## Goals

- Replace the row action label `Evidence` with `Detail`, keeping the existing eye icon.
- Rename the drawer presentation from `Deadline evidence` to `Deadline detail`.
- Keep the task summary visible at the top of the drawer: task title, client/profile, current official due date, original due date, firm target date, and work status.
- Add tabs in this order:
  - `Activity`: mutable task update history from `updateRecords`, excluding update records already represented by due date events.
  - `Due date history`: date event timeline from `dateEvents`.
  - `Evidence`: source/reference information currently shown in the drawer.
- Default the drawer to the `Activity` tab.

## User Experience

- CPAs opening a row detail should first see operational activity because status and field changes are more frequently consulted during daily triage.
- Official date changes should remain visually separate from general activity to protect the distinction between official due date, original due date, and firm target date.
- Evidence remains available but is no longer the first thing users see because official source evidence is comparatively static.

## Requirements

- Use the existing design system style: dense, calm, audit-friendly, light-first product UI.
- If no shared tabs component exists, implement a local accessible tab control inside the drawer using button semantics and ARIA tab roles.
- Preserve existing loading and error states.
- Provide empty states for:
  - no activity records,
  - no due date changes,
  - entered deadline with no official source evidence.
- Do not alter the `tasks.getEvidence` API contract.
- Do not modify project documentation for this UI-only task.

## Acceptance Criteria

- Shared `TaskTable` rows show `Detail` instead of `Evidence`.
- Clicking `Detail` opens the same drawer and loads the selected task data.
- Drawer title reads `Deadline detail`.
- `Activity`, `Due date history`, and `Evidence` tabs are keyboard accessible and visually stable.
- `Activity` does not duplicate date-event-backed due date changes.
- `Evidence` still shows verification status, source link, rule summary, last verified/checked/changed, and rule version for verified-rule tasks.
- Entered deadlines clearly remain marked as not verified by DueDateHQ.
