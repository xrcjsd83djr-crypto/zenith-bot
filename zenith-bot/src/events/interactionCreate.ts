import { Client, Events, Interaction, Collection, EmbedBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { config } from "../lib/config.js";

export const name = Events.InteractionCreate;
export const once = false;

interface BotClient extends Client {
  commands?: Collection<string, { data: any; execute: (i: ChatInputCommandInteraction) => Promise<void>; autocomplete?: (i: any) => Promise<void> }>;
}

export async function execute(interaction: Interaction) {
  const client = interaction.client as BotClient;

  // ── Autocomplete ───────────────────────────────────────────────────────────
  if (interaction.isAutocomplete()) {
    const command = client.commands?.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(`[autocomplete] ${interaction.commandName}:`, err);
        interaction.respond([]).catch(() => {});
      }
    } else {
      interaction.respond([]).catch(() => {});
    }
    return;
  }

  // ── Button interactions ────────────────────────────────────────────────
  if (interaction.isButton()) {
    const [action, ...args] = interaction.customId.split(':');

    if (action === 'apply') {
      const guildId = interaction.guildId;
      if (!guildId) return;
      try {
        const url = `https://zenith-web-production.up.railway.app/dashboard/${guildId}/applications`;
        await interaction.reply({
          content: `📋 To apply for staff, please visit the application portal:\n${url}`,
          ephemeral: true,
        });
      } catch {
        await interaction.reply({
          content: '📋 Please visit the staff application portal on our website to apply.',
          ephemeral: true,
        });
      }
      return;
    }

    if (action === 'review_accept' || action === 'review_deny') {
      await interaction.reply({
        content: `✅ Please use the dashboard to review applications:\nhttps://zenith-web-production.up.railway.app/dashboard/${interaction.guildId}/applications`,
        ephemeral: true,
      });
      return;
    }

    // Unknown button
    await interaction.reply({
      content: '⚙️ This action is managed through the Zenith dashboard.',
      ephemeral: true,
    }).catch(() => {});
    return;
  }

  // ── Select menu interactions ───────────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    // handbook_select is handled in the handbook command via collector
    // If it falls through here, handle gracefully
    if (interaction.customId === 'handbook_select') return;
    await interaction.reply({
      content: '⚙️ This selection is managed through the Zenith dashboard.',
      ephemeral: true,
    }).catch(() => {});
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands?.get(interaction.commandName);

  // ── Custom command fallback ────────────────────────────────────────────
  if (!command) {
    const guildId = interaction.guildId;
    if (!guildId) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
    try {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/custom-commands`, {
        headers: { 'x-bot-secret': config.botSecret },
      });
      if (res.ok) {
        const cmds: any[] = await res.json();
        const cmdNameNorm = interaction.commandName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const cc = cmds.find(c =>
          c.is_active &&
          (c.name.toLowerCase() === interaction.commandName.toLowerCase() ||
           c.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32) === cmdNameNorm)
        );
        if (cc) {
          const ephemeral = false; // Custom commands are public by default
          if (cc.is_embed) {
            const embed = new EmbedBuilder()
              .setColor(cc.embed_color as `#${string}` || '#5865F2')
              .setTitle(cc.embed_title || cc.name)
              .setDescription(cc.response)
              .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral });
          } else {
            await interaction.reply({ content: cc.response, ephemeral });
          }
          // Fire-and-forget: increment use count
          fetch(`${config.apiUrl}/guilds/${guildId}/custom-commands/${cc.id}/use`, {
            method: 'POST',
            headers: { 'x-bot-secret': config.botSecret },
          }).catch(() => {});
          return;
        }
      }
    } catch (e) {
      console.error(`Error checking custom commands for ${interaction.commandName}:`, e);
    }
    console.error(`No command matching ${interaction.commandName} was found.`);
    await interaction.reply({
      content: `❌ Unknown command: \`${interaction.commandName}\``,
      ephemeral: true,
    }).catch(() => {});
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
