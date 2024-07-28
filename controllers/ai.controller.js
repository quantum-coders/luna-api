import 'dotenv/config';
import AIService from '../services/ai.service.js';
import RIMService from '../services/rim.service.js';
import { Readable } from 'stream';

class AIController {
	/**
	 * Sends a message to the AI model and streams the response back to the client.
	 *
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 * @returns {Promise<void>} - A promise that resolves when the response is sent.
	 * @throws {Error} - Throws an error if required fields are missing or if there is an issue processing the request.
	 */
	static async sendMessage(req, res) {
		const body = req.body;
		let {
			model,
			system = '',
			prompt,
			stream = true,
			history = [],
			mode,
			temperature = 0.5,
			maxTokens = 1024,
			topP = 1,
			frequencyPenalty = 0.0001,
			presencePenalty = 0,
			stop = '',
		} = body;

		if(!model || !prompt) {
			const missingFields = [];
			if(!model) missingFields.push('model');
			if(!prompt) missingFields.push('prompt');
			res.respond({
				status: 400,
				message: 'Missing required fields: ' + missingFields.join(', '),
			});
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

			if(provider === 'openai' && mode === 'json') data.response_format = { type: 'json_object' };
			if(provider === 'openai') if(stop) data.stop = stop;

			const response = await AIService.sendMessage(data, provider);
			res.writeHead(response.status, response.headers);
			response.data.pipe(res);

		} catch(error) {
			console.error('Error:', error);
			if(error.response) {
				res.respond({
					status: error.response.status,
					message: 'Error to process the request: ' + error.message,
					errorData: error.response.data,
				});
			} else if(error.request) {
				res.respond({
					status: 500,
					message: 'No answer from the server',
				});
			} else {
				res.respond({
					status: 500,
					message: 'Error to process the request: ' + error.message,
				});
			}
		}
	}

	/**
	 * Converts text to audio using OpenAI's text-to-speech model.
	 *
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 * @returns {Promise<void>} - A promise that resolves when the audio is generated and the response is sent.
	 * @throws {Error} - Throws an error if no text is provided or if there is an issue generating the audio.
	 */
	static async textToAudio(req, res) {
		const { text } = req.body;
		if(!text) {
			return res.respond({
				status: 400,
				message: 'No text provided',
			});
		}

		try {
			const audio = await AIService.textToAudio(text);

			return res.respond({
				data: audio,
				message: 'Audio generated successfully',
			});

		} catch(e) {
			return res.respond({
				status: 500,
				message: 'Error generating the audio: ' + e.message,
			});
		}
	}

	/**
	 * Converts audio to text using the provided file path.
	 *
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 * @returns {Promise<void>} - A promise that resolves when the transcription is generated and the response is sent.
	 * @throws {Error} - Throws an error if no file path is provided or if there is an issue with the transcription.
	 */
	static async audioToText(req, res) {
		const { filePath } = req.body;
		if(!filePath) {
			return res.respond({
				status: 400,
				message: 'No audio provided',
			});
		}

		try {
			const transcript = await AIService.audioToText('./temp/' + filePath);

			return res.respond({
				data: transcript,
				message: 'Audio converted to text successfully',
			});

		} catch(e) {
			return res.respond({
				status: 500,
				message: 'Error converting the audio to text: ' + e.message,
			});
		}
	}

	/**
	 * Generates an AI image based on the provided prompt.
	 *
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 * @returns {Promise<void>} - A promise that resolves when the image is generated and the response is sent.
	 * @throws {Error} - Throws an error if no prompt is provided or if there is an issue generating the image.
	 */
	static async createImage(req, res) {

		// get prompt from body
		const { prompt } = req.body;

		if(!prompt) {
			return res.respond({
				status: 400,
				message: 'No prompt provided',
			});
		}

		try {
			const data = await AIService.createImage(prompt);

			return res.respond({
				data,
				message: 'Image generated successfully',
			});

		} catch(e) {
			return res.respond({
				status: 500,
				message: 'Error generating the image: ' + e.message,
			});
		}
	}

	static async messageToRIM(req, res) {
		try {

			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			});

			const prompt = req.body.prompt;
			const properties = req.body.properties || {};

			const actions = await AIService.solveAction(prompt);

			res.write(`data: ${ JSON.stringify({ type: 'actionsSolved', actions }) }\n\n`);

			const actionRes = [];

			for(let act of actions) {
				if(act.name === 'answerMessage') continue;

				act.args.properties = properties;

				try {
					const ar = await RIMService[act.name](act.args);
					actionRes.push(ar);
				} catch(e) {
					console.error('Error on action', act.name, e);
				}
			}

			const messages = [
				{
					role: 'system',
					content: !!actionRes.length ? actionRes[0].responseSystemPrompt : 'Answer the user in a funny sarcastic way',
				},
				{ role: 'user', content: prompt },
			];

			const data = {
				model: 'gpt-4',
				messages,
				temperature: 0.5,
				max_tokens: 1024,
				top_p: 1,
				frequency_penalty: 0.0001,
				presence_penalty: 0,
				stream: true,
			};

			const response = await AIService.sendMessage(data, 'openai');
			//res.writeHead(response.status, response.headers);

			res.write(`data: ${ JSON.stringify({ type: 'rims', rims: actionRes }) }\n\n`);

			response.data.pipe(res);

		} catch(e) {
			console.error(e);
		}
	}
}

export default AIController;