import { EmbedBuilder, type ColorResolvable } from "discord.js";
import { db } from "@workspace/db";
import { guildsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ZENITH_COLOR = "#5865F2" as ColorResolvable;
const ZENITH_FOOTER = "Zenith Staff Management";

export async function getGuildEmbed(guildId: string): Promise<{ color: ColorResolvable; footer: string }> {
  try {
    const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId)).limit(1);
    if (guild[0]) {
      return {
        color: (guild[0].embedColor || ZENITH_COLOR) as ColorResolvable,
        footer: guild[0].embedFooter || ZENITH_FOOTER,
      };
    }
  } catch {}
  return { color: ZENITH_COLOR, footer: ZENITH_FOOTER };
}

export function zenithEmbed(color: ColorResolvable = ZENITH_COLOR, footer = ZENITH_FOOTER): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: footer })
    .setTimestamp();
}

export function successEmbed(title: string, description: string, color: ColorResolvable = ZENITH_COLOR, footer = ZENITH_FOOTER): EmbedBuilder {
  return zenithEmbed(color, footer)
    .setTitle(`✓  ${title}`)
    .setDescription(description);
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#ED4245")
    .setTitle("Something went wrong")
    .setDescription(description)
    .setFooter({ text: ZENITH_FOOTER })
    .setTimestamp();
}

export function infoEmbed(title: string, description: string, color: ColorResolvable = ZENITH_COLOR, footer = ZENITH_FOOTER): EmbedBuilder {
  return zenithEmbed(color, footer)
    .setTitle(title)
    .setDescription(description);
}
