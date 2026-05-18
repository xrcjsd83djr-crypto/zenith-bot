import "dotenv/config";
  import { REST, Routes } from "discord.js";
  import { config } from "./lib/config.js";

  // Staff management commands (global)
  import * as strikeCommand    from "./commands/strike.js";
  import * as staffCommand     from "./commands/staff.js";
  import * as loaCommand       from "./commands/loa.js";
  import * as rankCommand      from "./commands/rank.js";
  import * as activityCommand  from "./commands/activity.js";
  import * as configCommand    from "./commands/config.js";
  import * as helpCommand      from "./commands/help.js";
  import * as warningCommand   from "./commands/warning.js";
  import * as blacklistCommand from "./commands/blacklist.js";
  import * as analyticsCommand from "./commands/analytics.js";
  import * as performanceCommand from "./commands/performance.js";
  import * as scheduleCommand  from "./commands/schedule.js";
  import * as trainingCommand  from "./commands/training.js";

  // Support server only command
  import * as supportCommand   from "./commands/support.js";
  // Premium admin command
  import * as givePremiumCommand from "./commands/admin/give-premium.js";
  // Bot setup command
  import * as setupCommand     from "./commands/admin/config.js";

  const globalCommands = [
    strikeCommand, staffCommand, loaCommand, rankCommand,
    activityCommand, configCommand, helpCommand,
    warningCommand, blacklistCommand,
    analyticsCommand, performanceCommand, scheduleCommand, trainingCommand,
  ].map(c => c.data.toJSON());

  const supportServerCommands = [
    supportCommand,
    givePremiumCommand,
    setupCommand,
  ].map(c => c.data.toJSON());

  const SUPPORT_SERVER_ID = process.env.SUPPORT_SERVER_ID ?? "1501905192277377214";

  const rest = new REST().setToken(config.token);

  async function deploy() {
    console.log(`[Zenith] Deploying ${globalCommands.length} global commands...`);
    try {
      const global = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: globalCommands },
      ) as any[];
      console.log(`[Zenith] ✅ ${global.length} global commands deployed.`);
    } catch (err) {
      console.error("[Zenith] Failed to deploy global commands:", err);
    }

    console.log(`[Zenith] Deploying ${supportServerCommands.length} support server commands to ${SUPPORT_SERVER_ID}...`);
    try {
      const guild = await rest.put(
        Routes.applicationGuildCommands(config.clientId, SUPPORT_SERVER_ID),
        { body: supportServerCommands },
      ) as any[];
      console.log(`[Zenith] ✅ ${guild.length} support server commands deployed.`);
    } catch (err) {
      console.error("[Zenith] Failed to deploy support server commands:", err);
    }
  }

  deploy();
  