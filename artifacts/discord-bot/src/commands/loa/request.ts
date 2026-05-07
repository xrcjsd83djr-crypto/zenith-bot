import {
  SlashCommandBuilder, type ChatInputCommandInteraction,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, type ModalActionRowComponentBuilder, type ModalSubmitInteraction,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
} from "discord.js";
import { db } from "@workspace/db";
import { staffTable, loasTable, guildsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { successEmbed, errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("loa")
  .setDescription("Submit a Leave of Absence request");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await ensureGuild(interaction.guild);

  const staffMember = await db.select().from(staffTable)
    .where(and(eq(staffTable.guildId, interaction.guild.id), eq(staffTable.discordId, interaction.user.id))).limit(1);

  if (!staffMember[0] || !staffMember[0].isActive) {
    await interaction.reply({ embeds: [errorEmbed("You are not an active staff member.")], ephemeral: true });
    return;
  }

  const pending = await db.select().from(loasTable)
    .where(and(eq(loasTable.staffId, staffMember[0].id), eq(loasTable.status, "pending"))).limit(1);

  if (pending.length > 0) {
    await interaction.reply({ embeds: [errorEmbed("You already have a pending LOA request.")], ephemeral: true });
    return;
  }

  const modal = new ModalBuilder().setCustomId(`loa_${interaction.guild.id}`).setTitle("Leave of Absence Request");
  modal.addComponents(
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      new TextInputBuilder().setCustomId("reason").setLabel("Reason for LOA").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)
    ),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      new TextInputBuilder().setCustomId("duration").setLabel("How long will you be gone? (e.g. 1 week)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
    ),
  );

  await interaction.showModal(modal);

  try {
    const modalInteraction = await interaction.awaitModalSubmit({
      filter: (i: ModalSubmitInteraction) => i.customId === `loa_${interaction.guild!.id}` && i.user.id === interaction.user.id,
      time: 300_000,
    });

    const reason = modalInteraction.fields.getTextInputValue("reason");
    const duration = modalInteraction.fields.getTextInputValue("duration");
    const { color, footer } = await getGuildEmbed(interaction.guild.id);

    await db.insert(loasTable).values({
      id: nanoid(21),
      guildId: interaction.guild.id,
      staffId: staffMember[0].id,
      reason: `${reason} (Duration: ${duration})`,
      status: "pending",
    });

    await modalInteraction.reply({ embeds: [successEmbed("LOA Submitted", "Your leave of absence request has been submitted and is pending approval.", color, footer)], ephemeral: true });

    const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id)).limit(1);
    if (guild[0]?.logChannelId) {
      const ch = interaction.guild.channels.cache.get(guild[0].logChannelId);
      if (ch?.isTextBased()) {
        const reviewEmbed = new EmbedBuilder().setColor(color)
          .setTitle("LOA Request")
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .addFields({ name: "Reason", value: reason }, { name: "Duration", value: duration })
          .setFooter({ text: footer }).setTimestamp();
        const approveBtn = new ButtonBuilder().setCustomId(`loa_approve_${staffMember[0].id}`).setLabel("Approve").setStyle(ButtonStyle.Success);
        const denyBtn = new ButtonBuilder().setCustomId(`loa_deny_${staffMember[0].id}`).setLabel("Deny").setStyle(ButtonStyle.Danger);
        await (ch as any).send({ embeds: [reviewEmbed], components: [new ActionRowBuilder<any>().addComponents(approveBtn, denyBtn)] });
      }
    }
  } catch { /* timed out */ }
}
