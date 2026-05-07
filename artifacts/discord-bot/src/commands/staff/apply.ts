import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  type ModalSubmitInteraction,
} from "discord.js";
import { db } from "@workspace/db";
import { applicationsTable, applicationQuestionsTable, guildsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { successEmbed, errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("apply")
  .setDescription("Apply to join the staff team");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [errorEmbed("This command can only be used in a server.")], ephemeral: true });
    return;
  }

  await ensureGuild(interaction.guild);

  const questions = await db
    .select()
    .from(applicationQuestionsTable)
    .where(eq(applicationQuestionsTable.guildId, interaction.guild.id))
    .orderBy(applicationQuestionsTable.position);

  if (questions.length === 0) {
    await interaction.reply({
      embeds: [errorEmbed("Applications are not currently set up for this server. Ask a manager to configure them.")],
      ephemeral: true,
    });
    return;
  }

  const existing = await db
    .select()
    .from(applicationsTable)
    .where(
      and(
        eq(applicationsTable.guildId, interaction.guild.id),
        eq(applicationsTable.applicantDiscordId, interaction.user.id),
        eq(applicationsTable.status, "pending"),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await interaction.reply({
      embeds: [errorEmbed("You already have a pending application. Please wait for it to be reviewed.")],
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`apply_${interaction.guild.id}`)
    .setTitle("Staff Application");

  const maxFields = Math.min(questions.length, 5);
  for (let i = 0; i < maxFields; i++) {
    const q = questions[i];
    const input = new TextInputBuilder()
      .setCustomId(`q_${q.id}`)
      .setLabel(q.question.slice(0, 45))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(q.isRequired)
      .setMaxLength(1000);
    if (q.placeholder) input.setPlaceholder(q.placeholder.slice(0, 100));
    modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(input));
  }

  await interaction.showModal(modal);

  try {
    const modalInteraction = await interaction.awaitModalSubmit({
      filter: (i: ModalSubmitInteraction) => i.customId === `apply_${interaction.guild!.id}` && i.user.id === interaction.user.id,
      time: 300_000,
    });

    const answers = questions.slice(0, maxFields).map((q) => ({
      question: q.question,
      answer: modalInteraction.fields.getTextInputValue(`q_${q.id}`) || "",
    }));

    await db.insert(applicationsTable).values({
      id: nanoid(21),
      guildId: interaction.guild.id,
      applicantDiscordId: interaction.user.id,
      applicantUsername: interaction.user.username,
      status: "pending",
      answers,
    });

    const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id)).limit(1);
    const { color, footer } = await getGuildEmbed(interaction.guild.id);
    const embed = successEmbed(
      "Application Submitted",
      "Your application has been submitted successfully. You will be notified once it has been reviewed.\n\nPlease be patient and do not reapply.",
      color,
      footer,
    );

    await modalInteraction.reply({ embeds: [embed], ephemeral: true });

    if (guild[0]?.applicationReviewChannelId) {
      const channel = interaction.guild.channels.cache.get(guild[0].applicationReviewChannelId);
      if (channel?.isTextBased()) {
        const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder: AR } = await import("discord.js");
        const reviewEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle("New Staff Application")
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .setFooter({ text: footer })
          .setTimestamp();

        answers.forEach(({ question, answer }) => {
          reviewEmbed.addFields({ name: question, value: answer.slice(0, 1024) || "*No answer*" });
        });

        const acceptBtn = new ButtonBuilder().setCustomId(`app_accept_${interaction.guild!.id}_${nanoid(10)}`).setLabel("Accept").setStyle(ButtonStyle.Success);
        const denyBtn = new ButtonBuilder().setCustomId(`app_deny_${interaction.guild!.id}_${nanoid(10)}`).setLabel("Deny").setStyle(ButtonStyle.Danger);
        const row = new AR<any>().addComponents(acceptBtn, denyBtn);

        await (channel as any).send({ embeds: [reviewEmbed], components: [row] });
      }
    }
  } catch {
    // Modal timed out — no action needed
  }
}
