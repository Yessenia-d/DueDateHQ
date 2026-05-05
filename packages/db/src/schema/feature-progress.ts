import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const featureProgressStatuses = [
  "done",
  "in_progress",
  "blocked",
  "not_started",
] as const;

export type FeatureProgressStatus = (typeof featureProgressStatuses)[number];

export const featureProgressPriorities = ["p0", "p1", "p2"] as const;

export type FeatureProgressPriority = (typeof featureProgressPriorities)[number];

export const featureItems = sqliteTable("feature_items", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  specPath: text("spec_path").notNull(),
  status: text("status", { enum: featureProgressStatuses }).notNull().default("not_started"),
  priority: text("priority", { enum: featureProgressPriorities }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type FeatureItem = typeof featureItems.$inferSelect;
export type NewFeatureItem = typeof featureItems.$inferInsert;
