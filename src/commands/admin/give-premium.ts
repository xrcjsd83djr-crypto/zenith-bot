import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { successEmbed, errorEmbed } from "../../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("give-premium")
  .setDescription("[Zenith Admin] Grant premium to a server")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName("guild_id").setDescription("The server ID to grant premium").setRequired(true))
  .addIntegerOption(o => o.setName("days").setDescription("Days of premium (default: 30)").setRequired(false).setMinValue(1).setMaxValue(365));

const OWNER_IDS = ["1416209242838401064"];

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!OWNER_IDS.includes(interaction.user.id)) {
    await interaction.reply({ content: "❌ Unauthorized.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.options.getString("guild_id", true);
  const days = interaction.options.getInteger("days") ?? 30;

  try {
    const apiUrl = process.env.API_URL ?? "http://localhost:8080/api";
    const res = await fetch(`${apiUrl}/admin/give-premium`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": process.env.BOT_SECRET ?? "",
      },
      body: JSON.stringify({ guildId, days }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    await interaction.editReply({
      embeds: [successEmbed("Premium Granted", `Server \`${guildId}\` has been granted **${days} days** of premium.\nExpires: ${new Date(data.expiresAt).toLocaleDateString()}`)]
    });
  } catch (err: any) {
    await interaction.editReply({ embeds: [errorEmbed("Failed", err.message)] });
  }
}
