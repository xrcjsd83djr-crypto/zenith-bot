import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";

export const meetingsTable = pgTable("meetings", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  hostId: text("host_id").notNull(),
  hostUsername: text("host_username").notNull(),
  channelId: text("channel_id"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  attendees: text("attendees").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ createdAt: true });
export const selectMeetingSchema = createSelectSchema(meetingsTable);
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetingsTable.$inferSelect;
