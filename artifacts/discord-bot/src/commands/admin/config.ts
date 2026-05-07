import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { db } from "@workspace/db";
import { guildsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { successEmbed, errorEmbed, getGuildEmbed, infoEmbed } from "../../lib/embed.js";
import { ensureGuild } from "../../lib/utils.js";

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure Zenith for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View current configuration")
  )
  .addSubcommand((sub) =>
    sub.setName("set")
    .setDescription("Update a configuration setting")
    .addStringOption((opt) =>
      opt.setName("setting")
        .setDescription("Setting to update")
        .setRequired(true)
        .addChoices(
          { name: "Log Channel", value: "log_channel" },
          { name: "Application Channel", value: "application_channel" },
          { name: "Application Review Channel", value: "review_channel" },
          { name: "Welcome Channel", value: "welcome_channel" },
          { name: "Staff Role", value: "staff_role" },
          { name: "Management Role", value: "management_role" },
          { name: "Embed Color", value: "embed_color" },
          { name: "Embed Footer", value: "embed_footer" },
        )
    )
    .addChannelOption((opt) => opt.setName("channel").setDescription("Channel value"))
    .addRoleOption((opt) => opt.setName("role").setDescription("Role value"))
    .addStringOption((opt) => opt.setName("text").setDescription("Text value (for color/footer)"))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });
  await ensureGuild(interaction.guild);

  const sub = interaction.options.getSubcommand();
  const { color, footer } = await getGuildEmbed(interaction.guild.id);

  if (sub === "view") {
    const config = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id)).limit(1);
    if (!config[0]) { await interaction.editReply({ embeds: [errorEmbed("No config found.")] }); return; }
    const c = config[0];
    const embed = new EmbedBuilder().setColor(color).setTitle(`⚙️  Zenith Config — ${interaction.guild.name}`)
      .addFields(
        { name: "Log Channel", value: c.logChannelId ? `<#${c.logChannelId}>` : "Not set", inline: true },
        { name: "App Channel", value: c.applicationChannelId ? `<#${c.applicationChannelId}>` : "Not set", inline: true },
        { name: "Review Channel", value: c.applicationReviewChannelId ? `<#${c.applicationReviewChannelId}>` : "Not set", inline: true },
        { name: "Welcome Channel", value: c.welcomeChannelId ? `<#${c.welcomeChannelId}>` : "Not set", inline: true },
        { name: "Staff Role", value: c.staffRoleId ? `<@&${c.staffRoleId}>` : "Not set", inline: true },
        { name: "Management Role", value: c.managementRoleId ? `<@&${c.managementRoleId}>` : "Not set", inline: true },
        { name: "Embed Color", value: c.embedColor, inline: true },
        { name: "Premium", value: c.isPremium ? "✨ Active" : "Free", inline: true },
      )
      .setDescription("Use `/config set` to update settings or visit the dashboard for full configuration.")
      .setFooter({ text: footer }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const setting = interaction.options.getString("setting", true);
  const channel = interaction.options.getChannel("channel");
  const role = interaction.options.getRole("role");
  const text = interaction.options.getString("text");

  const updates: Partial<typeof guildsTable.$inferInsert> = { updatedAt: new Date() };

  if (setting === "log_channel" && channel) updates.logChannelId = channel.id;
  else if (setting === "application_channel" && channel) updates.applicationChannelId = channel.id;
  else if (setting === "review_channel" && channel) updates.applicationReviewChannelId = channel.id;
  else if (setting === "welcome_channel" && channel) updates.welcomeChannelId = channel.id;
  else if (setting === "staff_role" && role) updates.staffRoleId = role.id;
  else if (setting === "management_role" && role) updates.managementRoleId = role.id;
  else if (setting === "embed_color" && text) updates.embedColor = text;
  else if (setting === "embed_footer" && text) updates.embedFooter = text;
  else {
    await interaction.editReply({ embeds: [errorEmbed("Provide the correct option type for this setting.")] });
    return;
  }

  await db.update(guildsTable).set(updates).where(eq(guildsTable.id, interaction.guild.id));
  await interaction.editReply({ embeds: [successEmbed("Config Updated", `**${setting.replace("_", " ")}** has been updated.`, color, footer)] });
}
