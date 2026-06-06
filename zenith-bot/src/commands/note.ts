import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
  import { config } from "../lib/config.js";

  export const data = new SlashCommandBuilder()
    .setName("note")
    .setDescription("Add an internal staff note on a member")
    .addUserOption(o => o.setName("member").setDescription("The staff member").setRequired(true))
    .addStringOption(o => o.setName("content").setDescription("Note content").setRequired(true))
    .addBooleanOption(o => o.setName("private").setDescription("Make this note private (management only)").setRequired(false));

  export async function execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("member", true);
    const content = interaction.options.getString("content", true);
    const isPrivate = interaction.options.getBoolean("private") ?? false;
    const guildId = interaction.guildId!;
    const headers = { "Content-Type": "application/json", "x-bot-secret": config.botSecret };

    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/notes`, {
        method: "POST", headers,
        body: JSON.stringify({
          targetUserId: target.id,
          targetUsername: target.username,
          content,
          authorId: interaction.user.id,
          authorUsername: interaction.user.username,
          isPrivate,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        return interaction.editReply({ content: `❌ Failed to add note: ${d.error || "Unknown error"}` });
      }
      const embed = new EmbedBuilder()
        .setColor(isPrivate ? 0xEF4444 : 0x5865F2)
        .setTitle(`${isPrivate ? "🔒 Private" : "📝"} Note Added`)
        .setDescription(`Note added for <@${target.id}>`)
        .addFields(
          { name: "Content", value: content },
          { name: "Private", value: isPrivate ? "Yes (management only)" : "No", inline: true },
          { name: "By", value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "View all notes in the Zenith dashboard" });
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Note error:", err);
      return interaction.editReply({ content: "❌ An unexpected error occurred." });
    }
  }
  