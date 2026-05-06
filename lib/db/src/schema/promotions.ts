import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";
import { staffTable } from "./staff";
import { ranksTable } from "./ranks";

export const promotionsTable = pgTable("promotions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  type: text("type").$type<"promotion" | "demotion">().notNull(),
  fromRankId: text("from_rank_id").references(() => ranksTable.id, { onDelete: "set null" }),
  toRankId: text("to_rank_id").references(() => ranksTable.id, { onDelete: "set null" }),
  fromRankName: text("from_rank_name"),
  toRankName: text("to_rank_name"),
  reason: text("reason"),
  promotedById: text("promoted_by_id").notNull(),
  promotedByUsername: text("promoted_by_username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotionsTable).omit({ createdAt: true });
export const selectPromotionSchema = createSelectSchema(promotionsTable);
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotionsTable.$inferSelect;
