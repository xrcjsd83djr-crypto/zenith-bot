import "dotenv/config";
import { REST, Routes } from "discord.js";
import { config } from "./lib/config.js";

import * as strikeCommand from "./commands/strike.js";
import * as staffCommand from "./commands/staff.js";
import * as loaCommand from "./commands/loa.js";
import * as rankCommand from "./commands/rank.js";
import * as activityCommand from "./commands/activity.js";
import * as configCommand from "./commands/config.js";
import * as helpCommand from "./commands/help.js";

const commands = [
  strikeCommand,
  staffCommand,
  loaCommand,
  rankCommand,
  activityCommand,
  configCommand,
  helpCommand,
].map(c => c.data.toJSON());

const rest = new REST().setToken(config.token);

async function deploy() {
  console.log(`[Zenith] Deploying ${commands.length} slash commands globally...`);
  try {
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    ) as any[];
    console.log(`[Zenith] Successfully deployed ${data.length} commands.`);
  } catch (error) {
    console.error("[Zenith] Failed to deploy commands:", error);
    process.exit(1);
  }
}

deploy();
