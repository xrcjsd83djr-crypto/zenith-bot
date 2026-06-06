import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

const SEV_EMOJI: Record<string, string> = { minor: "🟡", moderate: "🟠", major: "🔴" };
const SEV_LABEL: Record<string, string> = { minor: "Minor", moderate: "Moderate", major: "Major" };

export const data = new SlashCommandBuilder()
  .setName("warning")
  .setDescription("Manage staff warnings")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("add")
      .setDescription("Issue a warning to a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member to warn").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for the warning").setRequired(true))
      .addStringOption(o => o.setName("severity").setDescription("Warning severity (default: minor)").setRequired(false)
        .addChoices(
          { name: "🟡 Minor",    value: "minor"    },
          { name: "🟠 Moderate", value: "moderate" },
          { name: "🔴 Major",    value: "major"    },
        ))
  )
  .addSubcommand(sub =>
    sub.setName("remove")
      .setDescription("Remove a specific warning by ID")
      .addStringOption(o => o.setName("warning_id").setDescription("Warning ID to remove").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all warnings for a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("clear")
      .setDescription("Clear ALL warnings for a staff member (requires Administrator)")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ embeds: [errorEmbed("Server Only", "This command can only be used in a server.")], ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const sub     = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  try {
    // ── ADD ─────────────────────────────────────────────────────────────
    if (sub === "add") {
      const user     = interaction.options.getUser("user", true);
      const reason   = interaction.options.getString("reason", true);
      const severity = interaction.options.getString("severity") ?? "minor";

      const warning = await api.warnings.create(guildId, {
        userId: user.id, username: user.username,
        reason, severity,
        issuedBy: interaction.user.id, issuedByName: interaction.user.username,
      });

      // Fetch updated count for this user
      const allWarnings = await api.warnings.list(guildId, user.id);
      const active      = allWarnings.filter((w: any) => w.active !== false);
      const emoji       = SEV_EMOJI[severity] ?? "⚠️";
      const label       = SEV_LABEL[severity] ?? "Warning";
      const ts          = Math.floor(new Date(warning.created_at ?? Date.now()).getTime() / 1000);

      const embed = new EmbedBuilder()
        .setColor(severity === "major" ? 0xED4245 : severity === "moderate" ? 0xFEE75C : 0xFEE75C)
        .setTitle(`${emoji} ${label} Warning Issued`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "👤 Staff Member",    value: `${user} (${user.username})`,                  inline: true  },
          { name: "🆔 Warning ID",      value: `**#${warning.id}**`,                          inline: true  },
          { name: "🎚️ Severity",       value: `${emoji} ${label}`,                           inline: true  },
          { name: "📝 Reason",          value: reason,                                        inline: false },
          { name: "📊 Active Warnings", value: `**${active.length}** on record`,             inline: true  },
          { name: "🛡️ Issued by",      value: interaction.user.username,                     inline: true  },
          { name: "🕐 Issued at",       value: `<t:${ts}:F>`,                                inline: false },
        )
        .setFooter({ text: active.length >= 3 && severity === "major" ? "⚠️ 3 major warnings may auto-escalate to a strike." : `Use /warning list @${user.username} to view all warnings` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // ── REMOVE ───────────────────────────────────────────────────────────
    else if (sub === "remove") {
      const warningId = interaction.options.getString("warning_id", true);
      await api.warnings.remove(guildId, warningId);
      await interaction.editReply({
        embeds: [successEmbed("Warning Removed", `Warning **#${warningId}** has been removed.`)],
      });
    }

    // ── LIST ─────────────────────────────────────────────────────────────
    else if (sub === "list") {
      const user     = interaction.options.getUser("user", true);
      const warnings = await api.warnings.list(guildId, user.id);
      const active   = warnings.filter((w: any) => w.active !== false);

      if (!active.length) {
        return await interaction.editReply({
          embeds: [infoEmbed("No Warnings", `${user.username} has no active warnings on record.`)],
        });
      }

      const lines = active.slice(0, 10).map((w: any, i: number) => {
        const emoji = SEV_EMOJI[w.severity] ?? "⚠️";
        const label = SEV_LABEL[w.severity] ?? "Warning";
        const ts    = Math.floor(new Date(w.created_at).getTime() / 1000);
        return `${emoji} **#${w.id}** · ${label} — ${w.reason.slice(0, 60)}\n> By **${w.issued_by_name}** · <t:${ts}:R>`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`Warnings — ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .setDescription(lines.join("\n\n"))
        .addFields({ name: "📊 Total Active", value: String(active.length), inline: true })
        .setFooter({ text: active.length > 10 ? `Showing 10 of ${active.length}` : `${active.length} active warning${active.length !== 1 ? "s" : ""}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // ── CLEAR ────────────────────────────────────────────────────────────
    else if (sub === "clear") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return await interaction.editReply({
          embeds: [errorEmbed("Unauthorized", "You need **Administrator** permission to clear all warnings.")],
        });
      }
      const user = interaction.options.getUser("user", true);
      await api.warnings.clearUser(guildId, user.id);
      await interaction.editReply({
        embeds: [successEmbed("Warnings Cleared", `All warnings cleared for **${user.username}**.`)
          .addFields({ name: "Cleared by", value: interaction.user.username, inline: true })],
      });
    }
  } catch (err: any) {
    await interaction.editReply({
      embeds: [errorEmbed("Error", err.message ?? "An unexpected error occurred.")],
    });
  }
}
