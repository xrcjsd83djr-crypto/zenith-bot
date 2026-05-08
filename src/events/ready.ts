import { Client, Events, ActivityType } from "discord.js";

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>) {
  console.log(`[Zenith] Logged in as ${client.user.tag}`);
  console.log(`[Zenith] Serving ${client.guilds.cache.size} guild(s)`);

  client.user.setPresence({
    activities: [{
      name: "ERLC staff | /help",
      type: ActivityType.Watching,
    }],
    status: "online",
  });
}
