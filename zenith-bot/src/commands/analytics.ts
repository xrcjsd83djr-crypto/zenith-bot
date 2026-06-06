import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { api } from "../lib/api.js";
import { infoEmbed, errorEmbed, premiumEmbed } from "../lib/embed.js";
import { checkPremium } from "../lib/premium.js";

export const data = new SlashCommandBuilder()
  .setName("analytics")
  .setDescription("View server analytics and insights")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub => sub.setName("overview").setDescription("View server overview (free)"))
  .addSubcommand(sub => sub.setName("staff").setDescription("Top performers and activity (free)"))
  .addSubcommand(sub => sub.setName("trends").setDescription("7-day activity trends [Premium]"))
  .addSubcommand(sub => sub.setName("export").setDescription("Export analytics as JSON [Premium]"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    const isPremium = await checkPremium(guildId);

    if (sub === "trends" || sub === "export") {
      if (!isPremium) {
        await interaction.editReply({ embeds: [errorEmbed("Premium Required", `\`/analytics ${sub}\` is a **Zenith Premium** feature.\n\n[Upgrade at zenithbot.up.railway.app/premium](https://zenithbot.up.railway.app/premium)`)] });
        return;
      }
    }

    const data: any = await api.get(`/guilds/${guildId}/analytics`).then(r => r.json()).catch(() => null);
    if (!data) {
      await interaction.editReply({ embeds: [errorEmbed("Failed to fetch analytics", "Could not connect to the API.")] });
      return;
    }

    if (sub === "overview") {
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle("📊 Server Analytics Overview")
        .addFields(
          { name: "👥 Active Staff",      value: String(data.summary?.totalStaff ?? 0),       inline: true },
          { name: "⚠️ Active Strikes",    value: String(data.summary?.activeStrikes ?? 0),     inline: true },
          { name: "📅 On LOA",            value: String(data.summary?.activeLoa ?? 0),          inline: true },
          { name: "📈 Promotions (30d)",  value: String(data.summary?.recentPromotions ?? 0),  inline: true },
          { name: "⏱️ Total Shift Hrs",  value: `${Math.round((data.summary?.totalShiftMins ?? 0)/60)}h`, inline: true },
          { name: "🔄 Total Shifts",      value: String(data.summary?.totalShifts ?? 0),        inline: true },
        )
        .setFooter({ text: isPremium ? "Zenith Premium — Full Analytics" : "Zenith Free — /analytics trends for Premium trends" })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "staff") {
      const top = (data.topPerformers ?? []) as any[];
      const lines = top.length > 0
        ? top.map((m: any, i: number) => {
            const hrs = Math.round((m.total_mins || 0) / 60);
            const medal = ["🥇","🥈","🥉"][i] ?? `**${i+1}.**`;
            return `${medal} **${m.username}** — ${hrs}h · ${m.shift_count} shifts · ${m.strike_count} strikes`;
          }).join("\n")
        : "No shift data yet. Use `/schedule shift-start` to begin tracking.";
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setTitle("🏆 Top Performers")
        .setDescription(lines)
        .setFooter({ text: "Based on total logged shift time" })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "trends") {
      const trends = (data.trends ?? []) as any[];
      const lines = trends.length > 0
        ? trends.map((t: any) => `**${t.date}** — ${t.count} actions`).join("\n")
        : "No activity in the last 7 days.";
      const embed = premiumEmbed("7-Day Activity Trends").setDescription(lines).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "export") {
      const summary = data.summary ?? {};
      const json = JSON.stringify({ guildId, generatedAt: new Date().toISOString(), ...summary }, null, 2);
      await interaction.editReply({ content: `\`\`\`json\n${json.slice(0, 1900)}\n\`\`\`` });
    }
  } catch (err: any) {
    await interaction.editReply({ embeds: [errorEmbed("Error", err.message)] });
  }
}
