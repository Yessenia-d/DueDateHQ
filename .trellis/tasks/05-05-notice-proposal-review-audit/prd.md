# Implement Notice Proposal Review and Audit Workflow

## Type

AFK vertical slice.

## Goal

Implement CPA-facing in-app notice alerts and affected-item review so CPAs can approve, reject, or decide later on proposed task/profile changes individually or in bulk, with clear before/after diffs and audit logs.

Latest user constraint: notice alerts use a banner notification that does not occupy normal page layout space. The banner floats or overlays at the top of the working page, supports an expanded state, and lets CPAs review the notice summary, confidence, affected proposal count, and direct actions without leaving the current page. Expanded detail should open in an overlay, popover, or drawer pattern so the main dashboard/table layout is not pushed down. Full detail can still be available through a secondary detail route when needed.

## Blocked By

- `05-05-core-deadline-domain-schema`
- `05-05-tax-obligation-coverage-matrix`
- `05-05-official-notice-monitor-agent`
- `05-05-dashboard` for shared task/evidence UI patterns

## Owned Files

- `packages/db/src/schema/notice-proposals.ts`
- `packages/db/src/schema/index.ts` for exports only
- `packages/api/src/routers/notices.ts`
- `packages/api/src/routers/noticeProposals.ts`
- `packages/api/src/routers/index.ts` for router registration only
- `apps/web/src/routes/notices.tsx`
- `apps/web/src/routes/notices/$noticeId.tsx`
- `apps/web/src/components/notices/*`
- Notice proposal/action tests

## API Ownership

- `notices.list`
- `notices.get`
- `noticeProposals.listForNotice`
- `noticeProposals.approve`
- `noticeProposals.reject`
- `noticeProposals.decideLater`
- `noticeProposals.bulkApprove`
- `noticeProposals.bulkReject`
- `noticeProposals.bulkDecideLater`

## Schema Ownership

- `notice_impact_proposals`
- `notice_proposal_actions` if a dedicated action table is needed

Uses:

- `official_notices`
- `deadline_tasks`
- `filing_profiles`
- `audit_logs`

## Proposal Semantics

- `pending`: CPA has not decided.
- `approved`: CPA accepted and the workspace change is applied.
- `rejected`: CPA explicitly refused the proposed change.
- `decide_later`: CPA deferred the decision; proposal remains available but de-emphasized.

## Acceptance Criteria

- App sidebar includes a `Notices` entry so CPAs can return to notice review after dismissing or navigating away from the banner.
- `/notices` is a durable notice operations page with pending/deferred notice review and an official-source monitor section.
- Monitor section shows supported source status, active/inactive state, last checked/changed timestamps, last error, and run/check status.
- CPA/admin can enable or disable monitoring for a supported source from the Notices page without deleting source history.
- CPA/admin can request a monitor check for an enabled supported source; disabled sources cannot be queued from the UI.
- Dashboard/in-app notice alert uses a banner notification that overlays the page and does not reserve vertical layout space.
- Collapsed banner shows the highest-priority pending notice/proposal signal, source/jurisdiction, confidence, affected count, and a clear expand control.
- Expanded banner opens detail in an overlay/popover/drawer pattern that shows notice detail first, then affected proposal summaries with approve/reject/decide-later entry points while preserving the current page context.
- Full notice detail may open in a secondary detail route, but the primary workflow must not force CPAs to start from a standalone notice inbox or shift the dashboard layout down.
- Notice detail appears first: official source, source URL, AI summary, jurisdiction, confidence label, confidence reasons, affected conditions.
- Affected items table appears second with before/after diff per task/profile.
- Proposal types include task date/status diff and coverage/review status diff.
- CPA can approve/reject/decide-later individually.
- CPA can bulk approve/reject/decide-later selected rows.
- Every action writes an audit record with actor, before/after state, notice/source, action, timestamp, and bulk action id when applicable.
- No proposed change mutates workspace state until CPA approves.

## Out of Scope

- Email/SMS/Slack/calendar push.
- Direct notification to CPA end clients.
- AI auto-approval.
