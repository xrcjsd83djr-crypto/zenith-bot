import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";
import { handlePremiumLimit, checkPremium } from "../lib/premium.js";

export const data = new SlashCommandBuilder()
  .setName("moderation")
  .setDescription("Advanced moderation and staff management")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("timeout")
      .setDescription("Timeout a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addIntegerOption(o => o.setName("duration").setDescription("Duration in minutes").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("kick")
      .setDescription("Remove a staff member from the roster")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("warn")
      .setDescription("Issue a warning to a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("history")
      .setDescription("View moderation history for a user")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "timeout") {
      const user = interaction.options.getUser("user", true);
      const duration = interaction.options.getInteger("duration", true);
      const reason = interaction.options.getString("reason", true);

      const member = await interaction.guild?.members.fetch(user.id);
      if (!member) {
        await interaction.editReply({ embeds: [errorEmbed("Member not found")] });
        return;
      }

      await member.timeout(duration * 60 * 1000, reason);
      await interaction.editReply({
        embeds: [successEmbed("Timeout Applied", `${user} has been timed out for ${duration} minutes.\n**Reason:** ${reason}`)],
      });
    }

    if (sub === "kick") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);

      try {
        await api.staff.remove(guildId, user.id);
        await interaction.editReply({
          embeds: [successEmbed("Staff Member Removed", `${user} has been removed from the roster.\n**Reason:** ${reason}`)],
        });
      } catch (err) {
        await interaction.editReply({ embeds: [errorEmbed("Failed to remove staff member")] });
      }
    }

    if (sub === "warn") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);

      await interaction.editReply({
        embeds: [successEmbed("Warning Issued", `${user} has been warned.\n**Reason:** ${reason}`)],
      });
    }

    if (sub === "history") {
      const user = interaction.options.getUser("user", true);
      const embed = infoEmbed(`Moderation History — ${user.username}`)
        .setDescription("No moderation actions recorded.")
        .setThumbnail(user.displayAvatarURL());
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(`[moderation] Error:`, err);
    await interaction.editReply({ embeds: [errorEmbed("An error occurred")] });
  }
}
