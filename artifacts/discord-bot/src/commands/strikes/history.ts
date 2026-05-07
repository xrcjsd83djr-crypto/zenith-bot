import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db } from "@workspace/db";
import { staffTable, strikesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild, formatDate } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("strikes")
  .setDescription("View strike history for a staff member")
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
    .limit(15);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Strike History — ${target.username}`)
    .setThumbnail(target.displayAvatarURL())
    .setFooter({ text: footer })
    .setTimestamp();

  if (strikes.length === 0) {
    embed.setDescription("No strikes on record.");
  } else {
    const active = strikes.filter((s) => s.isActive).length;
    embed.setDescription(`**${active}** active strike${active !== 1 ? "s" : ""} out of **${strikes.length}** total`);
    strikes.forEach((s, i) => {
      const severityIcon = { warning: "⚠️", strike: "🔴", final_warning: "🚨" }[s.severity] ?? "•";
      const status = s.isActive ? "Active" : "Removed";
      embed.addFields({
        name: `${severityIcon} Strike #${i + 1} — ${status}`,
        value: `**Reason:** ${s.reason}\n**Issued by:** ${s.issuedByUsername}\n**Date:** ${formatDate(s.issuedAt)}`,
      });
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
