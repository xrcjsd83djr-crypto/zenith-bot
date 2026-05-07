import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ComponentType,
} from "discord.js";
import { db } from "@workspace/db";
import { staffTable, ranksTable, promotionsTable, guildsTable } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { successEmbed, errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("demote")
  .setDescription("Demote a staff member")
  .addUserOption((opt) => opt.setName("member").setDescription("Staff member to demote").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for demotion").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });
  await ensureGuild(interaction.guild);

  const target = interaction.options.getUser("member", true);
  const reason = interaction.options.getString("reason", true);
  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  const staffMember = await db
    .select()
    .from(staffTable)
    .where(and(eq(staffTable.guildId, interaction.guild.id), eq(staffTable.discordId, target.id)))
    .limit(1);

  if (!staffMember[0] || !staffMember[0].isActive) {
    await interaction.editReply({ embeds: [errorEmbed(`${target.username} is not an active staff member.`)] });
    return;
  }

  const ranks = await db.select().from(ranksTable).where(eq(ranksTable.guildId, interaction.guild.id)).orderBy(asc(ranksTable.position));
  const currentRank = staffMember[0].rankId ? ranks.find((r) => r.id === staffMember[0].rankId) : null;
  const availableRanks = ranks.filter((r) => r.id !== staffMember[0].rankId);

  if (availableRanks.length === 0) {
    await interaction.editReply({ embeds: [errorEmbed("No other ranks to demote to.")] });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("demote_rank")
    .setPlaceholder("Select new rank")
    .addOptions(availableRanks.slice(0, 25).map((r) => ({ label: r.name, value: r.id })));

  const embed = new EmbedBuilder()
    .setColor("#ED4245")
    .setTitle("Select New Rank")
    .setDescription(`Demoting **${target.username}**\nCurrent rank: **${currentRank?.name ?? "None"}**\n**Reason:** ${reason}`)
    .setFooter({ text: footer })
    .setTimestamp();

  const response = await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder<any>().addComponents(select)] });

  try {
    const selectInteraction = await response.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      componentType: ComponentType.StringSelect,
      time: 60_000,
    });

    const selectedRank = ranks.find((r) => r.id === selectInteraction.values[0]);
    if (!selectedRank) return;

    await db.update(staffTable).set({ rankId: selectedRank.id, updatedAt: new Date() }).where(eq(staffTable.id, staffMember[0].id));
    await db.insert(promotionsTable).values({
      id: nanoid(21),
      guildId: interaction.guild.id,
      staffId: staffMember[0].id,
      type: "demotion",
      fromRankId: currentRank?.id ?? null,
      toRankId: selectedRank.id,
      fromRankName: currentRank?.name ?? null,
      toRankName: selectedRank.name,
      reason,
      promotedById: interaction.user.id,
      promotedByUsername: interaction.user.username,
    });

    if (currentRank?.discordRoleId) {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (member) await member.roles.remove(currentRank.discordRoleId).catch(() => null);
    }
    if (selectedRank.discordRoleId) {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (member) await member.roles.add(selectedRank.discordRoleId).catch(() => null);
    }

    const successMsg = successEmbed("Staff Demoted", `**${target.username}** has been demoted to **${selectedRank.name}**\n**Reason:** ${reason}`, "#ED4245", footer);
    await selectInteraction.update({ embeds: [successMsg], components: [] });

    const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id)).limit(1);
    if (guild[0]?.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(guild[0].logChannelId);
      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder().setColor("#ED4245").setTitle("Staff Demoted")
          .addFields(
            { name: "Staff Member", value: `<@${target.id}>`, inline: true },
            { name: "Demoted By", value: `<@${interaction.user.id}>`, inline: true },
            { name: "From", value: currentRank?.name ?? "None", inline: true },
            { name: "To", value: selectedRank.name, inline: true },
            { name: "Reason", value: reason },
          )
          .setFooter({ text: footer }).setTimestamp();
        await (logChannel as any).send({ embeds: [logEmbed] });
      }
    }
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("Selection timed out.")], components: [] });
  }
}
