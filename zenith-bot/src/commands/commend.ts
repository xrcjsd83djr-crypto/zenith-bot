import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
  import { config } from "../lib/config.js";

  export const data = new SlashCommandBuilder()
    .setName("commend")
    .setDescription("Issue a commendation to a staff member for outstanding performance")
    .addUserOption(o => o.setName("member").setDescription("The staff member to commend").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason for the commendation").setRequired(true))
    .addStringOption(o => o.setName("title").setDescription("Commendation title (optional)").setRequired(false));

  export async function execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("member", true);
    const reason = interaction.options.getString("reason", true);
    const title = interaction.options.getString("title") || "Outstanding Performance";
    const guildId = interaction.guildId!;
    const headers = { "Content-Type": "application/json", "x-bot-secret": config.botSecret };

    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/commendations`, {
        method: "POST", headers,
        body: JSON.stringify({
          targetUserId: target.id,
          targetUsername: target.username,
          issuedById: interaction.user.id,
          issuedByUsername: interaction.user.username,
          title,
          description: reason,
          badgeType: "star",
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        return interaction.editReply({ content: `❌ Failed to issue commendation: ${d.error || "Unknown error"}` });
      }
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle("⭐ Commendation Issued")
        .setDescription(`<@${target.id}> has been commended for outstanding performance!`)
        .addFields(
          { name: "Title", value: title, inline: true },
          { name: "Commended By", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Reason", value: reason }
        )
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Commend error:", err);
      return interaction.editReply({ content: "❌ An unexpected error occurred." });
    }
  }
  