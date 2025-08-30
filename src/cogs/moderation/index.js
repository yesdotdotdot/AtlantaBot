const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	name: "Moderation",
	id: "moderation",
	description: "Moderation commands for managing server members",

	init: async function (client, { db, models }) {
		this._client = client;
		this._db = db;
		this._models = models;
	},

	commands: [
		{
			data: new SlashCommandBuilder()
				.setName("kick")
				.setDescription("Kick a member from the server")
				.addUserOption(option => 
					option.setName("user")
						.setDescription("The user to kick")
						.setRequired(true)
				)
				.addStringOption(option =>
					option.setName("reason")
						.setDescription("Reason for kicking")
						.setRequired(false)
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

			async execute(interaction, context) {
				const user = interaction.options.getUser("user");
				const reason = interaction.options.getString("reason") || "No reason provided";
				const member = interaction.guild.members.cache.get(user.id);

				if (!member) {
					return interaction.reply({ 
						content: "That user is not a member of this server.", 
						ephemeral: true 
					});
				}

				if (!member.kickable) {
					return interaction.reply({ 
						content: "I cannot kick that user. They may have higher permissions than me.", 
						ephemeral: true 
					});
				}

				try {
					await member.kick(reason);
					await interaction.reply({ 
						content: `Successfully kicked ${user.tag} for: ${reason}`, 
						ephemeral: true 
					});
				} catch (error) {
					console.error("Kick error:", error);
					await interaction.reply({ 
						content: "Failed to kick the user. Please check my permissions.", 
						ephemeral: true 
					});
				}
			}
		},
		{
			data: new SlashCommandBuilder()
				.setName("ban")
				.setDescription("Ban a member from the server")
				.addUserOption(option => 
					option.setName("user")
						.setDescription("The user to ban")
						.setRequired(true)
				)
				.addStringOption(option =>
					option.setName("reason")
						.setDescription("Reason for banning")
						.setRequired(false)
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

			async execute(interaction, context) {
				const user = interaction.options.getUser("user");
				const reason = interaction.options.getString("reason") || "No reason provided";

				try {
					await interaction.guild.members.ban(user, { reason });
					await interaction.reply({ 
						content: `Successfully banned ${user.tag} for: ${reason}`, 
						ephemeral: true 
					});
				} catch (error) {
					console.error("Ban error:", error);
					await interaction.reply({ 
						content: "Failed to ban the user. Please check my permissions.", 
						ephemeral: true 
					});
				}
			}
		}
	],

	events: [
		{
			name: "guildMemberRemove",
			handler: async function (member, client, context) {
				// Log member removal for moderation purposes
				const guildConfig = await context.client.cogManager.isEnabledForGuild("moderation", member.guild.id);
				if (guildConfig) {
					console.log(`Member ${member.user.tag} left guild ${member.guild.name}`);
				}
			}
		}
	],

	dashboardRoutes: [
		{
			method: "get",
			path: "/moderation",
			handler: async (req, res) => {
				res.render("dashboard/moderation", { 
					guildConfig: req.guildConfig,
					user: req.userInfos,
					translate: req.translate
				});
			}
		}
	]
};
