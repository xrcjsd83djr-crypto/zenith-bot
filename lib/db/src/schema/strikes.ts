import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";
import { staffTable } from "./staff";

export const strikeSeverityEnum = ["warning", "strike", "final_warning"] as const;
export type StrikeSeverity = typeof strikeSeverityEnum[number];

export const strikesTable = pgTable("strikes", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  issuedById: text("issued_by_id").notNull(),
  issuedByUsername: text("issued_by_username").notNull(),
  severity: text("severity").$type<StrikeSeverity>().notNull().default("strike"),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  isActive: boolean("is_active").notNull().default(true),
  appealStatus: text("appeal_status").$type<"none" | "pending" | "accepted" | "denied">().notNull().default("none"),
  appealReason: text("appeal_reason"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  removedAt: timestamp("removed_at"),
  removedById: text("removed_by_id"),
});

export const insertStrikeSchema = createInsertSchema(strikesTable).omit({ issuedAt: true });
export const selectStrikeSchema = createSelectSchema(strikesTable);
export type InsertStrike = z.infer<typeof insertStrikeSchema>;
export type Strike = typeof strikesTable.$inferSelect;
