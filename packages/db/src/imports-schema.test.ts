import assert from "node:assert/strict";
import test from "node:test";

import { getTableConfig } from "drizzle-orm/sqlite-core/utils";

import {
  duplicateCandidates,
  duplicateCandidateResolutions,
  importBatches,
  importReviewItems,
  importReviewProblemTypes,
  importSourceSystems,
  relationshipSuggestions,
  relationshipSuggestionStatuses,
} from "./schema/imports";

test("import schema exposes source-specific batch and review tables", () => {
  assert.deepEqual(importSourceSystems, ["taxdome", "drake", "karbon", "quickbooks"]);
  assert.ok(importReviewProblemTypes.includes("duplicate_candidate"));
  assert.ok(importReviewProblemTypes.includes("coverage_gap"));
  assert.deepEqual(relationshipSuggestionStatuses, ["pending", "accepted", "rejected"]);
  assert.deepEqual(duplicateCandidateResolutions, [
    "pending",
    "create",
    "update_existing",
    "skip",
  ]);
});

test("import batches keep auditable preview metadata without raw CSV storage", () => {
  const columns = new Set(getTableConfig(importBatches).columns.map((column) => column.name));
  const checks = new Set(getTableConfig(importBatches).checks.map((check) => check.name));

  assert.equal(
    [
      "id",
      "firm_id",
      "source_system",
      "status",
      "adapter_profile",
      "adapter_version",
      "total_rows",
      "accepted_rows",
      "review_rows",
      "duplicate_rows",
      "header_detected",
      "mapping_confidence",
      "column_mapping",
      "recognized_fields",
      "unmapped_columns",
      "validation_messages",
      "created_at",
      "committed_at",
    ].every((name) => columns.has(name)),
    true,
  );
  assert.equal(columns.has("raw_csv"), false);
  assert.ok(checks.has("import_batches_source_system_check"));
  assert.ok(checks.has("import_batches_status_check"));
  assert.ok(checks.has("import_batches_counts_check"));
});

test("import review tables enforce the firm-owned batch chain", () => {
  const batchUniqueIndexes = new Set(
    getTableConfig(importBatches)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name),
  );
  const itemForeignKeys = new Set(
    getTableConfig(importReviewItems).foreignKeys.map((foreignKey) => foreignKey.getName()),
  );
  const suggestionForeignKeys = new Set(
    getTableConfig(relationshipSuggestions).foreignKeys.map((foreignKey) =>
      foreignKey.getName(),
    ),
  );
  const duplicateForeignKeys = new Set(
    getTableConfig(duplicateCandidates).foreignKeys.map((foreignKey) => foreignKey.getName()),
  );

  assert.ok(batchUniqueIndexes.has("import_batches_firm_id_id_unique"));
  assert.ok(itemForeignKeys.has("import_review_items_firm_batch_fk"));
  assert.ok(suggestionForeignKeys.has("relationship_suggestions_firm_batch_fk"));
  assert.ok(suggestionForeignKeys.has("relationship_suggestions_firm_item_fk"));
  assert.ok(suggestionForeignKeys.has("relationship_suggestions_firm_client_fk"));
  assert.ok(duplicateForeignKeys.has("duplicate_candidates_firm_batch_fk"));
  assert.ok(duplicateForeignKeys.has("duplicate_candidates_firm_item_fk"));
  assert.ok(duplicateForeignKeys.has("duplicate_candidates_firm_client_fk"));
});
