# AtlantaBot Cog System

## Overview

The Cog system transforms AtlantaBot into a modular, plugin-based architecture where extensions are called "Cogs". Each cog is self-contained and can include commands, event handlers, and dashboard integration.

## Quick Start

### 1. Run the Migration

First, run the migration script to add the `cogsEnabled` field to existing guilds:

```bash
node scripts/migrate-add-cogsEnabled.js
```

### 2. Start the Bot

The bot will automatically:
- Load all cogs from `src/cogs/`
- Register slash commands and event handlers
- Initialize the CogManager

```bash
npm start
```

### 3. Use the Dashboard

Navigate to `/dashboard/:guildId/cogs` to:
- View all available cogs
- Enable/disable cogs for your server
- See cog descriptions and status

## Available Commands

### `/help`
Interactive help menu that shows:
- List of enabled cogs for your server
- Commands available in each cog
- Navigate between cogs with select menu

### `/reload <cog>`
Admin command to reload a cog without restarting:
- Updates code changes immediately
- Preserves bot uptime
- Requires "Manage Server" permission

## Example Cogs

### Moderation Cog
- `/kick` - Kick members from server
- `/ban` - Ban members from server
- Event logging for member actions

### Music Cog
- `/play` - Play music (placeholder)
- `/skip` - Skip current track (placeholder)
- Voice channel event handling

### Economy Cog
- `/balance` - Check user balance
- `/daily` - Collect daily reward
- Message-based currency earning

## Creating Your Own Cog

### 1. Create Directory Structure
```
src/cogs/your-cog/
└── index.js
```

### 2. Basic Template
```javascript
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    name: "Your Cog Name",
    id: "your-cog",
    description: "What your cog does",
    
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

### 3. Advanced Features
- **Initialization**: Use `init()` function for setup
- **Dashboard Routes**: Add web interface for your cog
- **Database Models**: Access to Guild, User, and Member models
- **Error Handling**: Graceful failure handling

## How It Works

### Command Execution Flow
1. User runs `/command`
2. Bot finds command owner (cog)
3. Checks if cog is enabled for guild
4. If enabled: executes command
5. If disabled: shows "Command Disabled" message

### Event Handling
- Events only run for enabled cogs
- Automatic registration/unregistration
- Guild-specific filtering

### Hot Reloading
- `/reload <cog>` updates code immediately
- No bot restart required
- Preserves all bot state

## Dashboard Management

### Access Control
- **Authentication**: Discord OAuth required
- **Permissions**: "Manage Server" permission needed
- **Security**: CSRF protection and validation

### Features
- Visual toggle buttons for each cog
- Real-time status updates
- Permission-based access
- Responsive design

## Configuration

### Environment Variables
```bash
MONGO_URI=mongodb://localhost/atlanta
DASHBOARD_PORT=3000
```

### Default Cogs
The following cogs are enabled by default:
- `moderation` - Server moderation tools
- `music` - Music playback system
- `economy` - Virtual currency system
- `general` - General utility commands
- `fun` - Entertainment commands
- `images` - Image manipulation
- `administration` - Server administration

## Troubleshooting

### Common Issues

**Cog Not Loading**
- Check `index.js` exists in cog directory
- Verify `cog.id` is set and unique
- Check console for error messages

**Commands Not Working**
- Verify cog is enabled for the guild
- Check command registration
- Ensure proper Discord permissions

**Dashboard Errors**
- Check user permissions in guild
- Verify OAuth authentication
- Check database connectivity

### Debug Commands
- `/reload <cog>` - Reload specific cog
- Check bot logs for CogManager messages
- Use dashboard to verify cog status

## Architecture

### Core Components
- **CogManager**: Central orchestrator for all cogs
- **GuildConfig**: Extended guild model with cog settings
- **Cog Interface**: Standardized cog structure
- **Dashboard Integration**: Web-based cog management

### Benefits
- **Modularity**: Each cog is self-contained
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new features
- **Reliability**: Isolated failures don't crash bot
- **Performance**: Efficient resource management

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify cog configuration and permissions
3. Use `/reload <cog>` to refresh cog code
4. Check dashboard for cog status

## Development

### Testing
Run the test suite:
```bash
npm test
```

### Adding New Cogs
1. Create cog directory in `src/cogs/`
2. Follow the template structure
3. Test with `/reload <cog>`
4. Enable via dashboard

### Contributing
- Follow existing cog patterns
- Include proper error handling
- Add documentation for complex features
- Test thoroughly before submitting

---

The Cog system makes AtlantaBot more powerful, maintainable, and extensible. Each cog adds specific functionality while maintaining the overall bot stability and performance.
