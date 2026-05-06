import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";

export const ranksTable = pgTable("ranks", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  discordRoleId: text("discord_role_id"),
  position: integer("position").notNull().default(0),
  color: text("color").default("#5865F2"),
  isDefault: boolean("is_default").notNull().default(false),
  permissions: text("permissions").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRankSchema = createInsertSchema(ranksTable).omit({ createdAt: true });
export const selectRankSchema = createSelectSchema(ranksTable);
export type InsertRank = z.infer<typeof insertRankSchema>;
export type Rank = typeof ranksTable.$inferSelect;
