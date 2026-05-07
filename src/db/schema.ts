import { pgTable, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

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
  embedFooter: text("embed_footer").default("Zenith Staff Management"),
  customBotName: text("custom_bot_name"),
  customBotAvatar: text("custom_bot_avatar"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

export const divisionsTable = pgTable("divisions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  discordRoleId: text("discord_role_id"),
  color: text("color").default("#5865F2"),
  leaderId: text("leader_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const staffTable = pgTable("staff", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  discordId: text("discord_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  robloxUsername: text("roblox_username"),
  callsign: text("callsign"),
  rankId: text("rank_id").references(() => ranksTable.id, { onDelete: "set null" }),
  divisionId: text("division_id").references(() => divisionsTable.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  strikeCount: integer("strike_count").notNull().default(0),
  notes: text("notes"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const applicationsTable = pgTable("applications", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  applicantDiscordId: text("applicant_discord_id").notNull(),
  applicantUsername: text("applicant_username").notNull(),
  robloxUsername: text("roblox_username"),
  status: text("status").$type<"pending" | "reviewing" | "interview" | "accepted" | "denied" | "withdrawn">().notNull().default("pending"),
  answers: jsonb("answers").$type<Array<{ question: string; answer: string }>>().notNull().default([]),
  reviewerId: text("reviewer_id"),
  reviewerUsername: text("reviewer_username"),
  reviewNotes: text("review_notes"),
  messageId: text("message_id"),
  threadId: text("thread_id"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const applicationQuestionsTable = pgTable("application_questions", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  position: integer("position").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const strikesTable = pgTable("strikes", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  issuedById: text("issued_by_id").notNull(),
  issuedByUsername: text("issued_by_username").notNull(),
  severity: text("severity").$type<"warning" | "strike" | "final_warning">().notNull().default("strike"),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  isActive: boolean("is_active").notNull().default(true),
  removedById: text("removed_by_id"),
  removedAt: timestamp("removed_at"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});

export const loasTable = pgTable("loas", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").$type<"pending" | "approved" | "denied" | "active" | "expired">().notNull().default("pending"),
  reviewerId: text("reviewer_id"),
  reviewerUsername: text("reviewer_username"),
  reviewNotes: text("review_notes"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const promotionsTable = pgTable("promotions", {
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
  promotedAt: timestamp("promoted_at").notNull().defaultNow(),
});

export const meetingsTable = pgTable("meetings", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60),
  hostId: text("host_id").notNull(),
  hostUsername: text("host_username").notNull(),
  attendeeIds: text("attendee_ids").array().notNull().default([]),
  isCompleted: boolean("is_completed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
