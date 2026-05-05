import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { firms } from "./firms";

// --- Enums ---

export const verificationStatuses = [
  "verified",
  "needs_review",
  "source_changed",
  "unsupported",
] as const;

export type VerificationStatus = (typeof verificationStatuses)[number];

export const knownStatuses = ["known", "planned", "unsupported"] as const;

export type KnownStatus = (typeof knownStatuses)[number];

export const jurisdictionLevels = ["federal", "state", "county", "city"] as const;

export type JurisdictionLevel = (typeof jurisdictionLevels)[number];

export const verificationRequestTypes = [
  "source_changed",
  "needs_review",
  "user_requested",
  "manual_deadline",
  "coverage_gap_dismissed",
] as const;

export type VerificationRequestType = (typeof verificationRequestTypes)[number];

export const verificationRequestStatuses = ["open", "approved", "rejected", "closed"] as const;

export type VerificationRequestStatus = (typeof verificationRequestStatuses)[number];

// --- Due Date Rule Types ---

export type FixedDueDateRule = {
  type: "fixed";
  month: number;
  day: number;
  adjustForWeekendHoliday: boolean;
  extensionRule?: {
    month: number;
    day: number;
    adjustForWeekendHoliday: boolean;
  };
};

export type QuarterlyDueDateRule = {
  type: "quarterly";
  quarters: {
    q1: { month: number; day: number; yearOffset?: number };
    q2: { month: number; day: number; yearOffset?: number };
    q3: { month: number; day: number; yearOffset?: number };
    q4: { month: number; day: number; yearOffset?: number };
  };
  adjustForWeekendHoliday: boolean;
  extensionRule?: {
    month: number;
    day: number;
    adjustForWeekendHoliday: boolean;
  };
};

export type DueDateRule = FixedDueDateRule | QuarterlyDueDateRule;

// --- Tables ---

export const taxObligations = sqliteTable("tax_obligations", {
  id: text("id").primaryKey(),
  jurisdiction: text("jurisdiction").notNull(),
  jurisdictionLevel: text("jurisdiction_level", { enum: jurisdictionLevels }).notNull(),
  agencyName: text("agency_name").notNull(),
  taxCategory: text("tax_category").notNull(),
  obligationName: text("obligation_name").notNull(),
  /** JSON array of entity types, e.g. ["individual","c_corp"] */
  entityTypes: text("entity_types", { mode: "json" }).notNull().$type<string[]>(),
  knownStatus: text("known_status", { enum: knownStatuses }).notNull().default("known"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type TaxObligation = typeof taxObligations.$inferSelect;
export type NewTaxObligation = typeof taxObligations.$inferInsert;

export const taxRules = sqliteTable("tax_rules", {
  id: text("id").primaryKey(),
  obligationId: text("obligation_id")
    .notNull()
    .references(() => taxObligations.id),
  ruleSummary: text("rule_summary").notNull(),
  /** Structured JSON defining how to calculate due dates */
  dueDateRule: text("due_date_rule", { mode: "json" }).notNull().$type<DueDateRule>(),
  verificationStatus: text("verification_status", { enum: verificationStatuses })
    .notNull()
    .default("needs_review"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  lastVerifiedAt: integer("last_verified_at", { mode: "timestamp_ms" }),
  sourceLastCheckedAt: integer("source_last_checked_at", { mode: "timestamp_ms" }),
  sourceLastChangedAt: integer("source_last_changed_at", { mode: "timestamp_ms" }),
  sourceContentHash: text("source_content_hash"),
  verifiedBy: text("verified_by"),
  verificationNotes: text("verification_notes"),
  currentVersion: integer("current_version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type TaxRule = typeof taxRules.$inferSelect;
export type NewTaxRule = typeof taxRules.$inferInsert;

export const taxRuleVersions = sqliteTable("tax_rule_versions", {
  id: text("id").primaryKey(),
  ruleId: text("rule_id")
    .notNull()
    .references(() => taxRules.id),
  version: integer("version").notNull(),
  ruleSummary: text("rule_summary").notNull(),
  dueDateRule: text("due_date_rule", { mode: "json" }).notNull().$type<DueDateRule>(),
  sourceSnapshotId: text("source_snapshot_id"),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  publishedBy: text("published_by"),
});

export type TaxRuleVersion = typeof taxRuleVersions.$inferSelect;
export type NewTaxRuleVersion = typeof taxRuleVersions.$inferInsert;

export const verificationRequests = sqliteTable("verification_requests", {
  id: text("id").primaryKey(),
  firmId: text("firm_id")
    .notNull()
    .references(() => firms.id, { onDelete: "cascade" }),
  requestType: text("request_type", { enum: verificationRequestTypes }).notNull(),
  obligationId: text("obligation_id"),
  taxRuleId: text("tax_rule_id"),
  deadlineTaskId: text("deadline_task_id"),
  status: text("status", { enum: verificationRequestStatuses }).notNull().default("open"),
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("verification_requests_firm_status_idx").on(table.firmId, table.status),
  index("verification_requests_obligation_idx").on(table.obligationId),
  check(
    "verification_requests_type_check",
    sql`${table.requestType} in ('source_changed', 'needs_review', 'user_requested', 'manual_deadline', 'coverage_gap_dismissed')`,
  ),
  check(
    "verification_requests_status_check",
    sql`${table.status} in ('open', 'approved', 'rejected', 'closed')`,
  ),
  check(
    "verification_requests_subject_check",
    sql`${table.obligationId} is not null or ${table.taxRuleId} is not null or ${table.deadlineTaskId} is not null`,
  ),
]);

export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type NewVerificationRequest = typeof verificationRequests.$inferInsert;
