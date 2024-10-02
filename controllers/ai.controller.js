import 'dotenv/config';
import AIService from '../services/ai.service.js';
import RIMService from '../services/rim.service.js';
import ChatService from "../services/chat.service.js";
import MessageService from "../services/message.service.js";
import VariantService from "../services/variant.service.js";

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
		const {text} = req.body;
		const {uidMessage} = req.body;

		if (!text) {
			return res.respond({
				status: 400,
				message: 'No text provided',
			});
		}

		try {
			const audio = await AIService.textToAudio(text);
			const newVariant = await VariantService.createAudioVariant(uidMessage, audio.attachment);
			// check if attachment exists
			if (!audio.attachment) {
				return res.respond({
					status: 500,
					message: 'Error generating the audio',
				});
			}

			// here save it to the corresponding variant:
			const response = {
				url: audio.attachment.url,
				mimeType: audio.attachment.mimeType,
				size: audio.attachment.size,
			}
			return res.respond({
				data: newVariant,
				message: 'Audio generated successfully',
			});

		} catch (e) {
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
		const {filePath} = req.body;
		if (!filePath) {
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

		} catch (e) {
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
		const {prompt} = req.body;

		if (!prompt) {
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

		} catch (e) {
			return res.respond({
				status: 500,
				message: 'Error generating the image: ' + e.message,
			});
		}
	}

	/**
	 * Handles the message processing and streaming for RIMs ().
	 *
	 * @async
	 * @param {Object} req - The request object from the client.
	 * @param {Object} req.body - The body of the request.
	 * @param {string} req.body.prompt - The user's input prompt.
	 * @param {string} req.body.uidChat - The unique identifier for the chat.
	 * @param {Object} req.body.properties - Additional properties for the message (optional).
	 * @param {Object} req.user - The user object.
	 * @param {Object} req.user.payload - The payload containing user information.
	 * @param {Object} res - The response object to send data back to the client.
	 * @throws {Error} Throws an error if there's an issue during processing.
	 */
	static async messageToRIM(req, res) {
		try {
			// Set up the response headers for server-sent events
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			});

			const {prompt, uidChat, properties = {}, uidMessage, uidMessageAssistant} = req.body;
			const user = req.user.payload;

			// Validate required inputs
			if (!prompt) {
				return res.write(`data: ${JSON.stringify({type: 'error', message: 'No prompt provided'})}\n\n`);
			}
			if (!uidChat) {
				return res.write(`data: ${JSON.stringify({type: 'error', message: 'No chat provided'})}\n\n`);
			}

			if (!uidMessage) {
				return res.write(`data: ${JSON.stringify({type: 'error', message: 'No message provided'})}\n\n`);
			}

			if (!uidMessageAssistant) {
				return res.write(`data: ${JSON.stringify({type: 'error', message: 'No assistant message provided'})}\n\n`);
			}
			// Retrieve the chat
			const chat = await ChatService.getByUid(uidChat);
			if (!chat) {
				return res.write(`data: ${JSON.stringify({type: 'error', message: 'Chat not found'})}\n\n`);
			}

			// Save the user's message
			await MessageService.saveMessage({
				idChat: chat.id,
				content: prompt,
				uid: uidMessage,
				idUser: user.id,
				role: 'user',
				messageType: 'text',
			});

			// Solve actions based on the prompt
			const actions = await AIService.solveAction({messages: [], prompt});
			res.write(`data: ${JSON.stringify({type: 'actionsSolved', actions})}\n\n`);

			// Process actions
			const actionRes = [];
			for (let act of actions) {
				if (act.name === 'answerMessage') continue;
				act.args.properties = properties;
				try {
					const ar = await RIMService[act.name](act.args);
					actionRes.push(ar);
				} catch (e) {
					console.error('Error on action', act.name, e);
				}
			}

			// Prepare data for AI service
			const data = {
				model: 'gpt-4',
				system: actionRes.length ? actionRes[0].responseSystemPrompt : 'Answer the user in a funny sarcastic way',
				prompt,
				stream: true
			};

			// Send message to AI service
			const response = await AIService.sendMessage(data, 'openai');

			// Write action results to the response
			res.write(`data: ${JSON.stringify({type: 'rims', rims: actionRes})}\n\n`);

			let fullMessage = '';
			let buffer = '';

			// Process the streamed response
			response.data.on('data', (chunk) => {
				buffer += chunk.toString();
				let lines = buffer.split('\n');
				buffer = lines.pop(); // Keep the last potentially incomplete line in the buffer

				lines.forEach(line => {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(5));
							if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
								fullMessage += data.choices[0].delta.content;
							}
						} catch (e) {
							// Ignore lines that are not valid JSON (like 'data: [DONE]')
						}
					}
				});

				// Send the chunk to the client to maintain streaming
				res.write(chunk);
			});

			// Handle the end of the stream
			response.data.on('end', async () => {
				// Process any remaining data in the buffer
				if (buffer.startsWith('data: ')) {
					try {
						const data = JSON.parse(buffer.slice(5));
						if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
							fullMessage += data.choices[0].delta.content;
						}
					} catch (e) {
						// Ignore if it's not valid JSON
					}
				}

				// Save the complete final message
				await MessageService.saveMessage({
					idChat: chat.id,
					content: fullMessage,
					idUser: user.id,
					uid: uidMessageAssistant,
					role: 'assistant',
					messageType: 'text',
				});

				// Send the complete message to the client
				res.write(`data: ${JSON.stringify({type: 'end', fullMessage})}\n\n`);
				res.end();
			});

		} catch (e) {
			console.error(e);
			res.write(`data: ${JSON.stringify({type: 'error', message: e.message})}\n\n`);
			res.end();
		}
	}
}

export default AIController;
