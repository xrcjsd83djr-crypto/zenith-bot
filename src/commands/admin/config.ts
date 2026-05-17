import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { api } from "../../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure Zenith settings for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("view")
      .setDescription("View current configuration")
  )
  .addSubcommand(sub =>
    sub.setName("logs")
      .setDescription("Set the logs channel")
      .addChannelOption(o =>
        o.setName("channel").setDescription("Channel for bot logs").setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand(sub =>
    sub.setName("loa-channel")
      .setDescription("Set the LOA channel")
      .addChannelOption(o =>
        o.setName("channel").setDescription("Channel for LOA requests").setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand(sub =>
    sub.setName("applications")
      .setDescription("Set the applications channel")
      .addChannelOption(o =>
        o.setName("channel").setDescription("Channel for staff applications").setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand(sub =>
    sub.setName("staff-role")
      .setDescription("Set the staff role")
      .addRoleOption(o => o.setName("role").setDescription("Staff role").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("admin-role")
      .setDescription("Set the admin role")
      .addRoleOption(o => o.setName("role").setDescription("Admin role").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("management-role")
      .setDescription("Set the management role")
      .addRoleOption(o => o.setName("role").setDescription("Management role").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("strike-threshold")
      .setDescription("Set the strike threshold for automatic action")
      .addIntegerOption(o =>
        o.setName("count").setDescription("Number of strikes before action (1-20)").setRequired(true).setMinValue(1).setMaxValue(20)
      )
  )
  .addSubcommand(sub =>
    sub.setName("strike-action")
      .setDescription("Set what happens when a member hits the strike threshold")
      .addStringOption(o =>
        o.setName("action").setDescription("Action to take").setRequired(true)
          .addChoices(
            { name: "Demotion", value: "demotion" },
            { name: "Kick from server", value: "kick" },
            { name: "Ban from server", value: "ban" },
            { name: "Remove from staff", value: "fire" },
            { name: "Notify management only", value: "notify" },
          )
      )
  )
  .addSubcommand(sub =>
    sub.setName("loa-max-days")
      .setDescription("Set the maximum LOA duration in days")
      .addIntegerOption(o =>
        o.setName("days").setDescription("Maximum days for an LOA").setRequired(true).setMinValue(1).setMaxValue(365)
      )
  )
  .addSubcommand(sub =>
    sub.setName("reset")
      .setDescription("Reset all Zenith configuration to defaults")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();

  try {
    if (sub === "view") {
      const cfg = await api.config.get(guildId);

      const channelStr = (id: string | null) => id ? `<#${id}>` : "❌ Not set";
      const roleStr = (id: string | null) => id ? `<@&${id}>` : "❌ Not set";

      const embed = infoEmbed("⚙️ Zenith Configuration")
        .addFields(
          { name: "📋 Logs Channel", value: channelStr(cfg.logs_channel_id), inline: true },
          { name: "🏖️ LOA Channel", value: channelStr(cfg.loa_channel_id), inline: true },
          { name: "📝 Applications Channel", value: channelStr(cfg.applications_channel_id), inline: true },
          { name: "👥 Staff Role", value: roleStr(cfg.staff_role_id), inline: true },
          { name: "🔑 Admin Role", value: roleStr(cfg.admin_role_id), inline: true },
          { name: "🛡️ Management Role", value: roleStr(cfg.management_role_id), inline: true },
          { name: "⚠️ Strike Threshold", value: String(cfg.strike_threshold ?? 3), inline: true },
          { name: "⚡ Strike Action", value: cfg.strike_action ?? "demotion", inline: true },
          { name: "📅 Max LOA Days", value: String(cfg.loa_max_days ?? 14), inline: true },
          { name: "🎨 Embed Color", value: cfg.embed_color ?? "#5BA4CF", inline: true },
          { name: "🕐 Timezone", value: cfg.timezone ?? "UTC", inline: true },
        )
        .setFooter({ text: "Use the Zenith dashboard to configure channels/roles with dropdowns" });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Build partial config update
    const update: Record<string, any> = {};

    if (sub === "logs") {
      update.logs_channel_id = interaction.options.getChannel("channel", true).id;
    } else if (sub === "loa-channel") {
      update.loa_channel_id = interaction.options.getChannel("channel", true).id;
    } else if (sub === "applications") {
      update.applications_channel_id = interaction.options.getChannel("channel", true).id;
    } else if (sub === "staff-role") {
      update.staff_role_id = interaction.options.getRole("role", true).id;
    } else if (sub === "admin-role") {
      update.admin_role_id = interaction.options.getRole("role", true).id;
    } else if (sub === "management-role") {
      update.management_role_id = interaction.options.getRole("role", true).id;
    } else if (sub === "strike-threshold") {
      update.strike_threshold = interaction.options.getInteger("count", true);
    } else if (sub === "strike-action") {
      update.strike_action = interaction.options.getString("action", true);
    } else if (sub === "loa-max-days") {
      update.loa_max_days = interaction.options.getInteger("days", true);
    } else if (sub === "reset") {
      update.logs_channel_id = null; update.loa_channel_id = null;
      update.applications_channel_id = null; update.staff_role_id = null;
      update.admin_role_id = null; update.management_role_id = null;
      update.strike_threshold = 3; update.strike_action = "demotion"; update.loa_max_days = 14;
    }

    // Get current config, merge, save
    const current = await api.config.get(guildId).catch(() => ({}));
    const merged = { ...current, ...update };

    const apiUrl = process.env.API_URL ?? "http://localhost:8080/api";
    const res = await fetch(`${apiUrl}/guilds/${guildId}/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": process.env.BOT_SECRET ?? "",
      },
      body: JSON.stringify(merged),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error: ${err}`);
    }

    const labels: Record<string, string> = {
      logs: "Logs channel", "loa-channel": "LOA channel",
      applications: "Applications channel", "staff-role": "Staff role",
      "admin-role": "Admin role", "management-role": "Management role",
      "strike-threshold": "Strike threshold", "strike-action": "Strike action",
      "loa-max-days": "Max LOA days", reset: "All settings",
    };

    const embed = successEmbed(
      sub === "reset" ? "Configuration Reset" : "Configuration Updated",
      sub === "reset"
        ? "All Zenith settings have been reset to defaults."
        : `**${labels[sub] || sub}** has been updated successfully.`
    ).setFooter({ text: "Use /setup view to see all current settings" });

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    console.error("[setup]", err);
    await interaction.editReply({
      embeds: [errorEmbed("Configuration Failed", err.message || "Could not save configuration. Make sure the bot can reach the API.")]
    });
  }
}
