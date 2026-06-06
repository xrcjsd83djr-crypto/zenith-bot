import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { api } from "../lib/api.js";
import { successEmbed, errorEmbed, infoEmbed, premiumEmbed } from "../lib/embed.js";
import { checkPremium } from "../lib/premium.js";

export const data = new SlashCommandBuilder()
  .setName("performance")
  .setDescription("Track and manage staff performance")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName("review")
      .setDescription("Submit a performance review (free: 3 per staff, premium: unlimited)")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
      .addIntegerOption(o => o.setName("rating").setDescription("Rating 1-5").setRequired(true).setMinValue(1).setMaxValue(5))
      .addStringOption(o => o.setName("comments").setDescription("Review comments").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("stats")
      .setDescription("View performance stats for a staff member")
      .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("leaderboard")
      .setDescription("View performance leaderboard [Premium]")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    const isPremium = await checkPremium(guildId);

    if (sub === "review") {
      const user = interaction.options.getUser("user", true);
      const rating = interaction.options.getInteger("rating", true);
      const comments = interaction.options.getString("comments", true);
      const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);

      const res = await api.post(`/guilds/${guildId}/performance`, {
        targetUserId: user.id, targetUsername: user.username,
        reviewerId: interaction.user.id, reviewerUsername: interaction.user.username,
        rating, comments,
      });

      if (!res.ok) {
        const err = await res.json() as any;
        const msg = err.error || "Failed to submit review";
        if (msg.includes("Premium")) {
          await interaction.editReply({ embeds: [errorEmbed("Free Limit Reached", `${msg}\n\n[Upgrade to Premium](https://zenithbot.up.railway.app/premium)`)] });
        } else {
          await interaction.editReply({ embeds: [errorEmbed("Failed to Submit Review", msg)] });
        }
        return;
      }

      await interaction.editReply({
        embeds: [successEmbed("Review Submitted ✅", `Performance review for ${user} has been recorded.`)
          .addFields(
            { name: "Rating", value: `${stars} (${rating}/5)`, inline: true },
            { name: "Reviewer", value: interaction.user.username, inline: true },
            { name: "Comments", value: comments, inline: false },
          )],
      });
    }

    if (sub === "stats") {
      const user = interaction.options.getUser("user", true);
      const res = await api.get(`/guilds/${guildId}/performance?userId=${user.id}`);
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to fetch reviews")] }); return; }
      const reviews = await res.json() as any[];

      if (reviews.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed(`Performance: ${user.username}`, "No performance reviews yet.")] });
        return;
      }

      const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
      const stars = "⭐".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
      const recent = reviews.slice(0, 3).map(r => `${r.rating}/5 — ${r.comments.slice(0, 80)} *(by ${r.reviewer_username})*`).join("\n\n");

      const embed = new EmbedBuilder()
        .setColor(avg >= 4 ? 0x57F287 : avg >= 3 ? 0xFEE75C : 0xED4245)
        .setTitle(`Performance Stats — ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Average Rating", value: `${stars} (${avg.toFixed(1)}/5)`, inline: true },
          { name: "Total Reviews", value: String(reviews.length), inline: true },
          { name: "Recent Reviews", value: recent || "None", inline: false },
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === "leaderboard") {
      if (!isPremium) {
        await interaction.editReply({ embeds: [errorEmbed("Premium Required", "The performance leaderboard is a **Zenith Premium** feature.\n\n[Upgrade now](https://zenithbot.up.railway.app/premium)")] });
        return;
      }
      const res = await api.get(`/guilds/${guildId}/performance/leaderboard`);
      if (!res.ok) { await interaction.editReply({ embeds: [errorEmbed("Failed to fetch leaderboard")] }); return; }
      const lb = await res.json() as any[];

      if (lb.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed("Performance Leaderboard", "No reviews submitted yet.")] });
        return;
      }

      const medals = ["🥇","🥈","🥉"];
      const lines = lb.map((e: any, i: number) => {
        const stars = "⭐".repeat(Math.round(parseFloat(e.avg_rating)));
        return `${medals[i] ?? `**${i+1}.**`} **${e.target_username}** — ${parseFloat(e.avg_rating).toFixed(1)}/5 ${stars} *(${e.review_count} reviews)*`;
      });

      await interaction.editReply({
        embeds: [premiumEmbed("Performance Leaderboard").setDescription(lines.join("\n")).setTimestamp()],
      });
    }
  } catch (err: any) {
    await interaction.editReply({ embeds: [errorEmbed("Error", err.message)] });
  }
}
