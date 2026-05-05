import assert from "node:assert/strict";
import test from "node:test";

import { getTableConfig } from "drizzle-orm/sqlite-core/utils";

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
