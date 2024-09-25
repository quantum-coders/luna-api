import 'dotenv/config';
import AIService from '../services/ai.service.js';
import RIMService from '../services/rim.service.js';

class AIController {

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
