import {session, Telegraf} from "telegraf";
import TelegramService from './services/telegram.service.js';
console.log("Env telegram token", process.env.BOT_TOKEN);
const bot = new Telegraf(process.env.BOT_TOKEN,
    {handlerTimeout: 1000}
);

bot.use(async (ctx, next) => {
		console.log("Context............", ctx);
		await TelegramService.getOrCreateSession(ctx);
		await TelegramService.getOrCreateChat(ctx);
		const messages = await TelegramService.getChatMessages(ctx);
		const textInput = await TelegramService.getTextMessage(ctx);
		console.log("Text input: ", textInput);
		return next();
    }
)


bot.launch();
bot.use(session());
bot.catch(async err => {
    console.error('Catchying......', err);
});
export default bot;
