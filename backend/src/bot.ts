import { Telegraf } from 'telegraf';
import axios from 'axios';

// Initialize Telegram Bot
const tgToken = process.env.TELEGRAM_BOT_TOKEN || '';
export const tgBot = tgToken && tgToken !== 'YOUR_TELEGRAM_BOT_TOKEN' ? new Telegraf(tgToken) : null;

// Initialize MAX Bot Configuration
const maxToken = process.env.MAX_BOT_TOKEN || '';
const maxApiUrl = process.env.MAX_API_URL || 'https://platform-api.max.ru';

/**
 * Sends a notification message to a Telegram user.
 */
export async function sendTelegramNotification(userId: string, text: string): Promise<boolean> {
  if (!tgBot) {
    console.warn('Telegram Bot is not initialized (missing token)');
    return false;
  }
  try {
    await tgBot.telegram.sendMessage(userId, text);
    console.log(`Telegram notification sent to user ${userId}`);
    return true;
  } catch (error) {
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
export async function sendMAXNotification(userId: string, text: string): Promise<boolean> {
  if (!maxToken || maxToken === 'YOUR_MAX_BOT_TOKEN') {
    console.warn('MAX Bot token is not configured');
    return false;
  }
  try {
    const response = await axios.post(
      `${maxApiUrl}/messages`,
      { text },
      {
        params: { user_id: userId },
        headers: {
          'Authorization': maxToken,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`MAX notification sent to user ${userId}, response code: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`Failed to send MAX notification to ${userId}:`, error);
    return false;
  }
}

/**
 * Interface to unify notification sending based on the messenger type
 */
export async function sendNotification(
  messenger: 'TELEGRAM' | 'MAX',
  userId: string,
  text: string
): Promise<boolean> {
  if (messenger === 'TELEGRAM') {
    return sendTelegramNotification(userId, text);
  } else if (messenger === 'MAX') {
    return sendMAXNotification(userId, text);
  }
  return false;
}

// Set up basic Telegram Bot command handlers
if (tgBot) {
  tgBot.start((ctx) => {
    // Extract payload from deep link, e.g., start=point_123
    const payload = ctx.startPayload || '';
    
    // In Telegram, a button can open the WebApp
    const miniappUrl = process.env.WEBHOOK_URL || 'https://yourdomain.com';
    const launchUrl = payload ? `${miniappUrl}#pointId=${payload}` : miniappUrl;

    ctx.reply(
      'Привет! Добро пожаловать в сервис доставки еды «Домашняя кухня».\n\nСканируйте QR-код на пляже или нажмите на кнопку ниже, чтобы открыть меню и оформить заказ.',
      {
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
      }
    );
  });
}
