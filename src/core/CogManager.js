const fs = require("fs");
const path = require("path");
const GuildConfig = require("./guildConfig.model");

class CogManager {
	constructor(client, options = {}) {
		this.client = client;
		this.cogsPath = options.cogsPath || path.join(__dirname, "..", "cogs");
		this.cogs = new Map();
		this.commandMap = new Map();
		this.db = options.db;
		this.logger = client.logger || console;
	}

	async init() {
		try {
			if (!fs.existsSync(this.cogsPath)) {
				this.logger.log(`Cogs directory not found at ${this.cogsPath}, creating...`, "warn");
				fs.mkdirSync(this.cogsPath, { recursive: true });
			}

			const files = fs.readdirSync(this.cogsPath);
			this.logger.log(`Found ${files.length} cog directories`, "log");

			for (const f of files) {
				const full = path.join(this.cogsPath, f);
				if (fs.statSync(full).isDirectory()) {
					await this.load(full);
				}
			}

			this.logger.log(`CogManager initialized with ${this.cogs.size} cogs`, "log");
		} catch (err) {
			this.logger.log(`Failed to initialize CogManager: ${err}`, "error");
		}
	}

	async load(cogFolderPath) {
		try {
			const cogId = path.basename(cogFolderPath);
			const indexPath = path.join(cogFolderPath, "index.js");

			if (!fs.existsSync(indexPath)) {
				this.logger.log(`No index.js found in cog ${cogId}`, "warn");
				return false;
			}

			const cog = require(indexPath);
			if (!cog || !cog.id) {
				throw new Error(`Invalid cog format: missing id in ${cogId}`);
			}

			if (cog.init) {
				try {
					await cog.init(this.client, { 
						db: this.db, 
						models: {
							GuildConfig: GuildConfig,
							Guild: this.client.guildsData,
							User: this.client.usersData,
							Member: this.client.membersData
						}
					});
				} catch (initErr) {
					this.logger.log(`Failed to initialize cog ${cogId}: ${initErr}`, "warn");
				}
			}

			const handlers = [];
			if (cog.events) {
				for (const e of cog.events) {
					if (!e.name || !e.handler) {
						this.logger.log(`Invalid event in cog ${cogId}: missing name or handler`, "warn");
						continue;
					}

					const bound = e.handler.bind(cog);
					this.client.on(e.name, bound);
					handlers.push({ name: e.name, fn: bound });
				}
			}

			if (cog.commands) {
				for (const cmd of cog.commands) {
					if (!cmd.data || !cmd.data.name) {
						this.logger.log(`Invalid command in cog ${cogId}: missing data or name`, "warn");
						continue;
					}

					const name = cmd.data.name;
					this.commandMap.set(name, cog.id);
				}
			}

			this.cogs.set(cog.id, { 
				module: cog, 
				handlers, 
				commands: cog.commands || [],
				path: cogFolderPath
			});

			this.logger.log(`Loaded cog: ${cogId}`, "log");
			return true;
		} catch (err) {
			this.logger.log(`Failed to load cog at ${cogFolderPath}: ${err}`, "error");
			return false;
		}
	}

	async unload(cogId) {
		const entry = this.cogs.get(cogId);
		if (!entry) {
			this.logger.log(`Cog ${cogId} not found for unloading`, "warn");
			return false;
		}

		try {
			for (const h of entry.handlers) {
				this.client.off(h.name, h.fn);
			}

			for (const c of entry.commands) {
				this.commandMap.delete(c.data.name);
			}

			try {
				const modPath = require.resolve(path.join(entry.path, "index.js"));
				delete require.cache[modPath];
			} catch (err) {}

			this.cogs.delete(cogId);
			this.logger.log(`Unloaded cog: ${cogId}`, "log");
			return true;
		} catch (err) {
			this.logger.log(`Failed to unload cog ${cogId}: ${err}`, "error");
			return false;
		}
	}

	async reload(cogId) {
		try {
			const unloaded = await this.unload(cogId);
			if (!unloaded) return false;

			const cogPath = path.join(this.cogsPath, cogId);
			const loaded = await this.load(cogPath);
			
			if (loaded) {
				this.logger.log(`Reloaded cog: ${cogId}`, "log");
			}
			
			return loaded;
		} catch (err) {
			this.logger.log(`Failed to reload cog ${cogId}: ${err}`, "error");
			return false;
		}
	}

	getCogByCommand(commandName) {
		const cogId = this.commandMap.get(commandName);
		if (!cogId) return null;
		return this.cogs.get(cogId);
	}

	async enableForGuild(cogId, guildId) {
		try {
			const gcfg = await GuildConfig.findOneAndUpdate(
				{ guildId },
				{ $addToSet: { cogsEnabled: cogId } },
				{ upsert: true, new: true }
			);
			
			this.logger.log(`Enabled cog ${cogId} for guild ${guildId}`, "log");
			return gcfg;
		} catch (err) {
			this.logger.log(`Failed to enable cog ${cogId} for guild ${guildId}: ${err}`, "error");
			throw err;
		}
	}

	async disableForGuild(cogId, guildId) {
		try {
			const gcfg = await GuildConfig.findOneAndUpdate(
				{ guildId },
				{ $pull: { cogsEnabled: cogId } },
				{ upsert: true, new: true }
			);
			
			this.logger.log(`Disabled cog ${cogId} for guild ${guildId}`, "log");
			return gcfg;
		} catch (err) {
			this.logger.log(`Failed to disable cog ${cogId} for guild ${guildId}: ${err}`, "error");
			throw err;
		}
	}

	async isEnabledForGuild(cogId, guildId) {
		try {
			const gcfg = await GuildConfig.findOne({ guildId });
			if (!gcfg) return false;
			return (gcfg.cogsEnabled || []).includes(cogId);
		} catch (err) {
			this.logger.log(`Failed to check cog status for ${cogId} in guild ${guildId}: ${err}`, "error");
			return false;
		}
	}

	listCogs() {
		return [...this.cogs.keys()];
	}

	getCogsInfo() {
		return Array.from(this.cogs.entries()).map(([id, entry]) => ({
			id,
			name: entry.module.name || id,
			description: entry.module.description || "No description",
			commands: entry.commands.length,
			events: entry.handlers.length,
			enabled: true
		}));
	}

	getCog(cogId) {
		return this.cogs.get(cogId);
	}

	isLoaded(cogId) {
		return this.cogs.has(cogId);
	}
}

module.exports = CogManager;
