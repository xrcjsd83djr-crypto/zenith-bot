import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";

export const applicationQuestionsTable = pgTable("application_questions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  placeholder: text("placeholder"),
  isRequired: boolean("is_required").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApplicationQuestionSchema = createInsertSchema(applicationQuestionsTable).omit({ createdAt: true });
export const selectApplicationQuestionSchema = createSelectSchema(applicationQuestionsTable);
export type InsertApplicationQuestion = z.infer<typeof insertApplicationQuestionSchema>;
export type ApplicationQuestion = typeof applicationQuestionsTable.$inferSelect;
