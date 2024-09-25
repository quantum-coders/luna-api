import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';
import { promptTokensEstimate } from 'openai-chat-tokens';
import { openAIModels, perplexityModels, groqModels } from '../assets/data/ai-models.js';
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
			mode,
			temperature = 0.5,
			maxTokens = 1024,
			topP = 1,
			frequencyPenalty = 0.0001,
			presencePenalty = 0,
			stop = '',
			tools,
			tool_choice,
		} = data;

		// Sanitize input
		if (!model || !prompt) {
			const missingFields = [];
			if (!model) missingFields.push('model');
			if (!prompt) missingFields.push('prompt');
			throw new Error('Missing required fields: ' + missingFields.join(', '));
		}

		try {
			// Get model information (maxTokens and provider)
			const modelInfo = AIService.solveModelInfo(model);
			const provider = modelInfo.provider;
			maxTokens = modelInfo.maxTokens;

			// Adjust sizes to avoid token limit
			const adjustHistory = AIService.adjustHistory(system, history, prompt);
			system = adjustHistory.system;
			history = adjustHistory.history;
			prompt = adjustHistory.prompt;

			const messages = [
				{ 'role': 'system', 'content': system || 'You are a helpful assistant.' },
				...history,
				{ 'role': 'user', 'content': prompt || 'Hello' },
			];

			const data = {
				model,
				messages,
				temperature,
				max_tokens: maxTokens,
				top_p: topP,
				frequency_penalty: frequencyPenalty,
				presence_penalty: presencePenalty,
				stream,
			};

			console.log("System: -----------------> ", system);

			if (tools && tool_choice && provider === 'openai' && !stream) {
				data.tools = tools;
				data.tool_choice = tool_choice;
			}

			if (provider === 'openai' && mode === 'json') data.response_format = { type: 'json_object' };
			if (provider === 'openai') if (stop) data.stop = stop;

			const payload = {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${modelInfo.authToken}`,
				},
			};
			const url = AIService.solveProviderUrl(provider);
			if (!!data.stream) {
				payload.responseType = 'stream';
			}
			return await axios.post(url, data, payload);

		} catch (error) {
			console.error('Error:', error);
			if (error.response) {
				throw new Error('Error to process the request: ' + error.message);
			} else if (error.request) {
				throw new Error('Error to process the request: ' + error.message);
			} else {
				throw new Error('Error to process the request: ' + error.message);
			}
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
		let maxTokens = 4096;

		if (!openAIModels.includes(model) && !perplexityModels.includes(model) && !groqModels.includes(model)) {
			throw new Error('Invalid model');
		}

		if (groqModels.includes(model)) {
			if (model === 'llama2-70b-4096' && maxTokens > 4096) maxTokens = 4096 - 2500;
			if (model === 'llama3-8b-8192' && maxTokens > 8192) maxTokens = 8192 - 2500;
			if (model === 'llama3-70b-8192' && maxTokens > 8192) maxTokens = 8192 - 2500;
		}

		if (openAIModels.includes(model)) {
			if (model === 'gpt-3.5-turbo-16k' && maxTokens > 16000) maxTokens = 16000;
			if (model === 'gpt-3.5-turbo' && maxTokens > 4096) maxTokens = 4096;
			if (model === 'gpt-4' && maxTokens > 4096) maxTokens = 4096;
			if (model === 'gpt-4-turbo' && maxTokens > 4096) maxTokens = 4096;
			if (model === 'gpt-4-1106-preview' && maxTokens > 4096) maxTokens = 4096;
			if (model === 'gpt-4-turbo-preview' && maxTokens > 4096) maxTokens = 4096;
		}

		if (perplexityModels.includes(model)) {
			if (model === 'sonar-small-chat' && maxTokens > 16384) maxTokens = 16384;
			if (model === 'sonar-small-online' && maxTokens > 12000) maxTokens = 12000;
			if (model === 'sonar-medium-chat' && maxTokens > 16384) maxTokens = 16384;
			if (model === 'sonar-medium-online' && maxTokens > 12000) maxTokens = 12000;
			if (model === 'llama-3-8b-instruct' && maxTokens > 8192) maxTokens = 8192;
			if (model === 'llama-3-70b-instruct' && maxTokens > 8192) maxTokens = 8192;
			if (model === 'codellama-70b-instruct' && maxTokens > 16384) maxTokens = 16384;
			if (model === 'mistral-7b-instruct' && maxTokens > 16384) maxTokens = 16384;
			if (model === 'mixtral-8x7b-instruct' && maxTokens > 16384) maxTokens = 16384;
			if (model === 'mixtral-8x22b-instruct' && maxTokens > 16384) maxTokens = 16384;
			if (model === 'llama-3-sonar-large-32k-online' && maxTokens > 4096) maxTokens = 4096;
			if (model === 'llama-3-sonar-small-32k-online' && maxTokens > 4096) maxTokens = 4096;
		}

		let provider, authToken;

		if (openAIModels.includes(model)) {
			provider = 'openai';
			authToken = process.env.OPENAI_API_KEY;
		}
		if (perplexityModels.includes(model)) {
			provider = 'perplexity';
			authToken = process.env.PERPLEXITY_API_KEY;
		}
		if (groqModels.includes(model)) {
			provider = 'groq';
			authToken = process.env.GROQ_API_KEY;
		}

		if (!provider || !authToken) {
			throw new Error(`${provider ? 'Provider' : authToken ? 'Auth Token' : 'Provider and Auth Token'} not found`);
		}

		return { maxTokens, provider, authToken };
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
	 * @returns {Object} - An object containing the adjusted system message and history.
	 * @throws {Error} - Throws an error if there is an issue with the adjustment.
	 */
	static adjustHistory(system, history, prompt) {

		let estimate = promptTokensEstimate({
			messages: [
				{ 'role': 'system', 'content': system || 'You are a helpful assistant.' },
				...history,
				{
					'role': 'user',
					'content': prompt || 'Hello',
				},
			],
		});

		let chunkSize = 250;

		while (estimate > 2500) {
			if (estimate <= 2500) chunkSize = 250;
			if (estimate <= 5000) chunkSize = 500;
			if (estimate > 10000) chunkSize = 5000;
			system = system.substring(0, system.length - chunkSize);

			if (estimate > 2500 && system.length < 1000) {
				if (history.length > 0) {
					if (estimate > 2500 && history[history.length - 1].content.length < 500) {
						prompt = prompt.substring(0, prompt.length - chunkSize);
					}

					history[history.length - 1].content = history[history.length - 1].content.substring(0, history[history.length - 1].content.length - chunkSize);
				} else {
					prompt = prompt.substring(0, prompt.length - chunkSize);
				}
			}
			estimate = promptTokensEstimate({
				messages: [
					{ 'role': 'system', 'content': system || 'You are a helpful assistant.' },
					...history,
					{
						'role': 'user',
						'content': prompt || 'Hello',
					},
				],
			});
		}

		system = JSON.stringify(system);
		prompt = JSON.stringify(prompt);

		for (let i = 0; i < history.length; i++) {
			history[i].content = JSON.stringify(history[i].content);
		}

		return { system, history, prompt };
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
			const attachment = await AttachmentService.createAttachment(file, {
				acl: 'public-read',
				mimeType: 'image/png',
				extension: 'png',
			});

			return attachment.data.Location;
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
			messages: [
				{
					role: 'system',
					content: [{
						type: 'text',
						text: `You are an AI assistant that solves the best function to be performed based on user input.`,
					}],
				},
				...data.messages,
			],
			prompt: data.prompt,
			tools,
			tool_choice: 'required',
			model: 'gpt-4',
		};

		console.log('ConfigData', configData);

		const response = await AIService.sendMessage(configData, 'openai');
		console.log('Response', response.data);
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
