import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { auditLogs } from "./audit";
import { user } from "./auth";
import { firms } from "./firms";

export const clientRelationshipCreatedViaValues = ["csv_import", "manual"] as const;
export type ClientRelationshipCreatedVia = (typeof clientRelationshipCreatedViaValues)[number];

export const clientRelationshipTypes = [
  "individual",
  "business",
  "household",
  "related_group",
] as const;
export type ClientRelationshipType = (typeof clientRelationshipTypes)[number];

export const sourceSystems = [
  "manual",
  "taxdome",
  "drake",
  "karbon",
  "quickbooks",
  "other",
] as const;
export type SourceSystem = (typeof sourceSystems)[number];

export const filingProfileCreatedViaValues = ["csv_import", "manual"] as const;
export type FilingProfileCreatedVia = (typeof filingProfileCreatedViaValues)[number];

export const filingProfileEntityTypes = [
  "individual",
  "sole_prop",
  "s_corp",
  "c_corp",
  "partnership",
  "llc",
  "trust_estate",
  "nonprofit",
  "other",
] as const;
export type FilingProfileEntityType = (typeof filingProfileEntityTypes)[number];

export const fiscalYearTypes = ["calendar_year", "fiscal_year"] as const;
export type FiscalYearType = (typeof fiscalYearTypes)[number];

export const filingProfileCoverageStates = [
  "ready",
  "needs_review",
  "coverage_gap",
  "unsupported",
] as const;
export type FilingProfileCoverageState = (typeof filingProfileCoverageStates)[number];

export const deadlineTaskStatuses = [
  "not_started",
  "waiting_on_client",
  "ready_to_work",
  "in_progress",
  "done",
] as const;
export type DeadlineTaskStatus = (typeof deadlineTaskStatuses)[number];

export const deadlineTaskPriorities = ["low", "normal", "high", "urgent"] as const;
export type DeadlineTaskPriority = (typeof deadlineTaskPriorities)[number];

export const deadlineTaskSourceTypes = ["verified_rule", "entered_deadline"] as const;
export type DeadlineTaskSourceType = (typeof deadlineTaskSourceTypes)[number];

export const deadlineTaskCreatedViaValues = ["system_rule", "manual"] as const;
export type DeadlineTaskCreatedVia = (typeof deadlineTaskCreatedViaValues)[number];

export const deadlineDateEventTypes = [
  "official_original_due_date",
  "official_extension",
  "official_relief_change",
  "entered_deadline_adjustment",
  "firm_target_change",
] as const;
export type DeadlineDateEventType = (typeof deadlineDateEventTypes)[number];

export const deadlineTaskUpdateRecordFieldNames = [
  "status",
  "currentDueDate",
  "originalDueDate",
  "firmTargetDate",
  "notes",
] as const;
export type DeadlineTaskUpdateRecordFieldName =
  (typeof deadlineTaskUpdateRecordFieldNames)[number];

export const clientRelationships = sqliteTable(
  "client_relationships",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    relationshipType: text("relationship_type", { enum: clientRelationshipTypes }).notNull(),
    notes: text("notes"),
    sourceSystem: text("source_system", { enum: sourceSystems }).notNull().default("manual"),
    sourceClientId: text("source_client_id"),
    createdVia: text("created_via", { enum: clientRelationshipCreatedViaValues }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("client_relationships_firm_display_name_idx").on(table.firmId, table.displayName),
    uniqueIndex("client_relationships_firm_id_id_unique").on(table.firmId, table.id),
    uniqueIndex("client_relationships_firm_source_client_unique").on(
      table.firmId,
      table.sourceSystem,
      table.sourceClientId,
    ),
    check(
      "client_relationships_type_check",
      sql`${table.relationshipType} in ('individual', 'business', 'household', 'related_group')`,
    ),
    check(
      "client_relationships_created_via_check",
      sql`${table.createdVia} in ('csv_import', 'manual')`,
    ),
    check(
      "client_relationships_source_system_check",
      sql`${table.sourceSystem} in ('manual', 'taxdome', 'drake', 'karbon', 'quickbooks', 'other')`,
    ),
  ],
);

