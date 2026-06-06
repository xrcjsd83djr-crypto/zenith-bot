import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { config } from "../lib/config.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("requestrank")
  .setDescription("Submit a rank-up request to server management")
  .addStringOption(o =>
    o.setName("requested_rank")
      .setDescription("The rank you are requesting")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("reason")
      .setDescription("Why do you deserve this rank?")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const username = interaction.user.username;
  const requestedRank = interaction.options.getString("requested_rank", true);
  const reason = interaction.options.getString("reason", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    // Get current rank from staff list
    let currentRank: string | null = null;
    try {
      const staffRes = await fetch(`${config.apiUrl}/guilds/${guildId}/staff/${userId}`, {
        headers: { "x-bot-secret": config.botSecret },
      });
      if (staffRes.ok) {
        const staffData: any = await staffRes.json();
        currentRank = staffData?.rank || staffData?.rankName || null;
      }
    } catch {}

    const res = await fetch(`${config.apiUrl}/guilds/${guildId}/rank-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
      body: JSON.stringify({ userId, username, currentRank, requestedRank, reason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any;
      await interaction.editReply({
        embeds: [errorEmbed("Rank Request Failed", err.error || "Could not submit your request. Please try again.")],
      });
      return;
    }

    const data = await res.json() as any;
    const embed = successEmbed(
      "Rank Request Submitted",
      `Your request has been submitted to management for review.\n\n**Requested Rank:** ${requestedRank}\n**Current Rank:** ${currentRank || "Not on staff list"}\n**Reason:** ${reason}`
    )
      .setFooter({ text: `Request ID: ${data.id?.slice(0, 8) || "N/A"} • You'll be notified once reviewed` });

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    await interaction.editReply({
      embeds: [errorEmbed("Error", err.message || "Failed to submit rank request.")],
    });
  }
}
