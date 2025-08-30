const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	name: "Economy",
	id: "economy",
	description: "Virtual economy and currency system",

	init: async function (client, { db, models }) {
		this._client = client;
		this._db = db;
		this._models = models;
	},

	commands: [
		{
			data: new SlashCommandBuilder()
				.setName("balance")
				.setDescription("Check your or another user's balance")
				.addUserOption(option => 
					option.setName("user")
						.setDescription("User to check balance for")
						.setRequired(false)
				),

			async execute(interaction, context) {
				const targetUser = interaction.options.getUser("user") || interaction.user;
				await interaction.reply({ 
					content: `💰 ${targetUser.username}'s balance: 1000 coins (placeholder)`, 
					ephemeral: true 
				});
			}
		},
		{
			data: new SlashCommandBuilder()
				.setName("daily")
				.setDescription("Collect your daily reward"),

			async execute(interaction, context) {
				await interaction.reply({ 
					content: "🎁 Daily reward collected! +100 coins (placeholder)", 
					ephemeral: true 
				});
			}
		}
	],

	events: [
		{
			name: "messageCreate",
			handler: async function (message, client, context) {
				// Ignore bot messages
				if (message.author.bot) return;
				
				// Simple message-based currency earning (placeholder)
				if (message.content.length > 10) {
					console.log(`User ${message.author.tag} earned 1 coin for long message`);
				}
			}
		}
	]
};
