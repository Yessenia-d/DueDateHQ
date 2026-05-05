# Implement Notice Proposal Review and Audit Workflow

## Type

AFK vertical slice.

## Goal

Implement CPA-facing in-app notice alerts and affected-item review so CPAs can approve, reject, or decide later on proposed task/profile changes individually or in bulk, with clear before/after diffs and audit logs.

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

- Dashboard/in-app notice banner links to notice detail.
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
