import assert from "node:assert/strict";
import test from "node:test";

import { getTableConfig } from "drizzle-orm/sqlite-core/utils";

import { auditLogs } from "./schema/audit";
import { deadlineTasks, filingProfiles } from "./schema/deadline-domain";
import {
  confidenceLabels,
  noticeAlertVisibilities,
  officialNotices,
  officialSourceAllowlistLevels,
  officialSources,
  officialSourceTypes,
  sourceCheckRuns,
  sourceCheckRunStatuses,
  sourceSnapshots,
} from "./schema/monitoring";
import {
  noticeImpactProposals,
  noticeProposalActions,
  noticeProposalActionTypes,
  noticeProposalStatuses,
  noticeProposalTypes,
} from "./schema/notice-proposals";

test("monitoring schema exposes official source, snapshot, run, and notice tables", () => {
  const sourceColumns = new Set(
    getTableConfig(officialSources).columns.map((column) => column.name),
  );
  const snapshotColumns = new Set(
    getTableConfig(sourceSnapshots).columns.map((column) => column.name),
  );
  const runColumns = new Set(
    getTableConfig(sourceCheckRuns).columns.map((column) => column.name),
  );
  const noticeColumns = new Set(
    getTableConfig(officialNotices).columns.map((column) => column.name),
  );

  assert.equal(
    [
      "id",
      "jurisdiction",
      "agency_name",
      "source_type",
      "source_url",
      "allowlist_level",
      "deadline_scope",
      "monitor_frequency_hours",
      "active",
      "last_checked_at",
      "last_changed_at",
    ].every((name) => sourceColumns.has(name)),
    true,
  );
  assert.equal(["source_id", "content_hash", "snapshot_url", "captured_at"].every((name) =>
    snapshotColumns.has(name),
  ), true);
  assert.equal(
    [
      "source_id",
      "checked_at",
      "status",
      "http_status",
      "content_hash",
      "previous_content_hash",
      "changed_detected",
      "error_message",
    ].every((name) => runColumns.has(name)),
    true,
  );
  assert.equal(
    [
      "source_id",
      "notice_url",
      "notice_title",
      "notice_summary",
      "deadline_relevance",
      "confidence_label",
      "confidence_reasons",
      "impact_conditions",
      "workspace_match_hints",
      "alert_visibility",
    ].every((name) => noticeColumns.has(name)),
    true,
  );
});

test("monitoring enums preserve allowlist, status, confidence, and visibility contracts", () => {
  assert.deepEqual(officialSourceTypes, ["html", "pdf", "rss", "api", "manual"]);
  assert.deepEqual(officialSourceAllowlistLevels, ["p0", "later"]);
  assert.deepEqual(sourceCheckRunStatuses, ["success", "failed", "skipped"]);
  assert.deepEqual(confidenceLabels, ["high", "medium", "low"]);
  assert.deepEqual(noticeAlertVisibilities, ["workspace_alert", "internal_queue"]);
});

test("monitoring schema has checks and indexes for monitor trust boundaries", () => {
  const sourceCheckNames = new Set(
    getTableConfig(officialSources).checks.map((sourceCheck) => sourceCheck.name),
  );
  const runCheckNames = new Set(
    getTableConfig(sourceCheckRuns).checks.map((runCheck) => runCheck.name),
  );
  const noticeCheckNames = new Set(
    getTableConfig(officialNotices).checks.map((noticeCheck) => noticeCheck.name),
  );
  const snapshotUniqueIndexNames = new Set(
    getTableConfig(sourceSnapshots)
      .indexes.filter((snapshotIndex) => snapshotIndex.config.unique)
      .map((snapshotIndex) => snapshotIndex.config.name),
  );
  const noticeUniqueIndexNames = new Set(
    getTableConfig(officialNotices)
      .indexes.filter((noticeIndex) => noticeIndex.config.unique)
      .map((noticeIndex) => noticeIndex.config.name),
  );

  assert.ok(sourceCheckNames.has("official_sources_allowlist_level_check"));
  assert.ok(sourceCheckNames.has("official_sources_frequency_check"));
  assert.ok(runCheckNames.has("source_check_runs_success_content_check"));
  assert.ok(runCheckNames.has("source_check_runs_failure_error_check"));
  assert.ok(noticeCheckNames.has("official_notices_confidence_label_check"));
  assert.ok(noticeCheckNames.has("official_notices_alert_visibility_check"));
  assert.ok(snapshotUniqueIndexNames.has("source_snapshots_source_hash_unique"));
  assert.ok(noticeUniqueIndexNames.has("official_notices_source_url_unique"));
});

test("notice proposal schema preserves CPA decision and audit boundaries", () => {
  const proposalColumns = new Set(
    getTableConfig(noticeImpactProposals).columns.map((column) => column.name),
  );
  const proposalCheckNames = new Set(
    getTableConfig(noticeImpactProposals).checks.map((proposalCheck) => proposalCheck.name),
  );
  const proposalForeignKeyNames = new Set(
    getTableConfig(noticeImpactProposals).foreignKeys.map((foreignKey) =>
      foreignKey.getName(),
    ),
  );
  const filingProfileUniqueIndexNames = new Set(
    getTableConfig(filingProfiles)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const deadlineTaskUniqueIndexNames = new Set(
    getTableConfig(deadlineTasks)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const auditLogUniqueIndexNames = new Set(
    getTableConfig(auditLogs)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const actionColumns = new Set(
    getTableConfig(noticeProposalActions).columns.map((column) => column.name),
  );
  const actionIndexNames = new Set(
    getTableConfig(noticeProposalActions).indexes.map((index) => index.config.name),
  );

  assert.deepEqual(noticeProposalTypes, ["task_update", "coverage_review_status_update"]);
  assert.deepEqual(noticeProposalStatuses, ["pending", "approved", "rejected", "decide_later"]);
  assert.deepEqual(noticeProposalActionTypes, ["approve", "reject", "decide_later"]);
  assert.equal(
    [
      "official_notice_id",
      "firm_id",
      "filing_profile_id",
      "deadline_task_id",
      "proposal_type",
      "before_state",
      "after_state",
      "confidence_label",
      "status",
      "decided_by",
      "decided_at",
      "audit_log_id",
    ].every((name) => proposalColumns.has(name)),
    true,
  );
  assert.ok(proposalCheckNames.has("notice_impact_proposals_target_check"));
  assert.ok(proposalCheckNames.has("notice_impact_proposals_decision_check"));
  assert.ok(proposalForeignKeyNames.has("notice_impact_proposals_firm_filing_profile_fk"));
  assert.ok(proposalForeignKeyNames.has("notice_impact_proposals_firm_deadline_task_fk"));
  assert.ok(proposalForeignKeyNames.has("notice_impact_proposals_firm_audit_log_fk"));
  assert.ok(filingProfileUniqueIndexNames.has("filing_profiles_firm_id_id_unique"));
  assert.ok(deadlineTaskUniqueIndexNames.has("deadline_tasks_firm_id_id_unique"));
  assert.ok(auditLogUniqueIndexNames.has("audit_logs_firm_id_id_unique"));
  assert.equal(
    [
      "proposal_id",
      "action",
      "actor_user_id",
      "previous_status",
      "new_status",
      "audit_log_id",
      "bulk_action_id",
    ].every((name) => actionColumns.has(name)),
    true,
  );
  assert.ok(actionIndexNames.has("notice_proposal_actions_bulk_action_idx"));
});
