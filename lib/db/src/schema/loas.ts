import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";
import { staffTable } from "./staff";

export const loaStatusEnum = ["pending", "approved", "denied", "active", "expired"] as const;
export type LoaStatus = typeof loaStatusEnum[number];

export const loasTable = pgTable("loas", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").$type<LoaStatus>().notNull().default("pending"),
  reviewerId: text("reviewer_id"),
  reviewerUsername: text("reviewer_username"),
  reviewNotes: text("review_notes"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertLoaSchema = createInsertSchema(loasTable).omit({ requestedAt: true });
export const selectLoaSchema = createSelectSchema(loasTable);
export type InsertLoa = z.infer<typeof insertLoaSchema>;
export type Loa = typeof loasTable.$inferSelect;
