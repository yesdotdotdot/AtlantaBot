const express = require("express"),
	utils = require("../utils"),
	CheckAuth = require("../auth/CheckAuth"),
	router = express.Router();

module.exports = (app, { cogManager, ensureAuth }) => {
	// GET /dashboard/:guildId/cogs - renders the Cog management page
	router.get("/:guildId/cogs", CheckAuth, async(req, res) => {
		const { guildId } = req.params;
		
		// Check if the user has the permissions to edit this guild
		const guild = req.client.guilds.cache.get(guildId);
		if(!guild || !req.userInfos.displayedGuilds || !req.userInfos.displayedGuilds.find((g) => g.id === guildId)){
			return res.render("404", {
				user: req.userInfos,
				translate: req.translate,
				currentURL: `${req.client.config.dashboard.baseURL}/${req.originalUrl}`
			});
		}

		// Check if user has admin permissions in the guild
		const member = await guild.members.fetch(req.user.id).catch(() => null);
		if (!member || !member.permissions.has("ManageGuild")) {
			return res.render("403", {
				user: req.userInfos,
				translate: req.translate,
				currentURL: `${req.client.config.dashboard.baseURL}/${req.originalUrl}`
			});
		}

		// Get guild config and cogs info
		const GuildConfig = require("../../src/core/guildConfig.model");
		const guildCfg = await GuildConfig.findOne({ guildId }) || { cogsEnabled: [] };
		
		const cogs = cogManager.listCogs().map(id => {
			const entry = cogManager.getCog(id);
			return { 
				id, 
				name: entry?.module.name || id, 
				description: entry?.module.description || "No description", 
				enabled: (guildCfg.cogsEnabled || []).includes(id) 
			};
		});

		res.render("dashboard/cogs", { 
			guildId, 
			cogs,
			guild: guild,
			user: req.userInfos,
			translate: req.translate,
			bot: req.client,
			currentURL: `${req.client.config.dashboard.baseURL}/${req.originalUrl}`
		});
	});

	// POST /api/dashboard/:guildId/cogs/toggle - toggles a cog on or off
	router.post("/:guildId/cogs/toggle", CheckAuth, async(req, res) => {
		const { guildId } = req.params;
		const { cogId, action } = req.body;
		
		// Check if the user has the permissions to edit this guild
		const guild = req.client.guilds.cache.get(guildId);
		if(!guild || !req.userInfos.displayedGuilds || !req.userInfos.displayedGuilds.find((g) => g.id === guildId)){
			return res.status(403).json({ error: "Access denied" });
		}

		// Check if user has admin permissions in the guild
		const member = await guild.members.fetch(req.user.id).catch(() => null);
		if (!member || !member.permissions.has("ManageGuild")) {
			return res.status(403).json({ error: "Insufficient permissions" });
		}

		// Validate action
		if (!["enable", "disable"].includes(action)) {
			return res.status(400).json({ error: "Invalid action" });
		}

		try {
			if (action === "enable") {
				await cogManager.enableForGuild(cogId, guildId);
			} else {
				await cogManager.disableForGuild(cogId, guildId);
			}
			
			res.json({ 
				ok: true, 
				action, 
				cogId,
				message: `Cog ${cogId} ${action}d successfully` 
			});
		} catch (error) {
			console.error("Cog toggle error:", error);
			res.status(500).json({ error: "Failed to toggle cog" });
		}
	});

	return router;
};
