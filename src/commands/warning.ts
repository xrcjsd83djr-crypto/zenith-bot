import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
  } from "discord.js";
  import { api } from "../lib/api.js";
  import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

  export const data = new SlashCommandBuilder()
    .setName("warning")
    .setDescription("Manage staff warnings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName("add")
        .setDescription("Issue a warning to a staff member")
        .addUserOption(o => o.setName("user").setDescription("Staff member to warn").setRequired(true))
        .addStringOption(o => o.setName("reason").setDescription("Reason for the warning").setRequired(true))
        .addIntegerOption(o => o.setName("severity").setDescription("Severity 1-3 (default: 1)").setMinValue(1).setMaxValue(3))
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Remove a specific warning by ID")
        .addStringOption(o => o.setName("warning_id").setDescription("Warning ID to remove").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("View warnings for a staff member")
        .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("clear")
        .setDescription("Clear all warnings for a staff member (requires Admin)")
        .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
    );

  export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [errorEmbed("Error", "This command can only be used in a server.")], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === "add") {
        const user = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason", true);
        const severity = interaction.options.getInteger("severity") ?? 1;

        const res = await api.post(`/guilds/${interaction.guildId}/warnings`, {
          userId: user.id,
          username: user.tag ?? user.username,
          reason,
          severity,
          issuedBy: interaction.user.id,
          issuedByName: interaction.user.tag ?? interaction.user.username,
        });

        if (!res.ok) throw new Error(await res.text());

        await interaction.editReply({
          embeds: [successEmbed(
            "Warning Issued",
            `⚠️ **${user.displayName ?? user.username}** has received a warning.\n` +
            `**Reason:** ${reason}\n**Severity:** ${'⭐'.repeat(severity)}\n**Issued by:** ${interaction.user.displayName ?? interaction.user.username}`
          )],
        });

      } else if (sub === "remove") {
        const warningId = interaction.options.getString("warning_id", true);
        const res = await api.delete(`/guilds/${interaction.guildId}/warnings/${warningId}`);
        if (!res.ok) throw new Error(await res.text());
        await interaction.editReply({ embeds: [successEmbed("Warning Removed", `Warning ID ``${warningId}`` has been removed.`)] });

      } else if (sub === "list") {
        const user = interaction.options.getUser("user", true);
        const res = await api.get(`/guilds/${interaction.guildId}/warnings?userId=${user.id}`);
        if (!res.ok) throw new Error(await res.text());
        const warnings = await res.json() as any[];

        if (!warnings.length) {
          await interaction.editReply({ embeds: [infoEmbed("No Warnings", `${user.displayName ?? user.username} has no warnings on record.`)] });
          return;
        }

        const lines = warnings.map((w: any, i: number) =>
          `**${i + 1}.** ${w.reason} — Severity: ${'⭐'.repeat(w.severity ?? 1)} (${new Date(w.createdAt).toLocaleDateString()})`
        ).join("\n");

        await interaction.editReply({
          embeds: [infoEmbed(
            `Warnings — ${user.displayName ?? user.username}`,
            `${warnings.length} warning(s) on record:\n\n${lines}`
          )],
        });

      } else if (sub === "clear") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.editReply({ embeds: [errorEmbed("Unauthorized", "You need **Administrator** permission to clear all warnings.")] });
          return;
        }
        const user = interaction.options.getUser("user", true);
        const res = await api.delete(`/guilds/${interaction.guildId}/warnings?userId=${user.id}`);
        if (!res.ok) throw new Error(await res.text());
        await interaction.editReply({
          embeds: [successEmbed("Warnings Cleared", `All warnings cleared for ${user.displayName ?? user.username}.`)]
        });
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed("Error", err.message ?? "An unexpected error occurred.")] });
    }
  }
  