export const filingProfiles = sqliteTable(
  "filing_profiles",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    clientRelationshipId: text("client_relationship_id")
      .notNull()
      .references(() => clientRelationships.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    ein: text("ein"),
    ssnLast4: text("ssn_last4"),
    entityType: text("entity_type", { enum: filingProfileEntityTypes }).notNull(),
    states: text("states", { mode: "json" }).$type<string[]>().notNull(),
    county: text("county"),
    fiscalYearType: text("fiscal_year_type", { enum: fiscalYearTypes }).notNull(),
    coverageState: text("coverage_state", { enum: filingProfileCoverageStates })
      .notNull()
      .default("needs_review"),
    notes: text("notes"),
    sourceSystem: text("source_system", { enum: sourceSystems }).notNull().default("manual"),
    sourceRowId: text("source_row_id"),
    createdVia: text("created_via", { enum: filingProfileCreatedViaValues }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("filing_profiles_firm_client_relationship_idx").on(
      table.firmId,
      table.clientRelationshipId,
    ),
    index("filing_profiles_firm_entity_type_idx").on(table.firmId, table.entityType),
    uniqueIndex("filing_profiles_firm_client_id_unique").on(
      table.firmId,
      table.clientRelationshipId,
      table.id,
    ),
    uniqueIndex("filing_profiles_firm_id_id_unique").on(table.firmId, table.id),
    foreignKey({
      name: "filing_profiles_firm_client_relationship_fk",
      columns: [table.firmId, table.clientRelationshipId],
      foreignColumns: [clientRelationships.firmId, clientRelationships.id],
    }).onDelete("cascade"),
    check(
      "filing_profiles_entity_type_check",
      sql`${table.entityType} in ('individual', 'sole_prop', 's_corp', 'c_corp', 'partnership', 'llc', 'trust_estate', 'nonprofit', 'other')`,
    ),
    check(
      "filing_profiles_fiscal_year_type_check",
      sql`${table.fiscalYearType} in ('calendar_year', 'fiscal_year')`,
    ),
    check(
      "filing_profiles_coverage_state_check",
      sql`${table.coverageState} in ('ready', 'needs_review', 'coverage_gap', 'unsupported')`,
    ),
    check(
      "filing_profiles_created_via_check",
      sql`${table.createdVia} in ('csv_import', 'manual')`,
    ),
    check(
      "filing_profiles_source_system_check",
      sql`${table.sourceSystem} in ('manual', 'taxdome', 'drake', 'karbon', 'quickbooks', 'other')`,
    ),
    check(
      "filing_profiles_identity_check",
      sql`${table.ein} is null or ${table.ssnLast4} is null`,
    ),
  ],
);

export const deadlineTasks = sqliteTable(
  "deadline_tasks",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    clientRelationshipId: text("client_relationship_id")
      .notNull()
      .references(() => clientRelationships.id, { onDelete: "cascade" }),
    filingProfileId: text("filing_profile_id")
      .notNull()
      .references(() => filingProfiles.id, { onDelete: "cascade" }),
    taxRuleId: text("tax_rule_id"),
    title: text("title").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    taxCategory: text("tax_category").notNull(),
    currentDueDate: text("current_due_date").notNull(),
    originalDueDate: text("original_due_date"),
    firmTargetDate: text("firm_target_date"),
    recurrenceKey: text("recurrence_key"),
    status: text("status", { enum: deadlineTaskStatuses }).notNull().default("not_started"),
    priority: text("priority", { enum: deadlineTaskPriorities }).notNull().default("normal"),
    sourceType: text("source_type", { enum: deadlineTaskSourceTypes }).notNull(),
    createdVia: text("created_via", { enum: deadlineTaskCreatedViaValues }).notNull(),
    enteredDeadlineReferenceNote: text("entered_deadline_reference_note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("deadline_tasks_firm_due_date_idx").on(table.firmId, table.currentDueDate),
    index("deadline_tasks_firm_status_idx").on(table.firmId, table.status),
    index("deadline_tasks_firm_priority_idx").on(table.firmId, table.priority),
    index("deadline_tasks_client_relationship_idx").on(table.clientRelationshipId),
    index("deadline_tasks_filing_profile_idx").on(table.filingProfileId),
    index("deadline_tasks_tax_rule_idx").on(table.taxRuleId),
    uniqueIndex("deadline_tasks_firm_id_id_unique").on(table.firmId, table.id),
    foreignKey({
      name: "deadline_tasks_firm_client_relationship_fk",
      columns: [table.firmId, table.clientRelationshipId],
      foreignColumns: [clientRelationships.firmId, clientRelationships.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "deadline_tasks_firm_client_profile_fk",
      columns: [table.firmId, table.clientRelationshipId, table.filingProfileId],
      foreignColumns: [filingProfiles.firmId, filingProfiles.clientRelationshipId, filingProfiles.id],
    }).onDelete("cascade"),
    check(
      "deadline_tasks_status_check",
      sql`${table.status} in ('not_started', 'waiting_on_client', 'ready_to_work', 'in_progress', 'done')`,
    ),
    check(
      "deadline_tasks_priority_check",
      sql`${table.priority} in ('low', 'normal', 'high', 'urgent')`,
    ),
    check(
      "deadline_tasks_source_type_check",
      sql`${table.sourceType} in ('verified_rule', 'entered_deadline')`,
    ),
    check(
      "deadline_tasks_created_via_check",
      sql`${table.createdVia} in ('system_rule', 'manual')`,
    ),
    check(
      "deadline_tasks_source_created_via_check",
      sql`(${table.sourceType} = 'verified_rule' and ${table.createdVia} = 'system_rule') or (${table.sourceType} = 'entered_deadline' and ${table.createdVia} = 'manual')`,
    ),
    check(
      "deadline_tasks_verified_rule_tax_rule_check",
      sql`${table.sourceType} != 'verified_rule' or ${table.taxRuleId} is not null`,
    ),
    check(
      "deadline_tasks_entered_deadline_reference_note_check",
      sql`${table.sourceType} != 'entered_deadline' or ${table.enteredDeadlineReferenceNote} is not null`,
    ),
  ],
);

export const deadlineDateEvents = sqliteTable(
  "deadline_date_events",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    deadlineTaskId: text("deadline_task_id")
      .notNull()
      .references(() => deadlineTasks.id, { onDelete: "cascade" }),
    eventType: text("event_type", { enum: deadlineDateEventTypes }).notNull(),
    previousCurrentDueDate: text("previous_current_due_date"),
    newCurrentDueDate: text("new_current_due_date"),
    previousFirmTargetDate: text("previous_firm_target_date"),
    newFirmTargetDate: text("new_firm_target_date"),
    sourceName: text("source_name"),
    sourceUrl: text("source_url"),
    sourceSnapshotId: text("source_snapshot_id"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    auditLogId: text("audit_log_id").references(() => auditLogs.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("deadline_date_events_task_created_at_idx").on(table.deadlineTaskId, table.createdAt),
    index("deadline_date_events_firm_event_type_idx").on(table.firmId, table.eventType),
    index("deadline_date_events_audit_log_id_idx").on(table.auditLogId),
    foreignKey({
      name: "deadline_date_events_firm_deadline_task_fk",
      columns: [table.firmId, table.deadlineTaskId],
      foreignColumns: [deadlineTasks.firmId, deadlineTasks.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "deadline_date_events_firm_audit_log_fk",
      columns: [table.firmId, table.auditLogId],
      foreignColumns: [auditLogs.firmId, auditLogs.id],
    }),
    check(
      "deadline_date_events_type_check",
      sql`${table.eventType} in ('official_original_due_date', 'official_extension', 'official_relief_change', 'entered_deadline_adjustment', 'firm_target_change')`,
    ),
    check(
      "deadline_date_events_due_date_payload_check",
      sql`${table.eventType} = 'firm_target_change' or ${table.newCurrentDueDate} is not null`,
    ),
    check(
      "deadline_date_events_due_date_previous_check",
      sql`${table.eventType} in ('official_original_due_date', 'firm_target_change') or ${table.previousCurrentDueDate} is not null`,
    ),
    check(
      "deadline_date_events_firm_target_payload_check",
      sql`${table.eventType} != 'firm_target_change' or ${table.previousFirmTargetDate} is not null or ${table.newFirmTargetDate} is not null`,
    ),
    check(
      "deadline_date_events_current_due_date_separation_check",
      sql`${table.eventType} != 'firm_target_change' or (${table.previousCurrentDueDate} is null and ${table.newCurrentDueDate} is null)`,
    ),
    check(
      "deadline_date_events_firm_target_separation_check",
      sql`${table.eventType} = 'firm_target_change' or (${table.previousFirmTargetDate} is null and ${table.newFirmTargetDate} is null)`,
    ),
    check(
      "deadline_date_events_official_source_check",
      sql`${table.eventType} not in ('official_original_due_date', 'official_extension', 'official_relief_change') or ${table.sourceName} is not null or ${table.sourceUrl} is not null or ${table.sourceSnapshotId} is not null`,
    ),
  ],
);

export const deadlineTaskUpdateRecords = sqliteTable(
  "deadline_task_update_records",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    deadlineTaskId: text("deadline_task_id")
      .notNull()
      .references(() => deadlineTasks.id, { onDelete: "cascade" }),
    fieldName: text("field_name", { enum: deadlineTaskUpdateRecordFieldNames }).notNull(),
    previousValue: text("previous_value", { mode: "json" }).$type<string | null>(),
    newValue: text("new_value", { mode: "json" }).$type<string | null>(),
    action: text("action").notNull(),
    auditLogId: text("audit_log_id").references(() => auditLogs.id),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("deadline_task_update_records_task_created_at_idx").on(
      table.deadlineTaskId,
      table.createdAt,
    ),
    index("deadline_task_update_records_firm_field_idx").on(table.firmId, table.fieldName),
    index("deadline_task_update_records_audit_log_id_idx").on(table.auditLogId),
    uniqueIndex("deadline_task_update_records_firm_id_id_unique").on(table.firmId, table.id),
    foreignKey({
      name: "deadline_task_update_records_firm_deadline_task_fk",
      columns: [table.firmId, table.deadlineTaskId],
      foreignColumns: [deadlineTasks.firmId, deadlineTasks.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "deadline_task_update_records_firm_audit_log_fk",
      columns: [table.firmId, table.auditLogId],
      foreignColumns: [auditLogs.firmId, auditLogs.id],
    }),
    check(
      "deadline_task_update_records_field_name_check",
      sql`${table.fieldName} in ('status', 'currentDueDate', 'originalDueDate', 'firmTargetDate', 'notes')`,
    ),
    check(
      "deadline_task_update_records_changed_value_check",
      sql`${table.previousValue} is not ${table.newValue}`,
    ),
  ],
);

export type ClientRelationship = typeof clientRelationships.$inferSelect;
export type NewClientRelationship = typeof clientRelationships.$inferInsert;

export type FilingProfile = typeof filingProfiles.$inferSelect;
export type NewFilingProfile = typeof filingProfiles.$inferInsert;

export type DeadlineTask = typeof deadlineTasks.$inferSelect;
export type NewDeadlineTask = typeof deadlineTasks.$inferInsert;

export type DeadlineDateEvent = typeof deadlineDateEvents.$inferSelect;
export type NewDeadlineDateEvent = typeof deadlineDateEvents.$inferInsert;

export type DeadlineTaskUpdateRecord = typeof deadlineTaskUpdateRecords.$inferSelect;
export type NewDeadlineTaskUpdateRecord = typeof deadlineTaskUpdateRecords.$inferInsert;
