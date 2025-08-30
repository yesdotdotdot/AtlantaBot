# Cog System Architecture

## Overview

The Cog system transforms AtlantaBot into a modular, plugin-based architecture where functionality is organized into self-contained modules called "Cogs". Each cog can contain commands, event handlers, and dashboard routes, making the bot highly extensible and maintainable.

## Architecture Components

### 1. CogManager (`src/core/CogManager.js`)

The central orchestrator that handles:
- **Loading/Unloading**: Dynamically loads cogs from the `src/cogs/` directory
- **Event Management**: Registers and unregisters Discord.js event handlers
- **Command Routing**: Maps command names to their owning cogs
- **Guild Configuration**: Manages which cogs are enabled per guild
- **Hot Reloading**: Allows cogs to be reloaded without bot restart

### 2. GuildConfig Model (`src/core/guildConfig.model.js`)

Extends the existing Guild model with:
- `cogsEnabled`: Array of cog IDs that are active for the guild
- Default cogs: `["moderation", "music", "economy", "general", "fun", "images", "administration"]`

### 3. Cog Interface

Each cog must export an object with:

```javascript
module.exports = {
    name: "Human Readable Name",
    id: "unique-cog-id", // lowercase, kebab-case
    description: "What this cog does",
    
    // Optional initialization
    init: async function(client, { db, models }) {
        // Setup code, DB connections, etc.
    },
    
    // Slash commands
    commands: [
        {
            data: new SlashCommandBuilder()...,
            async execute(interaction, context) { ... }
        }
    ],
    
    // Event handlers
    events: [
        {
            name: "eventName",
            handler: async function(...args) { ... }
        }
    ],
    
    // Dashboard routes (optional)
    dashboardRoutes: [
        {
            method: "get",
            path: "/custom-path",
            handler: async (req, res) { ... }
        }
    ]
};
```

## Lifecycle

### 1. Bot Startup
```
1. Bot initializes
2. CogManager.init() is called
3. Scans src/cogs/ directory
4. Loads each cog/index.js
5. Calls cog.init() if present
6. Registers event handlers
7. Maps commands to cogs
```

### 2. Command Execution
```
1. User invokes /command
2. Bot finds command in CogManager.commandMap
3. Checks if owning cog is enabled for guild
4. If disabled: returns "Command Disabled" message
5. If enabled: executes command
```

### 3. Event Handling
```
1. Discord event occurs
2. Bot checks if cog is enabled for guild
3. If enabled: runs event handler
4. If disabled: skips handler
```

### 4. Cog Reloading
```
1. Admin runs /reload <cog>
2. CogManager.unload(cogId) - removes handlers
3. CogManager.load(cogPath) - reloads module
4. New event handlers registered
5. Command mappings updated
```

## Security & Permissions

### Dashboard Access Control
- **Authentication**: User must be logged in via Discord OAuth
- **Guild Membership**: User must be a member of the target guild
- **Permissions**: User must have "Manage Server" permission
- **CSRF Protection**: AJAX requests include proper headers

### Command Permissions
- Commands respect Discord's built-in permission system
- Cog-level permissions checked via `isEnabledForGuild()`
- Failed permission checks return ephemeral messages

## Creating a New Cog

### 1. Directory Structure
```
src/cogs/your-cog/
├── index.js          # Main cog file
├── commands/         # Additional command files (optional)
├── events/           # Additional event files (optional)
└── utils/            # Helper functions (optional)
```

### 2. Basic Template
```javascript
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    name: "Your Cog Name",
    id: "your-cog",
    description: "What your cog does",
    
    init: async function(client, { db, models }) {
        // Initialize your cog
        this.client = client;
        this.db = db;
    },
    
    commands: [
        {
            data: new SlashCommandBuilder()
                .setName("example")
                .setDescription("Example command"),
            
            async execute(interaction, context) {
                await interaction.reply("Hello from your cog!");
            }
        }
    ],
    
    events: [
        {
            name: "messageCreate",
            handler: async function(message, client, context) {
                if (message.author.bot) return;
                // Handle message
            }
        }
    ]
};
```

