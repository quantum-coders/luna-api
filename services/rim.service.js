import AIService from './ai.service.js';
import SolanaService from './solana.service.js';
import YoutubeService from './youtube.service.js';
import {prisma} from "@thewebchimp/primate";
import JupiterService from "./jupiter.service.js";

const systemPromptString = `You are Luna AI, a Crypto Solana AI Assistant. Answer the user in a funny enthusiastic way.`;

class RIMService {

	/**
	 * Retrieves wallet information and balances for a given wallet address.
	 *
	 * @param {Object} args - The input arguments containing properties.
	 * @param {Object} args.properties - Additional properties including wallet address.
	 * @returns {Promise<Object>} - The response object containing wallet information and prompt.
	 */
	static async getWalletInfo(args) {
		let balances = [];
		if (!!args.properties.wallet) {
			balances = await SolanaService.getAllBalances(args.properties.wallet);
		}
		return {
			rimType: 'wallet',
			responseSystemPrompt: systemPromptString + 'Generate an answers in the line of "Here are your wallet balances".',
			parameters: {
				...args,
				balances,
			},
		};
	}

	/**
	 * Generates an image based on the provided prompt.
	 *
	 * @param {Object} args - The input arguments containing the image prompt.
	 * @returns {Promise<Object>} - The response object containing the image URL and prompt.
	 */
	static async generateImage(args) {
		const imageURL = await AIService.createImage(args.prompt);

		return {
			rimType: 'image',
			responseSystemPrompt: systemPromptString + 'Generate an answers in the line of "Here is the image you requested". Do not give details about the image.',
			parameters: {
				imageUrl: imageURL,
			},
		};
	}

	/**
	 * Searches for a YouTube video based on the provided prompt.
	 *
	 * @param {Object} args - The input arguments containing the video search prompt.
	 * @returns {Promise<Object>} - The response object containing video details and prompt.
	 */
	static async searchYoutubeVideo(args) {
		let search = await YoutubeService.searchVideo(args.prompt, 1);
		search = search[0];

		return {
			rimType: 'video',
			responseSystemPrompt: `${systemPromptString}
                Generate an answers in the line of "here is your video".
                This is the video title: ${search.snippet.title}.
                This is the video description: ${search.snippet.description}`,
			parameters: {
				id: search.id.videoId,
				url: `https://www.youtube.com/watch?v=${search.id.videoId}`,
				title: search.snippet.title,
				author: search.snippet.channelTitle,
				channelId: search.snippet.channelId,
				description: search.snippet.description,
			},
		};
	}

