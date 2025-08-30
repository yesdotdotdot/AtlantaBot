#!/usr/bin/env node

// Migration script to add cogsEnabled field to existing guilds
// Run: node scripts/migrate-add-cogsEnabled.js

const mongoose = require("mongoose");
const GuildConfig = require("../src/core/guildConfig.model");

// Default cogs that should be enabled for all guilds
const DEFAULT_COGS = ["moderation", "music", "economy", "general", "fun", "images", "administration"];

// Get MongoDB URI from environment or use default
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost/atlanta";

async function runMigration() {
	try {
		console.log("Starting migration: Adding cogsEnabled field to existing guilds...");
		
		// Connect to MongoDB
		await mongoose.connect(MONGO_URI, { 
			useNewUrlParser: true, 
			useUnifiedTopology: true 
		});
		console.log("Connected to MongoDB");

		// Find all guilds that don't have cogsEnabled field
		const guildsWithoutCogs = await GuildConfig.find({ 
			cogsEnabled: { $exists: false } 
		});
		
		console.log(`Found ${guildsWithoutCogs.length} guilds without cogsEnabled field`);

		if (guildsWithoutCogs.length === 0) {
			console.log("No migration needed - all guilds already have cogsEnabled field");
			return;
		}

		// Update all guilds to add cogsEnabled field with default values
		const result = await GuildConfig.updateMany(
			{ cogsEnabled: { $exists: false } },
			{ $set: { cogsEnabled: DEFAULT_COGS } }
		);

		console.log(`Migration completed successfully!`);
		console.log(`Updated ${result.modifiedCount} guilds`);
		console.log(`Default cogs enabled: ${DEFAULT_COGS.join(", ")}`);

		// Verify the migration
		const verification = await GuildConfig.find({ cogsEnabled: { $exists: true } });
		console.log(`Total guilds with cogsEnabled: ${verification.length}`);

	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	} finally {
		// Disconnect from MongoDB
		await mongoose.disconnect();
		console.log("Disconnected from MongoDB");
	}
}

// Run the migration if this script is executed directly
if (require.main === module) {
	runMigration().catch(console.error);
}

module.exports = { runMigration, DEFAULT_COGS };
