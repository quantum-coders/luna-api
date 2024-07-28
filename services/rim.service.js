import AIService from './ai.service.js';
import ExaService from './exa.service.js';
import SolanaService from './solana.service.js';
import YoutubeService from './youtube.service.js';

const systemPromptString = `You are Luna AI, a Crypto Solana AI Assistant. Answer the user in a funny enthusiastic way.`;

class RIMService {

	static async getWalletInfo(args) {
		let balances = [];
		if(!!args.properties.wallet) {
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

	static async searchYoutubeVideo(args) {

		let search = await YoutubeService.searchVideo(args.prompt, 1);
		search = search[0];

		console.log('search', search);

		return {
			rimType: 'video',
			responseSystemPrompt: `${systemPromptString}
				Generate an answers in the line of "here is your video".
				This is the video title: ${ search.snippet.title }.
				This is the video description: ${ search.snippet.description }`,
			parameters: {
				id: search.id.videoId,
				url: `https://www.youtube.com/watch?v=${ search.id.videoId }`,
				title: search.snippet.title,
				author: search.snippet.channelTitle,
				channelId: search.snippet.channelId,
				description: search.snippet.description,
			},
		};
	}

	static async addMemo(args) {

		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${ JSON.stringify(args, null, 2) }. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: 'https://appapi.lunadefi.ai/blinks/memo?message={message}',
				blinkParameters: {
					message: args.message,
				},
			},
		};
	}

	static async transferSol(args) {

		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${ JSON.stringify(args, null, 2) }. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: 'https://appapi.lunadefi.ai/blinks/transfer-sol?to={to}&amount={amount}',
				blinkParameters: {
					to: args.to,
					amount: args.amount,
				},
			},
		};
	}

	static async swap(args) {

		return {
			rimType: 'blink',
			responseSystemPrompt: systemPromptString + `Generate an answers explaining that the user should fill this fields: ${ JSON.stringify(args, null, 2) }. Do not mention the properties, just the fields.`,
			parameters: {
				blinkUrl: 'https://appapi.lunadefi.ai/blinks/swap?inputMint={inputMint}&outputMint={outputMint}&amount={amount}',
				blinkParameters: {
					inputMint: args.inputMint,
					outputMint: args.outputMint,
					amount: args.amount,
				},
			},
		};
	}
}

export default RIMService;