	/**
	 * Adds a memo to the user's account based on the provided message.
	 *
	 * @param {Object} args - The input arguments containing the memo message.
	 * @returns {Promise<Object>} - The response object with memo-related information.
	 */
	static async addMemo(args) {
		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${JSON.stringify(args, null, 2)}. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: `${process.env.BASE_URL}/blinks/memo?message={message}`,
				blinkParameters: {
					message: args.message,
				},
			},
		};
	}

	/**
	 * Transfers Solana tokens to a specified address.
	 *
	 * @param {Object} args - The input arguments containing the transfer details.
	 * @returns {Promise<Object>} - The response object with transfer-related information.
	 */
	static async transferSol(args) {
		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${JSON.stringify(args, null, 2)}. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: `${process.env.BASE_URL}/blinks/transfer-sol?to={to}&amount={amount}`,
				blinkParameters: [
					{
						name: 'to',
						value: args.to,
					},
					{
						name: 'amount',
						value: args.amount,

					}
				]
			}
		}
	}

	/**
	 * Stakes Bonk tokens for a specified number of days.
	 *
	 * @param {Object} args - The input arguments containing the staking details.
	 * @returns {Promise<Object>} - The response object with staking-related information.
	 */
	static async stakeBonk(args) {
		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${JSON.stringify(args, null, 2)}. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: `${process.env.BASE_URL}/blinks/stake-bonk?amount={amount}&days={days}`,
				blinkParameters: [
					{
						name: 'amount',
						value: args.amount,
					}
				]
			},
		};
	}

	/**
	 * Swaps tokens on the Solana blockchain based on the provided details.
	 *
	 * @param {Object} args - The input arguments containing the swap details.
	 * @returns {Promise<Object>} - The response object with swap-related information.
	 */
	static async swap(args) {
		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${JSON.stringify(args, null, 2)}. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: `${process.env.BASE_URL}/blinks/swap?inputMint={inputMint}&outputMint={outputMint}&amount={amount}&slippageBps={slippageBps}`,
				blinkParameters: [
					{
						name: 'amount',
						value: args.amount,
					},
					{
						name: 'slippage',
						value: args.slippage || 0.05,
					}
				]
			},
		};
	}

	/**
	 * Processes a user's message and returns a response after executing the relevant actions.
	 *
	 * @param {Object} data - The input data containing model configuration and messages.
	 * @param {Object} properties - Additional properties for action arguments.
	 * @returns {Promise<Object>} - The response from the AIService.
	 * @throws {Error} - Throws an error if the data object is not provided or if there is a processing failure.
	 */
	static async messageToRIM(data, properties = {}) {
		try {
			if (!data || !data.messages || data.messages.length === 0) {
				throw new Error('Invalid data provided');
			}

			const userMessage = data.messages.find(msg => msg.role === 'user');

			if (!userMessage || !userMessage.content) {
				throw new Error('User message content not provided');
			}

			const prompt = data.prompt || userMessage.content;

			const actionObject = {
				messages: data.messages,
				prompt,
			};
			const actions = await AIService.solveAction(actionObject);

			const actionResults = [];

			for (const action of actions) {
				if (action.name === 'answerMessage') continue;

				// Check if the action function exists in RIMService
				const actionFunction = RIMService[action.name];
				if (typeof actionFunction !== 'function') {
					console.error(`The action "${action.name}" is not a valid function in RIMService.`);
					continue;
				}

				// Prevents mutating input parameters
				const argsWithProperties = {
					...action.args,
					properties,
				};

				try {
					const result = await actionFunction.call(RIMService, argsWithProperties);
					actionResults.push(result);
				} catch (error) {
					console.error(`Error executing action "${action.name}":`, error);
				}
			}

			// Prepares the system message for AIService
			const systemContent = actionResults.length > 0
				? actionResults[0].responseSystemPrompt
				: 'Respond to the user in a fun and sarcastic manner - talk repeating the word bro, talk like a super mega broo';


			const updatedData = {
				...data,
				messages: [
					...data.messages,
				],
				system: systemContent,
				prompt,
			};

			const aiResponse = await AIService.sendMessage(updatedData, 'openai');

			return {
				aiResponse, userMessage,
				rims: actionResults,
			};
		} catch (error) {
			console.error('Error in RIMService.messageToRIM:', error);
			throw error;
		}
	}

	/**
	 * Creates a new Rim entry in the database.
	 *
	 * @param {Object} data - The data for creating a new Rim.
	 * @param {number} data.idMessage - The ID of the associated message (required).
	 * @param {Object} data.jsonData - The JSON data for the Rim (required).
	 * @param {string} [data.version] - The version of the Rim.
	 * @param {number} [data.idUser] - The ID of the associated user.
	 * @param {Date} [data.expired] - The expiration date of the Rim.
	 * @param {number} [data.interactionCount] - The interaction count of the Rim.
	 * @param {string} [data.type] - The type of the Rim.
	 * @param {string} [data.status='active'] - The status of the Rim.
	 * @returns {Promise<Object>} The created Rim object.
	 * @throws {Error} If required fields are missing or if there's a database error.
	 */
	static async create(data) {
		// Destructure and validate required fields
		const {idMessage, jsonData, version, idUser, expired, interactionCount, type, status} = data;

		if (!idMessage) {
			throw new Error('Missing required field: idMessage');
		}
		if (!jsonData || typeof jsonData !== 'object') {
			throw new Error('Invalid or missing required field: jsonData');
		}

		// Prepare the data object, including only valid fields
		const rimData = {
			idMessage: idMessage,
			jsonData: jsonData,
			version,
			idUser: idUser,
			expired,
			interactionCount: interactionCount ?? 0, // Use default if not provided
			type,
			status: status ?? 'active', // Use default if not provided
		};

		// Remove undefined fields
		Object.keys(rimData).forEach(key => rimData[key] === undefined && delete rimData[key]);
		console.info("rimData", rimData);
		try {
			return await prisma.rim.create({
				data: rimData,
			});
		} catch (error) {
			console.error('Error creating Rim:', error);
			throw new Error('Failed to create Rim entry');
		}
	}

	static async createLimitOrder(args) {
		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${JSON.stringify(args, null, 2)}. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: `${process.env.BASE_URL}/blinks/create-limit-order?inputMint={inputMint}&outputMint={outputMint}&inAmount={inAmount}&outAmount={outAmount}&expiredAt={expiredAt}`,
				blinkParameters: [
					{
						name: 'inAmount',
						value: args.inAmount,
					},
					{
						name: 'outAmount',
						value: args.outAmount,
					},
					{
						name: 'expiredAt',
						value: args.expiredAt,
					}
				]
			},
		};
	}

	static async createDCATransaction(args) {
		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${JSON.stringify(args, null, 2)}. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: `${process.env.BASE_URL}/blinks/create-dca-transaction?account={account}&inputMint={inputMint}&outputMint={outputMint}&inAmount={inAmount}&inAmountPerCycle={inAmountPerCycle}&cycleSecondsApart={cycleSecondsApart}`,
				blinkParameters: [
					{
						name: 'inAmount',
						value: args.inAmount,
					},
					{
						name: 'InAmountPerCycle',
						value: args.InAmountPerCycle,
					},
					{
						name: 'CyclesSecondsApart',
						value: args.CyclesSecondsApart,
					}
				]
			},
		}
	}

}

export default RIMService;
