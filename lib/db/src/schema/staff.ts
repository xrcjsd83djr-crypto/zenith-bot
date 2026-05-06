import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guildsTable } from "./guilds";
import { ranksTable } from "./ranks";
import { divisionsTable } from "./divisions";

export const staffTable = pgTable("staff", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  discordId: text("discord_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  discordAvatarUrl: text("discord_avatar_url"),
  robloxId: text("roblox_id"),
  robloxUsername: text("roblox_username"),
  rankId: text("rank_id").references(() => ranksTable.id, { onDelete: "set null" }),
  divisionId: text("division_id").references(() => divisionsTable.id, { onDelete: "set null" }),
  callsign: text("callsign"),
  isActive: boolean("is_active").notNull().default(true),
  strikeCount: integer("strike_count").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  hiredById: text("hired_by_id"),
  notes: text("notes"),
});

export const insertStaffSchema = createInsertSchema(staffTable).omit({ joinedAt: true, updatedAt: true });
export const selectStaffSchema = createSelectSchema(staffTable);
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staffTable.$inferSelect;
