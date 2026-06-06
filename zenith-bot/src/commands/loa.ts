import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

const STATUS_EMOJI: Record<string, string> = {
  pending:  "⏳",
  approved: "✅",
  denied:   "❌",
  active:   "🟢",
  returned: "🔄",
  expired:  "⌛",
};

function dateToParts(str: string): { ts: number; label: string } {
  const d = new Date(str);
  return { ts: Math.floor(d.getTime() / 1000), label: d.toLocaleDateString() };
}

export const data = new SlashCommandBuilder()
  .setName("loa")
  .setDescription("Manage Leave of Absence requests")
  .addSubcommand(sub =>
    sub.setName("request")
      .setDescription("Submit a Leave of Absence request")
      .addStringOption(o => o.setName("reason").setDescription("Reason for LOA").setRequired(true))
      .addStringOption(o => o.setName("start").setDescription("Start date (YYYY-MM-DD)").setRequired(true))
      .addStringOption(o => o.setName("end").setDescription("End date (YYYY-MM-DD)").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all LOA requests")
      .addStringOption(o => o.setName("status").setDescription("Filter by status").setRequired(false)
        .addChoices(
          { name: "⏳ Pending",  value: "pending"  },
          { name: "✅ Approved", value: "approved" },
          { name: "❌ Denied",   value: "denied"   },
          { name: "🟢 Active",   value: "active"   },
          { name: "🔄 Returned", value: "returned" },
        ))
  )
  .addSubcommand(sub =>
    sub.setName("approve")
      .setDescription("Approve an LOA request (Admin/Management)")
      .addIntegerOption(o => o.setName("id").setDescription("The LOA request ID").setRequired(true))
      .addStringOption(o => o.setName("note").setDescription("Optional note to the requester").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("deny")
      .setDescription("Deny an LOA request (Admin/Management)")
      .addIntegerOption(o => o.setName("id").setDescription("The LOA request ID").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for denial").setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub     = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: false });

  // ── REQUEST ─────────────────────────────────────────────────────────────
  if (sub === "request") {
    const reason = interaction.options.getString("reason", true);
    const start  = interaction.options.getString("start",  true);
    const end    = interaction.options.getString("end",    true);

    const startDate = new Date(start);
    const endDate   = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return await interaction.editReply({
        embeds: [errorEmbed("Invalid Date", "Please use **YYYY-MM-DD** format for start and end dates.")],
      });
    }
    if (endDate <= startDate) {
      return await interaction.editReply({
        embeds: [errorEmbed("Invalid Date Range", "End date must be after start date.")],
      });
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);

    try {
      const cfg = await api.config.get(guildId).catch(() => ({})) as any;

      const loa = await api.loa.create(guildId, {
        userId:    interaction.user.id,
        username:  interaction.user.username,
        reason,
        startDate: startDate,
        endDate:   endDate,
      });

      const startTs = Math.floor(startDate.getTime() / 1000);
      const endTs   = Math.floor(endDate.getTime() / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x5BA4CF)
        .setTitle("🏖️ LOA Request Submitted")
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(`${interaction.user}'s leave of absence request has been submitted and is pending review.`)
        .addFields(
          { name: "📋 Request ID",  value: `**#${loa.id}**`,                         inline: true  },
          { name: "📊 Status",      value: "⏳ Pending approval",                    inline: true  },
          { name: "📅 Duration",    value: `**${days}** day${days !== 1 ? "s" : ""}`, inline: true  },
          { name: "🗓️ Start",      value: `<t:${startTs}:D>`,                        inline: true  },
          { name: "🗓️ End",        value: `<t:${endTs}:D>`,                          inline: true  },
          { name: "📝 Reason",      value: reason,                                   inline: false },
        )
        .setFooter({ text: cfg.loa_channel_id ? "Management will review your request shortly." : "Note: LOA channel not yet configured — use the dashboard to set it up." })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("[loa request]", err);
      await interaction.editReply({
        embeds: [errorEmbed("Failed to Submit LOA Request", err.message || "Please try again.")],
      });
    }
  }

  // ── LIST ────────────────────────────────────────────────────────────────
  if (sub === "list") {
    const statusFilter = interaction.options.getString("status");
    try {
      let loas = await api.loa.list(guildId);
      if (statusFilter) loas = loas.filter((l: any) => l.status === statusFilter);

      if (loas.length === 0) {
        return await interaction.editReply({
          embeds: [infoEmbed(
            "LOA Requests",
            statusFilter ? `No **${statusFilter}** LOA requests found.` : "No LOA requests on record.",
          )],
        });
      }

      const lines = loas.slice(0, 12).map((l: any) => {
        const emoji = STATUS_EMOJI[l.status] ?? "❔";
        const startTs = Math.floor(new Date(l.start_date).getTime() / 1000);
        const endTs   = Math.floor(new Date(l.end_date).getTime() / 1000);
        return `${emoji} **#${l.id}** · <@${l.user_id}> — ${l.reason.slice(0, 45)}\n> <t:${startTs}:D> → <t:${endTs}:D>`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5BA4CF)
        .setTitle(`LOA Requests${statusFilter ? ` — ${statusFilter}` : ""}`)
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: loas.length > 12 ? `Showing 12 of ${loas.length}. View all in the dashboard.` : `${loas.length} request${loas.length !== 1 ? "s" : ""}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed("Failed to Fetch LOA Requests", err.message)] });
    }
  }

  // ── APPROVE ─────────────────────────────────────────────────────────────
  if (sub === "approve") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.editReply({
        embeds: [errorEmbed("Insufficient Permission", "You need **Manage Server** permission to approve LOA requests.")],
      });
    }

    const id   = interaction.options.getInteger("id", true);
    const note = interaction.options.getString("note") ?? undefined;

    try {
      const loa = await api.loa.update(guildId, id, {
        status:          "approved",
        approvedBy:      interaction.user.id,
        approvedByName:  interaction.user.username,
      });

      const startTs = Math.floor(new Date(loa.start_date).getTime() / 1000);
      const endTs   = Math.floor(new Date(loa.end_date).getTime() / 1000);

      const embed = successEmbed("✅ LOA Approved", `LOA request **#${id}** has been approved.`)
        .addFields(
          { name: "👤 Staff Member", value: `<@${loa.user_id}> (${loa.username})`,                     inline: true  },
          { name: "📋 Request ID",   value: `**#${id}**`,                                              inline: true  },
          { name: "🗓️ Period",      value: `<t:${startTs}:D> → <t:${endTs}:D>`,                       inline: false },
          { name: "✅ Approved by",  value: `${interaction.user} (${interaction.user.username})`,      inline: true  },
        );

      if (note) embed.addFields({ name: "📝 Note", value: note, inline: false });

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed("Failed to Approve LOA", err.message || "Request may not exist.")] });
    }
  }

  // ── DENY ────────────────────────────────────────────────────────────────
  if (sub === "deny") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.editReply({
        embeds: [errorEmbed("Insufficient Permission", "You need **Manage Server** permission to deny LOA requests.")],
      });
    }

    const id     = interaction.options.getInteger("id", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    try {
      const loa = await api.loa.update(guildId, id, {
        status:         "denied",
        approvedBy:     interaction.user.id,
        approvedByName: interaction.user.username,
      });

      const embed = errorEmbed("❌ LOA Denied", `LOA request **#${id}** has been denied.`)
        .addFields(
          { name: "👤 Staff Member", value: `<@${loa.user_id}> (${loa.username})`, inline: true  },
          { name: "📋 Request ID",   value: `**#${id}**`,                          inline: true  },
          { name: "❌ Denied by",    value: `${interaction.user.username}`,        inline: true  },
          { name: "📝 Reason",       value: reason,                               inline: false },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed("Failed to Deny LOA", err.message || "Request may not exist.")] });
    }
  }
}
