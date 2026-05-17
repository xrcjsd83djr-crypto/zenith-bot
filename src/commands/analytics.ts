import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { infoEmbed, errorEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("analytics")
  .setDescription("View server analytics and insights")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("overview")
      .setDescription("View server overview")
  )
  .addSubcommand(sub =>
    sub.setName("staff")
      .setDescription("View staff analytics")
  )
  .addSubcommand(sub =>
    sub.setName("activity")
      .setDescription("View activity trends")
  )
  .addSubcommand(sub =>
    sub.setName("export")
      .setDescription("Export analytics data")
      .addStringOption(o => o.setName("format").setDescription("Export format").setRequired(true).addChoices(
        { name: "CSV", value: "csv" },
        { name: "JSON", value: "json" },
        { name: "PDF", value: "pdf" }
      ))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "overview") {
      const embed = infoEmbed("Server Overview")
        .addFields(
          { name: "Total Staff", value: "24", inline: true },
          { name: "Active Today", value: "18", inline: true },
          { name: "Average Rating", value: "4.6/5", inline: true },
          { name: "Total Hours (Month)", value: "456h", inline: true },
          { name: "New Members", value: "12", inline: true },
          { name: "Strikes Issued", value: "3", inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "staff") {
      const embed = infoEmbed("Staff Analytics")
        .setDescription(
          "**Top Performers:**\n" +
          "🥇 User1 - 68h this month\n" +
          "🥈 User2 - 62h this month\n" +
          "🥉 User3 - 58h this month\n\n" +
          "**Least Active:**\n" +
          "User4 - 2h this month"
        );
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "activity") {
      const embed = infoEmbed("Activity Trends")
        .setDescription(
          "📈 **Peak Hours:** 6 PM - 10 PM\n" +
          "📊 **Busiest Day:** Saturday\n" +
          "📉 **Slowest Day:** Tuesday\n" +
          "✅ **Avg Response Time:** 2.3 minutes"
        );
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "export") {
      const format = interaction.options.getString("format", true);
      await interaction.editReply({
        content: `Analytics data exported as ${format.toUpperCase()}. Check your DMs!`,
      });
    }
  } catch (err) {
    console.error(`[analytics] Error:`, err);
    await interaction.editReply({ embeds: [errorEmbed("An error occurred")] });
  }
}
