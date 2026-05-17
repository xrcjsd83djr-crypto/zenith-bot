import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed, warnEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("loa")
  .setDescription("Manage leave of absence requests")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("request")
      .setDescription("Submit an LOA request")
      .addStringOption(o => o.setName("reason").setDescription("Reason for LOA").setRequired(true))
      .addStringOption(o => o.setName("start").setDescription("Start date (YYYY-MM-DD)").setRequired(true))
      .addStringOption(o => o.setName("end").setDescription("End date (YYYY-MM-DD)").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("List LOA requests")
      .addStringOption(o => o.setName("status").setDescription("Filter by status").setRequired(false)
        .addChoices(
          { name: "Pending", value: "pending" },
          { name: "Approved", value: "approved" },
          { name: "Denied", value: "denied" },
        ))
  )
  .addSubcommand(sub =>
    sub.setName("approve")
      .setDescription("Approve an LOA request")
      .addIntegerOption(o => o.setName("id").setDescription("The LOA request ID").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("deny")
      .setDescription("Deny an LOA request")
      .addIntegerOption(o => o.setName("id").setDescription("The LOA request ID").setRequired(true))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: true });

  if (sub === "request") {
    const reason = interaction.options.getString("reason", true);
    const start = interaction.options.getString("start", true);
    const end = interaction.options.getString("end", true);

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      await interaction.editReply({ embeds: [errorEmbed("Invalid Date", "Please use YYYY-MM-DD format (e.g. 2025-05-15)")] });
      return;
    }

    if (endDate <= startDate) {
      await interaction.editReply({ embeds: [errorEmbed("Invalid Date Range", "End date must be after start date.")] });
      return;
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);

    try {
      const loa = await api.loa.create(guildId, {
        reason,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId: interaction.user.id,
        username: interaction.user.username,
      });

      const embed = successEmbed("LOA Request Submitted", "Your leave of absence request has been submitted for review.")
        .addFields(
          { name: "Duration", value: `${days} day${days !== 1 ? "s" : ""}`, inline: true },
          { name: "Dates", value: `${start} → ${end}`, inline: true },
          { name: "Request ID", value: `#${loa.id}`, inline: true },
          { name: "Reason", value: reason, inline: false },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to submit LOA request")] });
    }
  }

  if (sub === "list") {
    const statusFilter = interaction.options.getString("status");
    try {
      let loas = await api.loa.list(guildId);
      if (statusFilter) loas = loas.filter((l: any) => l.status === statusFilter);

      if (loas.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed("LOA Requests", "No requests found.")] });
        return;
      }

      const lines = loas.slice(0, 15).map((l: any) => {
        const statusEmoji = l.status === "approved" ? "✅" : l.status === "denied" ? "❌" : "⏳";
        return `${statusEmoji} **#${l.id}** · <@${l.userId}> · ${new Date(l.startDate).toLocaleDateString()} → ${new Date(l.endDate).toLocaleDateString()}`;
      });

      const embed = infoEmbed(`LOA Requests${statusFilter ? ` — ${statusFilter}` : ""}`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: `${loas.length} request${loas.length !== 1 ? "s" : ""}` });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to fetch LOA requests")] });
    }
  }

  if (sub === "approve" || sub === "deny") {
    const id = interaction.options.getInteger("id", true);
    const status = sub === "approve" ? "approved" : "denied";

    try {
      await api.loa.update(guildId, id, { status });
      const verb = sub === "approve" ? "Approved" : "Denied";
      await interaction.editReply({ embeds: [successEmbed(`LOA ${verb}`, `LOA request **#${id}** has been ${status}.`)] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to ${sub} LOA request`)] });
    }
  }
}
