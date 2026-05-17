import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("loa")
  .setDescription("Manage Leave of Absence requests")
  .addSubcommand(sub =>
    sub.setName("request")
      .setDescription("Submit a Leave of Absence request")
      .addStringOption(o => o.setName("reason").setDescription("Reason for LOA").setRequired(true))
      .addStringOption(o => o.setName("start").setDescription("Start date (YYYY-MM-DD)").setRequired(true))
      .addStringOption(o => o.setName("end").setDescription("End date (YYYY-MM-DD)").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all LOA requests")
  )
  .addSubcommand(sub =>
    sub.setName("approve")
      .setDescription("Approve an LOA request")
      .addIntegerOption(o => o.setName("id").setDescription("The LOA request ID").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();

  // Make responses public
  await interaction.deferReply({ ephemeral: false });

  if (sub === "request") {
    const reason = interaction.options.getString("reason", true);
    const start = interaction.options.getString("start", true);
    const end = interaction.options.getString("end", true);

    try {
      // Check if LOA channel is configured
      const config = await api.config.get(guildId);
      if (!config.loa_channel_id) {
        return await interaction.editReply({
          embeds: [errorEmbed(
            "LOA Channel Not Configured",
            "The server admin must configure a LOA channel in Server Settings before you can submit requests."
          )]
        });
      }

      const loa = await api.loa.create(guildId, {
        userId: interaction.user.id,
        username: interaction.user.username,
        reason,
        startDate: new Date(start),
        endDate: new Date(end),
      });

      const embed = successEmbed("LOA Request Submitted", `Your leave of absence request has been submitted.`)
        .addFields(
          { name: "Reason", value: reason, inline: false },
          { name: "Start Date", value: start, inline: true },
          { name: "End Date", value: end, inline: true },
          { name: "Status", value: "⏳ Pending", inline: true },
          { name: "Request ID", value: `#${loa.id}`, inline: true },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("LOA request error:", err);
      await interaction.editReply({
        embeds: [errorEmbed("Failed to Submit LOA Request", err.message || "Please try again.")]
      });
    }
  }

  if (sub === "list") {
    try {
      const loaRequests = await api.loa.list(guildId);
      const embed = infoEmbed("Leave of Absence Requests")
        .setDescription(loaRequests.length === 0 ? "No LOA requests." : null);

      if (loaRequests.length > 0) {
        const lines = loaRequests.slice(0, 15).map((l: any) =>
          `**#${l.id}** · <@${l.user_id}> — ${l.reason.slice(0, 40)} *(${l.status})*`
        );
        embed.setDescription(lines.join("\n"));
        embed.setFooter({ text: `${loaRequests.length} total request${loaRequests.length !== 1 ? "s" : ""}` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("LOA list error:", err);
      await interaction.editReply({
        embeds: [errorEmbed("Failed to fetch LOA requests")]
      });
    }
  }

  if (sub === "approve") {
    const id = interaction.options.getInteger("id", true);

    try {
      await api.loa.update(guildId, id, {
        status: "approved",
        approvedBy: interaction.user.id,
      });

      await interaction.editReply({
        embeds: [successEmbed("LOA Approved", `LOA request **#${id}** has been approved.`)]
      });
    } catch (err) {
      console.error("LOA approve error:", err);
      await interaction.editReply({
        embeds: [errorEmbed("Failed to approve LOA request")]
      });
    }
  }
}
