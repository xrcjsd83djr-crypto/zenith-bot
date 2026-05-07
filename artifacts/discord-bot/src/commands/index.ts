import * as apply from "./staff/apply.js";
import * as roster from "./staff/roster.js";
import * as promote from "./staff/promote.js";
import * as demote from "./staff/demote.js";
import * as strikeAdd from "./strikes/add.js";
import * as strikeHistory from "./strikes/history.js";
import * as strikeRemove from "./strikes/remove.js";
import * as loa from "./loa/request.js";
import * as config from "./admin/config.js";
import * as givePremium from "./admin/give-premium.js";
import type { Command } from "../client.js";

export const commands: Command[] = [
  apply,
  roster,
  promote,
  demote,
  strikeAdd,
  strikeHistory,
  strikeRemove,
  loa,
  config,
  givePremium,
];
