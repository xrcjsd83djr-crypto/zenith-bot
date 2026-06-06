import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../lib/config.js";

export const data = new SlashCommandBuilder()
  .setName("roster")
  .setDescription("View the current duty roster — who is checked in")
  .addSubcommand(s => s.setName("view").setDescription("View who is currently on duty"))
  .addSubcommand(s => s.setName("checkin").setDescription("Check yourself into the duty roster"))
  .addSubcommand(s => s.setName("checkout").setDescription("Check yourself out of the duty roster"));

const GOLD = 0xD4AF37;

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const username = interaction.user.username;
  const apiBase = config.apiUrl;
  const headers = { "Content-Type": "application/json", "x-bot-secret": config.botSecret };

  await interaction.deferReply({ ephemeral: sub !== "view" });

  try {
    if (sub === "view") {
      const res = await fetch(`${apiBase}/guilds/${guildId}/roster`, { headers });
      const data: any[] = res.ok ? await res.json().catch(() => []) : [];
      const onDuty = data.filter((d: any) => d.on_duty);
      const embed = new EmbedBuilder()
        .setColor(GOLD)
        .setTitle("📋 Duty Roster — Currently On Duty")
        .setDescription(onDuty.length === 0 ? "*No staff currently on duty.*" : onDuty.map((d: any) => `• **${d.username}** — since <t:${Math.floor(new Date(d.checked_in_at).getTime()/1000)}:R>`).join("\n"))
        .setFooter({ text: `${onDuty.length} staff on duty • /roster checkin to join` })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });

    } else if (sub === "checkin") {
      const res = await fetch(`${apiBase}/guilds/${guildId}/roster/checkin`, {
        method: "POST", headers,
        body: JSON.stringify({ userId, username }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return interaction.editReply({ content: `❌ ${e.error || "Failed to check in."}` }); }
      return interaction.editReply({ content: "✅ You're now checked into the duty roster! Use `/roster checkout` when you're done." });

    } else if (sub === "checkout") {
      const res = await fetch(`${apiBase}/guilds/${guildId}/roster/checkout`, {
        method: "POST", headers,
        body: JSON.stringify({ userId, username }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return interaction.editReply({ content: `❌ ${e.error || "Failed to check out."}` }); }
      return interaction.editReply({ content: "✅ You've been checked out of the duty roster." });
    }
  } catch (err) {
    console.error("Roster command error:", err);
    return interaction.editReply({ content: "❌ An unexpected error occurred." });
  }
}
