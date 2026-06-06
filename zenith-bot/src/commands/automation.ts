import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed, premiumEmbed } from "../lib/embed.js";
import { checkPremium } from "../lib/premium.js";

export const data = new SlashCommandBuilder()
  .setName("automation")
  .setDescription("[Premium] Configure strike automation")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName("status").setDescription("View current automation settings")
  )
  .addSubcommand(sub =>
    sub.setName("setup")
      .setDescription("Configure strike automation")
      .addBooleanOption(o => o.setName("enabled").setDescription("Enable/disable automation").setRequired(true))
      .addIntegerOption(o => o.setName("threshold").setDescription("Strike count to trigger (default: 3)").setMinValue(1).setMaxValue(10))
      .addStringOption(o =>
        o.setName("action").setDescription("What to do when triggered").setRequired(false)
          .addChoices(
            { name: "DM Warning only", value: "dm_warn" },
            { name: "Remove role only", value: "remove_role" },
            { name: "DM + Remove role", value: "dm_and_role" },
          )
      )
      .addRoleOption(o => o.setName("role").setDescription("Role to remove when triggered").setRequired(false))
      .addStringOption(o => o.setName("message").setDescription("Custom DM message sent to the staff member").setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    const isPremium = await checkPremium(guildId);
    if (!isPremium) {
      await interaction.editReply({
        embeds: [errorEmbed("Premium Required ⭐",
          "**Strike Automation** is a Zenith Premium feature.\n\nWhen enabled, the bot automatically DMs staff members and/or removes their roles when they hit the strike threshold.\n\n[Upgrade to Zenith Premium](https://zenithbot.up.railway.app/premium)")],
      });
      return;
    }

    if (sub === "status") {
      const res = await api.get(`/guilds/${guildId}/strike-automation`);
      if (!res.ok) { const err = await res.json() as any; await interaction.editReply({ embeds: [errorEmbed("Error", err.error)] }); return; }
      const cfg = await res.json() as any;
      const embed = premiumEmbed("Strike Automation")
        .addFields(
          { name: "Status",    value: cfg.enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Threshold", value: `${cfg.threshold} strikes`,                  inline: true },
          { name: "Action",    value: cfg.action?.replace(/_/g, " ") || "dm_warn", inline: true },
          ...(cfg.remove_role_id ? [{ name: "Remove Role", value: `<@&${cfg.remove_role_id}>`, inline: true }] : []),
          ...(cfg.dm_message ? [{ name: "DM Message", value: cfg.dm_message, inline: false }] : []),
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "setup") {
      const enabled = interaction.options.getBoolean("enabled", true);
      const threshold = interaction.options.getInteger("threshold") ?? 3;
      const action = interaction.options.getString("action") ?? "dm_warn";
      const role = interaction.options.getRole("role");
      const message = interaction.options.getString("message") ?? undefined;

      const res = await api.post(`/guilds/${guildId}/strike-automation`, {
        enabled, threshold, action, removeRoleId: role?.id ?? null, dmMessage: message,
      });

      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to save", "Could not save automation config.")] }); return; }

      const embed = premiumEmbed("Strike Automation Updated ✅")
        .addFields(
          { name: "Status",    value: enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Threshold", value: `${threshold} strikes`,                  inline: true },
          { name: "Action",    value: action.replace(/_/g, " "),               inline: true },
          ...(role ? [{ name: "Remove Role", value: `<@&${role.id}>`, inline: true }] : []),
          ...(message ? [{ name: "DM Message", value: message, inline: false }] : []),
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err: any) {
    await interaction.editReply({ embeds: [errorEmbed("Error", err.message)] });
  }
}
