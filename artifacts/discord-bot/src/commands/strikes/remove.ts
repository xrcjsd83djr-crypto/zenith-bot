import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db } from "@workspace/db";
import { staffTable, strikesTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { successEmbed, errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("unstrike")
  .setDescription("Remove a strike from a staff member")
  .addUserOption((opt) => opt.setName("member").setDescription("Staff member").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for removal"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });
  await ensureGuild(interaction.guild);

  const target = interaction.options.getUser("member", true);
  const reason = interaction.options.getString("reason");
  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  const staffMember = await db.select().from(staffTable)
    .where(and(eq(staffTable.guildId, interaction.guild.id), eq(staffTable.discordId, target.id))).limit(1);

  if (!staffMember[0]) {
    await interaction.editReply({ embeds: [errorEmbed(`${target.username} is not a staff member.`)] });
    return;
  }

  const activeStrikes = await db.select().from(strikesTable)
    .where(and(eq(strikesTable.staffId, staffMember[0].id), eq(strikesTable.isActive, true)))
    .limit(1);

  if (activeStrikes.length === 0) {
    await interaction.editReply({ embeds: [errorEmbed(`${target.username} has no active strikes.`)] });
    return;
  }

  await db.update(strikesTable)
    .set({ isActive: false, removedAt: new Date(), removedById: interaction.user.id })
    .where(eq(strikesTable.id, activeStrikes[0].id));

  const [remaining] = await db.select({ total: count() }).from(strikesTable)
    .where(and(eq(strikesTable.staffId, staffMember[0].id), eq(strikesTable.isActive, true)));

  await db.update(staffTable).set({ strikeCount: remaining.total, updatedAt: new Date() }).where(eq(staffTable.id, staffMember[0].id));

  await interaction.editReply({
    embeds: [successEmbed("Strike Removed", `Removed a strike from **${target.username}**${reason ? `\n**Reason:** ${reason}` : ""}\nThey now have **${remaining.total}** active strike${remaining.total !== 1 ? "s" : ""}.`, color, footer)],
  });
}
