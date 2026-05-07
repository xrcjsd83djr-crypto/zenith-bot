import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const rest = new REST({ version: "10" }).setToken(token);

const commandData = commands.map((c) => c.data.toJSON());

(async () => {
  try {
    console.log(`[Zenith] Deploying ${commandData.length} slash commands...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    console.log("[Zenith] Commands deployed successfully.");
  } catch (error) {
    console.error("[Zenith] Failed to deploy commands:", error);
    process.exit(1);
  }
})();
