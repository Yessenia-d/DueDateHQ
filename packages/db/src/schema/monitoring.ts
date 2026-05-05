import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const officialSourceTypes = ["html", "pdf", "rss", "api", "manual"] as const;
export type OfficialSourceType = (typeof officialSourceTypes)[number];

export const officialSourceAllowlistLevels = ["p0", "later"] as const;
export type OfficialSourceAllowlistLevel = (typeof officialSourceAllowlistLevels)[number];

export const sourceCheckRunStatuses = ["success", "failed", "skipped"] as const;
export type SourceCheckRunStatus = (typeof sourceCheckRunStatuses)[number];

export const confidenceLabels = ["high", "medium", "low"] as const;
export type ConfidenceLabel = (typeof confidenceLabels)[number];

export const noticeAlertVisibilities = ["workspace_alert", "internal_queue"] as const;
export type NoticeAlertVisibility = (typeof noticeAlertVisibilities)[number];

export type NoticeImpactCondition = {
  jurisdiction: string;
  taxCategories: string[];
  entityTypes: string[];
  deadlineKinds: string[];
  dateText: string | null;
  affectedLocation: string | null;
  summary: string;
};

export type NoticeWorkspaceMatchHints = {
  jurisdictions: string[];
  entityTypes: string[];
  taxCategories: string[];
};

export const officialSources = sqliteTable(
  "official_sources",
  {
    id: text("id").primaryKey(),
    jurisdiction: text("jurisdiction").notNull(),
    agencyName: text("agency_name").notNull(),
    sourceType: text("source_type", { enum: officialSourceTypes }).notNull(),
    sourceUrl: text("source_url").notNull(),
    allowlistLevel: text("allowlist_level", { enum: officialSourceAllowlistLevels }).notNull(),
    deadlineScope: text("deadline_scope").notNull(),
    monitorFrequencyHours: integer("monitor_frequency_hours").notNull().default(24),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
    lastChangedAt: integer("last_changed_at", { mode: "timestamp_ms" }),
    lastStatus: text("last_status", { enum: sourceCheckRunStatuses }),
    lastErrorMessage: text("last_error_message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("official_sources_jurisdiction_idx").on(table.jurisdiction),
    index("official_sources_active_idx").on(table.active),
    check(
      "official_sources_type_check",
      sql`${table.sourceType} in ('html', 'pdf', 'rss', 'api', 'manual')`,
    ),
    check(
      "official_sources_allowlist_level_check",
      sql`${table.allowlistLevel} in ('p0', 'later')`,
    ),
    check(
      "official_sources_last_status_check",
      sql`${table.lastStatus} is null or ${table.lastStatus} in ('success', 'failed', 'skipped')`,
    ),
    check("official_sources_frequency_check", sql`${table.monitorFrequencyHours} > 0`),
  ],
);

export const sourceSnapshots = sqliteTable(
  "source_snapshots",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => officialSources.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    snapshotUrl: text("snapshot_url"),
    capturedAt: integer("captured_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("source_snapshots_source_captured_at_idx").on(table.sourceId, table.capturedAt),
    uniqueIndex("source_snapshots_source_hash_unique").on(table.sourceId, table.contentHash),
  ],
);

export const sourceCheckRuns = sqliteTable(
  "source_check_runs",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => officialSources.id, { onDelete: "cascade" }),
    checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: sourceCheckRunStatuses }).notNull(),
    httpStatus: integer("http_status"),
    contentHash: text("content_hash"),
    previousContentHash: text("previous_content_hash"),
    changedDetected: integer("changed_detected", { mode: "boolean" }).notNull().default(false),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("source_check_runs_source_checked_at_idx").on(table.sourceId, table.checkedAt),
    index("source_check_runs_status_idx").on(table.status),
    check(
      "source_check_runs_status_check",
      sql`${table.status} in ('success', 'failed', 'skipped')`,
    ),
    check(
      "source_check_runs_success_content_check",
      sql`${table.status} != 'success' or ${table.contentHash} is not null`,
    ),
    check(
      "source_check_runs_failure_error_check",
      sql`${table.status} = 'success' or ${table.errorMessage} is not null`,
    ),
  ],
);

export const officialNotices = sqliteTable(
  "official_notices",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => officialSources.id, { onDelete: "cascade" }),
    sourceSnapshotId: text("source_snapshot_id").references(() => sourceSnapshots.id, {
      onDelete: "set null",
    }),
    noticeUrl: text("notice_url").notNull(),
    noticeTitle: text("notice_title").notNull(),
    noticePublishedAt: integer("notice_published_at", { mode: "timestamp_ms" }),
    noticeSummary: text("notice_summary").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    deadlineRelevance: text("deadline_relevance", { enum: confidenceLabels }).notNull(),
    confidenceLabel: text("confidence_label", { enum: confidenceLabels }).notNull(),
    confidenceReasons: text("confidence_reasons", { mode: "json" }).notNull().$type<string[]>(),
    impactConditions: text("impact_conditions", { mode: "json" })
      .notNull()
      .$type<NoticeImpactCondition[]>(),
    workspaceMatchHints: text("workspace_match_hints", { mode: "json" })
      .notNull()
      .$type<NoticeWorkspaceMatchHints>(),
    alertVisibility: text("alert_visibility", { enum: noticeAlertVisibilities }).notNull(),
    detectedAt: integer("detected_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("official_notices_source_detected_at_idx").on(table.sourceId, table.detectedAt),
    index("official_notices_alert_visibility_idx").on(table.alertVisibility),
    index("official_notices_confidence_idx").on(table.confidenceLabel),
    uniqueIndex("official_notices_source_url_unique").on(table.sourceId, table.noticeUrl),
    check(
      "official_notices_deadline_relevance_check",
      sql`${table.deadlineRelevance} in ('high', 'medium', 'low')`,
    ),
    check(
      "official_notices_confidence_label_check",
      sql`${table.confidenceLabel} in ('high', 'medium', 'low')`,
    ),
    check(
      "official_notices_alert_visibility_check",
      sql`${table.alertVisibility} in ('workspace_alert', 'internal_queue')`,
    ),
  ],
);

export type OfficialSource = typeof officialSources.$inferSelect;
export type NewOfficialSource = typeof officialSources.$inferInsert;

export type SourceSnapshot = typeof sourceSnapshots.$inferSelect;
export type NewSourceSnapshot = typeof sourceSnapshots.$inferInsert;

export type SourceCheckRun = typeof sourceCheckRuns.$inferSelect;
export type NewSourceCheckRun = typeof sourceCheckRuns.$inferInsert;

export type OfficialNotice = typeof officialNotices.$inferSelect;
export type NewOfficialNotice = typeof officialNotices.$inferInsert;
