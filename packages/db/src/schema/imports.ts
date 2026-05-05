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

import { clientRelationships, filingProfileEntityTypes, fiscalYearTypes } from "./deadline-domain";
import { firms } from "./firms";

export const importSourceSystems = ["taxdome", "drake", "karbon", "quickbooks"] as const;
export type ImportSourceSystem = (typeof importSourceSystems)[number];

export const importBatchStatuses = ["previewed", "committed", "failed"] as const;
export type ImportBatchStatus = (typeof importBatchStatuses)[number];

export const importReviewStatuses = ["accepted", "needs_review", "committed", "skipped"] as const;
export type ImportReviewStatus = (typeof importReviewStatuses)[number];

export const importReviewProblemTypes = [
  "missing_client_name",
  "missing_entity_type",
  "fuzzy_entity_type",
  "missing_state",
  "missing_tax_id",
  "duplicate_candidate",
  "relationship_suggestion",
  "coverage_gap",
  "unsupported_obligation",
] as const;
export type ImportReviewProblemType = (typeof importReviewProblemTypes)[number];

export const relationshipSuggestionStatuses = ["pending", "accepted", "rejected"] as const;
export type RelationshipSuggestionStatus = (typeof relationshipSuggestionStatuses)[number];

export const relationshipSuggestionActions = [
  "confirm_relationship",
  "keep_separate",
] as const;
export type RelationshipSuggestionAction = (typeof relationshipSuggestionActions)[number];

export const duplicateCandidateActions = ["create", "update_existing", "skip"] as const;
export type DuplicateCandidateAction = (typeof duplicateCandidateActions)[number];

export const duplicateCandidateResolutions = [
  "pending",
  "create",
  "update_existing",
  "skip",
] as const;
export type DuplicateCandidateResolution = (typeof duplicateCandidateResolutions)[number];

export type ImportColumnMapping = {
  sourceColumn: string;
  canonicalField: string | null;
  confidence: "high" | "medium" | "low";
};

export type ImportCanonicalProfile = {
  clientName: string | null;
  ein: string | null;
  ssnLast4: string | null;
  state: string | null;
  states: string[];
  entityType: (typeof filingProfileEntityTypes)[number] | null;
  county: string | null;
  fiscalYearType: (typeof fiscalYearTypes)[number] | null;
  sourceSystem: ImportSourceSystem;
  sourceRowId: string;
};

export const importBatches = sqliteTable(
  "import_batches",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system", { enum: importSourceSystems }).notNull(),
    status: text("status", { enum: importBatchStatuses }).notNull().default("previewed"),
    adapterProfile: text("adapter_profile").notNull(),
    adapterVersion: text("adapter_version").notNull(),
    totalRows: integer("total_rows").notNull(),
    acceptedRows: integer("accepted_rows").notNull(),
    reviewRows: integer("review_rows").notNull(),
    duplicateRows: integer("duplicate_rows").notNull(),
    headerDetected: integer("header_detected", { mode: "boolean" }).notNull(),
    mappingConfidence: integer("mapping_confidence").notNull(),
    columnMapping: text("column_mapping", { mode: "json" })
      .$type<ImportColumnMapping[]>()
      .notNull(),
    recognizedFields: text("recognized_fields", { mode: "json" }).$type<string[]>().notNull(),
    unmappedColumns: text("unmapped_columns", { mode: "json" }).$type<string[]>().notNull(),
    validationMessages: text("validation_messages", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    committedAt: integer("committed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("import_batches_firm_created_at_idx").on(table.firmId, table.createdAt),
    index("import_batches_firm_status_idx").on(table.firmId, table.status),
    uniqueIndex("import_batches_firm_id_id_unique").on(table.firmId, table.id),
    check(
      "import_batches_source_system_check",
      sql`${table.sourceSystem} in ('taxdome', 'drake', 'karbon', 'quickbooks')`,
    ),
    check(
      "import_batches_status_check",
      sql`${table.status} in ('previewed', 'committed', 'failed')`,
    ),
    check(
      "import_batches_counts_check",
      sql`${table.totalRows} >= 0 and ${table.acceptedRows} >= 0 and ${table.reviewRows} >= 0 and ${table.duplicateRows} >= 0`,
    ),
  ],
);

export const importReviewItems = sqliteTable(
  "import_review_items",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    batchId: text("batch_id").notNull(),
    sourceRowId: text("source_row_id").notNull(),
    rowIndex: integer("row_index").notNull(),
    status: text("status", { enum: importReviewStatuses }).notNull(),
    problemTypes: text("problem_types", { mode: "json" })
      .$type<ImportReviewProblemType[]>()
      .notNull(),
    canonicalProfile: text("canonical_profile", { mode: "json" })
      .$type<ImportCanonicalProfile>()
      .notNull(),
    sourceFields: text("source_fields", { mode: "json" })
      .$type<Record<string, string>>()
      .notNull(),
    messages: text("messages", { mode: "json" }).$type<string[]>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("import_review_items_batch_status_idx").on(table.firmId, table.batchId, table.status),
    uniqueIndex("import_review_items_firm_batch_id_unique").on(
      table.firmId,
      table.batchId,
      table.id,
    ),
    foreignKey({
      name: "import_review_items_firm_batch_fk",
      columns: [table.firmId, table.batchId],
      foreignColumns: [importBatches.firmId, importBatches.id],
    }).onDelete("cascade"),
    check(
      "import_review_items_status_check",
      sql`${table.status} in ('accepted', 'needs_review', 'committed', 'skipped')`,
    ),
  ],
);

