import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const links = sqliteTable("links", {
  id: integer("id").primaryKey(),
  url: text("url").notNull().unique(),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

export const legacyLinks = sqliteTable("legacy_links", {
  id: text("id").primaryKey(),
  newId: integer("newId").notNull(),
});
