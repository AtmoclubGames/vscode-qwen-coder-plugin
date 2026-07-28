"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tgBot = void 0;
exports.sendTelegramNotification = sendTelegramNotification;
exports.sendMAXNotification = sendMAXNotification;
exports.sendNotification = sendNotification;
const telegraf_1 = require("telegraf");
const axios_1 = __importDefault(require("axios"));
// Initialize Telegram Bot
const tgToken = process.env.TELEGRAM_BOT_TOKEN || '';
exports.tgBot = tgToken && tgToken !== 'YOUR_TELEGRAM_BOT_TOKEN' ? new telegraf_1.Telegraf(tgToken) : null;
// Initialize MAX Bot Configuration
const maxToken = process.env.MAX_BOT_TOKEN || '';
const maxApiUrl = process.env.MAX_API_URL || 'https://platform-api.max.ru';
/**
 * Sends a notification message to a Telegram user.
 */
async function sendTelegramNotification(userId, text) {
    if (!exports.tgBot) {
        console.warn('Telegram Bot is not initialized (missing token)');
        return false;
    }
    try {
        await exports.tgBot.telegram.sendMessage(userId, text);
        console.log(`Telegram notification sent to user ${userId}`);
        return true;
    }
    catch (error) {
        console.error(`Failed to send Telegram notification to ${userId}:`, error);
        return false;
    }
}
/**
 * Sends a notification message to a MAX messenger user.
 * According to MAX API documentation:
 * Endpoint: POST platform-api.max.ru/messages?user_id={user_id}
 * Headers: Authorization: {token}
 */
async function sendMAXNotification(userId, text) {
    if (!maxToken || maxToken === 'YOUR_MAX_BOT_TOKEN') {
        console.warn('MAX Bot token is not configured');
        return false;
    }
    try {
        const response = await axios_1.default.post(`${maxApiUrl}/messages`, { text }, {
            params: { user_id: userId },
            headers: {
                'Authorization': maxToken,
                'Content-Type': 'application/json',
            },
        });
        console.log(`MAX notification sent to user ${userId}, response code: ${response.status}`);
        return true;
    }
    catch (error) {
        console.error(`Failed to send MAX notification to ${userId}:`, error);
        return false;
    }
}
/**
 * Interface to unify notification sending based on the messenger type
 */
async function sendNotification(messenger, userId, text) {
    if (messenger === 'TELEGRAM') {
        return sendTelegramNotification(userId, text);
    }
    else if (messenger === 'MAX') {
        return sendMAXNotification(userId, text);
    }
    return false;
}
// Set up basic Telegram Bot command handlers
if (exports.tgBot) {
    exports.tgBot.start((ctx) => {
        // Extract payload from deep link, e.g., start=point_123
        const payload = ctx.startPayload || '';
        // In Telegram, a button can open the WebApp
        const miniappUrl = process.env.WEBHOOK_URL || 'https://yourdomain.com';
        const launchUrl = payload ? `${miniappUrl}#pointId=${payload}` : miniappUrl;
        ctx.reply('Привет! Добро пожаловать в сервис доставки еды «Домашняя кухня».\n\nСканируйте QR-код на пляже или нажмите на кнопку ниже, чтобы открыть меню и оформить заказ.', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Открыть Меню',
                            web_app: { url: launchUrl },
                        },
                    ],
                ],
            },
        });
    });
}
