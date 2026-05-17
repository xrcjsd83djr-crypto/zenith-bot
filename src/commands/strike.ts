import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

export const data = new SlashCommandBuilder()
  .setName("strike")
  .setDescription("Manage staff strikes")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("issue")
      .setDescription("Issue a strike to a staff member")
      .addUserOption(o => o.setName("user").setDescription("The staff member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for the strike").setRequired(true))
      .addStringOption(o => o.setName("evidence").setDescription("Evidence URL or description").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all active strikes")
      .addUserOption(o => o.setName("user").setDescription("Filter by user").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("revoke")
      .setDescription("Revoke a strike by ID")
      .addIntegerOption(o => o.setName("id").setDescription("The strike ID").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  
  // Don't use ephemeral - make responses public
  await interaction.deferReply({ ephemeral: false });

  if (sub === "issue") {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const evidence = interaction.options.getString("evidence") ?? undefined;

    try {
      const strike = await api.strikes.create(guildId, {
        userId: user.id,
        username: user.username,
        reason,
        evidence,
        issuedBy: interaction.user.id,
        issuedByName: interaction.user.username,
      });

      const strikes = await api.strikes.list(guildId);
      const userStrikes = strikes.filter((s: any) => s.user_id === user.id && s.active);

      const embed = successEmbed("⚠️ Strike Issued", `${user} has received a strike.`)
        .addFields(
          { name: "Reason", value: reason, inline: false },
          { name: "Evidence", value: evidence || "None provided", inline: false },
          { name: "Total Active Strikes", value: String(userStrikes.length), inline: true },
          { name: "Strike ID", value: `#${strike.id}`, inline: true },
        )
        .setFooter({ text: `Issued by ${interaction.user.username}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Strike error:", err);
      await interaction.editReply({ 
        embeds: [errorEmbed("Failed to Issue Strike", "Please try again or use the dashboard.")] 
      });
    }
  }

  if (sub === "list") {
    const filterUser = interaction.options.getUser("user");

    try {
      let strikes = await api.strikes.list(guildId);
      if (filterUser) strikes = strikes.filter((s: any) => s.user_id === filterUser.id);
      const active = strikes.filter((s: any) => s.active);

      const embed = infoEmbed(`Strikes${filterUser ? ` — ${filterUser.username}` : ""}`)
        .setDescription(active.length === 0 ? "No active strikes." : null);

      if (active.length > 0) {
        const lines = active.slice(0, 15).map((s: any) =>
          `**#${s.id}** · <@${s.user_id}> — ${s.reason.slice(0, 60)} *(by ${s.issued_by_name})*`
        );
        embed.setDescription(lines.join("\n"));
        embed.setFooter({ text: `${active.length} active strike${active.length !== 1 ? "s" : ""}` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Strike list error:", err);
      await interaction.editReply({ 
        embeds: [errorEmbed("Failed to fetch strikes")] 
      });
    }
  }

  if (sub === "revoke") {
    const id = interaction.options.getInteger("id", true);

    try {
      await api.strikes.remove(guildId, id);
      await interaction.editReply({ 
        embeds: [successEmbed("Strike Revoked", `Strike **#${id}** has been revoked.`)] 
      });
    } catch (err) {
      console.error("Strike revoke error:", err);
      await interaction.editReply({ 
        embeds: [errorEmbed("Failed to revoke strike", "Strike may not exist or already be revoked.")] 
      });
    }
  }
}
