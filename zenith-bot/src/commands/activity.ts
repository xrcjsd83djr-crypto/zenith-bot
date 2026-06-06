import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { api } from "../lib/api.js";
import { infoEmbed, errorEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("activity")
  .setDescription("View staff activity")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addSubcommand(sub =>
    sub.setName("leaderboard")
      .setDescription("Show the activity leaderboard")
  )
  .addSubcommand(sub =>
    sub.setName("log")
      .setDescription("Log a custom activity entry")
      .addStringOption(o => o.setName("type").setDescription("Activity type").setRequired(true)
        .addChoices(
          { name: "Patrol", value: "patrol" },
          { name: "Meeting", value: "meeting" },
          { name: "Training", value: "training" },
          { name: "Event", value: "event" },
          { name: "Other", value: "other" },
        ))
      .addStringOption(o => o.setName("description").setDescription("Description").setRequired(true))
      .addIntegerOption(o => o.setName("duration").setDescription("Duration in minutes").setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: false });

  if (sub === "leaderboard") {
    try {
      const leaderboard = await api.activity.log(guildId, { type: "query_leaderboard", description: "leaderboard query" }).catch(() => null);

      const embed = infoEmbed("Activity Leaderboard")
        .setDescription("Activity leaderboard is best viewed on the dashboard.")
        .setFooter({ text: `Visit the Zenith dashboard for full analytics` });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to fetch leaderboard")] });
    }
  }

  if (sub === "log") {
    const type = interaction.options.getString("type", true);
    const description = interaction.options.getString("description", true);
    const duration = interaction.options.getInteger("duration") ?? undefined;

    try {
      await api.activity.log(guildId, {
        userId: interaction.user.id,
        username: interaction.user.username,
        type,
        description,
        duration,
      });

      const embed = infoEmbed("Activity Logged", `Your activity has been recorded.`)
        .addFields(
          { name: "Type", value: type, inline: true },
          { name: "Description", value: description, inline: false },
          ...(duration ? [{ name: "Duration", value: `${duration} minutes`, inline: true }] : []),
        );

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to log activity")] });
    }
  }
}
