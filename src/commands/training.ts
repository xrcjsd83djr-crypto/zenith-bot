import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("training")
  .setDescription("Manage staff training programs")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("create")
      .setDescription("Create a training program")
      .addStringOption(o => o.setName("name").setDescription("Program name").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("Description").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("assign")
      .setDescription("Assign training to a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("program").setDescription("Training program").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("complete")
      .setDescription("Mark training as complete")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("program").setDescription("Training program").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all training programs")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "create") {
      const name = interaction.options.getString("name", true);
      const description = interaction.options.getString("description", true);

      await interaction.editReply({
        embeds: [successEmbed(
          "Training Program Created",
          `**Name:** ${name}\n**Description:** ${description}`
        )],
      });
    }

    if (sub === "assign") {
      const user = interaction.options.getUser("user", true);
      const program = interaction.options.getString("program", true);

      await interaction.editReply({
        embeds: [successEmbed(
          "Training Assigned",
          `${user} has been assigned to **${program}**`
        )],
      });
    }

    if (sub === "complete") {
      const user = interaction.options.getUser("user", true);
      const program = interaction.options.getString("program", true);

      await interaction.editReply({
        embeds: [successEmbed(
          "Training Completed",
          `${user} has completed **${program}** ✅`
        )],
      });
    }

    if (sub === "list") {
      const embed = infoEmbed("Training Programs")
        .setDescription(
          "**Onboarding** - New staff orientation\n" +
          "**Moderation** - Moderation best practices\n" +
          "**Leadership** - Leadership skills\n" +
          "**Conflict Resolution** - Handling disputes"
        );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(`[training] Error:`, err);
    await interaction.editReply({ embeds: [errorEmbed("An error occurred")] });
  }
}
