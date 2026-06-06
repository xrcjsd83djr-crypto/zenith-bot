import type { Command } from "../client.js";

// ── Admin ──────────────────────────────────────────────────────────────────
import * as givePremium from "./admin/give-premium.js";

// ── Staff Applications ─────────────────────────────────────────────────────
import * as apply from "./staff/apply.js";

// ── All comprehensive top-level commands ───────────────────────────────────
import * as activity    from "./activity.js";
import * as analytics   from "./analytics.js";
import * as automation  from "./automation.js";
import * as blacklist   from "./blacklist.js";
import * as commend     from "./commend.js";
import * as handbook    from "./handbook.js";
import * as help        from "./help.js";
import * as loa         from "./loa.js";
import * as moderation  from "./moderation.js";
import * as note        from "./note.js";
import * as performance from "./performance.js";
import * as premium     from "./premium.js";
import * as promote     from "./promote.js";
import * as rank        from "./rank.js";
import * as requestrank from "./requestrank.js";
import * as roster      from "./roster.js";
import * as schedule    from "./schedule.js";
import * as shift       from "./shift.js";
import * as staff       from "./staff.js";
import * as strike      from "./strike.js";
import * as support     from "./support.js";
import * as training    from "./training.js";
import * as warning     from "./warning.js";

// NOTE: /division create is intentionally excluded — manage divisions via the web dashboard.

export const commands: Command[] = [
  givePremium,
  apply,
  activity,
  analytics,
  automation,
  blacklist,
  commend,
  handbook,
  help,
  loa,
  moderation,
  note,
  performance,
  premium,
  promote,
  rank,
  requestrank,
  roster,
  schedule,
  shift,
  staff,
  strike,
  support,
  training,
  warning,
];
