import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";

export const applicationStatusEnum = ["pending", "reviewing", "interview", "accepted", "denied", "withdrawn"] as const;
export type ApplicationStatus = typeof applicationStatusEnum[number];

export const applicationsTable = pgTable("applications", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  applicantDiscordId: text("applicant_discord_id").notNull(),
  applicantUsername: text("applicant_username").notNull(),
  robloxUsername: text("roblox_username"),
  status: text("status").$type<ApplicationStatus>().notNull().default("pending"),
  answers: jsonb("answers").$type<Array<{ question: string; answer: string }>>().notNull().default([]),
  reviewerId: text("reviewer_id"),
  reviewerUsername: text("reviewer_username"),
  reviewNotes: text("review_notes"),
  messageId: text("message_id"),
  threadId: text("thread_id"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ submittedAt: true });
export const selectApplicationSchema = createSelectSchema(applicationsTable);
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
