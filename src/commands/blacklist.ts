import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
  import { api } from "../lib/api.js";
  import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";

  export const data = new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Manage the server blacklist (ban from applying for staff)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName("add")
        .setDescription("Add a user to the blacklist")
        .addUserOption(o => o.setName("user").setDescription("User to blacklist").setRequired(true))
        .addStringOption(o => o.setName("reason").setDescription("Reason for blacklisting").setRequired(true))
        .addStringOption(o => o.setName("expires").setDescription("Expiry date YYYY-MM-DD, leave blank for permanent"))
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Remove a user from the blacklist")
        .addUserOption(o => o.setName("user").setDescription("User to remove").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("check")
        .setDescription("Check if a user is blacklisted")
        .addUserOption(o => o.setName("user").setDescription("User to check").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("View all blacklisted users")
    );

  export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [errorEmbed("Error", "Server only command.")], ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "add") {
        const user    = interaction.options.getUser("user", true);
        const reason  = interaction.options.getString("reason", true);
        const expires = interaction.options.getString("expires");
        const res = await api.post(`/guilds/${interaction.guildId}/blacklist`, {
          userId: user.id, username: user.tag ?? user.username, reason,
          expiresAt: expires ? new Date(expires).toISOString() : null,
          addedBy: interaction.user.id, addedByName: interaction.user.tag ?? interaction.user.username,
        });
        if (!res.ok) throw new Error(await res.text());
        await interaction.editReply({ embeds: [successEmbed("User Blacklisted",
          `🚫 **${user.displayName ?? user.username}** added to the blacklist.\n**Reason:** ${reason}\n**Expires:** ${expires ? new Date(expires).toLocaleDateString() : "Never (permanent)"}\n**By:** ${interaction.user.displayName ?? interaction.user.username}`
        )] });
      } else if (sub === "remove") {
        const user = interaction.options.getUser("user", true);
        const res = await api.delete(`/guilds/${interaction.guildId}/blacklist/${user.id}`);
        if (!res.ok) throw new Error(await res.text());
        await interaction.editReply({ embeds: [successEmbed("Blacklist Removed", `${user.displayName ?? user.username} removed from the blacklist.`)] });
      } else if (sub === "check") {
        const user = interaction.options.getUser("user", true);
        const res  = await api.get(`/guilds/${interaction.guildId}/blacklist/${user.id}`);
        if (res.status === 404) {
          await interaction.editReply({ embeds: [infoEmbed("Not Blacklisted", `${user.displayName ?? user.username} is **not** on the blacklist.`)] });
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const e = await res.json() as any;
        await interaction.editReply({ embeds: [errorEmbed("User Is Blacklisted",
          `🚫 **${user.displayName ?? user.username}**\n**Reason:** ${e.reason}\n**Added by:** ${e.addedByName ?? "Unknown"}\n**Expires:** ${e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : "Never"}`
        )] });
      } else if (sub === "list") {
        const res  = await api.get(`/guilds/${interaction.guildId}/blacklist`);
        if (!res.ok) throw new Error(await res.text());
        const list = await res.json() as any[];
        if (!list.length) {
          await interaction.editReply({ embeds: [infoEmbed("Blacklist Empty", "No users are currently blacklisted.")] });
          return;
        }
        const lines = list.slice(0, 10).map((e: any, i: number) =>
          `**${i+1}.** ${e.username} — ${e.reason} (${new Date(e.createdAt).toLocaleDateString()})`
        ).join("\n");
        await interaction.editReply({ embeds: [infoEmbed(`Blacklist (${list.length} entries)`, lines)] });
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed("Error", err.message ?? "An unexpected error occurred.")] });
    }
  }
  