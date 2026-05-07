import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { db } from "../../db/index.js";
import { guildsTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { successEmbed, errorEmbed } from "../../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("give-premium")
  .setDescription("Grant premium access to a server (bot owner only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) => opt.setName("guild_id").setDescription("Guild ID to grant premium to").setRequired(true))
  .addIntegerOption((opt) => opt.setName("days").setDescription("Number of days (leave empty for permanent)"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.options.getString("guild_id", true);
  const days = interaction.options.getInteger("days");

  const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId)).limit(1);

  if (!guild[0]) {
    await interaction.editReply({ embeds: [errorEmbed(`Guild ${guildId} not found. The bot must be in that server.`)] });
    return;
  }

  const premiumExpiresAt = days ? new Date(Date.now() + days * 86_400_000) : null;

  await db.update(guildsTable)
    .set({ isPremium: true, premiumExpiresAt, updatedAt: new Date() })
    .where(eq(guildsTable.id, guildId));

  const expiryText = premiumExpiresAt
    ? `Expires: <t:${Math.floor(premiumExpiresAt.getTime() / 1000)}:F>`
    : "**Permanent**";

  await interaction.editReply({
    embeds: [successEmbed(
      "Premium Granted",
      `✨ Premium has been granted to **${guild[0].name}**\n${expiryText}`,
      "#FFD700",
      "Zenith Staff Management",
    )],
  });

  try {
    const targetGuild = await interaction.client.guilds.fetch(guildId);
    const owner = await targetGuild.fetchOwner();
    const dm = await owner.createDM();
    await dm.send({
      embeds: [successEmbed(
        "Zenith Premium Activated!",
        `Your server **${guild[0].name}** now has access to Zenith Premium!\n${expiryText}\n\nVisit the dashboard at https://zenithbot.up.railway.app to unlock all premium features.`,
        "#FFD700",
        "Zenith Staff Management",
      )],
    });
  } catch { /* DMs disabled */ }
}
