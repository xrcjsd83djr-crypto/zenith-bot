import { Client, Events, ActivityType } from "discord.js";
  import { config } from "../lib/config.js";

  export const name = Events.ClientReady;
  export const once = true;

  /** Fetch and register custom commands for a single guild */
  async function syncCustomCommands(guild: any): Promise<void> {
    try {
      const res = await fetch(`${config.apiUrl}/guilds/${guild.id}/custom-commands`, {
        headers: { 'x-bot-secret': config.botSecret }
      });
      if (!res.ok) {
        // Clear existing guild commands if we can't fetch
        const existing = await guild.commands.fetch().catch(() => ({ size: 0 }));
        if (existing.size > 0) await guild.commands.set([]).catch(() => {});
        return;
      }
      const customCmds: any[] = await res.json();
      const activeCmds = customCmds
        .filter(c => c.is_active)
        .map(c => ({
          name: c.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32),
          description: (c.description || c.name).slice(0, 100),
          type: 1,
        }));
      await guild.commands.set(activeCmds).catch(() => {});
      if (activeCmds.length > 0) {
        console.log(`[Zenith] Registered ${activeCmds.length} custom commands for ${guild.name}`);
      }
    } catch (e) {
      // Silently ignore per-guild errors (missing permissions, etc.)
    }
  }

  export async function execute(client: Client<true>) {
    console.log(`[Zenith] Logged in as ${client.user.tag}`);
    console.log(`[Zenith] Serving ${client.guilds.cache.size} guild(s)`);

    // ── Register slash commands ─────────────────────────────────────────────
    try {
      const allCommandsCollection = (client as any).commands;
      const allCommands = allCommandsCollection
        ? [...allCommandsCollection.values()]
        : [];

      const supportCommandNames = ["support", "give-premium"];

      const globalCommands = allCommands
        .filter((cmd: any) => !supportCommandNames.includes(cmd.data.name))
        .map((cmd: any) => cmd.data.toJSON());

      const supportServerCommands = allCommands
        .filter((cmd: any) => supportCommandNames.includes(cmd.data.name))
        .map((cmd: any) => cmd.data.toJSON());

      // 1. Set Global Commands
      await client.application?.commands.set(globalCommands);
      console.log(`[Zenith] Registered ${globalCommands.length} global slash command(s)`);

      // 2. Set Support Server commands
      if (config.supportServerId) {
        const supportGuild = client.guilds.cache.get(config.supportServerId);
        if (supportGuild) {
          await supportGuild.commands.set([...globalCommands, ...supportServerCommands]);
          console.log(`[Zenith] Registered ${supportServerCommands.length} internal commands to support server: ${supportGuild.name}`);
        }
      }

      // 3. Sync custom commands per guild (replaces the old "clear guild commands" step)
      const guildSyncPromises: Promise<void>[] = [];
      for (const guild of client.guilds.cache.values()) {
        if (guild.id === config.supportServerId) continue;
        guildSyncPromises.push(syncCustomCommands(guild));
      }
      await Promise.allSettled(guildSyncPromises);

    } catch (err) {
      console.error("[Zenith] Failed to register commands:", err);
    }

    // ── Register guild data in API ──────────────────────────────────────────
    for (const guild of client.guilds.cache.values()) {
      fetch(`${config.apiUrl}/guilds/${guild.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Bot-Secret": config.botSecret },
        body: JSON.stringify({ name: guild.name, icon: guild.icon }),
      }).catch(() => {});
    }

    // ── Set bot presence ───────────────────────────────────────────────────
    // Check if a custom status is saved in the DB (best-effort)
    client.user.setPresence({
      activities: [{ name: "ERLC Staff | /help", type: ActivityType.Watching }],
      status: "online",
    });
  }
  