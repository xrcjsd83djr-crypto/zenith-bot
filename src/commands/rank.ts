import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { api } from "../lib/api.js";
import { infoEmbed, errorEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("ranks")
  .setDescription("View the server rank hierarchy")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;
  try {
    const ranks = await api.ranks.list(guildId);

    if (ranks.length === 0) {
      await interaction.editReply({ embeds: [infoEmbed("Ranks", "No ranks configured yet. Use the dashboard to set them up.")] });
      return;
    }

    const sorted = [...ranks].sort((a: any, b: any) => b.level - a.level);
    const lines = sorted.map((r: any) => {
      const divTag = r.division ? ` · *${r.division}*` : "";
      const staffTag = r.staffCount > 0 ? ` (${r.staffCount} staff)` : "";
      return `**${r.name}**${divTag} — Level ${r.level}${staffTag}`;
    });

    const embed = infoEmbed(`Rank Hierarchy (${ranks.length} ranks)`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Sorted by level (highest first)" });

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("Failed to fetch ranks")] });
  }
}