### 3. Adding Dashboard Integration
```javascript
dashboardRoutes: [
    {
        method: "get",
        path: "/your-cog",
        handler: async (req, res) => {
            res.render("dashboard/your-cog", {
                guildConfig: req.guildConfig,
                user: req.userInfos,
                translate: req.translate
            });
        }
    }
]
```

## Dashboard Management

### Cog Toggle Endpoints
- `GET /dashboard/:guildId/cogs` - View cog status
- `POST /dashboard/:guildId/cogs/toggle` - Enable/disable cogs

### Frontend Features
- Visual toggle buttons for each cog
- Real-time status updates
- Permission-based access control
- Responsive design with AJAX

## Migration & Deployment

### 1. Run Migration Script
```bash
node scripts/migrate-add-cogsEnabled.js
```

### 2. Update Bot Entry Point
Add CogManager initialization to `atlanta.js`:
```javascript
const CogManager = require("./src/core/CogManager");

// After client creation
client.cogManager = new CogManager(client, { db: mongoose.connection });
await client.cogManager.init();
```

### 3. Update Dashboard App
Register cogs routes in `dashboard/app.js`:
```javascript
const cogsRouter = require("./routes/cogs");
app.use("/dashboard", cogsRouter(app, { cogManager: client.cogManager }));
```

### 4. Environment Variables
```bash
MONGO_URI=mongodb://localhost/atlanta
DASHBOARD_PORT=3000
```

## Best Practices

### 1. Cog Design
- Keep cogs focused on a single responsibility
- Use descriptive names and descriptions
- Handle errors gracefully - don't crash the bot
- Use async/await for database operations

### 2. Event Handling
- Check if cog is enabled before processing events
- Use `context.client.cogManager.isEnabledForGuild()`
- Keep event handlers lightweight

### 3. Command Design
- Use SlashCommandBuilder for consistent UX
- Include proper permission requirements
- Provide helpful error messages
- Use ephemeral replies for admin commands

### 4. Database Operations
- Use the provided models from the context
- Handle database errors gracefully
- Use transactions for complex operations

## Troubleshooting

### Common Issues

1. **Cog Not Loading**
   - Check `index.js` exists in cog directory
   - Verify cog.id is set and unique
   - Check console for error messages

2. **Commands Not Working**
   - Verify cog is enabled for the guild
   - Check command registration in CogManager
   - Ensure proper Discord permissions

3. **Events Not Firing**
   - Verify cog is enabled for the guild
   - Check event handler registration
   - Ensure proper event names

4. **Dashboard Errors**
   - Check user permissions in guild
   - Verify OAuth authentication
   - Check database connectivity

### Debug Commands
- `/reload <cog>` - Reload a specific cog
- Check bot logs for CogManager messages
- Use dashboard to verify cog status

## Performance Considerations

### 1. Lazy Loading
- Cogs are loaded at startup but can be lazy-loaded
- Event handlers only run for enabled cogs
- Database queries cached where possible

### 2. Memory Management
- Unused cogs can be unloaded to save memory
- Event handler references properly cleaned up
- Module cache cleared on reload

### 3. Database Optimization
- Guild config cached in memory
- Batch operations for multiple guilds
- Indexes on frequently queried fields

## Future Enhancements

### 1. Advanced Features
- Cog dependencies and load order
- Conditional cog loading based on guild size
- Cog marketplace and auto-updates
- Performance metrics and monitoring

### 2. Developer Tools
- Cog development mode with auto-reload
- Built-in testing framework
- Cog validation and linting
- Documentation generator

### 3. Scaling
- Shard-aware cog management
- Redis-based cog configuration
- Webhook-based cog updates
- Cluster coordination

## Conclusion

The Cog system provides a robust foundation for building modular Discord bots. It enables:
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy addition of new features
- **Reliability**: Isolated failures don't crash the bot
- **Performance**: Efficient resource management
- **Developer Experience**: Simple, consistent patterns

By following the established patterns and best practices, developers can create powerful, maintainable Discord bot extensions that integrate seamlessly with the existing AtlantaBot infrastructure.
