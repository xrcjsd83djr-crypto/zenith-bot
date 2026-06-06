import { Client, GatewayIntentBits, Collection } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

export interface Command {
  data: { name: string; toJSON: () => object };
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>;
}

export interface ZenithClient extends Client {
  commands: Collection<string, Command>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
}) as ZenithClient;

client.commands = new Collection<string, Command>();

export default client;
