import { user } from "./auth";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const firms = sqliteTable(
  "firms",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("firms_owner_user_id_unique").on(table.ownerUserId)],
);

export type Firm = typeof firms.$inferSelect;
export type NewFirm = typeof firms.$inferInsert;
