import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";
import { staffTable } from "./staff";

export const activityLogsTable = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  details: text("details"),
  messageCount: integer("message_count").default(0),
  voiceMinutes: integer("voice_minutes").default(0),
  weekStart: timestamp("week_start"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ createdAt: true });
export const selectActivityLogSchema = createSelectSchema(activityLogsTable);
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
