import type { Interaction } from "discord.js";
import type { ZenithClient } from "../client.js";
import { errorEmbed } from "../lib/embed.js";

export const name = "interactionCreate";
export const once = false;

export async function execute(interaction: Interaction, client: ZenithClient): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Zenith] Error executing ${interaction.commandName}:`, error);
    const embed = errorEmbed("An unexpected error occurred. Please try again.");
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}
