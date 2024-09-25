/**
 * Main Telegram bot setup and middleware handling.
 * Initializes the bot, sets up middleware for handling messages,
 * and starts the bot.
 */

import { session, Telegraf } from 'telegraf';
import TelegramService from './services/telegram.service.js';

/**
 * Initialize the Telegraf bot with the provided token and options.
 */
const bot = new Telegraf(process.env.BOT_TOKEN, { handlerTimeout: 1000 });

/**
 * Middleware to handle incoming messages.
 * Retrieves or creates user sessions and chats, saves messages,
 * retrieves AI responses, saves AI messages, and replies to the user.
 *
 * @param {Object} ctx - The Telegraf context object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>}
 */
bot.use(async (ctx, next) => {
  try {
    // Manage user session and chat
    await TelegramService.getOrCreateSession(ctx);
    await TelegramService.getOrCreateChat(ctx);

    // Save incoming user message
    await TelegramService.saveMessage(ctx);

    // Retrieve AI response
    const response = await TelegramService.retrieveAnswer(ctx);
    const aiMessage = response.aiResponse.data.choices[0].message.content;

    // Save AI message and reply to the user
    await TelegramService.saveAiMessage(ctx, aiMessage);
    await ctx.reply(aiMessage);
  } catch (error) {
    console.error('Error in bot middleware:', error);
  }
  return next();
});

/**
 * Launches the bot and sets up session middleware.
 */
bot.launch();
bot.use(session());

/**
 * Global error handler for the bot.
 * Logs any errors caught during bot execution.
 *
 * @param {Error} err - The error object.
 */
bot.catch(async (err) => {
  console.error('Error caught by bot.catch:', err);
});

export default bot;
