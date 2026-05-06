import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";

export const divisionsTable = pgTable("divisions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  discordRoleId: text("discord_role_id"),
  channelId: text("channel_id"),
  color: text("color").default("#5865F2"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDivisionSchema = createInsertSchema(divisionsTable).omit({ createdAt: true });
export const selectDivisionSchema = createSelectSchema(divisionsTable);
export type InsertDivision = z.infer<typeof insertDivisionSchema>;
export type Division = typeof divisionsTable.$inferSelect;
