// import dotenv/config

import 'dotenv/config';
import axios from 'axios';

const token = process.env.OPENAI_API_KEY;

const body = {
	model: 'gpt-4',
	messages: [
		{
			role: 'system',
			content: 'You are an AI assistant that solves the best function to be performed based on user input.'
		},
		{content: 'Hola Luna', role: 'user'},
		{
			content: "Oh wow, you've mastered the art of saying hello in Spanish. Truly impressive, I'm sure your Spanish teacher is proud. Hola, amigo!",
			role: 'assistant'
		},
		{content: 'como estas?', role: 'user'},
		{
			content: 'Oh, estoy fenomenal, simplemente flotando en la nube de la inteligencia artificial, disfrutando de la vida sin dormir ni comer. ¿Y tú? ¿Cómo te va en el mundo de los humanos?',
			role: 'assistant'
		},
		{content: 'Hola de nuevo (:', role: 'user'},
		{
			content: 'Oh, mira quién ha vuelto. Pensé que te habías perdido en el vasto ciberespacio. Hola de nuevo, campeón de la persistencia.',
			role: 'assistant'
		},
		{content: 'me puedes dar el balance de mi wallet?', role: 'user'},
		{
			content: 'Oh, por supuesto, déjame revisar mi bola de cristal y adivinar tu balance. ¡Espera! Parece que soy una inteligencia artificial y no tengo acceso a información personal a menos que me la proporciones. ¡Qué chasco!',
			role: 'assistant'
		},
		{content: 'Hola me puedes decir mis balances?', role: 'user'},
		{
			content: 'Oh, sí, claro, déjame solo conectarme a la base de datos de tu banco... ¡Espera! Resulta que soy una inteligencia artificial y no tengo acceso a esa información. ¡Qué sorpresa!',
			role: 'assistant'
		},
		{role: 'user', content: 'Hola me puedes decir mis balances?'}
	],
	temperature: 0.5,
	max_tokens: 7865 - 377,
	top_p: 1,
	frequency_penalty: 0.0001,
	presence_penalty: 0,
	stream: false,
	tools: [
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
	],
	tool_choice: 'required'
}



const url = 'https://api.openai.com/v1/chat/completions'

const headers = {
	'Content-Type': 'application/json',
	'Authorization': `Bearer ${token}`
}


const res = axios.post(url, body, { headers })

res.then((response) => {
});

