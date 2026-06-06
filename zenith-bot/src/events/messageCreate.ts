import { Events, Message, EmbedBuilder } from "discord.js";
import { api } from "../lib/api.js";
import { config } from "../lib/config.js";
import { getGuildEmbed } from "../lib/embed.js";

export const name = Events.MessageCreate;
export const once = false;

const DEFAULT_PREFIX = "z!";

// Per-guild prefix cache (5 minute TTL)
const prefixCache = new Map<string, { prefix: string; ts: number }>();

async function getGuildPrefix(guildId: string): Promise<string> {
  const cached = prefixCache.get(guildId);
  if (cached && Date.now() - cached.ts < 5 * 60_000) return cached.prefix;
  try {
    const cfg = await api.config.get(guildId);
    const prefix = cfg?.prefix?.trim() || DEFAULT_PREFIX;
    prefixCache.set(guildId, { prefix, ts: Date.now() });
    return prefix;
  } catch {
    return DEFAULT_PREFIX;
  }
}

export async function execute(message: Message) {
  if (message.author.bot || !message.guildId) return;

  const guildId = message.guildId;
  const content = message.content;

  // ── Activity tracking ────────────────────────────────────────────────────
  try {
    const cfg = await api.config.get(guildId);
    if (cfg.activityTrackingEnabled !== false) {
      await api.activity.log(guildId, {
        userId: message.author.id,
        username: message.author.username,
        type: "message",
        description: `Message in #${"name" in message.channel ? (message.channel as any).name : "unknown"}`,
      });
    }
  } catch { /* silently ignore */ }

  // ── Per-guild prefix handler ─────────────────────────────────────────────
  const guildPrefix = await getGuildPrefix(guildId);

  // Always support "z!" as a universal fallback plus the guild custom prefix
  const prefixesToCheck = guildPrefix.toLowerCase() === DEFAULT_PREFIX.toLowerCase()
    ? [guildPrefix]
    : [guildPrefix, DEFAULT_PREFIX];

  const prefix = prefixesToCheck.find(p => content.toLowerCase().startsWith(p.toLowerCase()));
  if (!prefix) return;

  const args = content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return;

  const { color, footer } = await getGuildEmbed(guildId).catch(() => ({ color: "#d4af37", footer: "Zenith Staff Management" }));
  const colorInt = parseInt(color.replace("#", ""), 16);

  const reply = async (embed: EmbedBuilder) => {
    try { await message.reply({ embeds: [embed] }); } catch { /* channel perms */ }
  };

  const pfx = guildPrefix;

  try {
    // ── help ──────────────────────────────────────────────────────────────
    if (cmd === "help") {
      const embed = new EmbedBuilder()
        .setColor(colorInt)
        .setTitle(`Zenith — ${pfx} Command Reference`)
        .setDescription(`Use Discord slash commands (\`/\`) for full functionality. These text commands are quick shortcuts.\n**Prefix:** \`${pfx}\``)
        .addFields(
          { name: "📋 Staff", value: `\`${pfx}roster\` — view staff list\n\`${pfx}staffinfo @user\` — view staff member info\n\`${pfx}myinfo\` — your own staff info`, inline: false },
          { name: "🟢 Duty Roster", value: `\`${pfx}checkin [type]\` — check in to duty\n\`${pfx}checkout\` — check out from duty\n\`${pfx}onduty\` — who's on duty now`, inline: false },
          { name: "⚠️ Strikes & Warnings", value: `\`${pfx}strikes @user\` — check active strikes\n\`${pfx}warnings @user\` — check warnings\n\`${pfx}mystrikes\` — your own strikes`, inline: false },
          { name: "📅 LOA", value: `\`${pfx}loa\` — your LOA status\n\`${pfx}loa list\` — pending LOA requests (management)`, inline: false },
          { name: "🚫 Blacklist", value: `\`${pfx}blacklist\` — list blacklisted users\n\`${pfx}blacklist add @user [reason]\`\n\`${pfx}blacklist remove @user\`\n\`${pfx}blacklist check @user\``, inline: false },
          { name: "⭐ Commendations", value: `\`${pfx}commend @user [reason]\` — award commendation`, inline: false },
          { name: "🚨 Incidents", value: `\`${pfx}incident <title> [description]\` — report an incident`, inline: false },
          { name: "⬆️ Promotions", value: `\`${pfx}promote @user <rank>\` — promote staff\n\`${pfx}demote @user <rank>\` — demote staff`, inline: false },
          { name: "📖 Handbook", value: `\`${pfx}handbook\` — view staff handbook\n\`${pfx}handbook <search>\` — search entries`, inline: false },
          { name: "📊 Stats", value: `\`${pfx}stats\` — server staff stats\n\`${pfx}leaderboard\` — activity leaderboard`, inline: false },
          { name: "ℹ️ Info", value: `\`${pfx}ping\` — bot latency\n\`${pfx}premium\` — premium status\n\`${pfx}about\` — about Zenith`, inline: false },
        )
        .setFooter({ text: footer })
        .setTimestamp();
      return await reply(embed);
    }

    // ── ping ──────────────────────────────────────────────────────────────
    if (cmd === "ping") {
      const start = Date.now();
      const msg = await (message.channel as any).send("Pinging…");
      const latency = Date.now() - start;
      await msg.edit({
        content: "",
        embeds: [new EmbedBuilder().setColor(colorInt).setTitle("🏓 Pong!")
          .addFields({ name: "Latency", value: `${latency}ms`, inline: true }, { name: "API Latency", value: `${message.client.ws.ping}ms`, inline: true })
          .setFooter({ text: footer }).setTimestamp()],
      });
      return;
    }

    // ── about ─────────────────────────────────────────────────────────────
    if (cmd === "about") {
      const embed = new EmbedBuilder().setColor(colorInt).setTitle("⚡ About Zenith")
        .setDescription("Zenith is a comprehensive Discord staff management bot for ERLC servers. Manage staff, strikes, LOA, promotions, shifts, and more.")
        .addFields(
          { name: "Version", value: "2.5.0", inline: true },
          { name: "Dashboard", value: "Available via web", inline: true },
          { name: "Prefix", value: `\`${pfx}\` or slash \`/\``, inline: true },
        )
        .setFooter({ text: footer }).setTimestamp();
      return await reply(embed);
    }

    // ── roster ────────────────────────────────────────────────────────────
    if (cmd === "roster") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/staff/bot`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch staff roster");
      const staff: any[] = await res.json();
      if (staff.length === 0) {
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle("Staff Roster").setDescription("No active staff members.").setFooter({ text: footer }));
      }
      const byRank: Record<string, string[]> = {};
      for (const s of staff) {
        const r = s.rank || "Staff";
        if (!byRank[r]) byRank[r] = [];
        byRank[r].push(`${s.username}${s.callsign ? ` [${s.callsign}]` : ""}${s.division ? ` • ${s.division}` : ""}`);
      }
      const lines: string[] = [];
      for (const [r, members] of Object.entries(byRank)) {
        lines.push(`**${r}** (${members.length})`);
        lines.push(...members.slice(0, 5).map(m => `  • ${m}`));
        if (members.length > 5) lines.push(`  *...and ${members.length - 5} more*`);
      }
      return await reply(new EmbedBuilder().setColor(colorInt)
        .setTitle(`Staff Roster — ${staff.length} Members`)
        .setDescription(lines.slice(0, 40).join("\n") || "No staff listed.")
        .setFooter({ text: `${footer}${staff.length > 40 ? " • Showing partial roster" : ""}` })
        .setTimestamp());
    }

    // ── staffinfo / myinfo ────────────────────────────────────────────────
    if (cmd === "staffinfo" || cmd === "myinfo") {
      const mentioned = message.mentions.users.first();
      const targetId = mentioned?.id ?? message.author.id;
      const targetName = mentioned?.username ?? message.author.username;
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/staff/bot/${targetId}`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) {
        return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Not Found").setDescription(`**${targetName}** is not on the staff roster.`).setFooter({ text: footer }));
      }
      const m: any = await res.json();
      const strikes = m.strikes ?? [];
      const activeLoa = (m.loaHistory ?? []).find((l: any) => ["approved", "active"].includes(l.status));
      return await reply(new EmbedBuilder().setColor(colorInt).setTitle(`Staff Info — ${m.username || targetName}`)
        .setThumbnail(m.avatar_url || `https://cdn.discordapp.com/embed/avatars/0.png`)
        .addFields(
          { name: "Rank", value: m.rank || "No rank", inline: true },
          { name: "Division", value: m.division || "None", inline: true },
          { name: "Callsign", value: m.callsign || "N/A", inline: true },
          { name: "Active Strikes", value: String(strikes.filter((s: any) => s.active !== false).length), inline: true },
          { name: "LOA", value: activeLoa ? `✅ ${activeLoa.status}` : "Not on LOA", inline: true },
          { name: "Joined", value: m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "Unknown", inline: true },
          ...(m.roblox_username ? [{ name: "Roblox", value: m.roblox_username, inline: true }] : []),
        )
        .setFooter({ text: footer }).setTimestamp());
    }

    // ── strikes / mystrikes ───────────────────────────────────────────────
    if (cmd === "strikes" || cmd === "mystrikes") {
      const mentioned = message.mentions.users.first();
      const targetId = mentioned?.id ?? message.author.id;
      const targetName = mentioned?.username ?? message.author.username;
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/strikes/bot?userId=${targetId}`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch strikes");
      const userStrikes: any[] = await res.json();
      const active = userStrikes.filter(s => s.active !== false);
      if (active.length === 0) {
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle(`Strikes — ${targetName}`).setDescription("✅ No active strikes.").setFooter({ text: footer }));
      }
      const sev: Record<string, string> = { warning: "⚠️ Warning", strike: "🔴 Strike", final_warning: "🚨 Final Warning" };
      const lines = active.map((s, i) => `**${i + 1}.** ${sev[s.severity] || "🔴 Strike"} — ${s.reason}${s.issued_by_name ? ` *(by ${s.issued_by_name})*` : ""}`);
      return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle(`Strikes — ${targetName} (${active.length})`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: footer }).setTimestamp());
    }

    // ── warnings ──────────────────────────────────────────────────────────
    if (cmd === "warnings") {
      const mentioned = message.mentions.users.first();
      const targetId = mentioned?.id ?? message.author.id;
      const targetName = mentioned?.username ?? message.author.username;
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/warnings/bot?userId=${targetId}`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch warnings");
      const warnings: any[] = await res.json();
      const active = warnings.filter(w => w.active !== false);
      if (active.length === 0) {
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle(`Warnings — ${targetName}`).setDescription("✅ No active warnings.").setFooter({ text: footer }));
      }
      const sevColor: Record<string, string> = { minor: "🟡", moderate: "🟠", severe: "🔴" };
      const lines = active.map((w, i) => `**${i + 1}.** ${sevColor[w.severity] || "🟡"} ${w.reason}${w.issued_by_name ? ` *(by ${w.issued_by_name})*` : ""}`);
      return await reply(new EmbedBuilder().setColor(0xFFB347).setTitle(`Warnings — ${targetName} (${active.length})`)
        .setDescription(lines.join("\n")).setFooter({ text: footer }).setTimestamp());
    }

    // ── stats ─────────────────────────────────────────────────────────────
    if (cmd === "stats") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/analytics/bot`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch analytics");
      const data: any = await res.json();
      return await reply(new EmbedBuilder().setColor(colorInt).setTitle("📊 Server Stats")
        .addFields(
          { name: "Staff Members", value: String(data.totalStaff ?? 0), inline: true },
          { name: "Active Strikes", value: String(data.activeStrikes ?? 0), inline: true },
          { name: "Active LOAs", value: String(data.activeLoa ?? 0), inline: true },
          { name: "Promotions (30d)", value: String(data.recentPromotions ?? 0), inline: true },
        )
        .setFooter({ text: footer }).setTimestamp());
    }

    // ── leaderboard / lb ──────────────────────────────────────────────────
    if (cmd === "leaderboard" || cmd === "lb") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/analytics`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch leaderboard");
      const data: any = await res.json();
      const performers = data.topPerformers ?? data.topActivity ?? [];
      if (performers.length === 0) {
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle("Activity Leaderboard").setDescription("No activity data yet.").setFooter({ text: footer }));
      }
      const medals = ["🥇", "🥈", "🥉"];
      const lines = performers.slice(0, 10).map((p: any, i: number) => `${medals[i] || `\`${i + 1}.\``} **${p.username}** — ${p.totalActions ?? p.count ?? 0} actions`);
      return await reply(new EmbedBuilder().setColor(colorInt).setTitle("🏆 Activity Leaderboard").setDescription(lines.join("\n")).setFooter({ text: footer }).setTimestamp());
    }

    // ── handbook ──────────────────────────────────────────────────────────
    if (cmd === "handbook") {
      const search = args.join(" ").toLowerCase();
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/handbook/bot`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch handbook");
      const entries: any[] = await res.json();
      const pub = entries.filter(e => e.is_public !== false);
      const filtered = search
        ? pub.filter(e => e.title?.toLowerCase().includes(search) || e.content?.toLowerCase().includes(search))
        : pub;
      if (filtered.length === 0) {
        const msg = search ? `No handbook entries matching **"${search}"**.` : "No handbook entries yet. Admins can add them in the dashboard.";
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle("📖 Staff Handbook").setDescription(msg).setFooter({ text: footer }));
      }
      const top = filtered.slice(0, 3);
      const embeds = top.map(e => new EmbedBuilder().setColor(colorInt)
        .setTitle(`📖 ${e.title}`)
        .setDescription((e.content || "No content.").slice(0, 1024))
        .setFooter({ text: e.section ? `${e.section} • ${footer}` : footer }),
      );
      if (filtered.length > 3) embeds[embeds.length - 1].setFooter({ text: `Showing ${top.length} of ${filtered.length} entries • ${footer}` });
      try { await message.reply({ embeds }); } catch { /* perms */ }
      return;
    }

    // ── checkin / ci ──────────────────────────────────────────────────────
    if (cmd === "checkin" || cmd === "ci") {
      const dutyType = args.join(" ").trim() || "general";
      const avatarUrl = message.author.displayAvatarURL({ size: 128, extension: "webp" });
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/roster/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
        body: JSON.stringify({ userId: message.author.id, username: message.author.username, role: "Staff", dutyType, avatarUrl }),
      });
      if (!res.ok) throw new Error("Failed to check in");
      return await reply(new EmbedBuilder().setColor(0x57F287)
        .setTitle("✅ Checked In")
        .setDescription(`**${message.author.username}** is now on duty${dutyType !== "general" ? ` · *${dutyType}*` : ""}.`)
        .setThumbnail(avatarUrl)
        .setFooter({ text: footer })
        .setTimestamp());
    }

    // ── checkout / co ─────────────────────────────────────────────────────
    if (cmd === "checkout" || cmd === "co") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/roster/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
        body: JSON.stringify({ userId: message.author.id }),
      });
      if (!res.ok) throw new Error("Failed to check out");
      return await reply(new EmbedBuilder().setColor(0xED4245)
        .setTitle("🚪 Checked Out")
        .setDescription(`**${message.author.username}** is now off duty. Great work!`)
        .setFooter({ text: footer })
        .setTimestamp());
    }

    // ── onduty / dutylist ─────────────────────────────────────────────────
    if (cmd === "onduty" || cmd === "dutylist") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/roster`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch duty roster");
      const entries: any[] = await res.json();
      const active = entries.filter(e => e.on_duty || !e.checked_out_at);
      if (active.length === 0) {
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle("🟢 On Duty").setDescription("No staff currently on duty.").setFooter({ text: footer }));
      }
      const lines = active.map(e => {
        const mins = Math.round((Date.now() - new Date(e.checked_in_at).getTime()) / 60000);
        const h = Math.floor(mins / 60), m = mins % 60;
        const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
        return `• **${e.username}**${e.duty_type && e.duty_type !== "general" ? ` [${e.duty_type}]` : ""} — ${duration}`;
      });
      return await reply(new EmbedBuilder().setColor(0x57F287)
        .setTitle(`🟢 On Duty Now — ${active.length} Staff`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: footer })
        .setTimestamp());
    }

    // ── premium ───────────────────────────────────────────────────────────
    if (cmd === "premium") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/premium`, { headers: { "x-bot-secret": config.botSecret } });
      const guild: any = res.ok ? await res.json() : {};
      const isPrem = guild.isPremium ?? guild.is_premium;
      return await reply(new EmbedBuilder()
        .setColor(isPrem ? 0xFFD700 : colorInt)
        .setTitle(isPrem ? "⭐ Premium Active" : "Premium Status")
        .setDescription(isPrem
          ? "This server has an active Zenith Premium subscription! All features unlocked."
          : `This server is on the free plan. Upgrade to Premium for advanced features.\n\nCurrent prefix: \`${pfx}\` (Premium: customize to anything)`)
        .setFooter({ text: footer }).setTimestamp());
    }

    // ── prefix ────────────────────────────────────────────────────────────
    if (cmd === "prefix") {
      const newPrefix = args[0]?.trim();
      if (!newPrefix) {
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle("⚙️ Current Prefix")
          .setDescription(`This server's prefix is: \`${pfx}\`\n\nTo change it (Premium only): \`${pfx}prefix <new_prefix>\``)
          .setFooter({ text: footer }));
      }
      if (newPrefix.length > 5) {
        return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Invalid Prefix").setDescription("Prefix must be 5 characters or fewer.").setFooter({ text: footer }));
      }
      const premRes = await fetch(`${config.apiUrl}/guilds/${guildId}/premium`, { headers: { "x-bot-secret": config.botSecret } });
      const prem: any = premRes.ok ? await premRes.json() : {};
      if (!prem.isPremium) {
        return await reply(new EmbedBuilder().setColor(0xFFD700).setTitle("⭐ Premium Required")
          .setDescription("Custom prefixes are a Premium feature. Upgrade at the web dashboard.")
          .setFooter({ text: footer }));
      }
      const updateRes = await fetch(`${config.apiUrl}/guilds/${guildId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
        body: JSON.stringify({ prefix: newPrefix }),
      });
      if (!updateRes.ok) throw new Error("Failed to update prefix");
      prefixCache.delete(guildId);
      return await reply(new EmbedBuilder().setColor(0x57F287).setTitle("✅ Prefix Updated")
        .setDescription(`Server prefix changed to \`${newPrefix}\`\nBoth \`${newPrefix}\` and \`z!\` will work.`)
        .setFooter({ text: footer }));
    }

    // ── blacklist ─────────────────────────────────────────────────────────
    if (cmd === "blacklist") {
      const sub = args[0]?.toLowerCase();
      if (sub === "add") {
        const userId = args[1]?.replace(/[<@!>]/g, "");
        const reason = args.slice(2).join(" ").trim();
        if (!userId) return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Usage").setDescription(`\`${pfx}blacklist add <userId|@user> [reason]\``).setFooter({ text: footer }));
        const res = await fetch(`${config.apiUrl}/guilds/${guildId}/blacklist`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
          body: JSON.stringify({ userId, username: args[1], reason: reason || "No reason provided", addedById: message.author.id, addedByName: message.author.username }),
        });
        if (!res.ok) { const d: any = await res.json(); throw new Error(d.error || "Failed to blacklist"); }
        return await reply(new EmbedBuilder().setColor(0xED4245).setTitle("🚫 User Blacklisted").setDescription(`<@${userId}> has been added to the blacklist.\n**Reason:** ${reason || "No reason provided"}`).setFooter({ text: footer }).setTimestamp());
      }
      if (sub === "remove") {
        const userId = args[1]?.replace(/[<@!>]/g, "");
        if (!userId) return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Usage").setDescription(`\`${pfx}blacklist remove <userId|@user>\``).setFooter({ text: footer }));
        await fetch(`${config.apiUrl}/guilds/${guildId}/blacklist/user/${userId}`, { method: "DELETE", headers: { "x-bot-secret": config.botSecret } });
        return await reply(new EmbedBuilder().setColor(0x57F287).setTitle("✅ Removed from Blacklist").setDescription(`<@${userId}> has been removed from the blacklist.`).setFooter({ text: footer }).setTimestamp());
      }
      if (sub === "check") {
        const userId = args[1]?.replace(/[<@!>]/g, "");
        if (!userId) return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Usage").setDescription(`\`${pfx}blacklist check <userId|@user>\``).setFooter({ text: footer }));
        const res = await fetch(`${config.apiUrl}/guilds/${guildId}/blacklist/user/${userId}`, { headers: { "x-bot-secret": config.botSecret } });
        const data: any = res.ok ? await res.json() : null;
        if (!data?.id) return await reply(new EmbedBuilder().setColor(0x57F287).setTitle("✅ Not Blacklisted").setDescription(`<@${userId}> is not on the blacklist.`).setFooter({ text: footer }));
        return await reply(new EmbedBuilder().setColor(0xED4245).setTitle("🚫 Blacklisted").addFields(
          { name: "User", value: `<@${userId}>`, inline: true },
          { name: "Reason", value: data.reason || "N/A", inline: false },
          { name: "Added By", value: data.added_by_name || "Unknown", inline: true },
        ).setFooter({ text: footer }).setTimestamp());
      }
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/blacklist`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch blacklist");
      const list: any[] = await res.json();
      if (list.length === 0) return await reply(new EmbedBuilder().setColor(colorInt).setTitle("🚫 Blacklist").setDescription("No blacklisted users.").setFooter({ text: footer }));
      const lines = list.slice(0, 20).map((b, i) => `**${i + 1}.** <@${b.user_id}> — ${(b.reason || "No reason").slice(0, 80)}`);
      return await reply(new EmbedBuilder().setColor(0xED4245).setTitle(`🚫 Blacklist (${list.length})`).setDescription(lines.join("\n")).setFooter({ text: footer }).setTimestamp());
    }

    // ── divisions ─────────────────────────────────────────────────────────
    if (cmd === "divisions") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/divisions`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch divisions");
      const divisions: any[] = await res.json();
      if (divisions.length === 0) {
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle("🏢 Divisions").setDescription("No active divisions. Create them in the web dashboard.").setFooter({ text: footer }));
      }
      const lines = divisions.map(d => `**${d.name}**${d.description ? ` — ${d.description}` : ""}${d.discord_role_id ? ` (<@&${d.discord_role_id}>)` : ""}`);
      return await reply(new EmbedBuilder().setColor(colorInt).setTitle(`🏢 Divisions (${divisions.length})`).setDescription(lines.join("\n")).setFooter({ text: footer }).setTimestamp());
    }

    // ── commend ───────────────────────────────────────────────────────────
    if (cmd === "commend") {
      const mentioned = message.mentions.users.first();
      if (!mentioned) return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Usage").setDescription(`\`${pfx}commend @user [reason]\``).setFooter({ text: footer }));
      const reason = args.slice(1).join(" ").replace(/^<@!?\d+>\s*/, "").trim() || "Outstanding performance";
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/commendations`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
        body: JSON.stringify({ targetUserId: mentioned.id, targetUsername: mentioned.username, givenById: message.author.id, givenByUsername: message.author.username, reason }),
      });
      if (!res.ok) throw new Error("Failed to submit commendation");
      return await reply(new EmbedBuilder().setColor(0xFFB6C1).setTitle("🌟 Commendation Awarded!")
        .setDescription(`**${mentioned.username}** has been commended!\n**Reason:** ${reason}`)
        .setFooter({ text: footer }).setTimestamp());
    }

    // ── promote / demote ──────────────────────────────────────────────────
    if (cmd === "promote" || cmd === "demote") {
      const mentioned = message.mentions.users.first();
      const rankArg = args.slice(1).join(" ").replace(/^<@!?\d+>\s*/, "").trim();
      if (!mentioned || !rankArg) return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Usage").setDescription(`\`${pfx}${cmd} @user <rank>\``).setFooter({ text: footer }));
      const type = cmd === "promote" ? "promotion" : "demotion";
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/promotions`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
        body: JSON.stringify({ userId: mentioned.id, username: mentioned.username, type, toRank: rankArg, promotedById: message.author.id, promotedByName: message.author.username }),
      });
      if (!res.ok) { const d: any = await res.json(); throw new Error(d.error || "Failed"); }
      const emoji = cmd === "promote" ? "📈" : "📉";
      return await reply(new EmbedBuilder().setColor(cmd === "promote" ? 0x57F287 : 0xED4245)
        .setTitle(`${emoji} ${cmd === "promote" ? "Promoted" : "Demoted"}`)
        .setDescription(`**${mentioned.username}** has been ${cmd === "promote" ? "promoted to" : "demoted to"} **${rankArg}**.`)
        .setFooter({ text: footer }).setTimestamp());
    }

    // ── incident ──────────────────────────────────────────────────────────
    if (cmd === "incident") {
      const title = args[0];
      const description = args.slice(1).join(" ");
      if (!title) return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Usage").setDescription(`\`${pfx}incident <title> [description]\``).setFooter({ text: footer }));
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/incidents`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
        body: JSON.stringify({ title, description: description || title, severity: "medium", reportedByName: message.author.username, reportedById: message.author.id }),
      });
      if (!res.ok) throw new Error("Failed to report incident");
      return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("🚨 Incident Reported")
        .setDescription(`**${title}**${description ? `\n${description}` : ""}`)
        .setFooter({ text: footer }).setTimestamp());
    }

    // ── loa ───────────────────────────────────────────────────────────────
    if (cmd === "loa") {
      const sub = args[0]?.toLowerCase();
      if (sub === "list") {
        const res = await fetch(`${config.apiUrl}/guilds/${guildId}/loa`, { headers: { "x-bot-secret": config.botSecret } });
        if (!res.ok) throw new Error("Could not fetch LOA");
        const all: any[] = await res.json();
        const pending = all.filter(l => l.status === "pending");
        if (pending.length === 0) return await reply(new EmbedBuilder().setColor(colorInt).setTitle("📅 LOA Requests").setDescription("No pending LOA requests.").setFooter({ text: footer }));
        const lines = pending.slice(0, 10).map((l, i) => `**${i + 1}.** ${l.username} — ${l.reason?.slice(0, 60)}`);
        return await reply(new EmbedBuilder().setColor(colorInt).setTitle(`📅 Pending LOA (${pending.length})`).setDescription(lines.join("\n")).setFooter({ text: footer }).setTimestamp());
      }
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/loa?userId=${message.author.id}`, { headers: { "x-bot-secret": config.botSecret } });
      const all: any[] = res.ok ? await res.json() : [];
      const active = all.find(l => l.status === "approved" || l.status === "active");
      const pending = all.find(l => l.status === "pending");
      const status = active ? `✅ On LOA until ${active.end_date ? new Date(active.end_date).toLocaleDateString() : "unknown"}` : pending ? "⏳ Pending approval" : "Not on LOA";
      return await reply(new EmbedBuilder().setColor(colorInt).setTitle(`📅 LOA Status — ${message.author.username}`)
        .setDescription(status).setFooter({ text: footer }).setTimestamp());
    }

    // ── goals ─────────────────────────────────────────────────────────────
    if (cmd === "goals") {
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/goals`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch goals");
      const goals: any[] = await res.json();
      const myGoals = goals.filter(g => g.user_id === message.author.id);
      if (myGoals.length === 0) return await reply(new EmbedBuilder().setColor(colorInt).setTitle("🎯 Staff Goals").setDescription("No goals set for you yet.").setFooter({ text: footer }));
      const lines = myGoals.map(g => `• **${g.title}** — ${g.progress ?? 0}% ${g.status === "completed" ? "✅" : ""}`);
      return await reply(new EmbedBuilder().setColor(colorInt).setTitle("🎯 Your Staff Goals").setDescription(lines.join("\n")).setFooter({ text: footer }).setTimestamp());
    }

    // ── training ──────────────────────────────────────────────────────────
    if (cmd === "training") {
      const sub = args[0]?.toLowerCase();
      if (sub === "complete" && args[1]) {
        const mentioned = message.mentions.users.first();
        const programName = args.slice(mentioned ? 2 : 1).join(" ");
        if (!programName) return await reply(new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Usage").setDescription(`\`${pfx}training complete [@user] <program>\``).setFooter({ text: footer }));
        const targetUser = mentioned || message.author;
        const res = await fetch(`${config.apiUrl}/guilds/${guildId}/training/completions`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-bot-secret": config.botSecret },
          body: JSON.stringify({ username: targetUser.username, userId: targetUser.id, programName, trainerName: message.author.username }),
        });
        if (!res.ok) { const d: any = await res.json(); throw new Error(d.error || "Failed"); }
        return await reply(new EmbedBuilder().setColor(0x57F287).setTitle("🎓 Training Complete!")
          .setDescription(`**${targetUser.username}** completed **${programName}**.`)
          .setFooter({ text: footer }).setTimestamp());
      }
      const res = await fetch(`${config.apiUrl}/guilds/${guildId}/training/programs`, { headers: { "x-bot-secret": config.botSecret } });
      if (!res.ok) throw new Error("Could not fetch training programs");
      const programs: any[] = await res.json();
      if (programs.length === 0) return await reply(new EmbedBuilder().setColor(colorInt).setTitle("🎓 Training Programs").setDescription("No training programs configured yet.").setFooter({ text: footer }));
      const lines = programs.map(p => `• **${p.name}**${p.description ? ` — ${p.description}` : ""}${p.required ? " *(required)*" : ""}`);
      return await reply(new EmbedBuilder().setColor(colorInt).setTitle(`🎓 Training Programs (${programs.length})`).setDescription(lines.join("\n")).setFooter({ text: footer }).setTimestamp());
    }

    // ── Unknown command – silent ───────────────────────────────────────────
    // (don't reply to unknown commands to avoid spam)

  } catch (err: any) {
    try {
      await message.reply({
        embeds: [new EmbedBuilder().setColor(0xFF6B6B).setTitle("❌ Error").setDescription(err?.message || "An unexpected error occurred.").setFooter({ text: footer })],
      });
    } catch { /* channel perms */ }
  }
}
