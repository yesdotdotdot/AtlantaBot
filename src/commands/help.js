const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Show available commands for enabled Cogs"),

	async execute(interaction) {
		const guildId = interaction.guildId;
		const cogManager = interaction.client.cogManager;
		
		if (!cogManager) {
			return interaction.reply({ 
				content: "Cog system not initialized. Please contact an administrator.", 
				ephemeral: true 
			});
		}

		const GuildConfig = require("../core/guildConfig.model");
		const guildCfg = await GuildConfig.findOne({ guildId }) || { cogsEnabled: [] };
		const enabled = guildCfg.cogsEnabled || [];

		const lines = enabled.map(id => {
			const cogEntry = cogManager.getCog(id);
			if (!cogEntry) return `\`${id}\` (not loaded)`;
			return `**${cogEntry.module.name}** — ${cogEntry.module.description || "No description"}`;
		});

		const embed = new EmbedBuilder()
			.setTitle("Help — Enabled Cogs")
			.setDescription(lines.join("\n") || "No cogs enabled for this server.")
			.setFooter({ text: "Select a cog from the menu to see its commands." })
			.setColor("#00ff00");

		const options = enabled.map(id => {
			const cogEntry = cogManager.getCog(id);
			return {
				label: cogEntry?.module.name || id,
				value: id,
				description: cogEntry?.module.description?.slice(0, 90) || ""
			};
		});

		if (options.length === 0) {
			return interaction.reply({ 
				embeds: [embed], 
				ephemeral: true 
			});
		}

		const select = new StringSelectMenuBuilder()
			.setCustomId(`help_select_${interaction.id}`)
			.setPlaceholder("Choose a cog...")
			.addOptions(options);

		const selectRow = new ActionRowBuilder().addComponents(select);

		await interaction.reply({ 
			embeds: [embed], 
			components: [selectRow], 
			ephemeral: true 
		});

		const collector = interaction.channel.createMessageComponentCollector({
			filter: i => i.user.id === interaction.user.id,
			time: 120000
		});

		collector.on("collect", async i => {
			if (i.isStringSelectMenu()) {
				const cogId = i.values[0];
				const cogEntry = cogManager.getCog(cogId);
				if (!cogEntry) {
					return i.update({ 
						content: "Cog not available", 
						embeds: [], 
						components: [] 
					});
				}

				const cmds = (cogEntry.commands || []).map(c => 
					`• \`/${c.data.name}\` — ${c.data.description || ""}`
				);
				
				const cogEmbed = new EmbedBuilder()
					.setTitle(`${cogEntry.module.name} — Commands`)
					.setDescription(cmds.join("\n") || "_This cog has no slash commands._")
					.setColor("#0099ff");

				const backBtn = new ButtonBuilder()
					.setCustomId(`help_back_${interaction.id}`)
					.setLabel("Back")
					.setStyle(ButtonStyle.Secondary);
					
				const closeBtn = new ButtonBuilder()
					.setCustomId(`help_close_${interaction.id}`)
					.setLabel("Close")
					.setStyle(ButtonStyle.Danger);

				const btnRow = new ActionRowBuilder().addComponents(backBtn, closeBtn);
				await i.update({ embeds: [cogEmbed], components: [btnRow] });
			} else if (i.isButton()) {
				if (i.customId === `help_back_${interaction.id}`) {
					await i.update({ embeds: [embed], components: [selectRow] });
				} else if (i.customId === `help_close_${interaction.id}`) {
					await i.update({ 
						content: "Help menu closed.", 
						embeds: [], 
						components: [] 
					});
					collector.stop();
				}
			}
		});

		collector.on("end", async () => {
			try {
				await interaction.editReply({ components: [] });
			} catch (err) {
				// Ignore errors when collector times out
			}
		});
	}
};
