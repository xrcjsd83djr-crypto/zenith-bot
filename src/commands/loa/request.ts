import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { db } from "../../db/index.js";
import { staffTable, loasTable, guildsTable } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { successEmbed, errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("loa")
  .setDescription("Submit a Leave of Absence request")
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for your LOA").setRequired(true))
  .addStringOption((opt) => opt.setName("duration").setDescription("How long will you be gone? (e.g. '1 week', '3 days')").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });
  await ensureGuild(interaction.guild);

  const reason = interaction.options.getString("reason", true);
  const duration = interaction.options.getString("duration", true);
  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  const staffMember = await db.select().from(staffTable)
    .where(and(eq(staffTable.guildId, interaction.guild.id), eq(staffTable.discordId, interaction.user.id))).limit(1);

  if (!staffMember[0] || !staffMember[0].isActive) {
    await interaction.editReply({ embeds: [errorEmbed("You must be an active staff member to request an LOA.")] });
    return;
  }

  const activeLoa = await db.select().from(loasTable)
    .where(and(eq(loasTable.staffId, staffMember[0].id), eq(loasTable.status, "pending"))).limit(1);

  if (activeLoa.length > 0) {
    await interaction.editReply({ embeds: [errorEmbed("You already have a pending LOA request.")] });
    return;
  }

  const loaId = nanoid(21);
  await db.insert(loasTable).values({
    id: loaId,
    guildId: interaction.guild.id,
    staffId: staffMember[0].id,
    reason: `${reason} (Duration: ${duration})`,
    status: "pending",
  });

  await interaction.editReply({ embeds: [successEmbed("LOA Requested", `Your Leave of Absence request has been submitted.\n**Reason:** ${reason}\n**Duration:** ${duration}\n\nYou will be notified when it's reviewed.`, color, footer)] });

  // Post to log channel for review
  const guildConfig = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id)).limit(1);
  if (guildConfig[0]?.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(guildConfig[0].logChannelId);
    if (logChannel?.isTextBased()) {
      const loaEmbed = new EmbedBuilder().setColor(color).setTitle("📝 LOA Request")
        .setDescription(`**Staff Member:** <@${interaction.user.id}> (${interaction.user.username})\n**Reason:** ${reason}\n**Duration:** ${duration}`)
        .setFooter({ text: `LOA ID: ${loaId} • ${footer}` }).setTimestamp();

      const approveBtn = new ButtonBuilder().setCustomId(`loa_approve_${loaId}`).setLabel("Approve").setStyle(ButtonStyle.Success);
      const denyBtn = new ButtonBuilder().setCustomId(`loa_deny_${loaId}`).setLabel("Deny").setStyle(ButtonStyle.Danger);

      await (logChannel as any).send({ embeds: [loaEmbed], components: [new ActionRowBuilder<any>().addComponents(approveBtn, denyBtn)] });
    }
  }
}
