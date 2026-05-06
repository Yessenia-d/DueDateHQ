import assert from "node:assert/strict";
import test from "node:test";

import { getTableConfig } from "drizzle-orm/sqlite-core/utils";

import { auditLogs } from "./schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineDateEventTypes,
  deadlineTaskUpdateRecords,
  deadlineTaskUpdateRecordFieldNames,
  filingProfileCoverageStates,
  deadlineTaskSourceTypes,
  deadlineTaskStatuses,
  deadlineTasks,
  filingProfileEntityTypes,
  filingProfiles,
} from "./schema/deadline-domain";

test("deadline domain schema keeps the firm-owned client profile task chain", () => {
  const clientRelationshipColumns = new Set(
    getTableConfig(clientRelationships).columns.map((column) => column.name),
  );
  const filingProfileColumns = new Set(
    getTableConfig(filingProfiles).columns.map((column) => column.name),
  );
  const deadlineTaskColumns = new Set(
    getTableConfig(deadlineTasks).columns.map((column) => column.name),
  );

  assert.equal(
    [
      "id",
      "firm_id",
      "display_name",
      "source_system",
      "source_client_id",
      "created_via",
      "created_at",
      "updated_at",
    ].every((name) => clientRelationshipColumns.has(name)),
    true,
  );
  assert.equal(
    [
      "firm_id",
      "client_relationship_id",
      "display_name",
      "entity_type",
      "states",
      "county",
      "fiscal_year_type",
      "coverage_state",
      "source_system",
      "source_row_id",
    ].every((name) => filingProfileColumns.has(name)),
    true,
  );
  assert.equal(
    [
      "firm_id",
      "client_relationship_id",
      "filing_profile_id",
      "tax_rule_id",
      "current_due_date",
      "original_due_date",
      "firm_target_date",
      "source_type",
    ].every((name) => deadlineTaskColumns.has(name)),
    true,
  );
});

test("deadline task enums preserve the verified versus entered-deadline trust boundary", () => {
  assert.deepEqual(deadlineTaskSourceTypes, ["verified_rule", "entered_deadline"]);
  assert.deepEqual(deadlineTaskStatuses, [
    "not_started",
    "waiting_on_client",
    "ready_to_work",
    "in_progress",
    "done",
  ]);
  assert.ok(filingProfileEntityTypes.includes("individual"));
  assert.ok(filingProfileEntityTypes.includes("s_corp"));
  assert.ok(filingProfileEntityTypes.includes("partnership"));
  assert.deepEqual(filingProfileCoverageStates, [
    "ready",
    "needs_review",
    "coverage_gap",
    "unsupported",
  ]);
});

test("date event history supports official changes, entered-deadline adjustments, and firm target changes", () => {
  assert.deepEqual(deadlineDateEventTypes, [
    "official_original_due_date",
    "official_extension",
    "official_relief_change",
    "entered_deadline_adjustment",
    "firm_target_change",
  ]);

  const eventCheckNames = new Set(
    getTableConfig(deadlineDateEvents).checks.map((dateEventCheck) => dateEventCheck.name),
  );

  assert.ok(eventCheckNames.has("deadline_date_events_type_check"));
  assert.ok(eventCheckNames.has("deadline_date_events_due_date_payload_check"));
  assert.ok(eventCheckNames.has("deadline_date_events_due_date_previous_check"));
  assert.ok(eventCheckNames.has("deadline_date_events_firm_target_payload_check"));
  assert.ok(eventCheckNames.has("deadline_date_events_current_due_date_separation_check"));
  assert.ok(eventCheckNames.has("deadline_date_events_firm_target_separation_check"));
  assert.ok(eventCheckNames.has("deadline_date_events_official_source_check"));
});

