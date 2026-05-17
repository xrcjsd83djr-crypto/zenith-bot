import "dotenv/config";

export let config = {
  token: process.env.DISCORD_BOT_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  apiUrl: process.env.API_URL ?? "http://localhost:8080/api",
};

if (!config.token) throw new Error("DISCORD_BOT_TOKEN is required");
if (!config.clientId) throw new Error("DISCORD_CLIENT_ID is required");
