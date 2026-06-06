import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { db } from "../../db/index.js";
import { applicationsTable, applicationQuestionsTable, guildsTable } from "../../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild, generateId } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("apply")
  .setDescription("Apply to join the staff team");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await ensureGuild(interaction.guild);

  const guildConfig = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id)).limit(1);
  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  const questions = await db.select().from(applicationQuestionsTable)
    .where(eq(applicationQuestionsTable.guildId, interaction.guild.id)).orderBy(asc(applicationQuestionsTable.position));

  if (questions.length === 0) {
    await interaction.reply({ embeds: [errorEmbed("Applications are not set up for this server yet. Contact an administrator.")], ephemeral: true });
    return;
  }

  // Build modal with up to 5 questions (Discord limit)
  const modal = new ModalBuilder().setCustomId("staff_application").setTitle("Staff Application");
  const modalQuestions = questions.slice(0, 5);

  for (const q of modalQuestions) {
    const input = new TextInputBuilder()
      .setCustomId(`q_${q.id}`)
      .setLabel(q.question.slice(0, 45))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(q.isRequired)
      .setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder<any>().addComponents(input));
  }

  await interaction.showModal(modal);

  try {
    const submitted = await interaction.awaitModalSubmit({ filter: (i) => i.user.id === interaction.user.id, time: 10 * 60 * 1000 });
    await submitted.deferReply({ ephemeral: true });

    const answers = modalQuestions.map((q) => ({
      question: q.question,
      answer: submitted.fields.getTextInputValue(`q_${q.id}`),
    }));

    const appId = generateId();
    await db.insert(applicationsTable).values({
      id: appId,
      guildId: interaction.guild.id,
      applicantDiscordId: interaction.user.id,
      applicantUsername: interaction.user.username,
      answers,
      status: "pending",
    });

    // Post to application review channel
    if (guildConfig[0]?.applicationReviewChannelId) {
      const reviewChannel = interaction.guild.channels.cache.get(guildConfig[0].applicationReviewChannelId);
      if (reviewChannel?.isTextBased()) {
        const reviewEmbed = new EmbedBuilder().setColor(color as any)
          .setTitle("📋 New Staff Application")
          .setDescription(`**Applicant:** <@${interaction.user.id}> (${interaction.user.username})`)
          .addFields(answers.map((a) => ({ name: a.question, value: a.answer || "No answer" })))
          .setFooter({ text: `Application ID: ${appId} • ${footer}` }).setTimestamp();

        const acceptBtn = new ButtonBuilder().setCustomId(`app_accept_${appId}`).setLabel("Accept").setStyle(ButtonStyle.Success);
        const denyBtn = new ButtonBuilder().setCustomId(`app_deny_${appId}`).setLabel("Deny").setStyle(ButtonStyle.Danger);
        const reviewBtn = new ButtonBuilder().setCustomId(`app_review_${appId}`).setLabel("Mark as Reviewing").setStyle(ButtonStyle.Secondary);

        await (reviewChannel as any).send({ embeds: [reviewEmbed], components: [new ActionRowBuilder<any>().addComponents(acceptBtn, reviewBtn, denyBtn)] });
      }
    }

    await submitted.editReply({ embeds: [{ color: parseInt(color.replace("#", ""), 16), title: "✅ Application Submitted", description: "Your application has been submitted! You'll be notified of the outcome.", footer: { text: footer } }] });
  } catch {
    // Modal timeout — no action needed
  }
}
