import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { db } from "../../db/index.js";
import { staffTable, ranksTable, divisionsTable } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { getGuildEmbed } from "../../lib/embed.js";
import { ensureGuild, chunkArray } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("roster")
  .setDescription("View the staff roster")
  .addIntegerOption((opt) => opt.setName("page").setDescription("Page number").setMinValue(1));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply();
  await ensureGuild(interaction.guild);

  const page = interaction.options.getInteger("page") ?? 1;
  const perPage = 10;

  const allStaff = await db
    .select({
      id: staffTable.id,
      discordId: staffTable.discordId,
      discordUsername: staffTable.discordUsername,
      callsign: staffTable.callsign,
      rankName: ranksTable.name,
      divisionName: divisionsTable.name,
      isActive: staffTable.isActive,
      joinedAt: staffTable.joinedAt,
    })
    .from(staffTable)
    .leftJoin(ranksTable, eq(staffTable.rankId, ranksTable.id))
    .leftJoin(divisionsTable, eq(staffTable.divisionId, divisionsTable.id))
    .where(and(eq(staffTable.guildId, interaction.guild.id), eq(staffTable.isActive, true)));

  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  if (allStaff.length === 0) {
    const embed = new EmbedBuilder().setColor(color as any).setTitle("Staff Roster")
      .setDescription("No active staff members found.").setFooter({ text: footer }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const pages = chunkArray(allStaff, perPage);
  const totalPages = pages.length;
  const currentPage = Math.min(page, totalPages) - 1;
  const pageData = pages[currentPage];

  const embed = new EmbedBuilder().setColor(color as any).setTitle(`Staff Roster — ${interaction.guild.name}`)
    .setDescription(
      pageData.map((s, i) => {
        const rank = s.rankName ? `[${s.rankName}]` : "";
        const callsign = s.callsign ? `(${s.callsign})` : "";
        return `\`${currentPage * perPage + i + 1}.\` <@${s.discordId}> ${rank} ${callsign}`.trim();
      }).join("\n"),
    )
    .setFooter({ text: `${footer} • Page ${currentPage + 1}/${totalPages} • ${allStaff.length} staff members` })
    .setTimestamp();

  const components = [];
  if (totalPages > 1) {
    const prev = new ButtonBuilder().setCustomId(`roster_prev_${currentPage}`).setLabel("← Previous").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0);
    const next = new ButtonBuilder().setCustomId(`roster_next_${currentPage}`).setLabel("Next →").setStyle(ButtonStyle.Secondary).setDisabled(currentPage >= totalPages - 1);
    components.push(new ActionRowBuilder<any>().addComponents(prev, next));
  }

  await interaction.editReply({ embeds: [embed], components });
}
