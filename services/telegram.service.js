import { prisma } from '@thewebchimp/primate';
import ChatService from './chat.service.js';
import MessageService from './message.service.js';
import AiService from './ai.service.js';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import PromptService from './prompt.service.js';
import RIMService from './rim.service.js';

const BOT_USER_ID = process.env.BOT_USER_ID;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TelegramService {
	/**
	 * Retrieves or creates a session for the given chat context.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<Object>} The session data.
	 * @throws Will throw an error if session retrieval or creation fails.
	 */
	static async getOrCreateSession(ctx) {
		try {
			const key = `session:${ ctx.chat.id }`;
			let sessionData = await prisma.session.findUnique({
				where: { key, type: 'telegram' },
			});

			if(!sessionData) {
				const userInfo = await TelegramService.getUserInfo(ctx);
				const idUser = await TelegramService.findUser(userInfo.id);

				sessionData = await prisma.session.create({
					data: {
						key,
						value: JSON.stringify({ userInfo }),
						type: 'telegram',
						idUser: idUser ? idUser.id : null,
					},
				});
			}

			sessionData.value = JSON.parse(sessionData.value);
			return sessionData;
		} catch(error) {
			console.error('Error getting or creating session:', error);
			throw error;
		}
	}

	/**
	 * Extracts user information from the context.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<Object>} An object containing user information.
	 * @throws Will throw an error if user information retrieval fails.
	 */
	static async getUserInfo(ctx) {
		try {
			const idUser = ctx.from.id === BOT_USER_ID
				? (ctx.update.callback_query ? ctx.update.callback_query.from.id : BOT_USER_ID)
				: ctx.from.id;

			return {
				id: idUser,
				username: ctx.from.id === BOT_USER_ID ? ctx.update.callback_query.from.username : ctx.from.username,
				firstName: ctx.from.id === BOT_USER_ID ? ctx.update.callback_query.from.first_name : ctx.from.first_name,
				lastName: ctx.from.id === BOT_USER_ID ? ctx.update.callback_query.from.last_name : ctx.from.last_name,
			};
		} catch(error) {
			console.error('Error getting user info:', error);
			throw error;
		}
	}

	/**
	 * Finds a user in the database by their Telegram ID.
	 * @param {string} idTelegram - The Telegram ID of the user.
	 * @returns {Promise<Object|null>} The user data if found, otherwise null.
	 * @throws Will throw an error if user search fails.
	 */
	static async findUser(idTelegram) {
		try {
			return await prisma.linkedAccount.findUnique({
				where: {
					provider_idProvider: {
						provider: 'telegram',
						idProvider: String(idTelegram),
					},
				},
			});
		} catch(error) {
			console.error('Error finding user:', error);
			throw error;
		}
	}

	/**
	 * Retrieves or creates a chat based on the context.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<Object>} The chat data.
	 * @throws Will throw an error if chat retrieval or creation fails.
	 */
	static async getOrCreateChat(ctx) {
		try {
			const session = await TelegramService.getOrCreateSession(ctx);
			return await ChatService.getOrCreate({
				idExternal: session.value.userInfo.id,
				type: 'telegram',
				idUser: session.idUser,
			});
		} catch(error) {
			console.error('Error getting or creating chat:', error);
			throw error;
		}
	}

	/**
	 * Retrieves the last few messages from a chat.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<Array>} An array of messages.
	 * @throws Will throw an error if message retrieval fails.
	 */
	static async getChatMessages(ctx) {
		try {
			const chat = await TelegramService.getOrCreateChat(ctx);
			const messages = await MessageService.getMessages({
				idChat: chat.id,
				limit: 8,
			});
			return messages.map(message => {
				return {
					role: message.role,
					content: message.content,
				};
			});
		} catch(error) {
			console.error('Error getting chat messages:', error);
			throw error;
		}
	}

	/**
	 * Retrieves the text message from the context, or converts audio to text.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<string>} The text message.
	 * @throws Will throw an error if message retrieval or conversion fails.
	 */
	static async getTextMessage(ctx) {
		try {
			if(ctx?.message?.text) {
				return ctx.message.text;
			} else {
				return await TelegramService.audioToText(ctx);
			}
		} catch(error) {
			console.error('Error getting text message:', error);
			throw error;
		}
	}

	/**
	 * Converts an audio message to text using an AI service.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<string>} The converted text message.
	 * @throws Will throw an error if audio conversion fails.
	 */
	static async audioToText(ctx) {
		try {
			const fileId = ctx.message.voice.file_id;
			const file = await ctx.telegram.getFile(fileId);
			const filePath = file.file_path;
			const fileUrl = `https://api.telegram.org/file/bot${ process.env.BOT_TOKEN }/${ filePath }`;
			const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });

			const fileBuffer = Buffer.from(response.data);
			const tempDir = path.join(__dirname, './../temp');
			if(!existsSync(tempDir)) {
				mkdirSync(tempDir);
			}

			const oggFilePath = path.join(tempDir, `${ fileId }.ogg`);
			writeFileSync(oggFilePath, fileBuffer);

			return await AiService.audioToText(oggFilePath);
		} catch(error) {
			console.error('Error converting audio to text:', error);
			throw error;
		}
	}

	/**
	 * Saves a message to the chat.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<Object>} The saved message data.
	 * @throws Will throw an error if message saving fails.
	 */
	static async saveMessage(ctx) {
		try {
			const chat = await TelegramService.getOrCreateChat(ctx);
			const text = await TelegramService.getTextMessage(ctx);
			const session = await TelegramService.getOrCreateSession(ctx);
			const user = await TelegramService.findUser(session.value.userInfo.id);

			return ChatService.saveMessage({
				idChat: chat.id,
				idUser: user?.idUser,
				content: text,
			});
		} catch(error) {
			console.error('Error saving message:', error);
			throw error;
		}
	}

	/**
	 * Saves an AI-generated message to the chat.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @param {string} message - The message generated by the AI.
	 * @returns {Promise<Object>} The saved AI message data.
	 * @throws Will throw an error if message saving fails.
	 */
	static async saveAiMessage(ctx, message) {
		try {
			const chat = await TelegramService.getOrCreateChat(ctx);
			const session = await TelegramService.getOrCreateSession(ctx);
			const user = await TelegramService.findUser(session.value.userInfo.id);

			// Get latest message of the conversation
			const latestMessage = await MessageService.getLatestUserMessage({
				idChat: chat.id,
			});

			return ChatService.saveMessage({
				idChat: chat.id,
				idUser: user?.idUser,
				content: message,
				role: 'assistant',
				responseTo: latestMessage.id,
			});
		} catch(e) {
			console.error('Error saving AI message:', e);
			throw e;
		}
	}

	/**
	 * Generates the system prompt based on the user's session data.
	 *
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<string>} The generated system prompt.
	 * @throws Will throw an error if session retrieval fails or required data is missing.
	 */
	static async generateSystemPrompt(ctx) {
		try {
			// Retrieve the user session asynchronously
			const session = await TelegramService.getOrCreateSession(ctx);

			// Validate session data
			if(!session || !session.value || !session.value.userInfo) {
				throw new Error('Invalid session data.');
			}

			const { firstName, username, id } = session.value.userInfo;

			// Ensure required fields are present
			if(!firstName || !username || !id) {
				console.log('Session:', session);
				throw new Error(`Missing field: ${ !firstName ? 'firstName' : !username ? 'username' : 'idUser' }`);
			}

			// Extract the prompt from the context
			const prompt = ctx.message && ctx.message.text ? ctx.message.text : '';
			if(typeof prompt !== 'string') {
				throw new Error('Invalid prompt in context.');
			}
			let promptKey = 'mainPrompt';

			if(prompt === '/start') {
				promptKey = 'startMainIntro';
			}

			const promptData = {
				firstname: firstName,
				username: username,
				idUser: id,
				prompt: prompt,
			};

			return PromptService.handleSystemPrompt(promptData, promptKey);
		} catch(error) {
			console.error('Error in generateSystemPrompt:', error);
			throw error; // Rethrow the error after logging
		}
	}

	/**
	 * Generates a response using an AI service based on the provided data.
	 * @param {Object} data - The data required to generate the response.
	 * @param {string} data.model - The AI model to use.
	 * @param {string} data.system - The system prompt for the AI.
	 * @param {string} data.prompt - The user prompt for the AI.
	 * @param {Array} data.history - The chat history.
	 * @returns {Promise<string>} The generated response from the AI.
	 * @throws Will throw an error if the AI service fails to generate a response.
	 */
	static async generateResponse(data) {
		try {
			const response = await AiService.sendMessage(
				{
					model: data.model,
					system: data.system,
					prompt: data.prompt,
					stream: false,
					history: data.history,
				}, 'openai',
			);

			if(response.data.choices) {
				return response.data.choices[0].message.content;
			} else {
				throw new Error('No response from AI');
			}

		} catch(error) {
			console.error('Error saving message:', error);
			throw error;
		}
	}

	/**
	 * Retrieves an answer from the AI based on the chat context.
	 * @param {Object} ctx - The context object provided by Telegraf.
	 * @returns {Promise<string>} The generated answer from the AI.
	 * @throws Will throw an error if prompt retrieval or message retrieval fails.
	 */
	static async retrieveAnswer(ctx) {
		try {
			const prompt = await TelegramService.getTextMessage(ctx);
			if(!prompt) {
				throw new Error('No prompt provided');
			}
			const messages = await TelegramService.getChatMessages(ctx);
			if(!messages) {
				throw new Error('No messages provided');
			}

			const data = {
				model: 'gpt-4',
				prompt,
				messages,
				stream: false,
			};

			return RIMService.messageToRIM(data);
		} catch(error) {
			console.error('Error retrieving answer:', error);
			throw error;
		}
	}
}

export default TelegramService;
