import { Client } from "discord.js";

  export const name = "error";
  export const once = false;

  export async function execute(error: Error) {
    console.error("[ERROR]", error);

    if (error.message.includes("ECONNREFUSED")) {
      console.warn("[ERROR] API connection refused. Bot will retry commands independently.");
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
      // Log but do NOT exit — unhandled promise rejections from slash commands should not kill the bot
      console.error("[UNHANDLED REJECTION]", reason instanceof Error ? reason.message : reason);
    });

    process.on("uncaughtException", (error: Error) => {
      // Only exit on truly fatal errors (not API/command errors)
      console.error("[UNCAUGHT EXCEPTION]", error.message);
      // Don't call process.exit — let the bot keep running and handle errors per-command
    });

    process.on("SIGTERM", () => {
      console.log("[ZENITH] Graceful shutdown — SIGTERM received");
      client.destroy();
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("[ZENITH] Graceful shutdown — SIGINT received");
      client.destroy();
      process.exit(0);
    });

    client.on("error", (error: Error) => {
      console.error("[CLIENT ERROR]", error.message);
    });

    client.on("warn", (info: string) => {
      console.warn("[CLIENT WARN]", info);
    });
  }
  