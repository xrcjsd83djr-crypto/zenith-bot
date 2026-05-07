import "dotenv/config";
  import client from "./client.js";
  import { commands } from "./commands/index.js";
  import * as ready from "./events/ready.js";
  import * as interactionCreate from "./events/interactionCreate.js";

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("[Zenith] DISCORD_TOKEN must be set");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("[Zenith] DATABASE_URL must be set");
    process.exit(1);
  }

  // Keep the process alive on unhandled errors — log and continue
  process.on("unhandledRejection", (reason) => {
    console.error("[Zenith] Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[Zenith] Uncaught exception:", err);
  });

  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }

  client.once(ready.name, (...args) => ready.execute(...(args as [typeof client])));
  client.on(interactionCreate.name, (...args) => interactionCreate.execute(args[0] as any, client));

  client.login(token).then(() => {
    console.log("[Zenith] Bot is online.");
  }).catch((err: unknown) => {
    console.error("[Zenith] Failed to login:", err);
    process.exit(1);
  });
  