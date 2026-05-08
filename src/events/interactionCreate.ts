import { Client, Events, Interaction, Collection } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

export const name = Events.InteractionCreate;
export const once = false;

interface BotClient extends Client {
  commands?: Collection<string, { data: any; execute: (i: ChatInputCommandInteraction) => Promise<void> }>;
}

export async function execute(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const client = interaction.client as BotClient;
  const command = client.commands?.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    const reply = { content: "There was an error executing this command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}
