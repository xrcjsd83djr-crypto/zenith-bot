import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildsTable = pgTable("guilds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  staffRoleId: text("staff_role_id"),
  managementRoleId: text("management_role_id"),
  logChannelId: text("log_channel_id"),
  applicationChannelId: text("application_channel_id"),
  applicationReviewChannelId: text("application_review_channel_id"),
  welcomeChannelId: text("welcome_channel_id"),
  embedColor: text("embed_color").notNull().default("#5865F2"),
  embedFooter: text("embed_footer").default("Staff Management"),
  customBotName: text("custom_bot_name"),
  customBotAvatar: text("custom_bot_avatar"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGuildSchema = createInsertSchema(guildsTable).omit({ createdAt: true, updatedAt: true });
export const selectGuildSchema = createSelectSchema(guildsTable);
export type InsertGuild = z.infer<typeof insertGuildSchema>;
export type Guild = typeof guildsTable.$inferSelect;
