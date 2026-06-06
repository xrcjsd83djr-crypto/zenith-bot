import { EmbedBuilder, ColorResolvable } from "discord.js";
import { config } from "./config.js";

// Light, distinctive colors that stand out from default Discord colors
const LIGHT_GREEN  = 0x90EE90;   // Light green — success
const LIGHT_RED    = 0xFF6B6B;   // Soft red — errors  
const LIGHT_BLUE   = 0x87CEEB;   // Sky blue — info
const GOLD         = 0xFFD700;   // Gold — premium/important
const LIGHT_ORANGE = 0xFFB347;   // Light orange — warnings
const LIGHT_PURPLE = 0xC9B1FF;   // Lavender — performance/special
const LIGHT_PINK   = 0xFFB6C1;   // Light pink — commendations
const LIGHT_TEAL   = 0x40E0D0;   // Turquoise — schedules/shifts

// Cache embed config per guild to avoid spamming the API
const embedConfigCache = new Map<string, { color: string; footer: string; ts: number }>();

/**
 * Fetch per-server embed color and footer from the API.
 * Cached for 60s per guild.
 */
export async function getGuildEmbed(guildId: string): Promise<{ color: string; footer: string }> {
  const cached = embedConfigCache.get(guildId);
  if (cached && Date.now() - cached.ts < 60_000) {
    return { color: cached.color, footer: cached.footer };
  }
  let color = "#d4af37";
  let footer = "Zenith Staff Management";
  try {
    const res = await fetch(`${config.apiUrl}/guilds/${guildId}/embed-config/bot`, {
      headers: { "x-bot-secret": config.botSecret },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const cfg = await res.json() as { color?: string; footer?: string };
      if (cfg.color) color = cfg.color;
      if (cfg.footer) footer = cfg.footer;
    }
  } catch { /* use defaults */ }
  embedConfigCache.set(guildId, { color, footer, ts: Date.now() });
  return { color, footer };
}

export function successEmbed(title: string, description?: string, color?: string, footer?: string) {
  const b = new EmbedBuilder()
    .setColor((color ? parseInt(color.replace("#",""), 16) : LIGHT_GREEN) as ColorResolvable)
    .setTitle(`✅ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
  if (footer) b.setFooter({ text: footer });
  return b;
}

export function errorEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(LIGHT_RED as ColorResolvable)
    .setTitle(`❌ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function infoEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(LIGHT_BLUE as ColorResolvable)
    .setTitle(title)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function premiumEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(GOLD as ColorResolvable)
    .setTitle(`⭐ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function warnEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(LIGHT_ORANGE as ColorResolvable)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function commendEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(LIGHT_PINK as ColorResolvable)
    .setTitle(`🌟 ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function shiftEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(LIGHT_TEAL as ColorResolvable)
    .setTitle(`🕐 ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function performanceEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(LIGHT_PURPLE as ColorResolvable)
    .setTitle(`⭐ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

// Dynamic embed that respects per-server config fetched from API
export async function guildEmbed(
  title: string,
  description: string | undefined,
  guildId: string,
  apiBase: string,
  botSecret: string
) {
  let color: number = GOLD;
  let footer = 'Zenith Staff Management';
  try {
    const res = await fetch(`${apiBase}/api/guilds/${guildId}/embed-config/bot`, {
      headers: { 'x-bot-secret': botSecret },
    });
    if (res.ok) {
      const cfg = await res.json() as { color?: string; footer?: string };
      if (cfg.color) color = parseInt(cfg.color.replace('#', ''), 16);
      if (cfg.footer) footer = cfg.footer;
    }
  } catch {}
  return new EmbedBuilder()
    .setColor(color as ColorResolvable)
    .setTitle(title)
    .setDescription(description ?? null)
    .setFooter({ text: footer })
    .setTimestamp();
}
