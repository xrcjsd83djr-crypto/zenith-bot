import "dotenv/config";
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { config } from "./lib/config.js";

import * as strikeCommand      from "./commands/strike.js";
import * as staffCommand       from "./commands/staff.js";
import * as loaCommand         from "./commands/loa.js";
import * as rankCommand        from "./commands/rank.js";
import * as activityCommand    from "./commands/activity.js";
import * as helpCommand        from "./commands/help.js";
import * as warningCommand     from "./commands/warning.js";
import * as blacklistCommand   from "./commands/blacklist.js";
import * as analyticsCommand   from "./commands/analytics.js";
import * as performanceCommand from "./commands/performance.js";
import * as scheduleCommand    from "./commands/schedule.js";
import * as trainingCommand    from "./commands/training.js";
import * as divisionsCommand   from "./commands/divisions.js";
import * as promoteCommand     from "./commands/promote.js";
import * as automationCommand  from "./commands/automation.js";
import * as handbookCommand    from "./commands/handbook.js";
import * as premiumCommand     from "./commands/premium.js";
import * as givePremiumCommand from "./commands/admin/give-premium.js";
import * as supportCommand     from "./commands/support.js";
import * as shiftCommand       from "./commands/shift.js";
import * as rosterCommand      from "./commands/roster.js";
import * as commendCommand     from "./commands/commend.js";
import * as noteCommand        from "./commands/note.js";
import * as requestrankCommand from "./commands/requestrank.js";

import * as readyEvent             from "./events/ready.js";
import * as guildCreateEvent       from "./events/guildCreate.js";
import * as interactionCreateEvent from "./events/interactionCreate.js";
import * as messageCreateEvent     from "./events/messageCreate.js";
import * as errorHandler           from "./events/errorHandler.js";

interface BotClient extends Client { commands: Collection<string, any>; }

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
  // Core staff management (free)
  strikeCommand, staffCommand, loaCommand, rankCommand,
  helpCommand, warningCommand, blacklistCommand,
  // Freemium
  activityCommand, analyticsCommand, performanceCommand, scheduleCommand,
  trainingCommand,
  // Extended features
  divisionsCommand, promoteCommand, automationCommand,
  // Public info commands
  handbookCommand, premiumCommand,
  // Staff interaction
  commendCommand, noteCommand,
  // Admin (support server only)
  givePremiumCommand, supportCommand,
  // Shift & duty tracking
  shiftCommand, rosterCommand,
  // Rank management
  requestrankCommand,
];

for (const command of commands) {
  if (command.data) client.commands.set(command.data.name, command as any);
}

const events = [readyEvent, guildCreateEvent, interactionCreateEvent, messageCreateEvent];
for (const event of events) {
  if ((event as any).once) client.once((event as any).name, (...args) => (event as any).execute(...args));
  else client.on((event as any).name, (...args) => (event as any).execute(...args));
}

errorHandler.setupErrorHandlers(client);
client.login(config.token);
