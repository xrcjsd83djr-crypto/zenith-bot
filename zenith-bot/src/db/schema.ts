import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Helper for current timestamp default
const now = () => sql`(CURRENT_TIMESTAMP)`;

export const guildsTable = sqliteTable("guilds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  isPremium: integer("is_premium", { mode: "boolean" }).notNull().default(false),
  premiumExpiresAt: text("premium_expires_at"),
  staffRoleId: text("staff_role_id"),
  managementRoleId: text("management_role_id"),
  logChannelId: text("log_channel_id"),
  applicationChannelId: text("application_channel_id"),
  applicationReviewChannelId: text("application_review_channel_id"),
  welcomeChannelId: text("welcome_channel_id"),
  embedColor: text("embed_color").notNull().default("#5865F2"),
  embedFooter: text("embed_footer").default("Zenith Staff Management"),
  customBotName: text("custom_bot_name"),
  customBotAvatar: text("custom_bot_avatar"),
  settings: text("settings", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const ranksTable = sqliteTable("ranks", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  discordRoleId: text("discord_role_id"),
  position: integer("position").notNull().default(0),
  color: text("color").default("#5865F2"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  permissions: text("permissions", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const divisionsTable = sqliteTable("divisions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  discordRoleId: text("discord_role_id"),
  channelId: text("channel_id"),
  color: text("color").default("#5865F2"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const staffTable = sqliteTable("staff", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  discordId: text("discord_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  discordAvatarUrl: text("discord_avatar_url"),
  robloxId: text("roblox_id"),
  robloxUsername: text("roblox_username"),
  callsign: text("callsign"),
  rankId: text("rank_id").references(() => ranksTable.id, { onDelete: "set null" }),
  divisionId: text("division_id").references(() => divisionsTable.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  strikeCount: integer("strike_count").notNull().default(0),
  joinedAt: text("joined_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  hiredById: text("hired_by_id"),
  notes: text("notes"),
});

export const applicationsTable = sqliteTable("applications", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  applicantDiscordId: text("applicant_discord_id").notNull(),
  applicantUsername: text("applicant_username").notNull(),
  robloxUsername: text("roblox_username"),
  status: text("status").$type<"pending" | "reviewing" | "interview" | "accepted" | "denied" | "withdrawn">().notNull().default("pending"),
  answers: text("answers", { mode: "json" }).$type<Array<{ question: string; answer: string }>>().notNull().default([]),
  reviewerId: text("reviewer_id"),
  reviewerUsername: text("reviewer_username"),
  reviewNotes: text("review_notes"),
  messageId: text("message_id"),
  threadId: text("thread_id"),
  submittedAt: text("submitted_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  reviewedAt: text("reviewed_at"),
});

export const applicationQuestionsTable = sqliteTable("application_questions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  placeholder: text("placeholder"),
  position: integer("position").notNull().default(0),
  isRequired: integer("is_required", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const strikesTable = sqliteTable("strikes", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  issuedById: text("issued_by_id").notNull(),
  issuedByUsername: text("issued_by_username").notNull(),
  severity: text("severity").$type<"warning" | "strike" | "final_warning">().notNull().default("strike"),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  appealStatus: text("appeal_status").$type<"none" | "pending" | "accepted" | "denied">().notNull().default("none"),
  appealReason: text("appeal_reason"),
  removedById: text("removed_by_id"),
  removedAt: text("removed_at"),
  issuedAt: text("issued_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  expiresAt: text("expires_at"),
});

export const loasTable = sqliteTable("loas", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").$type<"pending" | "approved" | "denied" | "active" | "expired">().notNull().default("pending"),
  reviewerId: text("reviewer_id"),
  reviewerUsername: text("reviewer_username"),
  reviewNotes: text("review_notes"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  requestedAt: text("requested_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  reviewedAt: text("reviewed_at"),
});

export const promotionsTable = sqliteTable("promotions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  type: text("type").$type<"promotion" | "demotion" | "transfer">().notNull(),
  fromRankId: text("from_rank_id"),
  toRankId: text("to_rank_id"),
  fromRankName: text("from_rank_name"),
  toRankName: text("to_rank_name"),
  reason: text("reason"),
  promotedById: text("promoted_by_id").notNull(),
  promotedByUsername: text("promoted_by_username").notNull(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
