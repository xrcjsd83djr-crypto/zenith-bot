import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("blacklist")
  .setDescription("Manage the staff application blacklist")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("add")
      .setDescription("Add a user to the blacklist (prevents them applying for staff)")
      .addUserOption(o => o.setName("user").setDescription("User to blacklist").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for blacklisting").setRequired(true))
      .addStringOption(o => o.setName("expires").setDescription("Expiry date YYYY-MM-DD (leave blank = permanent)").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("remove")
      .setDescription("Remove a user from the blacklist")
      .addUserOption(o => o.setName("user").setDescription("User to remove").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("check")
      .setDescription("Check if a user is on the blacklist")
      .addUserOption(o => o.setName("user").setDescription("User to check").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all blacklisted users")
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
    // ── ADD ──────────────────────────────────────────────────────────────
    if (sub === "add") {
      const user    = interaction.options.getUser("user", true);
      const reason  = interaction.options.getString("reason", true);
      const expires = interaction.options.getString("expires");

      let expiresAt: string | null = null;
      if (expires) {
        const d = new Date(expires);
        if (isNaN(d.getTime())) {
          return await interaction.editReply({
            embeds: [errorEmbed("Invalid Date", "Please use **YYYY-MM-DD** format for the expiry date.")],
          });
        }
        expiresAt = d.toISOString();
      }

      const entry = await api.blacklist.add(guildId, {
        userId:      user.id,
        username:    user.username,
        reason,
        expiresAt,
        addedBy:     interaction.user.id,
        addedByName: interaction.user.username,
      });

      const ts = entry.created_at ? Math.floor(new Date(entry.created_at).getTime() / 1000) : null;

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🚫 User Blacklisted")
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`**${user}** has been added to the blacklist and can no longer apply for staff.`)
        .addFields(
          { name: "👤 User",       value: `${user} (${user.username})`,           inline: true  },
          { name: "📋 Entry ID",   value: `**#${entry.id}**`,                     inline: true  },
          { name: "📝 Reason",     value: reason,                                 inline: false },
          { name: "⏰ Expires",    value: expiresAt ? `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>` : "Never (permanent)", inline: true },
          { name: "🛡️ Added by",  value: interaction.user.username,              inline: true  },
        )
        .setTimestamp();

      if (ts) embed.addFields({ name: "📅 Added on", value: `<t:${ts}:F>`, inline: false });

      await interaction.editReply({ embeds: [embed] });
    }

    // ── REMOVE ───────────────────────────────────────────────────────────
    else if (sub === "remove") {
      const user = interaction.options.getUser("user", true);
      await api.blacklist.removeByUser(guildId, user.id);
      await interaction.editReply({
        embeds: [
          successEmbed("Blacklist Entry Removed", `**${user.username}** has been removed from the blacklist.`)
            .addFields({ name: "Removed by", value: interaction.user.username, inline: true }),
        ],
      });
    }

    // ── CHECK ────────────────────────────────────────────────────────────
    else if (sub === "check") {
      const user = interaction.options.getUser("user", true);
      const res  = await api.blacklist.checkUser(guildId, user.id);

      if (res.status === 404) {
        return await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle("✅ Not Blacklisted")
              .setThumbnail(user.displayAvatarURL())
              .setDescription(`**${user.username}** is **not** on the blacklist.`)
              .setTimestamp(),
          ],
        });
      }

      if (!res.ok) throw new Error(`API ${res.status}`);

      const e  = await res.json() as any;
      const ts = e.created_at ? Math.floor(new Date(e.created_at).getTime() / 1000) : null;

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🚫 User Is Blacklisted")
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`**${user.username}** is on the blacklist and **cannot** apply for staff.`)
        .addFields(
          { name: "📝 Reason",     value: e.reason,                                                          inline: false },
          { name: "🛡️ Added by",  value: e.added_by_name ?? e.addedByName ?? "Unknown",                    inline: true  },
          { name: "⏰ Expires",    value: e.expires_at ? `<t:${Math.floor(new Date(e.expires_at).getTime() / 1000)}:F>` : "Never", inline: true },
        )
        .setTimestamp();

      if (ts) embed.addFields({ name: "📅 Added on", value: `<t:${ts}:F>`, inline: false });

      await interaction.editReply({ embeds: [embed] });
    }

    // ── LIST ─────────────────────────────────────────────────────────────
    else if (sub === "list") {
      const list = await api.blacklist.list(guildId);

      if (!list.length) {
        return await interaction.editReply({
          embeds: [infoEmbed("Blacklist Empty", "No users are currently blacklisted in this server.")],
        });
      }

      const lines = list.slice(0, 12).map((e: any, i: number) => {
        const ts = e.created_at ? Math.floor(new Date(e.created_at).getTime() / 1000) : null;
        const expStr = e.expires_at ? `Expires <t:${Math.floor(new Date(e.expires_at).getTime() / 1000)}:R>` : "Permanent";
        return `**${i + 1}.** **${e.username}** — ${e.reason.slice(0, 50)}${ts ? ` · <t:${ts}:R>` : ""}\n> ${expStr} · Added by **${e.added_by_name ?? "Unknown"}**`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`🚫 Blacklist (${list.length} entr${list.length !== 1 ? "ies" : "y"})`)
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: list.length > 12 ? `Showing 12 of ${list.length}. View all in the dashboard.` : `${list.length} blacklisted user${list.length !== 1 ? "s" : ""}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err: any) {
    await interaction.editReply({
      embeds: [errorEmbed("Error", err.message ?? "An unexpected error occurred.")],
    });
  }
}
