import "dotenv/config";
import { REST, Routes } from "discord.js";
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
import * as shiftCommand       from "./commands/shift.js";
import * as rosterCommand      from "./commands/roster.js";
import * as commendCommand     from "./commands/commend.js";
import * as noteCommand        from "./commands/note.js";
import * as requestrankCommand from "./commands/requestrank.js";

// Support server only commands
import * as supportCommand     from "./commands/support.js";
import * as givePremiumCommand from "./commands/admin/give-premium.js";

const globalCommands = [
  strikeCommand, staffCommand, loaCommand, rankCommand,
  activityCommand, helpCommand,
  warningCommand, blacklistCommand,
  analyticsCommand, performanceCommand, scheduleCommand, trainingCommand,
  divisionsCommand, promoteCommand, automationCommand,
  handbookCommand, premiumCommand,
  shiftCommand, rosterCommand,
  commendCommand, noteCommand,
  requestrankCommand,
].map(c => (c as any).data.toJSON());

const supportServerCommands = [
  supportCommand,
  givePremiumCommand,
].map(c => (c as any).data.toJSON());

const SUPPORT_SERVER_ID = config.supportServerId;

const rest = new REST().setToken(config.token);

async function deploy() {
  console.log(`[Zenith] Deploying ${globalCommands.length} global commands...`);
  try {
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: globalCommands },
    );
    console.log(`[Zenith] ✅ Global commands deployed (${globalCommands.length} commands).`);
  } catch (err) {
    console.error("[Zenith] Failed to deploy global commands:", err);
  }

  if (SUPPORT_SERVER_ID) {
    console.log(`[Zenith] Deploying internal commands to support server: ${SUPPORT_SERVER_ID}...`);
    try {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, SUPPORT_SERVER_ID),
        { body: [...globalCommands, ...supportServerCommands] },
      );
      console.log(`[Zenith] ✅ Support server commands deployed.`);
    } catch (err) {
      console.error("[Zenith] Failed to deploy support server commands:", err);
    }
  }
}

deploy();
