import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db } from "../../db/index.js";
import { staffTable, strikesTable, guildsTable } from "../../db/schema.js";
import { eq, and, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import { successEmbed, errorEmbed, getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("strike")
  .setDescription("Issue a strike to a staff member")
  .addUserOption((opt) => opt.setName("member").setDescription("Staff member to strike").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the strike").setRequired(true))
  .addStringOption((opt) =>
    opt.setName("severity").setDescription("Severity level")
      .addChoices(
        { name: "Warning", value: "warning" },
        { name: "Strike", value: "strike" },
        { name: "Final Warning", value: "final_warning" },
      )
  )
  .addStringOption((opt) => opt.setName("evidence").setDescription("Evidence link or description"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });
  await ensureGuild(interaction.guild);

  const target = interaction.options.getUser("member", true);
  const reason = interaction.options.getString("reason", true);
  const severity = (interaction.options.getString("severity") ?? "strike") as "warning" | "strike" | "final_warning";
  const evidence = interaction.options.getString("evidence");
  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  const staffMember = await db.select().from(staffTable)
    .where(and(eq(staffTable.guildId, interaction.guild.id), eq(staffTable.discordId, target.id))).limit(1);

  if (!staffMember[0] || !staffMember[0].isActive) {
    await interaction.editReply({ embeds: [errorEmbed(`${target.username} is not an active staff member.`)] });
    return;
  }

  const strikeId = randomUUID().replace(/-/g,"").slice(0,21);
  await db.insert(strikesTable).values({
    id: strikeId,
    guildId: interaction.guild.id,
    staffId: staffMember[0].id,
    issuedById: interaction.user.id,
    issuedByUsername: interaction.user.username,
    severity,
    reason,
    evidence,
    isActive: true,
  });

  const [strikeCountResult] = await db.select({ total: count() }).from(strikesTable)
    .where(and(eq(strikesTable.staffId, staffMember[0].id), eq(strikesTable.isActive, true)));

  const newCount = strikeCountResult.total;
  await db.update(staffTable).set({ strikeCount: newCount, updatedAt: new Date() }).where(eq(staffTable.id, staffMember[0].id));

  const severityLabel = { warning: "⚠️ Warning", strike: "🔴 Strike", final_warning: "🚨 Final Warning" }[severity];

  await interaction.editReply({
    embeds: [successEmbed(
      "Strike Issued",
      `**${target.username}** received a **${severityLabel}**\n**Reason:** ${reason}${evidence ? `\n**Evidence:** ${evidence}` : ""}\n\nThey now have **${newCount}** active strike${newCount !== 1 ? "s" : ""}.`,
      "#ED4245",
      footer,
    )],
  });

  // Log to log channel
  const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id)).limit(1);
  if (guild[0]?.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(guild[0].logChannelId);
    if (logChannel?.isTextBased()) {
      const logEmbed = new EmbedBuilder().setColor("#ED4245").setTitle(`${severityLabel} Issued`)
        .addFields(
          { name: "Staff Member", value: `<@${target.id}>`, inline: true },
          { name: "Issued By", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Total Strikes", value: `${newCount}`, inline: true },
          { name: "Reason", value: reason },
          ...(evidence ? [{ name: "Evidence", value: evidence }] : []),
        )
        .setFooter({ text: footer }).setTimestamp();
      await (logChannel as any).send({ embeds: [logEmbed] });
    }
  }

  // DM the staff member
  try {
    const dmEmbed = new EmbedBuilder().setColor("#ED4245").setTitle(`${severityLabel} Received`)
      .setDescription(`You have received a **${severityLabel}** in **${interaction.guild.name}**.\n\n**Reason:** ${reason}${evidence ? `\n**Evidence:** ${evidence}` : ""}\n\nYou now have **${newCount}** active strike${newCount !== 1 ? "s" : ""}.`)
      .setFooter({ text: footer }).setTimestamp();
    const dm = await target.createDM();
    await dm.send({ embeds: [dmEmbed] });
  } catch { /* DMs disabled */ }
}
