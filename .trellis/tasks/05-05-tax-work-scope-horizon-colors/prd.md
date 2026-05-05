# Polish Tax Work scope summary and horizon colors

## Goal

Clarify the Tax Work page by removing the ambiguous standalone `Current scope` block and making the four horizon tabs use the same semantic color vocabulary as the Dashboard horizon selector.

## Requirements

- Remove `Current scope` as an independent right-side panel.
- Preserve the same client relationship, filing profile scope, filter controls, horizon tabs, and task table workflow.
- Move the current-filter summary into `Work scope filters` as concise copy.
- Include the active horizon in that summary so selecting `This month` or any other horizon does not conflict with the copy.
- Keep reset behavior available only when filters are active.
- Removing the current scope panel must not leave an orphan right-side column or obvious empty layout gap in the client relationship section.
- The wide task table must not force the upper Tax Work panels to extend off-screen; horizontal overflow belongs inside the table area only.
- Change only the theme color treatment of the four horizon tabs:
  - `Overdue`: risk red.
  - `Due this week`: review amber.
  - `This month`: accent blue.
  - `Later`: gap slate-blue.
- Do not change horizon tab size, labels, counts, or order.

## Acceptance Criteria

- Tax Work no longer shows a separate `Current scope` panel.
- `Work scope filters` clearly states the current filtered queue summary.
- Selecting `This month` updates the summary and table without stretching the filter panel or client relationship panel off-screen.
- The client relationship section spans the available workbench width after the scope panel is removed.
- Active horizon tabs use the same semantic color families as Dashboard.
- Inactive horizon tabs keep their current dimensions and spacing while gaining matching hover color cues.
- Type-check passes for the web app.
- Route is manually checked in the browser after the change.

## Out of Scope

- No task table column changes.
- No filter option changes.
- No API changes.
- No resizing or layout changes for the four horizon tabs.
