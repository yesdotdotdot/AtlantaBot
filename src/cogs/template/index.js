const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    name: "Template Cog",
    id: "template",
    description: "A template cog demonstrating all available features",
    
    init: async function (client, { db, models }) {
        this._client = client;
        this._db = db;
        this._models = models;
        console.log("Template cog initialized successfully!");
    },
    
    commands: [
        {
            data: new SlashCommandBuilder()
                .setName("hello")
                .setDescription("Say hello from the template cog"),
            
            async execute(interaction, context) {
                await interaction.reply({ 
                    content: "👋 Hello from the Template Cog!", 
                    ephemeral: true 
                });
            }
        },
        {
            data: new SlashCommandBuilder()
                .setName("info")
                .setDescription("Get information about this cog")
                .addStringOption(option =>
                    option.setName("detail")
                        .setDescription("What detail to show")
                        .setRequired(false)
                        .addChoices(
                            { name: "Commands", value: "commands" },
                            { name: "Events", value: "events" },
                            { name: "Version", value: "version" }
                        )
                ),
            
            async execute(interaction, context) {
                const detail = interaction.options.getString("detail");
                
                if (!detail) {
                    await interaction.reply({
                        content: "ℹ️ Template Cog v1.0.0\nUse `/info <detail>` to get specific information.",
                        ephemeral: true
                    });
                    return;
                }
                
                let response = "";
                switch (detail) {
                    case "commands":
                        response = "📋 Available commands:\n• `/hello` - Say hello\n• `/info` - Get cog information";
                        break;
                    case "events":
                        response = "🔔 Active events:\n• `messageCreate` - Logs messages";
                        break;
                    case "version":
                        response = "📦 Version: 1.0.0\nLast updated: Today";
                        break;
                    default:
                        response = "❓ Unknown detail. Try: commands, events, or version";
                }
                
                await interaction.reply({ content: response, ephemeral: true });
            }
        }
    ],
    
    events: [
        {
            name: "messageCreate",
            handler: async function (message, client, context) {
                if (message.author.bot) return;
                
                if (message.content.length > 50) {
                    console.log(`Long message from ${message.author.tag}: ${message.content.substring(0, 100)}...`);
                }
                
                if (message.content.toLowerCase().includes("template")) {
                    await message.react("📋");
                }
            }
        }
    ]
};
