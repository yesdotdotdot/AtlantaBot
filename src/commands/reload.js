const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("reload")
		.setDescription("Reload a cog (admin only)")
		.addStringOption(opt => 
			opt.setName("cog")
				.setDescription("Cog id to reload")
				.setRequired(true)
		),

	async execute(interaction) {
		// Check if user has Manage Server permission
		if (!interaction.memberPermissions.has("ManageGuild")) {
			return interaction.reply({ 
				content: "You need Manage Server permission to use this command.", 
				ephemeral: true 
			});
		}

		const cogId = interaction.options.getString("cog", true);
		const cogManager = interaction.client.cogManager;

		if (!cogManager) {
			return interaction.reply({ 
				content: "Cog system not initialized.", 
				ephemeral: true 
			});
		}

		// Check if cog exists
		if (!cogManager.isLoaded(cogId)) {
			return interaction.reply({ 
				content: `Cog \`${cogId}\` is not loaded.`, 
				ephemeral: true 
			});
		}

		try {
			await interaction.deferReply({ ephemeral: true });
			await cogManager.reload(cogId);
			await interaction.editReply({ 
				content: `✅ Successfully reloaded cog \`${cogId}\``, 
				ephemeral: true 
			});
		} catch (err) {
			console.error(`Failed to reload cog ${cogId}:`, err);
			await interaction.editReply({ 
				content: `❌ Failed to reload cog \`${cogId}\`: ${err.message}`, 
				ephemeral: true 
			});
		}
	}
};
