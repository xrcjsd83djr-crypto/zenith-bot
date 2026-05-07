import type { Command } from "../client.js";
import * as config from "./admin/config.js";
import * as givePremium from "./admin/give-premium.js";
import * as apply from "./staff/apply.js";
import * as promote from "./staff/promote.js";
import * as demote from "./staff/demote.js";
import * as roster from "./staff/roster.js";
import * as strike from "./strikes/add.js";
import * as unstrike from "./strikes/remove.js";
import * as strikeHistory from "./strikes/history.js";
import * as loaRequest from "./loa/request.js";

export const commands: Command[] = [
  config,
  givePremium,
  apply,
  promote,
  demote,
  roster,
  strike,
  unstrike,
  strikeHistory,
  loaRequest,
];