test("task update records support status, due-date, and notes field history", () => {
  assert.deepEqual(deadlineTaskUpdateRecordFieldNames, [
    "status",
    "currentDueDate",
    "originalDueDate",
    "firmTargetDate",
    "notes",
  ]);

  const updateRecordColumns = new Set(
    getTableConfig(deadlineTaskUpdateRecords).columns.map((column) => column.name),
  );
  const updateRecordIndexNames = new Set(
    getTableConfig(deadlineTaskUpdateRecords).indexes.map((index) => index.config.name),
  );
  const updateRecordCheckNames = new Set(
    getTableConfig(deadlineTaskUpdateRecords).checks.map((updateRecordCheck) => updateRecordCheck.name),
  );

  assert.equal(
    [
      "id",
      "firm_id",
      "deadline_task_id",
      "field_name",
      "previous_value",
      "new_value",
      "action",
      "audit_log_id",
      "actor_user_id",
      "created_at",
    ].every((name) => updateRecordColumns.has(name)),
    true,
  );
  assert.ok(updateRecordIndexNames.has("deadline_task_update_records_task_created_at_idx"));
  assert.ok(updateRecordIndexNames.has("deadline_task_update_records_firm_field_idx"));
  assert.ok(updateRecordIndexNames.has("deadline_task_update_records_audit_log_id_idx"));
  assert.ok(updateRecordIndexNames.has("deadline_task_update_records_firm_id_id_unique"));
  assert.ok(updateRecordCheckNames.has("deadline_task_update_records_field_name_check"));
  assert.ok(updateRecordCheckNames.has("deadline_task_update_records_changed_value_check"));
});

test("schema constraints require source evidence for user-visible changes", () => {
  const taskCheckNames = new Set(
    getTableConfig(deadlineTasks).checks.map((deadlineTaskCheck) => deadlineTaskCheck.name),
  );
  const auditCheckNames = new Set(
    getTableConfig(auditLogs).checks.map((auditLogCheck) => auditLogCheck.name),
  );

  assert.ok(taskCheckNames.has("deadline_tasks_source_created_via_check"));
  assert.ok(taskCheckNames.has("deadline_tasks_verified_rule_tax_rule_check"));
  assert.ok(taskCheckNames.has("deadline_tasks_entered_deadline_reference_note_check"));
  assert.ok(auditCheckNames.has("audit_logs_user_actor_check"));
});

test("workspace foreign keys keep deadline rows inside the owning firm", () => {
  const auditLogUniqueIndexNames = new Set(
    getTableConfig(auditLogs)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const clientRelationshipUniqueIndexNames = new Set(
    getTableConfig(clientRelationships)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const filingProfileUniqueIndexNames = new Set(
    getTableConfig(filingProfiles)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const taskUniqueIndexNames = new Set(
    getTableConfig(deadlineTasks)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const filingProfileForeignKeyNames = new Set(
    getTableConfig(filingProfiles).foreignKeys.map((foreignKey) => foreignKey.getName()),
  );
  const taskForeignKeyNames = new Set(
    getTableConfig(deadlineTasks).foreignKeys.map((foreignKey) => foreignKey.getName()),
  );
  const eventForeignKeyNames = new Set(
    getTableConfig(deadlineDateEvents).foreignKeys.map((foreignKey) => foreignKey.getName()),
  );
  const updateRecordForeignKeyNames = new Set(
    getTableConfig(deadlineTaskUpdateRecords).foreignKeys.map((foreignKey) => foreignKey.getName()),
  );

  assert.ok(auditLogUniqueIndexNames.has("audit_logs_firm_id_id_unique"));
  assert.ok(clientRelationshipUniqueIndexNames.has("client_relationships_firm_id_id_unique"));
  assert.ok(
    clientRelationshipUniqueIndexNames.has(
      "client_relationships_firm_source_client_unique",
    ),
  );
  assert.ok(filingProfileUniqueIndexNames.has("filing_profiles_firm_client_id_unique"));
  assert.ok(filingProfileUniqueIndexNames.has("filing_profiles_firm_id_id_unique"));
  assert.ok(taskUniqueIndexNames.has("deadline_tasks_firm_id_id_unique"));
  assert.ok(filingProfileForeignKeyNames.has("filing_profiles_firm_client_relationship_fk"));
  assert.ok(taskForeignKeyNames.has("deadline_tasks_firm_client_relationship_fk"));
  assert.ok(taskForeignKeyNames.has("deadline_tasks_firm_client_profile_fk"));
  assert.ok(eventForeignKeyNames.has("deadline_date_events_firm_deadline_task_fk"));
  assert.ok(eventForeignKeyNames.has("deadline_date_events_firm_audit_log_fk"));
  assert.ok(updateRecordForeignKeyNames.has("deadline_task_update_records_firm_deadline_task_fk"));
  assert.ok(updateRecordForeignKeyNames.has("deadline_task_update_records_firm_audit_log_fk"));
});
