# Apply DESIGN.md Style System and Add Sidebar Navigation

## Type

AFK UI foundation slice.

## Goal

Apply the DESIGN.md design system globally across all pages, add sidebar navigation matching the sample HTML pattern, and improve dashboard information hierarchy with clear functional area separation.

## Blocked By

None. All pages exist; this is a style/layout pass.

## Owned Files

- `packages/ui/src/styles/globals.css`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/components/app-sidebar.tsx` (new)
- `apps/web/src/components/status-badge.tsx` (new)
- `apps/web/src/components/header.tsx` (delete)
- `apps/web/src/components/dashboard/dashboard-page.tsx`
- `apps/web/src/components/task-table/task-table.tsx`
- `apps/web/src/components/evidence/evidence-drawer.tsx`
- `apps/web/src/routes/coverage.tsx`
- `apps/web/src/routes/login.tsx`
- `apps/web/src/routes/progress.tsx`
- `apps/web/src/routes/clients/*.tsx`

## Implementation Phases

### Phase 1: Global Foundation
- Align globals.css `:root` tokens to DESIGN.md warm OKLCH palette
- Add `--ddhq-*` semantic status tokens and wire into Tailwind `@theme inline`
- Add mono font to theme
- Change ThemeProvider default from "dark" to "light"
- Install shadcn components: table, select, badge, sheet, separator, scroll-area, textarea

### Phase 2: App Shell + Sidebar Navigation
- Create AppSidebar component (236px, sticky, with nav sections and count badges)
- Restructure __root.tsx to two-column layout (sidebar + main)
- Add mobile responsive sidebar using shadcn Sheet
- Delete old Header component
- Move user info and logout to sidebar footer

### Phase 3: Shared Components
- Create centralized StatusBadge using --ddhq-* tokens (6px radius, 11px/600 font)
- Replace all scattered badge implementations

### Phase 4: Page Updates
- Dashboard: remove hex colors, add panel-based information hierarchy (metrics strip → filters → bulk actions → horizon section panels)
- Coverage: token migration + shadcn component migration
- Client pages: shadcn Select/Table/Textarea migration
- Progress: token migration
- Login: verify light theme

### Phase 5: Polish
- Responsive verification at desktop/tablet/mobile breakpoints
- Keyboard focus states
- Browser testing all pages

## Acceptance Criteria

- All pages use DESIGN.md OKLCH tokens, no hardcoded hex colors
- Sidebar navigation with working links and active state
- Mobile sidebar collapses to Sheet drawer
- Dashboard has clear visual hierarchy: metrics → filters → task section panels
- All native HTML select/table elements replaced with shadcn equivalents
- Light theme is the default
- Status badges use --ddhq-* semantic tokens consistently

## Out of Scope

- Dark mode refinement (light-first is the priority)
- New page functionality
- API changes
