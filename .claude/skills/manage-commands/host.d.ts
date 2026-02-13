/**
 * Telegram Command Management - Host Side IPC Handler
 *
 * Handles IPC requests from the container to manage Telegram bot commands.
 */
/**
 * Handle Telegram command management IPC requests
 * @returns true if handled, false if not recognized
 */
export declare function handleTelegramCommandIpc(data: any, telegramBotToken: string | null, ipcDir: string): Promise<boolean>;
//# sourceMappingURL=host.d.ts.map