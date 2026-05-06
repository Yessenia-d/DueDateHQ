# Refine Deadline Dashboard Calendar Summary Layout

## Goal

Make the Deadline dashboard top workload area more compact and more useful for a CPA planning near-term capacity. The workload calendar should stop dominating the row; the right side should summarize how many tasks remain inside practical time windows, with completion progress for each window.

## Requirements

- Keep the existing horizon rail: `Overdue`, `Due this week`, `This month`, `Later`.
- Reduce the workload calendar width and keep it as a density/date-focus control.
- Add a right-side horizon summary beside the calendar.
- For `Due this week`, show 1 day, 3 days, and 1 week windows.
- For `This month`, show 10 days, 20 days, and 1 month windows.
- For `Later`, show 1 month, 2 months, and 3 months windows.
- Each summary row shows remaining open task count and a completion progress bar.
- Keep the table, filter bar, exception filters, and CSV behavior unchanged.
- Do not change the dashboard API contract.

## Acceptance Criteria

- [ ] Desktop dashboard top row has horizon rail, compact calendar, and right-side summary.
- [ ] Summary counts derive from the currently selected horizon task set.
- [ ] Progress bars use `done / total` within each window.
- [ ] Calendar day cells remain readable at the reduced width.
- [ ] Mobile/tablet layouts stack without horizontal overflow.

## Out of Scope

- New backend fields or API changes.
- Browser automation verification in this pass.
- Changes to Tax Work.

## Technical Notes

- Main implementation file: `apps/web/src/components/dashboard/dashboard-page.tsx`.
- Design direction: light-first Verified Operations Console, compact and status-forward.
