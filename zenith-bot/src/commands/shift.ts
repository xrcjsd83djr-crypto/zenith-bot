import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../lib/config.js";

export const data = new SlashCommandBuilder()
  .setName("shift")
  .setDescription("Manage your shift — start, end, or check status")
  .addSubcommand(s => s.setName("start").setDescription("Clock in and start your shift")
    .addStringOption(o => o.setName("type").setDescription("Shift type").addChoices(
      { name: "General", value: "general" },
      { name: "Patrol", value: "patrol" },
      { name: "Training", value: "training" },
      { name: "Event", value: "event" },
      { name: "Support", value: "support" },
    ))
    .addStringOption(o => o.setName("notes").setDescription("Optional notes for this shift"))
  )
  .addSubcommand(s => s.setName("end").setDescription("Clock out and end your current shift")
    .addStringOption(o => o.setName("notes").setDescription("End-of-shift notes (optional)"))
  )
  .addSubcommand(s => s.setName("status").setDescription("Check your current shift status"))
  .addSubcommand(s => s.setName("view").setDescription("View shift history for a staff member")
    .addUserOption(o => o.setName("user").setDescription("Staff member to view (defaults to you)"))
  )
  .addSubcommand(s => s.setName("leaderboard").setDescription("View top shift hours for this server this week"));

