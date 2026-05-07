import type { Client } from "discord.js";
import { ActivityType } from "discord.js";

export const name = "ready";
export const once = true;

export async function execute(client: Client): Promise<void> {
  if (!client.user) return;
  console.log(`[Zenith] Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "staff management", type: ActivityType.Watching }],
    status: "online",
  });
}
