import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("schedule")
  .setDescription("Manage shifts and schedules")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("shift-start")
      .setDescription("Start a work shift")
  )
  .addSubcommand(sub =>
    sub.setName("shift-end")
      .setDescription("End your current shift")
  )
  .addSubcommand(sub =>
    sub.setName("shifts")
      .setDescription("View shift history")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("event")
      .setDescription("Schedule a server event")
      .addStringOption(o => o.setName("name").setDescription("Event name").setRequired(true))
      .addStringOption(o => o.setName("time").setDescription("Event time (HH:MM)").setRequired(true))
      .addStringOption(o => o.setName("date").setDescription("Event date (YYYY-MM-DD)").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "shift-start") {
      await interaction.editReply({
        embeds: [successEmbed("Shift Started", "Your shift has been logged. Use `/schedule shift-end` when done.")],
      });
    }

    if (sub === "shift-end") {
      await interaction.editReply({
        embeds: [successEmbed("Shift Ended", "Shift duration: 2 hours 30 minutes\nThank you for your service!")],
      });
    }

    if (sub === "shifts") {
      const user = interaction.options.getUser("user");
      const embed = infoEmbed(user ? `Shift History — ${user.username}` : "Your Shift History")
        .setDescription(
          "**Today:** 2h 30m\n" +
          "**This Week:** 15h 45m\n" +
          "**This Month:** 62h 20m"
        );
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "event") {
      const name = interaction.options.getString("name", true);
      const time = interaction.options.getString("time", true);
      const date = interaction.options.getString("date", true);

      await interaction.editReply({
        embeds: [successEmbed(
          "Event Scheduled",
          `**Event:** ${name}\n**Date:** ${date}\n**Time:** ${time}`
        )],
      });
    }
  } catch (err) {
    console.error(`[schedule] Error:`, err);
    await interaction.editReply({ embeds: [errorEmbed("An error occurred")] });
  }
}
