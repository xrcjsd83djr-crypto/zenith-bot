import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from "discord.js";
import { config } from "../lib/config.js";

export const data = new SlashCommandBuilder()
  .setName("handbook")
  .setDescription("Browse and read the staff handbook")
  .addSubcommand(s => s
    .setName("list")
    .setDescription("List all handbook entries available to you")
  )
  .addSubcommand(s => s
    .setName("read")
    .setDescription("Read a specific handbook entry by title")
    .addStringOption(o => o
      .setName("title")
      .setDescription("Handbook entry title to read")
      .setRequired(true)
      .setAutocomplete(true)
    )
  );

const GOLD = 0xd4af37;

export async function autocomplete(interaction: any) {
  const guildId = interaction.guildId;
  if (!guildId) return interaction.respond([]);
  const focused = interaction.options.getFocused().toLowerCase();
  try {
    const res = await fetch(`${config.apiUrl}/guilds/${guildId}/handbook`, {
      headers: { "x-bot-secret": config.botSecret },
    });
    if (!res.ok) return interaction.respond([]);
    const entries: any[] = await res.json();
    const filtered = entries
      .filter(e => e.is_public && e.title.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(e => ({ name: e.title.slice(0, 100), value: e.title.slice(0, 100) }));
    return interaction.respond(filtered);
  } catch {
    return interaction.respond([]);
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle("❌ Server Only").setDescription("This command can only be used in a server.")],
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: false });

  try {
    const res = await fetch(`${config.apiUrl}/guilds/${interaction.guildId}/handbook`, {
      headers: { "x-bot-secret": config.botSecret },
    });
    if (!res.ok) throw new Error("API error");

    const entries: any[] = await res.json();
    const publicEntries = entries.filter(e => e.is_public);

    if (sub === "list") {
      if (publicEntries.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(GOLD)
            .setTitle("📖 Staff Handbook")
            .setDescription("No handbook entries have been added yet. Admins can add entries through the dashboard.")
            .setFooter({ text: "Zenith Staff Management" })
          ]
        });
      }

      // Group by category
      const byCategory = new Map<string, typeof publicEntries>();
      for (const e of publicEntries) {
        const cat = e.category || "General";
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(e);
      }

      let desc = "Use `/handbook read <title>` to read a specific entry.\n\n";
      for (const [cat, items] of byCategory) {
        desc += `**📂 ${cat}**\n`;
        for (const e of items) desc += `• ${e.title}\n`;
        desc += "\n";
      }

      // Add select menu if there are enough entries to browse
      if (publicEntries.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("handbook_select")
          .setPlaceholder("Select an entry to read...")
          .addOptions(
            publicEntries.slice(0, 25).map(e => ({
              label: e.title.slice(0, 100),
              value: e.id,
              description: (e.category || "General").slice(0, 100),
            }))
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
        const reply = await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(GOLD)
            .setTitle("📖 Staff Handbook")
            .setDescription(desc.slice(0, 4096))
            .setFooter({ text: `${publicEntries.length} entries • Select one below to read it` })
            .setTimestamp()
          ],
          components: [row],
        });

        // Collect select menu interaction
        try {
          const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60_000,
          });
          collector.on("collect", async (i: StringSelectMenuInteraction) => {
            const entryId = i.values[0];
            const entry = publicEntries.find(e => e.id === entryId);
            if (!entry) return i.reply({ content: "Entry not found.", ephemeral: true });
            await i.reply({
              embeds: [new EmbedBuilder()
                .setColor(GOLD)
                .setTitle(`📖 ${entry.title}`)
                .setDescription(entry.content.slice(0, 4000))
                .setFooter({ text: entry.category ? `Category: ${entry.category} • Zenith Handbook` : "Zenith Staff Handbook" })
                .setTimestamp()
              ],
              ephemeral: true,
            });
          });
          collector.on("end", () => {
            reply.edit({ components: [] }).catch(() => {});
          });
        } catch {}

        return;
      }

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(GOLD)
          .setTitle("📖 Staff Handbook")
          .setDescription(desc.slice(0, 4096))
          .setFooter({ text: `${publicEntries.length} entries • Use /handbook read <title>` })
          .setTimestamp()
        ],
      });

    } else if (sub === "read") {
      const title = interaction.options.getString("title", true).toLowerCase();
      const entry = publicEntries.find(e =>
        e.title.toLowerCase() === title ||
        e.title.toLowerCase().includes(title)
      );

      if (!entry) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle("❌ Not Found")
            .setDescription(`No handbook entry found matching "**${title}**".\n\nUse \`/handbook list\` to see all available entries.`)
          ]
        });
      }

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(GOLD)
          .setTitle(`📖 ${entry.title}`)
          .setDescription(entry.content.slice(0, 4000))
          .setFooter({ text: entry.category ? `Category: ${entry.category} • Zenith Staff Handbook` : "Zenith Staff Handbook" })
          .setTimestamp()
        ]
      });
    }

  } catch (err) {
    console.error("[handbook]", err);
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle("❌ Error")
        .setDescription("Failed to fetch handbook entries. Please try again later.")
      ]
    });
  }
}
