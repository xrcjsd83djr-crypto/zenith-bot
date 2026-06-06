import { Events, Guild } from "discord.js";
import { config } from "../lib/config.js";

export const name = Events.GuildCreate;
export const once = false;

async function syncCustomCommands(guild: Guild): Promise<void> {
  try {
    const res = await fetch(`${config.apiUrl}/guilds/${guild.id}/custom-commands`, {
      headers: { 'x-bot-secret': config.botSecret }
    });
    if (!res.ok) return;
    const customCmds: any[] = await res.json();
    const activeCmds = customCmds
      .filter((c: any) => c.is_active)
      .map((c: any) => ({
        name: c.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32),
        description: (c.description || c.name).slice(0, 100),
        type: 1,
      }));
    await guild.commands.set(activeCmds).catch(() => {});
    if (activeCmds.length > 0) {
      console.log(`[Zenith] Registered ${activeCmds.length} custom commands for new guild: ${guild.name}`);
    }
  } catch { }
}

export async function execute(guild: Guild) {
  console.log(`[Zenith] Joined guild: ${guild.name} (${guild.id})`);

  try {
    await fetch(`${config.apiUrl}/guilds/${guild.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": config.botSecret },
      body: JSON.stringify({ name: guild.name, icon: guild.icon }),
    });
  } catch {
    console.error(`[Zenith] Failed to register guild ${guild.id}`);
  }

  // Sync custom slash commands for this guild
  await syncCustomCommands(guild);
}
