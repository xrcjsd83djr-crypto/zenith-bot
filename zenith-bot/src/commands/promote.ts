import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("promote")
  .setDescription("Promote, demote, or transfer a staff member")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("up")
      .setDescription("Promote a staff member to a new rank")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("rank").setDescription("New rank name").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
      .addRoleOption(o => o.setName("role").setDescription("Discord role to assign for new rank").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("down")
      .setDescription("Demote a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("rank").setDescription("New (lower) rank name").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("history")
      .setDescription("View promotion/demotion history")
      .addUserOption(o => o.setName("user").setDescription("Filter to a specific staff member").setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: false });

  try {
    if (sub === "up" || sub === "down") {
      const type = sub === "up" ? "promotion" : "demotion";
      const user = interaction.options.getUser("user", true);
      const newRank = interaction.options.getString("rank", true);
      const reason = interaction.options.getString("reason") ?? undefined;
      const role = interaction.options.getRole("role");

      // Get current rank
      let fromRank: string | null = null;
      try {
        const staffData: any = await api.staff.get(guildId, user.id);
        fromRank = staffData?.rankName ?? staffData?.rank ?? null;
      } catch {}

      const res = await api.post(`/guilds/${guildId}/promotions`, {
        userId: user.id, username: user.username,
        type, fromRank, toRank: newRank, reason,
        promotedBy: interaction.user.id, promotedByName: interaction.user.username,
        discordRoleId: role?.id ?? null,
      });

      if (!res.ok) {
        const err = await res.json() as any;
        await interaction.editReply({ embeds: [errorEmbed(`Failed to record ${type}`, err.error || "API error")] });
        return;
      }

      const color = type === "promotion" ? 0x57F287 : 0xED4245;
      const emoji = type === "promotion" ? "📈" : "📉";
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Recorded`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "👤 Staff Member", value: `${user} (${user.username})`, inline: true },
          { name: "From Rank", value: fromRank || "_Unknown_", inline: true },
          { name: "To Rank", value: `**${newRank}**`, inline: true },
          ...(reason ? [{ name: "Reason", value: reason, inline: false }] : []),
          ...(role ? [{ name: "Role Assigned", value: `<@&${role.id}>`, inline: true }] : []),
          { name: "Actioned by", value: interaction.user.username, inline: true },
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "history") {
      const user = interaction.options.getUser("user");
      const res = await api.get(`/guilds/${guildId}/promotions`);
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to fetch history")] }); return; }
      let history = await res.json() as any[];
      if (user) history = history.filter((h: any) => h.user_id === user.id);
      if (history.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed(user ? `Promotion History — ${user.username}` : "Promotion History", "No promotions or demotions recorded yet.")] });
        return;
      }
      const lines = history.slice(0, 10).map((h: any) => {
        const ts = Math.floor(new Date(h.created_at).getTime() / 1000);
        const emoji = h.type === "promotion" ? "📈" : h.type === "demotion" ? "📉" : "🔄";
        return `${emoji} **${h.username}** — ${h.from_rank || "?"} → **${h.to_rank}**\n> By ${h.promoted_by_name || "Unknown"} · <t:${ts}:R>${h.reason ? `\n> Reason: ${h.reason}` : ""}`;
      });
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(user ? `Promotion History — ${user.username}` : "Promotion History")
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: history.length > 10 ? `Showing 10 of ${history.length} entries` : `${history.length} total` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err: any) {
    await interaction.editReply({ embeds: [errorEmbed("Error", err.message)] });
  }
}
