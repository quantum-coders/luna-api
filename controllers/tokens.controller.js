import TokenService from '../services/tokens.service.js';

class TokensController {
	static async getTokens(req, res) {
		try {
			console.log('Getting tokens');

			const { id } = req.params;

			const tokens = await TokenService.getTokens(id);
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
}

export default TokensController;
