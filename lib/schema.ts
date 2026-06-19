import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const savedSpecs = pgTable("saved_specs", {
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
