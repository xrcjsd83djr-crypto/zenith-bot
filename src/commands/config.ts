import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { api } from "../lib/api.js";
import { infoEmbed, errorEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("View the current Zenith configuration")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;
  try {
    const cfg = await api.config.get(guildId);

    const embed = infoEmbed("Zenith Configuration")
      .addFields(
        { name: "Prefix", value: cfg.prefix ?? "!", inline: true },
        { name: "Timezone", value: cfg.timezone ?? "UTC", inline: true },
        { name: "Strike Threshold", value: String(cfg.strikeThreshold ?? 3), inline: true },
        { name: "Strike Action", value: cfg.strikeAction ?? "demotion", inline: true },
        { name: "Max LOA Days", value: String(cfg.loaMaxDays ?? 14), inline: true },
        { name: "Activity Tracking", value: cfg.activityTrackingEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
        { name: "Log Channel", value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : "Not set", inline: true },
        { name: "Staff Role", value: cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : "Not set", inline: true },
      )
      .setFooter({ text: "Use the Zenith dashboard to change configuration" });

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("Failed to fetch configuration")] });
  }
}
