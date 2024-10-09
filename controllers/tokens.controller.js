import TokenService from '../services/tokens.service.js';

class TokensController {
	static async getTokens(req, res) {
		try {
			const { address } = req.params;

			const tokens = await TokenService.getTokenFromDatabase(address);
			res.respond({
				data: tokens,
				message: 'Tokens retrieved successfully',
			});
		} catch(error) {
			res.respond({
				status: 500,
				message: error.message,
			});
		}
	}

	static async getQuote(req, res) {
		try {
			const { inputMint, outputMint } = req.query;
			const inputToken = await TokenService.getTokenFromDatabase(inputMint);
			const outputToken = await TokenService.getTokenFromDatabase(outputMint);
			if(!inputToken || !outputToken) {
				throw new Error('Tokens not found');
			}
			const result = await TokenService.getQuote(inputMint, outputMint);
			// enrich the result with token data
			const quotes = result.data;
			const resourcedQuotes = {
				inputToken: inputToken,
				outputToken: outputToken,
				quotes: quotes,
			}
			res.respond({
				data: resourcedQuotes,
				message: 'Quote retrieved successfully',
			});
		} catch(error) {
			console.error("Error: ", error);
			res.respond({
				status: 500,
				message: error.message,
			});
		}
	}

}

export default TokensController;
