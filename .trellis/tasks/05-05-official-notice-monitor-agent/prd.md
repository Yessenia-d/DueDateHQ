# Implement Official Notice Monitor Agent

## Type

AFK vertical slice.

## Goal

Implement the P0 Official Notice Monitor that checks the supported official source allowlist, detects deadline-relevant notices, uses platform-managed AI to extract impact conditions, and records notice candidates without sending customer PII to the model or mutating CPA workspace data.

## Blocked By

- `05-05-auth-firm-workspace`
- `05-05-tax-obligation-coverage-matrix`

## Owned Files

- `packages/db/src/schema/monitoring.ts`
- `packages/db/src/schema/index.ts` for exports only
- `packages/env/src/server.ts` for platform AI/env keys
- `packages/api/src/routers/officialSources.ts`
- `packages/api/src/monitoring/*`
- `packages/api/src/ai/*`
- `packages/api/src/routers/index.ts` for router registration only
- Monitoring tests and source fixtures

Coordinate Cloudflare cron/queue binding changes with `05-05-cloudflare-beta-deployment`.

## API Ownership

- `officialSources.list`
- `officialSources.getCheckRuns`
- `officialSources.enqueueCheck`
- `officialSources.recordCheckResult`
- `officialNotices.listInternal` if needed for monitor/admin review

## Schema Ownership

- `official_sources`
- `source_snapshots`
- `source_check_runs`
- `official_notices`

This task does not own `notice_impact_proposals`; that belongs to the CPA proposal review workflow.

## P0 Source Scope

- IRS: federal individual and small-business filing/payment/extension/estimated tax deadlines, plus IRS disaster/tax relief deadline changes.
- California FTB: personal income, business/franchise, disaster/tax relief.
- New York Tax Department: personal income, business/corporate, disaster/tax relief.
- Texas Comptroller: franchise, sales/use, disaster/tax relief.
- Florida Department of Revenue: corporate income, sales/use, reemployment, disaster/tax relief.

## AI and Privacy Constraints

- DueDateHQ platform configures the AI provider/API key.
- CPA users do not bring their own API key.
- AI analyzes official notice content and official source metadata only.
- Customer PII is not sent to the model by default.
- Workspace matching happens locally.
- The monitor can create notices and extracted impact conditions; it must not mutate deadline tasks or coverage state.

## Acceptance Criteria

- Supported official sources are explicit and visible through API.
- Monitor records source check runs and detects changed/new notice content.
- AI extraction returns structured impact conditions with explainable `high | medium | low` confidence.
- High/medium confidence notices that can match workspaces are available for in-app alerts; low confidence stays internal.
- Confidence reasons are explainable; no fake percentage scores.
- No CPA workspace data changes occur in this task.

## Out of Scope

- CPA-facing approve/reject UI.
- Automatic Verified rule publication.
- Monitoring all IRS pages or all 50 states.
- Direct customer notification.
