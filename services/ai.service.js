import 'dotenv/config';
import {v4 as uuidv4} from 'uuid';
import fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';
import {promptTokensEstimate} from 'openai-chat-tokens';
import {groqModels, openAIModels, perplexityModels} from '../assets/data/ai-models.js';
import AttachmentService from '../entities/attachments/attachment.service.js';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

class AIService {

	/**
	 * Sends a message to the AI model and streams the response back to the client.
	 *
	 * @param {Object} data - The data to send to the AI model.
	 * @param {string} provider - The provider of the AI model.
	 * @returns {Promise<Object>} - A promise that resolves to the response from the AI model.
	 * @throws {Error} - Throws an error if there is an issue with the request or the response.
	 */
	static async sendMessage(data, provider) {
		let {
			model,
			system = '',
			prompt,
			stream = false,
			history = [],
			temperature = 0.5,
			max_tokens,
			top_p = 1,
			frequency_penalty = 0.0001,
			presence_penalty = 0,
			stop = '',
			tools = [],
			toolChoice,
		} = data;

		if (!model || !prompt) {
			throw new Error('Missing required fields: ' + (!model ? 'model' : 'prompt'));
		}

		try {
			const modelInfo = this.solveModelInfo(model);
			provider = modelInfo.provider;
			const contextWindow = modelInfo.contextWindow;
			console.warn("System:", system);
			console.warn("History:", history);
			console.warn("Prompt:", prompt);
			console.warn("Context Window:", contextWindow);
			let reservedTokens = tools.length > 0 ? 377 : 0;
			const adjustedContent = this.adjustContent(system, history, prompt, contextWindow, reservedTokens);
			system = adjustedContent.system;
			history = adjustedContent.history;
			prompt = adjustedContent.prompt;

			const messages = [
				{role: 'system', content: system},
				...history,
				{role: 'user', content: prompt},
			];

			let maxTokensCalculation = contextWindow - this.estimateTokens(messages) - reservedTokens;

			const requestData = {
				model,
				messages,
				temperature,
				max_tokens: max_tokens || maxTokensCalculation,
				top_p,
				frequency_penalty,
				presence_penalty,
				stream,
			};

			if (tools  && provider === 'openai' && !stream) {
				requestData.tools = tools;
				requestData.tool_choice = toolChoice;
			}

			if (stop) requestData.stop = stop;

			const url = this.solveProviderUrl(provider);
			const headers = {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${modelInfo.authToken}`,
			};

			const axiosConfig = {headers};
			if (stream) axiosConfig.responseType = 'stream';
			return await axios.post(url, requestData, axiosConfig);
		} catch (error) {
			console.error('Error:', error);
			throw new Error('Error processing the request: ' + error.message);
		}
	}

	/**
	 * Retrieves model information including the provider and maximum tokens.
	 *
	 * @param {string} model - The name of the model.
	 * @returns {Object} - An object containing the provider and maximum tokens for the model.
	 * @throws {Error} - Throws an error if the model is not recognized.
	 */
	static solveModelInfo(model) {
		const allModels = [...openAIModels, ...perplexityModels, ...groqModels];
		const modelInfo = allModels.find(m => m.name === model);

		if (!modelInfo) {
			throw new Error(`Model info not found for ${model}`);
		}

		let provider, authToken;

		if (openAIModels.some(m => m.name === model)) {
			provider = 'openai';
			authToken = process.env.OPENAI_API_KEY;
		} else if (perplexityModels.some(m => m.name === model)) {
			provider = 'perplexity';
			authToken = process.env.PERPLEXITY_API_KEY;
		} else if (groqModels.some(m => m.name === model)) {
			provider = 'groq';
			authToken = process.env.GROQ_API_KEY;
		} else {
			throw new Error(`Provider not found for model: ${model}`);
		}

		if (!authToken) {
			throw new Error(`Auth token not found for provider: ${provider}`);
		}

		// Use the contextWindow from the modelInfo, or set a default if not specified
		const contextWindow = modelInfo.contextWindow || 4096;  // Default to 4096 if not specified

		return {
			...modelInfo,
			provider,
			authToken,
			contextWindow
		};
	}

	/**
	 * Solves the provider URL based on the given provider name.
	 *
	 * @param {string} provider - The name of the provider (e.g., 'openai', 'perplexity', 'groq').
	 * @returns {string} - The URL corresponding to the given provider.
	 * @throws {Error} - Throws an error if the provider is not recognized.
	 */
	static solveProviderUrl(provider) {
		let url;

		// return url based on provider
		if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
		if (provider === 'perplexity') url = 'https://api.perplexity.ai/chat/completions';
		if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';

		return url;
	}

	/**
	 * Adjusts the history and system message for the AI model.
	 *
	 * @param {string} system - The system message to be used.
	 * @param {Array<Object>} history - The conversation history.
	 * @param {string} prompt - The user prompt.
	 * @param contextWindow
	 * @param reservedTokens
	 * @returns {Object} - An object containing the adjusted system message and history.
	 * @throws {Error} - Throws an error if there is an issue with the adjustment.
	 */
	static adjustContent(system, history, prompt, contextWindow, reservedTokens = 100) {
		const targetTokens = contextWindow - reservedTokens;
		let currentTokens = this.estimateTokens([
			{role: 'system', content: system},
			...history,
			{role: 'user', content: prompt}
		]);

		while (currentTokens > targetTokens) {
			if (history.length > 1) {
				// Remove the oldest message from history
				history.shift();
			} else if (system.length > 50) {
				// Trim the system message
				system = system.slice(0, -50);
			} else if (prompt.length > 50) {
				// Trim the prompt as a last resort
				prompt = prompt.slice(0, -50);
			} else {
				break; // Can't reduce further
			}

			currentTokens = this.estimateTokens([
				{role: 'system', content: system},
				...history,
				{role: 'user', content: prompt}
			]);

		}

		return {system, history, prompt};
	}

	static estimateTokens(messages) {
		return promptTokensEstimate({messages});
	}

	/**
	 * Converts text to audio using OpenAI's text-to-speech model.
	 *
	 * @param {string} text - The text to convert to audio.
	 * @param {string} [voice='nova'] - The voice to use for the audio.
	 * @returns {Promise<string>} - A promise that resolves to the URL of the generated audio.
	 * @throws {Error} - Throws an error if there is an issue with the request or the response.
	 */
	static async textToAudio(text, voice = 'nova') {
		try {

			const audio = await openai.audio.speech.create({
				model: 'tts-1',
				voice,
				input: text,
			});

			const arrayBuffer = await audio.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const file = {
				buffer: buffer,
				originalname: uuidv4() + '.mp3',
				mimeType: 'audio/mpeg',
				size: buffer.length,
			};


			// upload to CDN
			return await AttachmentService.createAttachment(file, {
				acl: 'public-read',
				mimeType: 'audio/mpeg',
				extension: 'mp3',
			});
		} catch (e) {
			console.error('Error generating image:', e);
			throw new Error('Error generating image: ' + e.message);
		}

	}

	/**
	 * Converts audio to text using OpenAI's Whisper model.
	 *
	 * @param {string} filePath - The path to the audio file.
	 * @param {boolean} [deleteFile=true] - Whether to delete the file after transcription.
	 * @returns {Promise<string>} - A promise that resolves to the transcribed text.
	 * @throws {Error} - Throws an error if no file path is provided, if the file does not exist, or if there is an issue with the transcription.
	 */
	static async audioToText(filePath, deleteFile = true) {
		try {
			if (!filePath) throw new Error('No file path provided');
			// check that file exists
			if (!fs.existsSync(filePath)) throw new Error('File does not exist');

			const transcription = await openai.audio.transcriptions.create({
				file: fs.createReadStream(filePath),
				model: 'whisper-1',
			});

			if (deleteFile) {
				fs.unlinkSync(filePath);
			}

			if (!transcription.text) throw new Error('No transcription generated');

			return transcription.text;

		} catch (error) {
			console.error('Error making request to OpenAI:', error);
			throw new Error('Error making request to OpenAI: ' + error.message);
		}
	}

	/**
	 * Generates an AI image based on the provided prompt.
	 *
	 * @param {string} prompt - The prompt to generate the image.
	 * @param {boolean} [saveToCDN=true] - Whether to save the generated image to a CDN.
	 * @returns {Promise<string>} - A promise that resolves to the URL of the generated image.
	 * @throws {Error} - Throws an error if no prompt is provided or if there is an issue generating the image.
	 */
	static async createImage(prompt, saveToCDN = true) {

		// if no prompt is provided
		if (!prompt) throw new Error('No prompt provided');

		try {
			const response = await openai.images.generate({
				model: 'dall-e-3',
				prompt,
				n: 1,
				size: '1024x1024',
			});

			const aiUrl = response.data[0].url;

			// check that response.data[0].url is not empty
			if (!aiUrl) throw new Error('No image url generated');

			if (saveToCDN) {
				// get fileBuffer from url with fetch
				const image = await fetch(aiUrl);
				if (!image.ok) throw new Error('Error fetching image');

				const arrayBuffer = await image.arrayBuffer();
				const buffer = Buffer.from(new Uint8Array(arrayBuffer));

				const file = {
					buffer: buffer,
					originalname: uuidv4() + '.png',
					mimeType: 'image/png',
					size: buffer.length,
				};

				// upload to CDN
				const attachment = await AttachmentService.createAttachment(file, {
					acl: 'public-read',
					mimeType: 'image/png',
					extension: 'png',
				});

				return attachment.data.Location;
			}

			return aiUrl;
		} catch (e) {
			console.error('Error generating image:', e);
			throw new Error('Error generating image: ' + e.message);
		}
	}

	/**
	 * Determines the best action to perform based on the provided data.
	 *
	 * @param {Object} data - The data containing the prompt and messages.
	 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of functions with their arguments.
	 * @throws {Error} - Throws an error if there is an issue processing the request.
	 */
	static async solveAction(data = {}) {

		const tools = [
			{
				type: 'function',
				function: {
					name: 'generateImage',
					description: 'Generates an image based on the provided prompt.',
					parameters: {
						type: 'object',
						properties: {
							prompt: {
								type: 'string',
								description: 'The prompt to generate the image.',
							},
						},
					},
				},
			},
			// youtube video embed
			{
				type: 'function',
				function: {
					name: 'searchYoutubeVideo',
					description: 'search for a video based on the prompt.',
					parameters: {
						type: 'object',
						properties: {
							prompt: {
								type: 'string',
								description: 'The prompt to search the video in a search query style for youtube search.',
							},
						},
					},
				},
			},
			// memo
			{
				type: 'function',
				function: {
					name: 'addMemo',
					description: 'Adds a memo to the blockchain.',
					parameters: {
						type: 'object',
						properties: {
							message: {
								type: 'string',
								description: 'The message to add to the blockchain.',
							},
						},
					},
				},
			},
			// transfer sol
			{
				type: 'function',
				function: {
					name: 'transferSol',
					description: 'Transfers SOL to another Solana wallet.',
					parameters: {
						type: 'object',
						properties: {
							to: {
								type: 'string',
								description: 'The account to transfer to.',
							},
							amount: {
								type: 'number',
								description: 'The amount of SOL to transfer.',
							},
						},
					},
				},
			},
			// swap
			{
				type: 'function',
				function: {
					name: 'swap',
					description: 'Swaps one token for another.',
					parameters: {
						type: 'object',
						properties: {
							from: {
								type: 'string',
								description: 'The token to swap from.',
							},
							to: {
								type: 'string',
								description: 'The token to swap to.',
							},
							amount: {
								type: 'number',
								description: 'The amount of the token to swap.',
							},
						},
					},
				},
			},
			// stake bonk, receives amount and number of days
			{
				type: 'function',
				function: {
					name: 'stakeBonk',
					description: 'Stakes BONK for a certain number of days.',
					parameters: {
						type: 'object',
						properties: {
							amount: {
								type: 'number',
								description: 'The amount of BONK to stake.',
							},
							days: {
								type: 'number',
								description: 'The number of days to stake BONK.',
							},
						},
					},
				},
			},
			// get wallet info
			{
				type: 'function',
				function: {
					name: 'getWalletInfo',
					description: 'Answers information about user wallet based on the provided prompt.',
					parameters: {
						type: 'object',
						properties: {
							prompt: {
								type: 'string',
								description: 'The prompt from the user.',
							},
							// infoRequested is an array of options of the info the user wants to know, it can one or more of the following: balance, transactions, nfts
							infoRequested: {
								type: 'array',
								description: 'The information the user wants to know about their wallet.',
								items: {
									type: 'string',
									enum: ['balance', 'transactions', 'nfts'],
								},
							},
						},
					},
				},
			},
			// default
			{
				type: 'function',
				function: {
					name: 'answerMessage',
					description: 'Answers a message based on the provided prompt from the user. Uses the exact message the user sent.',
					parameters: {
						type: 'object',
						properties: {
							prompt: {
								type: 'string',
								description: 'The message the user sent.',
							},
						},
					},
				},
			},
		];

		const configData = {
			system: 'You are an AI assistant that solves the best function to be performed based on user input.',
			history: [
				...data.history,
			],
			prompt: data.prompt,
			tools,
			toolChoice: 'required',
			model: 'gpt-4',
		};

		const response = await AIService.sendMessage(configData, 'openai');
		const functions = [];

		if (!!response.data.choices[0].message.tool_calls) {
			// iterate tool_calls
			for (let tool of response.data.choices[0].message.tool_calls) {
				// JSON.parse(function.arguments) to get the arguments
				const args = JSON.parse(tool.function.arguments);

				functions.push({
					name: tool.function.name,
					args,
				});
			}
		}

		return functions;
	}
}

export default AIService;
