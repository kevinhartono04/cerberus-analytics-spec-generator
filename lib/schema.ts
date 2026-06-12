import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const libraryRecords = sqliteTable("library_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  section: text("section").notNull(),
  recordKey: text("record_key").notNull(),
  payload: text("payload").notNull(),
});

export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const savedSpecs = sqliteTable("saved_specs", {
  id: text("id").primaryKey(),
  gameTitle: text("game_title").notNull(),
  genre: text("genre").notNull(),
  status: text("status").notNull(),
  eventCount: integer("event_count").notNull(),
  payloadCount: integer("payload_count").notNull(),
  generatedAt: text("generated_at").notNull(),
  savedAt: text("saved_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  payload: text("payload").notNull(),
});
