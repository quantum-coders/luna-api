import {prisma} from "@thewebchimp/primate";
import ChatService from './chat.service.js';
import MessageService from './message.service.js';
import AiService from "./ai.service.js";
import axios from "axios";
import path from 'path';
import { fileURLToPath } from 'url';
import {writeFileSync, existsSync, mkdirSync} from 'fs';

const BOT_USER_ID = process.env.BOT_USER_ID;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class TelegramService {
	static async getOrCreateSession(ctx) {
		const key = `session:${ctx.chat.id}`;
		let sessionData = await prisma.session.findUnique({
			where: {
				key,
				type: 'telegram'
			},
		});
		if (!sessionData) {
			const userInfo = await TelegramService.getUserInfo(ctx);
			const idUser = await TelegramService.findUser(userInfo.id);
			sessionData = await prisma.session.create({
				data: {
					key,
					value: JSON.stringify({
						userInfo,
					}),
					type: 'telegram',
					idUser: idUser ? idUser.id : null
				},
			});
		}
		sessionData.value = JSON.parse(sessionData.value);
		return sessionData;
	}

	static async getUserInfo(ctx) {
		const idUser = ctx.from.id === BOT_USER_ID ? (ctx.update.callback_query ? ctx.update.callback_query.from.id : BOT_USER_ID) : ctx.from.id;
		return {
			id: idUser,
			username: ctx.from.id === BOT_USER_ID ? ctx.update.callback_query.from.username : ctx.from.username,
			firstName: ctx.from.id === BOT_USER_ID ? ctx.update.callback_query.from.first_name : ctx.from.first_name,
			lastName: ctx.from.id === BOT_USER_ID ? ctx.update.callback_query.from.last_name : ctx.from.last_name,
		};
	}

	static async findUser(idTelegram) {
		return prisma.linkedAccount.findUnique({
			where: {
				provider_idProvider: {
					provider: 'telegram',
					idProvider: String(idTelegram)
				}
			}
		});
	}

	static async getOrCreateChat(ctx) {
		const session = await TelegramService.getOrCreateSession(ctx)
		console.log("Session:", session)
		return await ChatService.getOrCreate({
			idExternal: session.value.userInfo.id,
			type: 'telegram',
			idUser: session.idUser
		})
	}

	static async getChatMessages(ctx) {
		const chat = await TelegramService.getOrCreateChat(ctx);
		console.log("Chat:", chat)
		return MessageService.getMessages({
			idChat: chat.id,
			limit: 8,
		})
	}

	static async getTextMessage(ctx) {
		if (ctx?.message?.text) {
			return ctx.message.text;
		} else {
			console.log("Checkpoint audio...")
			return await TelegramService.audioToText(ctx);
		}
	}

	static async audioToText(ctx) {
		try {
			console.log("Audio to text...")
			console.log("Voice message detected...");
			const fileId = ctx.message.voice.file_id;
			const file = await ctx.telegram.getFile(fileId);
			const filePath = file.file_path;
			const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
			console.log("File URL:", fileUrl);
			const response = await axios({
				method: 'GET',
				url: fileUrl,
				responseType: 'arraybuffer',
			});
			console.log("Response:", response);
			const fileBuffer = Buffer.from(response.data);
			// Save the OGG file to a temporary location
			console.log("fileBuffer...", fileBuffer);
			if (!existsSync(path.join(__dirname, 'temp'))) {
				console.log("Creating temp directory...");
				mkdirSync(path.join(__dirname, 'temp'));
			}
			console.log("Temp directory already exists", path.join(__dirname, 'temp'));
			const tempDir = path.join(__dirname, 'temp');
			if (!existsSync(tempDir)) {
				console.log("Creating temp directory...");
				mkdirSync(tempDir);
			} else {
				console.log("Temp directory already exists");
			}
			const oggFilePath = path.join(tempDir, `${fileId}.ogg`);
			console.log("OGG file path:", oggFilePath);
			writeFileSync(oggFilePath, fileBuffer);
			console.log(`OGG file saved: ${oggFilePath}`);

			return await AiService.audioToText(oggFilePath);
		}catch (e) {
			console.error(e);
			throw e;
		}
	}
}

export default TelegramService;
