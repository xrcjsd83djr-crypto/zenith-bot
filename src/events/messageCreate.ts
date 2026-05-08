import { Events, Message } from "discord.js";
import { api } from "../lib/api.js";

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
  if (message.author.bot || !message.guildId) return;

  const guildId = message.guildId;

  try {
    const cfg = await api.config.get(guildId);
    if (!cfg.activityTrackingEnabled) return;

    await api.activity.log(guildId, {
      userId: message.author.id,
      username: message.author.username,
      type: "message",
      description: `Message in #${message.channel instanceof Object && "name" in message.channel ? message.channel.name : "unknown"}`,
    });
  } catch {
    // silently ignore
  }
}
