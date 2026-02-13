/**
 * Telegram Command Management - Host Side IPC Handler
 *
 * Handles IPC requests from the container to manage Telegram bot commands.
 */
import path from 'path';
import fs from 'fs';
// Simple logger for this module
const logger = {
    info: (msg, ...args) => {
        console.log('[telegram-commands]', typeof msg === 'string' ? msg : JSON.stringify(msg), ...args);
    },
    error: (msg, ...args) => {
        console.error('[telegram-commands]', typeof msg === 'string' ? msg : JSON.stringify(msg), ...args);
    }
};
const RESULTS_DIR_NAME = 'telegram_command_results';
/**
 * Handle Telegram command management IPC requests
 * @returns true if handled, false if not recognized
 */
export async function handleTelegramCommandIpc(data, telegramBotToken, ipcDir) {
    const { type, requestId } = data;
    if (!type.startsWith('telegram_')) {
        return false;
    }
    const resultsDir = path.join(ipcDir, RESULTS_DIR_NAME);
    fs.mkdirSync(resultsDir, { recursive: true });
    const writeResult = (result) => {
        const resultPath = path.join(resultsDir, `${requestId}.json`);
        fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    };
    // Check if Telegram is configured
    if (!telegramBotToken) {
        writeResult({
            success: false,
            message: 'Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN in .env'
        });
        return true;
    }
    const baseUrl = `https://api.telegram.org/bot${telegramBotToken}`;
    try {
        switch (type) {
            case 'telegram_list_commands': {
                const response = await fetch(`${baseUrl}/getMyCommands`);
                const result = await response.json();
                if (!result.ok) {
                    writeResult({
                        success: false,
                        message: `Failed to list commands: ${result.description || 'Unknown error'}`
                    });
                    return true;
                }
                writeResult({
                    success: true,
                    message: 'Commands retrieved successfully',
                    data: result.result
                });
                logger.info('Listed Telegram bot commands');
                return true;
            }
            case 'telegram_set_commands': {
                const { commands } = data;
                if (!Array.isArray(commands)) {
                    writeResult({
                        success: false,
                        message: 'Invalid commands format. Expected array of {command, description} objects.'
                    });
                    return true;
                }
                const response = await fetch(`${baseUrl}/setMyCommands`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commands })
                });
                const result = await response.json();
                if (!result.ok) {
                    writeResult({
                        success: false,
                        message: `Failed to set commands: ${result.description || 'Unknown error'}`
                    });
                    return true;
                }
                const commandList = commands.map((c) => `/${c.command}`).join(', ');
                writeResult({
                    success: true,
                    message: `Successfully set ${commands.length} commands: ${commandList}`
                });
                logger.info({ count: commands.length }, 'Set Telegram bot commands');
                return true;
            }
            case 'telegram_add_command': {
                const { command, description } = data;
                // First, get existing commands
                const getResponse = await fetch(`${baseUrl}/getMyCommands`);
                const getResult = await getResponse.json();
                if (!getResult.ok) {
                    writeResult({
                        success: false,
                        message: `Failed to get existing commands: ${getResult.description || 'Unknown error'}`
                    });
                    return true;
                }
                const existingCommands = getResult.result || [];
                // Check if command already exists
                const commandIndex = existingCommands.findIndex(c => c.command === command);
                if (commandIndex >= 0) {
                    // Update existing command
                    existingCommands[commandIndex].description = description;
                }
                else {
                    // Add new command
                    existingCommands.push({ command, description });
                }
                // Set updated command list
                const setResponse = await fetch(`${baseUrl}/setMyCommands`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commands: existingCommands })
                });
                const setResult = await setResponse.json();
                if (!setResult.ok) {
                    writeResult({
                        success: false,
                        message: `Failed to add command: ${setResult.description || 'Unknown error'}`
                    });
                    return true;
                }
                writeResult({
                    success: true,
                    message: `Successfully added command: /${command}`
                });
                logger.info({ command }, 'Added Telegram bot command');
                return true;
            }
            case 'telegram_remove_command': {
                const { command } = data;
                // First, get existing commands
                const getResponse = await fetch(`${baseUrl}/getMyCommands`);
                const getResult = await getResponse.json();
                if (!getResult.ok) {
                    writeResult({
                        success: false,
                        message: `Failed to get existing commands: ${getResult.description || 'Unknown error'}`
                    });
                    return true;
                }
                const existingCommands = getResult.result || [];
                const filteredCommands = existingCommands.filter(c => c.command !== command);
                if (filteredCommands.length === existingCommands.length) {
                    writeResult({
                        success: false,
                        message: `Command /${command} not found in registered commands`
                    });
                    return true;
                }
                // Set updated command list
                const setResponse = await fetch(`${baseUrl}/setMyCommands`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commands: filteredCommands })
                });
                const setResult = await setResponse.json();
                if (!setResult.ok) {
                    writeResult({
                        success: false,
                        message: `Failed to remove command: ${setResult.description || 'Unknown error'}`
                    });
                    return true;
                }
                writeResult({
                    success: true,
                    message: `Successfully removed command: /${command}`
                });
                logger.info({ command }, 'Removed Telegram bot command');
                return true;
            }
            case 'telegram_clear_commands': {
                const response = await fetch(`${baseUrl}/setMyCommands`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commands: [] })
                });
                const result = await response.json();
                if (!result.ok) {
                    writeResult({
                        success: false,
                        message: `Failed to clear commands: ${result.description || 'Unknown error'}`
                    });
                    return true;
                }
                writeResult({
                    success: true,
                    message: 'Successfully cleared all Telegram bot commands'
                });
                logger.info('Cleared all Telegram bot commands');
                return true;
            }
            default:
                return false;
        }
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ type, err: errorMsg }, 'Error handling Telegram command IPC');
        writeResult({
            success: false,
            message: `Error: ${errorMsg}`
        });
        return true;
    }
}
//# sourceMappingURL=host.js.map