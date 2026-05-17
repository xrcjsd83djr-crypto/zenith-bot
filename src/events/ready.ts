import { Client, Events, ActivityType } from "discord.js";

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>) {
  console.log(`[Zenith] Logged in as ${client.user.tag}`);
  console.log(`[Zenith] Serving ${client.guilds.cache.size} guild(s)`);

  // Register slash commands
  try {
    const commands = (client as any).commands?.map((cmd: any) => cmd.data.toJSON()) || [];
    if (commands.length > 0) {
      await client.application?.commands.set(commands);
      // Also register per-guild for immediate availability
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.commands.set(commands);
        } catch (e) {
          console.error(`[Zenith] Failed to register commands for guild ${guild.name}:`, e);
        }
      }
      console.log(`[Zenith] Registered ${commands.length} slash command(s)`);
    }
  } catch (err) {
    console.error("[Zenith] Failed to register commands:", err);
  }

  // Register guild data in API (non-blocking)
  const apiUrl = process.env.API_URL ?? "http://localhost:8080/api";
  const botSecret = process.env.BOT_SECRET ?? "";
  for (const guild of client.guilds.cache.values()) {
    fetch(`${apiUrl}/guilds/${guild.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": botSecret },
      body: JSON.stringify({ name: guild.name, icon: guild.icon }),
    }).catch(() => {});
  }

  client.user.setPresence({
    activities: [{ name: "ERLC Staff | /help", type: ActivityType.Watching }],
    status: "online",
  });
}