const GOLD = 0xD4AF37;

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const username = interaction.user.displayName || interaction.user.username;
  const headers = { "Content-Type": "application/json", "x-bot-secret": config.botSecret };

  // Status and view are public (not ephemeral), start/end are private
  const isPrivate = sub === "start" || sub === "end";
  await interaction.deferReply({ ephemeral: isPrivate });

  try {
    if (sub === "start") {
      const shiftType = interaction.options.getString("type") || "general";
      const notes = interaction.options.getString("notes") || "";

      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/shifts/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId, username, shiftType, notes }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as any;
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle("❌ Could Not Start Shift")
            .setDescription(err.error?.includes("already") || err.alreadyActive
              ? "You already have an active shift. Use `/shift end` to clock out first."
              : `Failed to start shift: ${err.error || "Unknown error"}`)
            .setFooter({ text: "Zenith Shift Tracking" })
          ]
        });
      }

      const shiftData = await res.json() as any;
      const startTs = Math.floor(new Date(shiftData.started_at || Date.now()).getTime() / 1000);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(GOLD)
          .setTitle("⏱ Shift Started")
          .setDescription(`You've clocked in for a **${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)}** shift. Good luck!`)
          .addFields(
            { name: "🕐 Started At", value: `<t:${startTs}:T>`, inline: true },
            { name: "📋 Type", value: shiftType.charAt(0).toUpperCase() + shiftType.slice(1), inline: true },
            ...(notes ? [{ name: "📝 Notes", value: notes, inline: false }] : [])
          )
          .setFooter({ text: "Use /shift end to clock out • Zenith Shift Tracking" })
          .setTimestamp()
        ]
      });

    } else if (sub === "end") {
      const notes = interaction.options.getString("notes") || "";

      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/shifts/end`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId, username, notes }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as any;
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle("❌ Could Not End Shift")
            .setDescription(
              err.error?.toLowerCase().includes("no active") || err.error?.toLowerCase().includes("not on")
                ? "You don't have an active shift to end. Use `/shift start` to clock in."
                : `Failed to end shift: ${err.error || "Unknown error"}`
            )
            .setFooter({ text: "Zenith Shift Tracking" })
          ]
        });
      }

      const shiftData = await res.json() as any;
      const mins = shiftData.duration_mins ? Math.round(Number(shiftData.duration_mins)) : 0;
      const startTs = shiftData.started_at ? Math.floor(new Date(shiftData.started_at).getTime() / 1000) : 0;
      const endTs = Math.floor(Date.now() / 1000);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x22C55E)
          .setTitle("✅ Shift Ended")
          .setDescription("Your shift has been logged. Great work!")
          .addFields(
            { name: "⏱ Duration", value: fmtDuration(mins), inline: true },
            { name: "🕐 Started", value: startTs ? `<t:${startTs}:T>` : "Unknown", inline: true },
            { name: "🕑 Ended", value: `<t:${endTs}:T>`, inline: true },
            { name: "📋 Type", value: (shiftData.shift_type || "general").charAt(0).toUpperCase() + (shiftData.shift_type || "general").slice(1), inline: true },
            ...(notes ? [{ name: "📝 Notes", value: notes, inline: false }] : [])
          )
          .setFooter({ text: "Zenith Shift Tracking" })
          .setTimestamp()
        ]
      });

    } else if (sub === "status") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/shifts/active/${userId}`, { headers });

      if (!res.ok || res.status === 404) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x6B7280)
            .setTitle("⭕ No Active Shift")
            .setDescription(`<@${userId}> is not currently on shift.\nUse \`/shift start\` to clock in.`)
            .setFooter({ text: "Zenith Shift Tracking" })
          ]
        });
      }

      const shift = await res.json().catch(() => null) as any;
      if (!shift?.started_at) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x6B7280)
            .setTitle("⭕ No Active Shift")
            .setDescription(`<@${userId}> is not currently on shift.`)
            .setFooter({ text: "Zenith Shift Tracking" })
          ]
        });
      }

      const startTs = Math.floor(new Date(shift.started_at).getTime() / 1000);
      const elapsedMins = Math.round((Date.now() - new Date(shift.started_at).getTime()) / 60000);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x22C55E)
          .setTitle("🟢 Currently On Shift")
          .setDescription(`<@${userId}> is actively on shift.`)
          .addFields(
            { name: "📋 Type", value: (shift.shift_type || "general").charAt(0).toUpperCase() + (shift.shift_type || "general").slice(1), inline: true },
            { name: "🕐 Started", value: `<t:${startTs}:R>`, inline: true },
            { name: "⏱ Elapsed", value: fmtDuration(elapsedMins), inline: true },
            ...(shift.notes ? [{ name: "📝 Notes", value: shift.notes, inline: false }] : [])
          )
          .setFooter({ text: "Use /shift end to clock out • Zenith Shift Tracking" })
          .setTimestamp()
        ]
      });

    } else if (sub === "view") {
      const target = interaction.options.getUser("user") || interaction.user;
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/shifts?userId=${target.id}&limit=10`, { headers });

      if (!res.ok) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle("❌ Error")
            .setDescription("Could not fetch shift history.")
          ]
        });
      }

      const allShifts = await res.json().catch(() => []) as any[];
      const completed = allShifts.filter((s: any) => s.ended_at).slice(0, 8);

      if (completed.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x6B7280)
            .setTitle(`Shift History — ${target.displayName || target.username}`)
            .setDescription("No completed shifts found.")
            .setFooter({ text: "Zenith Shift Tracking" })
          ]
        });
      }

      const totalMins = completed.reduce((a: number, s: any) => a + (Number(s.duration_mins) || 0), 0);
      const embed = new EmbedBuilder()
        .setColor(GOLD)
        .setTitle(`📊 Shift History — ${target.displayName || target.username}`)
        .setDescription(`**${completed.length}** recent shifts • **${fmtDuration(totalMins)}** total`)
        .setThumbnail(target.displayAvatarURL())
        .setFooter({ text: "Zenith Shift Tracking" })
        .setTimestamp();

      for (const s of completed) {
        const ts = Math.floor(new Date(s.started_at).getTime() / 1000);
        const mins = Math.round(Number(s.duration_mins) || 0);
        const type = (s.shift_type || "general").charAt(0).toUpperCase() + (s.shift_type || "general").slice(1);
        embed.addFields({
          name: `${type} — ${fmtDuration(mins)}`,
          value: `<t:${ts}:D> at <t:${ts}:t>${s.notes ? ` • ${s.notes.slice(0, 50)}` : ""}`,
          inline: true,
        });
      }

      return interaction.editReply({ embeds: [embed] });

    } else if (sub === "leaderboard") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/shifts?limit=500`, { headers });
      if (!res.ok) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle("❌ Error")
            .setDescription("Could not fetch shift data.")
          ]
        });
      }

      const allShifts = await res.json().catch(() => []) as any[];
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = allShifts.filter((s: any) => s.ended_at && new Date(s.started_at).getTime() > weekAgo);

      const totals: Record<string, { username: string; mins: number; shifts: number }> = {};
      for (const s of recent) {
        if (!totals[s.user_id]) totals[s.user_id] = { username: s.username, mins: 0, shifts: 0 };
        totals[s.user_id].mins += Number(s.duration_mins) || 0;
        totals[s.user_id].shifts++;
      }

      const sorted = Object.entries(totals).sort((a, b) => b[1].mins - a[1].mins).slice(0, 10);

      if (sorted.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x6B7280)
            .setTitle("📊 Shift Leaderboard — This Week")
            .setDescription("No shift data for this week yet.")
          ]
        });
      }

      const medals = ["🥇", "🥈", "🥉"];
      const lines = sorted.map(([uid, { username, mins, shifts }], i) =>
        `${medals[i] || `**${i + 1}.**`} <@${uid}> — **${fmtDuration(Math.round(mins))}** (${shifts} shift${shifts !== 1 ? "s" : ""})`
      );

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(GOLD)
          .setTitle("🏆 Shift Leaderboard — This Week")
          .setDescription(lines.join("\n"))
          .setFooter({ text: "Last 7 days • Zenith Shift Tracking" })
          .setTimestamp()
        ]
      });
    }
  } catch (err: any) {
    console.error("[shift command error]", err);
    return interaction.editReply({
      content: "❌ An unexpected error occurred. Please try again.",
    });
  }
}
