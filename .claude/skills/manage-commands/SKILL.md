---
name: manage-commands
description: Manage Telegram bot slash commands. Add, remove, or list the / commands that appear in the Telegram chat interface. Use when user wants to configure available Telegram commands. Triggers on "commands", "slash commands", "/commands", "manage commands", "telegram commands".
---

# Telegram Command Management

Manage the slash commands that appear in your Telegram bot's command menu.

## Features

- **List commands** - View all currently registered Telegram bot commands
- **Set commands** - Update the bot's command list to match available skills
- **Add command** - Register a new command with description
- **Remove command** - Unregister a specific command
- **Clear commands** - Remove all registered commands

## Usage

When you add or remove skills, use this to update the Telegram bot's command menu so users can easily discover available functionality.

## Examples

```
List all Telegram commands

Update bot commands to match available skills

Add /weather command

Remove /oldcommand

Clear all commands
```

## Notes

- Commands are managed via Telegram's Bot API `setMyCommands` endpoint
- Commands appear when users type "/" in the Telegram chat
- Each command needs a name (without /) and description (max 256 chars)
- Main group only (Telegram bot token required)
