import { Client, Events, ActivityType } from "discord.js";

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>) {
  console.log(`[Zenith] Logged in as ${client.user.tag}`);
  console.log(`[Zenith] Serving ${client.guilds.cache.size} guild(s)`);

  // Register slash commands globally
  try {
    const commands = client.commands?.map((cmd: any) => cmd.data.toJSON()) || [];
    if (commands.length > 0) {
      await client.application?.commands.set(commands);
      console.log(`[Zenith] Registered ${commands.length} slash command(s)`);
    }
  } catch (err) {
    console.error("[Zenith] Failed to register commands:", err);
  }

  client.user.setPresence({
    activities: [{
      name: "ERLC staff | /help",
      type: ActivityType.Watching,
    }],
    status: "online",
  });
}
