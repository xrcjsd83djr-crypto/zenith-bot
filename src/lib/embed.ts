import { EmbedBuilder } from "discord.js";
import { db } from "../db/index.js";
import { guildsTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function getGuildEmbed(guildId: string): Promise<{ color: `#${string}`; footer: string }> {
  const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId)).limit(1);
  return {
    color: (guild[0]?.embedColor ?? "#5865F2") as `#${string}`,
    footer: guild[0]?.embedFooter ?? "Zenith Staff Management",
  };
}

export function successEmbed(title: string, description: string, color: `#${string}` = "#57F287", footer = "Zenith Staff Management"): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`✅  ${title}`)
    .setDescription(description)
    .setFooter({ text: footer })
    .setTimestamp();
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#ED4245")
    .setTitle("❌  Error")
    .setDescription(description)
    .setTimestamp();
}

export function infoEmbed(title: string, description: string, color: `#${string}` = "#5865F2", footer = "Zenith Staff Management"): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`ℹ️  ${title}`)
    .setDescription(description)
    .setFooter({ text: footer })
    .setTimestamp();
}

export function warnEmbed(title: string, description: string, footer = "Zenith Staff Management"): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#FEE75C")
    .setTitle(`⚠️  ${title}`)
    .setDescription(description)
    .setFooter({ text: footer })
    .setTimestamp();
}
