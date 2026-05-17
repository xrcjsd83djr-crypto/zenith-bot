import { Events, Guild } from "discord.js";

export const name = Events.GuildCreate;
export const once = false;

export async function execute(guild: Guild) {
  console.log(`[Zenith] Joined guild: ${guild.name} (${guild.id})`);
  const apiUrl = process.env.API_URL ?? "http://localhost:8080/api";
  const botSecret = process.env.BOT_SECRET ?? "";

  try {
    await fetch(`${apiUrl}/guilds/${guild.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": botSecret },
      body: JSON.stringify({ name: guild.name, icon: guild.icon }),
    });
  } catch {
    console.error(`[Zenith] Failed to register guild ${guild.id}`);
  }
}
