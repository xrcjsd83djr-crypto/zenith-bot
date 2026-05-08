import "dotenv/config";
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { config } from "./lib/config.js";

import * as strikeCommand from "./commands/strike.js";
import * as staffCommand from "./commands/staff.js";
import * as loaCommand from "./commands/loa.js";
import * as rankCommand from "./commands/rank.js";
import * as activityCommand from "./commands/activity.js";
import * as configCommand from "./commands/config.js";
import * as helpCommand from "./commands/help.js";

import * as readyEvent from "./events/ready.js";
import * as guildCreateEvent from "./events/guildCreate.js";
import * as interactionCreateEvent from "./events/interactionCreate.js";
import * as messageCreateEvent from "./events/messageCreate.js";

interface BotClient extends Client {
  commands: Collection<string, any>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
}) as BotClient;

client.commands = new Collection();

const commands = [
  strikeCommand,
  staffCommand,
  loaCommand,
  rankCommand,
  activityCommand,
  configCommand,
  helpCommand,
];

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

const events = [
  readyEvent,
  guildCreateEvent,
  interactionCreateEvent,
  messageCreateEvent,
];

for (const event of events) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args as any));
  } else {
    client.on(event.name, (...args) => event.execute(...args as any));
  }
}

client.login(config.token);