export const relationshipSuggestions = sqliteTable(
  "relationship_suggestions",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    batchId: text("batch_id").notNull(),
    incomingReviewItemId: text("incoming_review_item_id").notNull(),
    suggestedClientRelationshipId: text("suggested_client_relationship_id"),
    reason: text("reason").notNull(),
    suggestedAction: text("suggested_action", { enum: relationshipSuggestionActions }).notNull(),
    status: text("status", { enum: relationshipSuggestionStatuses }).notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("relationship_suggestions_batch_status_idx").on(
      table.firmId,
      table.batchId,
      table.status,
    ),
    foreignKey({
      name: "relationship_suggestions_firm_batch_fk",
      columns: [table.firmId, table.batchId],
      foreignColumns: [importBatches.firmId, importBatches.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "relationship_suggestions_firm_item_fk",
      columns: [table.firmId, table.batchId, table.incomingReviewItemId],
      foreignColumns: [importReviewItems.firmId, importReviewItems.batchId, importReviewItems.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "relationship_suggestions_firm_client_fk",
      columns: [table.firmId, table.suggestedClientRelationshipId],
      foreignColumns: [clientRelationships.firmId, clientRelationships.id],
    }),
    check(
      "relationship_suggestions_action_check",
      sql`${table.suggestedAction} in ('confirm_relationship', 'keep_separate')`,
    ),
    check(
      "relationship_suggestions_status_check",
      sql`${table.status} in ('pending', 'accepted', 'rejected')`,
    ),
  ],
);

export const duplicateCandidates = sqliteTable(
  "duplicate_candidates",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    batchId: text("batch_id").notNull(),
    incomingReviewItemId: text("incoming_review_item_id").notNull(),
    existingClientRelationshipId: text("existing_client_relationship_id"),
    matchedFields: text("matched_fields", { mode: "json" }).$type<string[]>().notNull(),
    differingFields: text("differing_fields", { mode: "json" })
      .$type<Record<string, { incoming: string | null; existing: string | null }>>()
      .notNull(),
    suggestedAction: text("suggested_action", { enum: duplicateCandidateActions }).notNull(),
    resolution: text("resolution", { enum: duplicateCandidateResolutions })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("duplicate_candidates_batch_resolution_idx").on(
      table.firmId,
      table.batchId,
      table.resolution,
    ),
    foreignKey({
      name: "duplicate_candidates_firm_batch_fk",
      columns: [table.firmId, table.batchId],
      foreignColumns: [importBatches.firmId, importBatches.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "duplicate_candidates_firm_item_fk",
      columns: [table.firmId, table.batchId, table.incomingReviewItemId],
      foreignColumns: [importReviewItems.firmId, importReviewItems.batchId, importReviewItems.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "duplicate_candidates_firm_client_fk",
      columns: [table.firmId, table.existingClientRelationshipId],
      foreignColumns: [clientRelationships.firmId, clientRelationships.id],
    }),
    check(
      "duplicate_candidates_action_check",
      sql`${table.suggestedAction} in ('create', 'update_existing', 'skip')`,
    ),
    check(
      "duplicate_candidates_resolution_check",
      sql`${table.resolution} in ('pending', 'create', 'update_existing', 'skip')`,
    ),
  ],
);

export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;

export type ImportReviewItem = typeof importReviewItems.$inferSelect;
export type NewImportReviewItem = typeof importReviewItems.$inferInsert;

export type RelationshipSuggestion = typeof relationshipSuggestions.$inferSelect;
export type NewRelationshipSuggestion = typeof relationshipSuggestions.$inferInsert;

export type DuplicateCandidate = typeof duplicateCandidates.$inferSelect;
export type NewDuplicateCandidate = typeof duplicateCandidates.$inferInsert;
