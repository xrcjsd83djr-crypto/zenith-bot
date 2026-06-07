import { Client, Events, ActivityType } from 'discord.js';
import { config } from '../lib/config.js';

export const name = Events.ClientReady;
export const once = true;

/** Fetch custom status from API and apply to bot presence */
async function applyCustomStatus(client: Client<true>): Promise<void> {
  try {
    const res = await fetch(`${config.apiUrl}/api/bot/global-status`, {
      headers: { 'x-bot-secret': config.botSecret },
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data.status && data.status.trim()) {
        client.user.setPresence({
          activities: [{ name: data.status.trim(), type: ActivityType.Custom }],
          status: 'online',
        });
        console.log(`[Zenith] Applied custom status: ${data.status}`);
        return;
      }
    }
  } catch { /* ignore, fall through to default */ }
  // Default presence
  client.user.setPresence({
    activities: [{ name: 'ERLC Staff | z!help', type: ActivityType.Watching }],
    status: 'online',
  });
}

export async function execute(client: Client<true>) {
  console.log(`[Zenith] Logged in as ${client.user.tag}`);
  console.log(`[Zenith] Serving ${client.guilds.cache.size} guild(s)`);

  // ── Register built-in slash commands (global + support server) ────────────
  try {
    const allCommandsCollection = (client as any).commands;
    const allCommands = allCommandsCollection ? [...allCommandsCollection.values()] : [];
    const supportCommandNames = ['support', 'give-premium'];

    const globalCommands = allCommands
      .filter((cmd: any) => !supportCommandNames.includes(cmd.data.name))
      .map((cmd: any) => cmd.data.toJSON());

    const supportServerCommands = allCommands
      .filter((cmd: any) => supportCommandNames.includes(cmd.data.name))
      .map((cmd: any) => cmd.data.toJSON());

    await client.application?.commands.set(globalCommands);
    console.log(`[Zenith] Registered ${globalCommands.length} global slash command(s)`);

    if (config.supportServerId) {
      const supportGuild = client.guilds.cache.get(config.supportServerId);
      if (supportGuild) {
        await supportGuild.commands.set([...globalCommands, ...supportServerCommands]);
        console.log(`[Zenith] Registered ${supportServerCommands.length} internal commands to support server: ${supportGuild.name}`);
      }
    }

    // Clear any previously registered per-guild custom slash commands
    // Custom commands now run via text prefix only (per-server, not slash)
    for (const guild of client.guilds.cache.values()) {
      if (guild.id === config.supportServerId) continue;
      guild.commands.set([]).catch(() => {});
    }
  } catch (err) {
    console.error('[Zenith] Failed to register commands:', err);
  }

  // ── Register guild data in API ────────────────────────────────────────────
  for (const guild of client.guilds.cache.values()) {
    fetch(`${config.apiUrl}/guilds/${guild.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': config.botSecret },
      body: JSON.stringify({ name: guild.name, icon: guild.icon }),
    }).catch(() => {});
  }

  // ── Set bot presence (with custom status support) ─────────────────────────
  await applyCustomStatus(client);

  // Re-check every 5 minutes in case an admin updated their server status
  setInterval(() => applyCustomStatus(client), 5 * 60 * 1000);
}
