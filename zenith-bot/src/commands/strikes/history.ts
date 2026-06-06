import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db } from "../../db/index.js";
import { staffTable, strikesTable } from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild, formatDate } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("strike-history")
  .setDescription("View the strike history of a staff member")
  .addUserOption((opt) => opt.setName("member").setDescription("Staff member").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });
  await ensureGuild(interaction.guild);

  const target = interaction.options.getUser("member", true);
  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  const staffMember = await db.select().from(staffTable)
    .where(and(eq(staffTable.guildId, interaction.guild.id), eq(staffTable.discordId, target.id))).limit(1);

  if (!staffMember[0]) {
    await interaction.editReply({ embeds: [errorEmbed(`${target.username} is not a staff member.`)] });
    return;
  }

  const strikes = await db.select().from(strikesTable)
    .where(eq(strikesTable.staffId, staffMember[0].id))
    .orderBy(desc(strikesTable.issuedAt))
    .limit(10);

  const activeCount = strikes.filter(s => s.isActive).length;

  const embed = new EmbedBuilder()
    .setColor(color as any)
    .setTitle(`Strike History — ${target.username}`)
    .setDescription(strikes.length === 0 ? "No strikes on record." : strikes.map((s, i) => {
      const status = s.isActive ? "🔴 Active" : "✅ Removed";
      const severity = { warning: "⚠️", strike: "🔴", final_warning: "🚨" }[s.severity] ?? "🔴";
      return `${severity} **${i + 1}.** ${s.reason} — ${status}\n   *Issued by ${s.issuedByUsername} on ${formatDate(s.issuedAt)}*`;
    }).join("\n\n"))
    .addFields({ name: "Active Strikes", value: `${activeCount}`, inline: true }, { name: "Total on Record", value: `${strikes.length}`, inline: true })
    .setFooter({ text: footer }).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
