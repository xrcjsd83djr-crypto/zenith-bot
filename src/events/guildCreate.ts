import { Client, Events, Guild } from "discord.js";

export const name = Events.GuildCreate;
export const once = false;

export async function execute(guild: Guild) {
  console.log(`[Zenith] Joined guild: ${guild.name} (${guild.id})`);

  try {
    const apiUrl = process.env.API_URL ?? "http://localhost:8080/api";
    await fetch(`${apiUrl}/guilds/${guild.id}/config`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    console.error(`[Zenith] Failed to ensure guild config for ${guild.id}`);
  }
}
