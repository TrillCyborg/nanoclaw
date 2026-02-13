/**
 * Telegram Command Management - MCP Tool Definitions (Agent/Container Side)
 *
 * These tools manage the Telegram bot's slash commands via IPC to the host.
 */

// @ts-ignore - SDK available in container environment only
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export interface SkillToolsContext {
  groupFolder: string;
  isMain: boolean;
}

const IPC_DIR = '/workspace/ipc';
const TASKS_DIR = path.join(IPC_DIR, 'tasks');
const RESULTS_DIR = path.join(IPC_DIR, 'telegram_command_results');

function writeIpcFile(dir: string, data: object): string {
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const filepath = path.join(dir, filename);
  const tempPath = `${filepath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filepath);
  return filename;
}

async function waitForResult(requestId: string, maxWait = 10000): Promise<{ success: boolean; message: string; data?: any }> {
  const resultFile = path.join(RESULTS_DIR, `${requestId}.json`);
  const pollInterval = 500;
  let elapsed = 0;

  while (elapsed < maxWait) {
    if (fs.existsSync(resultFile)) {
      try {
        const result = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
        fs.unlinkSync(resultFile);
        return result;
      } catch (err) {
        return { success: false, message: `Failed to read result: ${err}` };
      }
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;
  }

  return { success: false, message: 'Request timed out' };
}

/**
 * Create Telegram command management MCP tools
 */
export function createTelegramCommandTools(ctx: SkillToolsContext) {
  const { groupFolder, isMain } = ctx;

  return [
    tool(
      'telegram_list_commands',
      `List all currently registered Telegram bot commands.

Shows the commands that appear when users type "/" in the Telegram chat.`,
      {},
      async () => {
        if (!isMain) {
          return {
            content: [{ type: 'text', text: 'Only the main group can manage Telegram commands.' }],
            isError: true
          };
        }

        const requestId = `tg-list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        writeIpcFile(TASKS_DIR, {
          type: 'telegram_list_commands',
          requestId,
          groupFolder,
          timestamp: new Date().toISOString()
        });

        const result = await waitForResult(requestId);
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.message }],
            isError: true
          };
        }

        const commands = result.data || [];
        if (commands.length === 0) {
          return {
            content: [{ type: 'text', text: 'No Telegram commands currently registered.' }]
          };
        }

        const commandList = commands.map((cmd: any) => `/${cmd.command} - ${cmd.description}`).join('\n');
        return {
          content: [{ type: 'text', text: `Registered Telegram commands:\n\n${commandList}` }]
        };
      }
    ),

    tool(
      'telegram_set_commands',
      `Set the complete list of Telegram bot commands.

Replaces all existing commands with the provided list. Each command needs a name (without /) and description (max 256 chars).`,
      {
        commands: z.array(z.object({
          command: z.string().describe('Command name without "/" (e.g., "start", "help")'),
          description: z.string().max(256).describe('Command description (max 256 chars)')
        })).describe('Array of commands to register')
      },
      async (args: { commands: Array<{ command: string; description: string }> }) => {
        if (!isMain) {
          return {
            content: [{ type: 'text', text: 'Only the main group can manage Telegram commands.' }],
            isError: true
          };
        }

        const requestId = `tg-set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        writeIpcFile(TASKS_DIR, {
          type: 'telegram_set_commands',
          requestId,
          commands: args.commands,
          groupFolder,
          timestamp: new Date().toISOString()
        });

        const result = await waitForResult(requestId);
        return {
          content: [{ type: 'text', text: result.message }],
          isError: !result.success
        };
      }
    ),

    tool(
      'telegram_add_command',
      `Add a single command to the Telegram bot.

Adds a new command without removing existing ones.`,
      {
        command: z.string().describe('Command name without "/" (e.g., "weather", "help")'),
        description: z.string().max(256).describe('Command description (max 256 chars)')
      },
      async (args: { command: string; description: string }) => {
        if (!isMain) {
          return {
            content: [{ type: 'text', text: 'Only the main group can manage Telegram commands.' }],
            isError: true
          };
        }

        const requestId = `tg-add-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        writeIpcFile(TASKS_DIR, {
          type: 'telegram_add_command',
          requestId,
          command: args.command,
          description: args.description,
          groupFolder,
          timestamp: new Date().toISOString()
        });

        const result = await waitForResult(requestId);
        return {
          content: [{ type: 'text', text: result.message }],
          isError: !result.success
        };
      }
    ),

    tool(
      'telegram_remove_command',
      `Remove a specific command from the Telegram bot.

Removes the command while keeping all others.`,
      {
        command: z.string().describe('Command name to remove (without "/")')
      },
      async (args: { command: string }) => {
        if (!isMain) {
          return {
            content: [{ type: 'text', text: 'Only the main group can manage Telegram commands.' }],
            isError: true
          };
        }

        const requestId = `tg-remove-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        writeIpcFile(TASKS_DIR, {
          type: 'telegram_remove_command',
          requestId,
          command: args.command,
          groupFolder,
          timestamp: new Date().toISOString()
        });

        const result = await waitForResult(requestId);
        return {
          content: [{ type: 'text', text: result.message }],
          isError: !result.success
        };
      }
    ),

    tool(
      'telegram_clear_commands',
      `Remove all Telegram bot commands.

Clears the entire command list. Users will no longer see any "/" suggestions.`,
      {},
      async () => {
        if (!isMain) {
          return {
            content: [{ type: 'text', text: 'Only the main group can manage Telegram commands.' }],
            isError: true
          };
        }

        const requestId = `tg-clear-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        writeIpcFile(TASKS_DIR, {
          type: 'telegram_clear_commands',
          requestId,
          groupFolder,
          timestamp: new Date().toISOString()
        });

        const result = await waitForResult(requestId);
        return {
          content: [{ type: 'text', text: result.message }],
          isError: !result.success
        };
      }
    )
  ];
}
