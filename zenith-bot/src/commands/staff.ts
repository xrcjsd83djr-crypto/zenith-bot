import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed, warnEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("staff")
  .setDescription("Manage the staff roster")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("add")
      .setDescription("Add a member to the staff roster")
      .addUserOption(o => o.setName("user").setDescription("The user to add").setRequired(true))
      .addStringOption(o => o.setName("rank").setDescription("Rank name to assign").setRequired(false))
      .addStringOption(o => o.setName("division").setDescription("Division").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("remove")
      .setDescription("Remove a member from the staff roster")
      .addUserOption(o => o.setName("user").setDescription("The staff member to remove").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("info")
      .setDescription("View a staff member's information")
      .addUserOption(o => o.setName("user").setDescription("The staff member").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("List all active staff members")
  )
  .addSubcommand(sub =>
    sub.setName("promote")
      .setDescription("Update a staff member's rank")
      .addUserOption(o => o.setName("user").setDescription("The staff member").setRequired(true))
      .addStringOption(o => o.setName("rank").setDescription("New rank name").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: true });

  if (sub === "add") {
    const user = interaction.options.getUser("user", true);
    const rankName = interaction.options.getString("rank");
    const division = interaction.options.getString("division");

    try {
      const ranks = await api.ranks.list(guildId);
      const rank = rankName ? ranks.find((r: any) => r.name.toLowerCase() === rankName.toLowerCase()) : null;

      await api.staff.add(guildId, {
        userId: user.id,
        rankId: rank?.id ?? null,
        division: division ?? null,
      });

      const embed = successEmbed("Staff Member Added", `${user} has been added to the staff roster.`)
        .addFields(
          { name: "Rank", value: rank?.name ?? "No rank", inline: true },
          { name: "Division", value: division ?? "None", inline: true },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to add staff member")] });
    }
  }

  if (sub === "remove") {
    const user = interaction.options.getUser("user", true);
    try {
      await api.staff.remove(guildId, user.id);
      await interaction.editReply({ embeds: [successEmbed("Staff Member Removed", `${user} has been removed from the roster.`)] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to remove staff member")] });
    }
  }

  if (sub === "info") {
    const user = interaction.options.getUser("user", true);
    try {
      const member = await api.staff.get(guildId, user.id);
      const strikes = member.strikes?.filter((s: any) => s.active) ?? [];
      const activeLoa = member.loaHistory?.find((l: any) => l.status === "approved" && new Date(l.endDate) > new Date());

      const embed = infoEmbed(`Staff Info — ${member.displayName || member.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Discord", value: `<@${member.userId}>`, inline: true },
          { name: "Rank", value: member.rankName ?? "No rank", inline: true },
          { name: "Division", value: member.division ?? "None", inline: true },
          { name: "Status", value: member.status, inline: true },
          { name: "Active Strikes", value: String(strikes.length), inline: true },
          { name: "LOA", value: activeLoa ? `Until ${new Date(activeLoa.endDate).toLocaleDateString()}` : "Not on LOA", inline: true },
          { name: "Joined", value: new Date(member.joinedAt).toLocaleDateString(), inline: true },
        );

      if (member.robloxUsername) embed.addFields({ name: "Roblox", value: member.robloxUsername, inline: true });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Staff member not found", "This user may not be on the roster.")] });
    }
  }

  if (sub === "list") {
    try {
      const staff = await api.staff.list(guildId);
      const active = staff.filter((m: any) => m.status === "active");

      if (active.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed("Staff Roster", "No active staff members.")] });
        return;
      }

      const lines = active.slice(0, 20).map((m: any) =>
        `<@${m.userId}> — **${m.rankName ?? "No rank"}**${m.division ? ` · ${m.division}` : ""} ${m.strikeCount > 0 ? `⚠️ ${m.strikeCount}` : ""}`
      );

      const embed = infoEmbed(`Staff Roster (${active.length})`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: active.length > 20 ? `Showing 20 of ${active.length} members` : `${active.length} active member${active.length !== 1 ? "s" : ""}` });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to fetch staff list")] });
    }
  }

  if (sub === "promote") {
    const user = interaction.options.getUser("user", true);
    const rankName = interaction.options.getString("rank", true);
    try {
      const ranks = await api.ranks.list(guildId);
      const rank = ranks.find((r: any) => r.name.toLowerCase() === rankName.toLowerCase());
      if (!rank) {
        await interaction.editReply({ embeds: [errorEmbed("Rank Not Found", `No rank named "${rankName}" exists.`)] });
        return;
      }

      await api.staff.update(guildId, user.id, { rankId: rank.id });

      const embed = successEmbed("Rank Updated", `${user}'s rank has been updated to **${rank.name}**.`)
        .addFields({ name: "New Rank", value: rank.name, inline: true });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed("Failed to update rank")] });
    }
  }
}
