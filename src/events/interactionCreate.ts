import { Client, Events, Interaction, Collection } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

export const name = Events.InteractionCreate;
export const once = false;

interface BotClient extends Client {
  commands?: Collection<string, { data: any; execute: (i: ChatInputCommandInteraction) => Promise<void> }>;
}

export async function execute(interaction: Interaction) {
  const client = interaction.client as BotClient;

  if (interaction.isButton()) {
    const [action, ...args] = interaction.customId.split(':');
    
    if (action === 'apply') {
      // Handle apply button
      const guildId = interaction.guildId;
      if (!guildId) return;
      
      // Redirect to website
      await interaction.reply({
        content: `To apply for staff, please visit our application portal: https://zenith-web-production.up.railway.app/apply/${guildId}`,
        ephemeral: true
      });
      return;
    }
    
    if (action === 'review_accept' || action === 'review_deny') {
      // Handle staff review buttons
      await interaction.reply({
        content: `Please use the application portal to review applications: https://zenith-web-production.up.railway.app/dashboard/${interaction.guildId}/applications`,
        ephemeral: true
      });
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;

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
