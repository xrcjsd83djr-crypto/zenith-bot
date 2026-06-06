import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

const SEV_EMOJI: Record<string, string> = { strike: "⚠️", final_warning: "🚨", auto: "🤖" };
const SEV_LABEL: Record<string, string> = { strike: "Strike", final_warning: "Final Warning", auto: "Auto-Strike" };

export const data = new SlashCommandBuilder()
  .setName("strike")
  .setDescription("Manage staff strikes")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("issue")
      .setDescription("Issue a strike to a staff member")
      .addUserOption(o => o.setName("user").setDescription("The staff member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for the strike").setRequired(true))
      .addStringOption(o => o.setName("severity").setDescription("Severity (default: strike)").setRequired(false)
        .addChoices(
          { name: "⚠️ Strike",        value: "strike" },
          { name: "🚨 Final Warning", value: "final_warning" },
        ))
      .addStringOption(o => o.setName("evidence").setDescription("Evidence URL or notes").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all active strikes in this server")
      .addUserOption(o => o.setName("user").setDescription("Filter to a specific staff member").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("info")
      .setDescription("View full strike history for a staff member")
      .addUserOption(o => o.setName("user").setDescription("The staff member").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("revoke")
      .setDescription("Revoke (remove) a strike by its ID")
      .addIntegerOption(o => o.setName("id").setDescription("Strike ID (shown in /strike list)").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for revocation").setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub     = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: false });

  // ── ISSUE ──────────────────────────────────────────────────────────────
  if (sub === "issue") {
    const user     = interaction.options.getUser("user", true);
    const reason   = interaction.options.getString("reason", true);
    const severity = interaction.options.getString("severity") ?? "strike";
    const evidence = interaction.options.getString("evidence") ?? undefined;

    try {
      const strike  = await api.strikes.create(guildId, {
        userId: user.id, username: user.username,
        reason, evidence, severity,
        issuedBy: interaction.user.id, issuedByName: interaction.user.username,
      });

      const allStrikes = await api.strikes.list(guildId);
      const userActive = allStrikes.filter((s: any) => s.user_id === user.id && s.active);
      const isCritical = userActive.length >= 3;
      const emoji      = SEV_EMOJI[severity] ?? "⚠️";
      const label      = SEV_LABEL[severity] ?? "Strike";
      const ts         = Math.floor(new Date(strike.created_at ?? Date.now()).getTime() / 1000);

      const embed = new EmbedBuilder()
        .setColor(isCritical ? 0xED4245 : severity === "final_warning" ? 0xFEE75C : 0xFEE75C)
        .setTitle(`${emoji} ${label} Issued`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "👤 Staff Member",    value: `${user} (${user.username})`,              inline: true  },
          { name: "🆔 Strike ID",       value: `**#${strike.id}**`,                       inline: true  },
          { name: "🎚️ Severity",       value: label,                                     inline: true  },
          { name: "📝 Reason",          value: reason,                                    inline: false },
          { name: "🔍 Evidence",        value: evidence || "_None provided_",             inline: false },
          { name: "📊 Active Strikes",  value: `**${userActive.length}**${isCritical ? " ⚠️ Threshold hit!" : ""}`, inline: true },
          { name: "🛡️ Issued by",      value: interaction.user.username,                 inline: true  },
          { name: "🕐 Issued at",       value: `<t:${ts}:F>`,                             inline: false },
        )
        .setFooter({ text: `Use /strike info @${user.username} to view full history` })
        .setTimestamp();

      if (isCritical) {
        embed.setDescription(
          `> ⚠️ **${user.username} has reached the strike threshold!**\n` +
          `> They now have **${userActive.length}** active strikes. Review their status in the dashboard.`
        );
      }

      await interaction.editReply({ embeds: [embed] });

      // Trigger strike automation check (premium — runs in background)
      api.post(`/guilds/${guildId}/strike-automation/check`, { userId: user.id, username: user.username })
        .then(async (r: any) => {
          if (r.ok) {
            const result: any = await r.json();
            if (result.triggered && result.actions?.length > 0) {
              try { await interaction.followUp({ content: `⚙️ Automation triggered: ${result.actions.join(', ')} (${result.count} strikes)`, ephemeral: true }); } catch {}
            }
          }
        }).catch(() => {});
    } catch (err: any) {
      console.error('[strike issue]', err);
      await interaction.editReply({
        embeds: [errorEmbed("Failed to Issue Strike", err.message || "Please try again or use the dashboard.")],
      });
    }
  }

  // ── LIST ───────────────────────────────────────────────────────────────
  if (sub === "list") {
    const filterUser = interaction.options.getUser("user");
    try {
      let strikes = await api.strikes.list(guildId);
      if (filterUser) strikes = strikes.filter((s: any) => s.user_id === filterUser.id);
      const active  = strikes.filter((s: any) => s.active);
      const revoked = strikes.filter((s: any) => !s.active);

      if (active.length === 0) {
        return await interaction.editReply({
          embeds: [infoEmbed(
            filterUser ? `No Strikes — ${filterUser.username}` : "No Active Strikes",
            filterUser ? `${filterUser.username} has no active strikes.` : "This server has no active strikes. 🎉",
          )],
        });
      }

      const lines = active.slice(0, 15).map((s: any) => {
        const emoji = SEV_EMOJI[s.severity] ?? "⚠️";
        const ts    = Math.floor(new Date(s.created_at).getTime() / 1000);
        return `${emoji} **#${s.id}** · <@${s.user_id}> — ${s.reason.slice(0, 55)}…\n> By **${s.issued_by_name}** · <t:${ts}:R>`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(filterUser ? `Active Strikes — ${filterUser.username}` : "Active Strikes")
        .setDescription(lines.join("\n\n"))
        .addFields({
          name: "📊 Summary",
          value: `**${active.length}** active · **${revoked.length}** revoked · **${strikes.length}** total`,
        })
        .setFooter({ text: active.length > 15 ? `Showing 15 of ${active.length}. View all in the dashboard.` : `${active.length} active strike${active.length !== 1 ? "s" : ""}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed("Failed to Fetch Strikes", err.message)] });
    }
  }

  // ── INFO ───────────────────────────────────────────────────────────────
  if (sub === "info") {
    const user = interaction.options.getUser("user", true);
    try {
      const strikes = await api.strikes.list(guildId);
      const all     = strikes.filter((s: any) => s.user_id === user.id);
      const active  = all.filter((s: any) => s.active);
      const revoked = all.filter((s: any) => !s.active);

      const embed = new EmbedBuilder()
        .setColor(active.length >= 3 ? 0xED4245 : active.length > 0 ? 0xFEE75C : 0x57F287)
        .setTitle(`Strike History — ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "🔴 Active",  value: String(active.length),  inline: true },
          { name: "✅ Revoked", value: String(revoked.length), inline: true },
          { name: "📊 Total",   value: String(all.length),     inline: true },
        )
        .setTimestamp();

      if (all.length === 0) {
        embed.setDescription(`${user} has a **clean record** — no strikes on file.`);
      } else {
        const recentLines = all.slice(0, 8).map((s: any) => {
          const emoji  = SEV_EMOJI[s.severity] ?? "⚠️";
          const status = s.active ? "🔴 Active" : "✅ Revoked";
          const ts     = Math.floor(new Date(s.created_at).getTime() / 1000);
          return (
            `${emoji} **#${s.id}** [${status}] · ${SEV_LABEL[s.severity] ?? "Strike"}\n` +
            `> **Reason:** ${s.reason.slice(0, 80)}\n` +
            `> By **${s.issued_by_name}** · <t:${ts}:F>` +
            (s.evidence ? `\n> Evidence: ${s.evidence.slice(0, 80)}` : "")
          );
        });
        embed.addFields({ name: "Strike History", value: recentLines.join("\n\n") });
        if (all.length > 8) embed.setFooter({ text: `Showing 8 of ${all.length}. View all in the dashboard.` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed("Failed to Fetch Strike History", err.message)] });
    }
  }

  // ── REVOKE ─────────────────────────────────────────────────────────────
  if (sub === "revoke") {
    const id     = interaction.options.getInteger("id", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    try {
      await api.strikes.remove(guildId, id);
      await interaction.editReply({
        embeds: [
          successEmbed("Strike Revoked", `Strike **#${id}** has been revoked.`)
            .addFields(
              { name: "Strike ID",     value: `**#${id}**`,            inline: true  },
              { name: "Revoked by",    value: interaction.user.username, inline: true  },
              { name: "Revoke reason", value: reason,                   inline: false },
            ),
        ],
      });
    } catch (err: any) {
      await interaction.editReply({
        embeds: [errorEmbed("Failed to Revoke Strike", "That strike may not exist or is already revoked.")],
      });
    }
  }
}
