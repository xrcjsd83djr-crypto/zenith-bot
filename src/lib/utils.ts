import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { guildsTable, staffTable, ranksTable } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import type { Guild, GuildMember } from "discord.js";

export function generateId(): string {
  return nanoid(21);
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function ensureGuild(guild: Guild): Promise<void> {
  const existing = await db.select().from(guildsTable).where(eq(guildsTable.id, guild.id)).limit(1);
  if (!existing[0]) {
    await db.insert(guildsTable).values({
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL(),
    });
    console.log(`[Zenith] Registered new guild: ${guild.name} (${guild.id})`);
  } else {
    await db.update(guildsTable)
      .set({ name: guild.name, iconUrl: guild.iconURL(), updatedAt: new Date() })
      .where(eq(guildsTable.id, guild.id));
  }
}

export async function getStaffMember(guildId: string, discordId: string) {
  const result = await db.select().from(staffTable)
    .where(and(eq(staffTable.guildId, guildId), eq(staffTable.discordId, discordId)))
    .limit(1);
  return result[0] ?? null;
}

export async function isStaff(guildId: string, discordId: string): Promise<boolean> {
  const member = await getStaffMember(guildId, discordId);
  return member !== null && member.isActive;
}

export async function getGuildConfig(guildId: string) {
  const result = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId)).limit(1);
  return result[0] ?? null;
}

export async function getRankByName(guildId: string, name: string) {
  const result = await db.select().from(ranksTable)
    .where(and(eq(ranksTable.guildId, guildId), eq(ranksTable.name, name)))
    .limit(1);
  return result[0] ?? null;
}

export async function isPremium(guildId: string): Promise<boolean> {
  const config = await getGuildConfig(guildId);
  if (!config) return false;
  if (!config.isPremium) return false;
  if (config.premiumExpiresAt && config.premiumExpiresAt < new Date()) return false;
  return true;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
