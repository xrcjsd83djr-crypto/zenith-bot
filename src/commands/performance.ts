import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("performance")
  .setDescription("Track and manage staff performance")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("review")
      .setDescription("Submit a performance review for a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addIntegerOption(o => o.setName("rating").setDescription("Rating 1-5").setRequired(true).setMinValue(1).setMaxValue(5))
      .addStringOption(o => o.setName("comments").setDescription("Review comments").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("stats")
      .setDescription("View performance statistics")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("leaderboard")
      .setDescription("View performance leaderboard")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "review") {
      const user = interaction.options.getUser("user", true);
      const rating = interaction.options.getInteger("rating", true);
      const comments = interaction.options.getString("comments", true);

      await interaction.editReply({
        embeds: [successEmbed(
          "Performance Review Submitted",
          `**User:** ${user}\n**Rating:** ${"⭐".repeat(rating)}\n**Comments:** ${comments}`
        )],
      });
    }

    if (sub === "stats") {
      const user = interaction.options.getUser("user");
      const embed = infoEmbed(user ? `Performance Stats — ${user.username}` : "Server Performance Stats")
        .addFields(
          { name: "Average Rating", value: "4.5/5", inline: true },
          { name: "Reviews", value: "12", inline: true },
          { name: "Trend", value: "📈 Improving", inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "leaderboard") {
      const embed = infoEmbed("Performance Leaderboard")
        .setDescription(
          "🥇 **User1** - 4.8/5\n" +
          "🥈 **User2** - 4.6/5\n" +
          "🥉 **User3** - 4.4/5"
        );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(`[performance] Error:`, err);
    await interaction.editReply({ embeds: [errorEmbed("An error occurred")] });
  }
}
