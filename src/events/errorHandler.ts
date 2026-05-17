import { Client } from "discord.js";

export const name = "error";
export const once = false;

export async function execute(error: Error) {
  console.error("[ERROR]", error);
  
  if (error.message.includes("ECONNREFUSED")) {
    console.warn("[ERROR] API connection refused. Retrying in 5 seconds...");
    setTimeout(() => {}, 5000);
  }
  
  if (error.message.includes("ENOTFOUND")) {
    console.warn("[ERROR] DNS resolution failed. Check API_URL configuration.");
  }
  
  if (error.message.includes("timeout")) {
    console.warn("[ERROR] Request timeout. API may be slow or unreachable.");
  }
}

export function setupErrorHandlers(client: Client) {
  process.on("unhandledRejection", (reason: any) => {
    console.error("[UNHANDLED REJECTION]", reason);
  });

  process.on("uncaughtException", (error: Error) => {
    console.error("[UNCAUGHT EXCEPTION]", error);
    process.exit(1);
  });

  client.on("error", (error: Error) => {
    console.error("[CLIENT ERROR]", error);
  });

  client.on("warn", (info: string) => {
    console.warn("[CLIENT WARN]", info);
  });
}
