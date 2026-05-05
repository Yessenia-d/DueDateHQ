import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { firms } from "./firms";

export const auditActorTypes = ["user", "system", "monitor"] as const;
export type AuditActorType = (typeof auditActorTypes)[number];

export const auditSourceTypes = [
  "manual_entry",
  "csv_import",
  "verified_rule",
  "official_notice",
  "system",
] as const;
export type AuditSourceType = (typeof auditSourceTypes)[number];

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    actorType: text("actor_type", { enum: auditActorTypes }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeState: text("before_state", { mode: "json" }).$type<Record<string, unknown> | null>(),
    afterState: text("after_state", { mode: "json" }).$type<Record<string, unknown> | null>(),
    sourceType: text("source_type", { enum: auditSourceTypes }).notNull(),
    sourceId: text("source_id"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("audit_logs_firm_entity_created_at_idx").on(
      table.firmId,
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    uniqueIndex("audit_logs_firm_id_id_unique").on(table.firmId, table.id),
    check(
      "audit_logs_actor_type_check",
      sql`${table.actorType} in ('user', 'system', 'monitor')`,
    ),
    check(
      "audit_logs_source_type_check",
      sql`${table.sourceType} in ('manual_entry', 'csv_import', 'verified_rule', 'official_notice', 'system')`,
    ),
    check(
      "audit_logs_user_actor_check",
      sql`${table.actorType} != 'user' or ${table.actorUserId} is not null`,
    ),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
