import {session, Telegraf} from "telegraf";
import TelegramService from './services/telegram.service.js';
const bot = new Telegraf(process.env.BOT_TOKEN, {handlerTimeout: 1000});

bot.use(async (ctx, next) => {
	try {
		await TelegramService.getOrCreateSession(ctx);
		await TelegramService.getOrCreateChat(ctx);
		const messages = await TelegramService.getChatMessages(ctx);
		const prompt = await TelegramService.getTextMessage(ctx);
		await TelegramService.saveMessage(ctx);
		const system =  await TelegramService.generateSystemPrompt(ctx);
	
	} catch (error) {
		console.error('Error in bot middleware:', error);
	}
	return next();
});

bot.launch();
bot.use(session());

bot.catch(async err => {
	console.error('Error caught by bot.catch:', err);
});

export default bot;
