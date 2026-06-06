import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { successEmbed, errorEmbed, infoEmbed } from "../lib/embed.js";
import { api } from "../lib/api.js";

export const data = new SlashCommandBuilder()
  .setName("training")
  .setDescription("Manage staff training programs")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("create")
      .setDescription("Create a training program")
      .addStringOption(o => o.setName("name").setDescription("Program name").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("Description").setRequired(true))
      .addStringOption(o => o.setName("category").setDescription("Category (general, moderation, leadership)").setRequired(false))
      .addBooleanOption(o => o.setName("required").setDescription("Is this training required?").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("complete")
      .setDescription("Mark training as completed for a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addStringOption(o => o.setName("program").setDescription("Training program name or ID").setRequired(true))
      .addNumberOption(o => o.setName("score").setDescription("Score (0–100)").setRequired(false))
      .addStringOption(o => o.setName("notes").setDescription("Completion notes").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("View all training programs")
  )
  .addSubcommand(sub =>
    sub.setName("completions")
      .setDescription("View recent training completions")
      .addUserOption(o => o.setName("user").setDescription("Filter by staff member").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("delete")
      .setDescription("Delete a training program")
      .addStringOption(o => o.setName("program_id").setDescription("Program ID").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "create") {
      const name = interaction.options.getString("name", true);
      const description = interaction.options.getString("description", true);
      const category = interaction.options.getString("category") ?? "general";
      const required = interaction.options.getBoolean("required") ?? false;

      const res = await api.post(`/guilds/${guildId}/training/programs`, { name, description, category, required });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as any;
        return await interaction.editReply({ embeds: [errorEmbed("Failed to create training program", err.error)] });
      }
      const program = await res.json() as any;
      await interaction.editReply({
        embeds: [successEmbed(
          "Training Program Created",
          `**${program.name}**\n${program.description}`,
        ).addFields(
          { name: "Category", value: program.category || category, inline: true },
          { name: "Required", value: required ? "Yes" : "No", inline: true },
          { name: "ID", value: program.id?.toString() || "N/A", inline: true },
        )],
      });
    }

    else if (sub === "list") {
      const res = await api.get(`/guilds/${guildId}/training/programs`);
      if (!res.ok) throw new Error("Could not fetch training programs");
      const programs = await res.json() as any[];

      if (programs.length === 0) {
        return await interaction.editReply({
          embeds: [infoEmbed("Training Programs").setDescription("No training programs created yet. Use `/training create` to add one.")],
        });
      }

      const byCategory: Record<string, any[]> = {};
      for (const p of programs) {
        const cat = p.category || "general";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(p);
      }

      const embed = infoEmbed(`Training Programs (${programs.length})`);
      for (const [cat, progs] of Object.entries(byCategory)) {
        const lines = progs.map(p =>
          `**${p.name}**${p.required ? " *(Required)*" : ""} — ${p.description?.slice(0, 80) || "No description"} [${p.completion_count ?? 0} completions]`
        );
        embed.addFields({ name: `📚 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, value: lines.join("\n").slice(0, 1024), inline: false });
      }

      await interaction.editReply({ embeds: [embed] });
    }

    else if (sub === "complete") {
      const user = interaction.options.getUser("user", true);
      const programQuery = interaction.options.getString("program", true);
      const score = interaction.options.getNumber("score");
      const notes = interaction.options.getString("notes") ?? "";

      const listRes = await api.get(`/guilds/${guildId}/training/programs`);
      if (!listRes.ok) throw new Error("Could not fetch programs");
      const programs = await listRes.json() as any[];
      const program = programs.find(p =>
        p.id === programQuery ||
        p.name.toLowerCase().includes(programQuery.toLowerCase())
      );
      if (!program) {
        return await interaction.editReply({
          embeds: [errorEmbed("Program Not Found", `No training program matching **"${programQuery}"**. Use \`/training list\` to see all programs.`)],
        });
      }

      const res = await api.post(`/guilds/${guildId}/training/completions`, {
        programId: program.id,
        username: user.username,
        score: score ?? null,
        notes,
        completedByName: interaction.user.username,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as any;
        return await interaction.editReply({ embeds: [errorEmbed("Failed to record completion", err.error)] });
      }

      await interaction.editReply({
        embeds: [successEmbed(
          "Training Completed ✅",
          `${user} has completed **${program.name}**`,
        ).addFields(
          { name: "Program", value: program.name, inline: true },
          { name: "Staff Member", value: user.username, inline: true },
          ...(score !== null ? [{ name: "Score", value: `${score}/100`, inline: true }] : []),
          ...(notes ? [{ name: "Notes", value: notes, inline: false }] : []),
        )],
      });
    }

    else if (sub === "completions") {
      const user = interaction.options.getUser("user");
      const res = await api.get(`/guilds/${guildId}/training/completions`);
      if (!res.ok) throw new Error("Could not fetch completions");
      const all = await res.json() as any[];

      const filtered = user ? all.filter(c => c.username === user.username) : all;
      if (filtered.length === 0) {
        return await interaction.editReply({
          embeds: [infoEmbed("Training Completions").setDescription(user ? `No training completions found for ${user}.` : "No training completions recorded yet.")],
        });
      }

      const lines = filtered.slice(0, 15).map((c, i) =>
        `**${i + 1}.** **${c.username}** — ${c.program_name}${c.score != null ? ` *(${c.score}/100)*` : ""}${c.completed_at ? ` — ${new Date(c.completed_at).toLocaleDateString()}` : ""}`
      );
      await interaction.editReply({
        embeds: [infoEmbed(`Recent Training Completions${user ? ` — ${user.username}` : ""} (${filtered.length})`)
          .setDescription(lines.join("\n"))],
      });
    }

    else if (sub === "delete") {
      const programId = interaction.options.getString("program_id", true);
      const res = await api.delete(`/guilds/${guildId}/training/programs/${programId}`);
      if (!res.ok) {
        return await interaction.editReply({ embeds: [errorEmbed("Failed to delete", "Program not found or could not be deleted.")] });
      }
      await interaction.editReply({ embeds: [successEmbed("Program Deleted", `Training program \`${programId}\` has been removed.`)] });
    }

  } catch (err) {
    console.error(`[training] Error:`, err);
    await interaction.editReply({ embeds: [errorEmbed("An error occurred", err instanceof Error ? err.message : "Unknown error")] });
  }
}
