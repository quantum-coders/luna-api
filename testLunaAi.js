// test.js

import 'dotenv/config';
import AIService from "./services/ai.service.js"; // Asegúrate de que la ruta sea correcta

const data = {
	model: 'gpt-4',
	system: 'You are an AI assistant that solves the best function to be performed based on user input.',
	prompt: 'Crea una limit order',
	history: [],
	temperature: 0.5,
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
		{
			type: 'function',
			function: {
				name: 'getDCA',
				description: 'Fetches raw DCA (Dollar-Cost Averaging) data for a given DCA public key.',
				parameters: {
					type: 'object',
					properties: {
						dcaPubKey: {
							type: 'string',
							description: 'The public key of the DCA to fetch.',
						},
					},
				},
			},
		},
		// Create DCA
		{
			type: 'function',
			function: {
				name: 'createDCA',
				description: 'Creates a DCA (Dollar-Cost Averaging) transaction.',
				parameters: {
					type: 'object',
					properties: {
						payerPublicKey: {
							type: 'string',
							description: 'The public key of the payer.',
						},
						inputMint: {
							type: 'string',
							description: 'The mint address of the input token.',
						},
						outputMint: {
							type: 'string',
							description: 'The mint address of the output token.',
						},
						inAmount: {
							type: 'number',
							description: 'The total amount for the DCA.',
						},
						inAmountPerCycle: {
							type: 'number',
							description: 'The amount for each DCA cycle.',
						},
						cycleSecondsApart: {
							type: 'number',
							description: 'The time interval between DCA cycles, in seconds.',
						},
					},
				},
			},
		},
		// Close DCA
		{
			type: 'function',
			function: {
				name: 'closeDCA',
				description: 'Closes a DCA and returns the encoded transaction.',
				parameters: {
					type: 'object',
					properties: {
						payerPublicKey: {
							type: 'string',
							description: 'The public key of the payer.',
						},
						dcaPubKey: {
							type: 'string',
							description: 'The public key of the DCA to close.',
						},
					},
				},
			},
		},
		// Create Limit Order
		{
			type: 'function',
			function: {
				name: 'createLimitOrder',
				description: 'Creates a limit order and returns the encoded transaction.',
				parameters: {
					type: 'object',
					properties: {
						ownerPublicKey: {
							type: 'string',
							description: 'The public key of the order owner.',
						},
						inAmount: {
							type: 'number',
							description: 'The input token amount for the order.',
						},
						outAmount: {
							type: 'number',
							description: 'The output token amount for the order.',
						},
						inputMint: {
							type: 'string',
							description: 'The mint address of the input token.',
						},
						outputMint: {
							type: 'string',
							description: 'The mint address of the output token.',
						},
						expiredAt: {
							type: 'number',
							description: 'The expiration timestamp (optional).',
						},
					},
				},
			},
		},
		// Cancel Limit Order
		{
			type: 'function',
			function: {
				name: 'cancelLimitOrder',
				description: 'Cancels a limit order and returns the encoded transaction.',
				parameters: {
					type: 'object',
					properties: {
						ownerPublicKey: {
							type: 'string',
							description: 'The public key of the order owner.',
						},
						orderPubKey: {
							type: 'string',
							description: 'The public key of the order to cancel.',
						},
					},
				},
			},
		},
		// Get Open Orders
		{
			type: 'function',
			function: {
				name: 'getOpenOrders',
				description: 'Fetches all open orders for the provided wallet.',
				parameters: {
					type: 'object',
					properties: {
						ownerPublicKey: {
							type: 'string',
							description: 'The public key of the wallet to fetch open orders for.',
						},
					},
				},
			},
		},
		// Get Trade History
		{
			type: 'function',
			function: {
				name: 'getTradeHistory',
				description: 'Fetches the trade history for the given wallet.',
				parameters: {
					type: 'object',
					properties: {
						ownerPublicKey: {
							type: 'string',
							description: 'The public key of the wallet to fetch trade history for.',
						},
					},
				},
			},
		},
		// Get Order History
		{
			type: 'function',
			function: {
				name: 'getOrderHistory',
				description: 'Fetches the order history for the given wallet.',
				parameters: {
					type: 'object',
					properties: {
						ownerPublicKey: {
							type: 'string',
							description: 'The public key of the wallet to fetch order history for.',
						},
					},
				},
			},
		},
	],
	toolChoice: 'required'
};

(async () => {
	try {
		const response = await AIService.sendMessage(data, 'openai');
		console.log('Response:', response.data);
	} catch (error) {
		if (error.response) {
			// Imprime el error de respuesta de manera detallada
			console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
		} else {
			// Imprime otros errores
			console.error('Error:', error.message);
		}
	}
})();
