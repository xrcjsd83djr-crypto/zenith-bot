import { EmbedBuilder, ColorResolvable } from "discord.js";

const PRIMARY = 0x5BA4CF;
const GOLD = 0xF5B800;
const RED = 0xED4245;
const GREEN = 0x57F287;
const GRAY = 0x99AAB5;

export function successEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(GREEN as ColorResolvable)
    .setTitle(`✅ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function errorEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(RED as ColorResolvable)
    .setTitle(`❌ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function infoEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(PRIMARY as ColorResolvable)
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
    .setColor(0xFEE75C as ColorResolvable)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}
