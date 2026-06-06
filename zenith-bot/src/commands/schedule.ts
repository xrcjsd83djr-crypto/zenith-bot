import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";
import { checkPremium } from "../lib/premium.js";

export const data = new SlashCommandBuilder()
  .setName("schedule")
  .setDescription("Manage shifts and schedules")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub => sub.setName("shift-start").setDescription("Start your work shift"))
  .addSubcommand(sub => sub.setName("shift-end").setDescription("End your current shift"))
  .addSubcommand(sub =>
    sub.setName("shifts").setDescription("View shift history")
      .addUserOption(o => o.setName("user").setDescription("Staff member (defaults to you)").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("active").setDescription("View all currently active shifts")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: false });

  try {
    if (sub === "shift-start") {
      const res = await api.post(`/guilds/${guildId}/shifts/start`, { userId: interaction.user.id, username: interaction.user.username });
      if (!res.ok) {
        const err = await res.json() as any;
        await interaction.editReply({ embeds: [errorEmbed("Failed to Start Shift", err.error || "API error")] });
        return;
      }
      const shift = await res.json() as any;
      const ts = Math.floor(new Date(shift.started_at).getTime() / 1000);
      await interaction.editReply({
        embeds: [successEmbed("Shift Started ✅", `Your shift has been logged.\nUse \`/schedule shift-end\` when done.`)
          .addFields({ name: "Started at", value: `<t:${ts}:T>`, inline: true })],
      });
    }

    if (sub === "shift-end") {
      const res = await api.post(`/guilds/${guildId}/shifts/end`, { userId: interaction.user.id });
      if (!res.ok) {
        const err = await res.json() as any;
        await interaction.editReply({ embeds: [errorEmbed("No Active Shift", "You don't have an active shift. Use `/schedule shift-start` first.")] });
        return;
      }
      const shift = await res.json() as any;
      const mins = Math.round(shift.duration_mins || 0);
      const hrs = Math.floor(mins / 60), rem = mins % 60;
      await interaction.editReply({
        embeds: [successEmbed("Shift Ended ✅", `Your shift has been logged. Thank you for your service!`)
          .addFields(
            { name: "⏱️ Duration", value: hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`, inline: true },
          )],
      });
    }

    if (sub === "shifts") {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const res = await api.get(`/guilds/${guildId}/shifts?userId=${user.id}`);
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to fetch shifts")] }); return; }
      const shifts = await res.json() as any[];
      const completed = shifts.filter(s => s.ended_at);
      const totalMins = completed.reduce((acc, s) => acc + (parseFloat(s.duration_mins) || 0), 0);
      const totalHrs = Math.floor(totalMins / 60);
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Shift History — ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Total Shifts", value: String(completed.length), inline: true },
          { name: "Total Time", value: `${totalHrs}h ${Math.round(totalMins % 60)}m`, inline: true },
        )
        .setTimestamp();
      const recent = completed.slice(0, 5);
      if (recent.length > 0) {
        const lines = recent.map(s => {
          const ts = Math.floor(new Date(s.started_at).getTime() / 1000);
          const mins = Math.round(parseFloat(s.duration_mins) || 0);
          return `<t:${ts}:d> — ${Math.floor(mins/60)}h ${mins%60}m`;
        });
        embed.addFields({ name: "Recent Shifts", value: lines.join("\n") });
      }
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "active") {
      const res = await api.get(`/guilds/${guildId}/shifts/active`);
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to fetch active shifts")] }); return; }
      const active = await res.json() as any[];
      if (active.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed("Active Shifts", "No staff are currently on shift.")] });
        return;
      }
      const lines = active.map(s => {
        const ts = Math.floor(new Date(s.started_at).getTime() / 1000);
        return `<@${s.user_id}> — started <t:${ts}:R>`;
      });
      await interaction.editReply({
        embeds: [infoEmbed(`Active Shifts (${active.length})`, lines.join("\n")).setTimestamp()],
      });
    }
  } catch (err: any) {
    await interaction.editReply({ embeds: [errorEmbed("Error", err.message || "An unexpected error occurred")] });
  }
}
