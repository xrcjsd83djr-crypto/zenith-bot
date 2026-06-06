import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed, premiumEmbed } from "../lib/embed.js";
import { checkPremium } from "../lib/premium.js";

export const data = new SlashCommandBuilder()
  .setName("division")
  .setDescription("Manage server divisions (free: 3, premium: unlimited)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("create")
      .setDescription("Create a new division")
      .addStringOption(o => o.setName("name").setDescription("Division name").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("Division description").setRequired(false))
      .addRoleOption(o => o.setName("role").setDescription("Discord role linked to this division").setRequired(false))
  )
  .addSubcommand(sub => sub.setName("list").setDescription("List all divisions"))
  .addSubcommand(sub =>
    sub.setName("assign")
      .setDescription("Assign a staff member to a division")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("division").setDescription("Division name").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("delete")
      .setDescription("Delete a division [Premium]")
      .addStringOption(o => o.setName("name").setDescription("Division name").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "create") {
      const name = interaction.options.getString("name", true);
      const description = interaction.options.getString("description") ?? undefined;
      const role = interaction.options.getRole("role");

      const res = await api.post(`/guilds/${guildId}/divisions`, {
        name, description, discordRoleId: role?.id ?? null,
      });

      if (!res.ok) {
        const err = await res.json() as any;
        const msg = err.error || "Failed to create division";
        if (msg.includes("Free plan") || msg.includes("Premium")) {
          await interaction.editReply({ embeds: [errorEmbed("Free Limit Reached", `${msg}\n\n[Upgrade to Premium](https://zenithbot.up.railway.app/premium)`) ] });
        } else {
          await interaction.editReply({ embeds: [errorEmbed("Failed to Create Division", msg)] });
        }
        return;
      }
      const div = await res.json() as any;
      await interaction.editReply({
        embeds: [successEmbed("Division Created ✅", `**${div.name}** has been created.`)
          .addFields(
            { name: "Name", value: div.name, inline: true },
            { name: "Role", value: role ? `<@&${role.id}>` : "None", inline: true },
            { name: "Description", value: description || "None", inline: false },
          )],
      });
    }

    if (sub === "list") {
      const res = await api.get(`/guilds/${guildId}/divisions`);
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to fetch divisions")] }); return; }
      const divs = await res.json() as any[];
      if (divs.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed("Divisions", "No divisions created yet. Use `/division create` to get started.")] });
        return;
      }
      const lines = divs.map(d => `**${d.name}**${d.discord_role_id ? ` — <@&${d.discord_role_id}>` : ""}${d.description ? `\n> ${d.description}` : ""}`);
      await interaction.editReply({ embeds: [infoEmbed(`Divisions (${divs.length})`, lines.join("\n\n")).setTimestamp()] });
    }

    if (sub === "assign") {
      const user = interaction.options.getUser("user", true);
      const divName = interaction.options.getString("division", true);
      const divsRes = await api.get(`/guilds/${guildId}/divisions`);
      const divs = divsRes.ok ? await divsRes.json() as any[] : [];
      const div = divs.find((d: any) => d.name.toLowerCase() === divName.toLowerCase());
      if (!div) {
        await interaction.editReply({ embeds: [errorEmbed("Division Not Found", `No division named "${divName}". Use \`/division list\` to see available divisions.`)] });
        return;
      }
      const res = await api.patch(`/guilds/${guildId}/staff/${user.id}/division`, { divisionId: div.id, divisionName: div.name });
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to assign division")] }); return; }
      await interaction.editReply({
        embeds: [successEmbed("Division Assigned ✅", `${user} has been assigned to **${div.name}**.`)
          .addFields(div.discord_role_id ? [{ name: "Role Assigned", value: `<@&${div.discord_role_id}>`, inline: true }] : [])],
      });
    }

    if (sub === "delete") {
      const isPremium = await checkPremium(guildId);
      if (!isPremium) {
        await interaction.editReply({ embeds: [errorEmbed("Premium Required", "Deleting divisions is a **Zenith Premium** feature.\n\n[Upgrade now](https://zenithbot.up.railway.app/premium)")] });
        return;
      }
      const divName = interaction.options.getString("name", true);
      const divsRes = await api.get(`/guilds/${guildId}/divisions`);
      const divs = divsRes.ok ? await divsRes.json() as any[] : [];
      const div = divs.find((d: any) => d.name.toLowerCase() === divName.toLowerCase());
      if (!div) {
        await interaction.editReply({ embeds: [errorEmbed("Division Not Found", `No division named "${divName}".`)] });
        return;
      }
      const res = await api.delete(`/guilds/${guildId}/divisions/${div.id}`);
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to delete division")] }); return; }
      await interaction.editReply({ embeds: [successEmbed("Division Deleted", `**${div.name}** has been removed.`)] });
    }
  } catch (err: any) {
    await interaction.editReply({ embeds: [errorEmbed("Error", err.message)] });
  }
}
