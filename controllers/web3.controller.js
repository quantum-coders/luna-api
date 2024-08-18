import Web3Service from '../services/web3.service.js';

class Web3Controller {

	static async createDeepLink(req, res) {
		try {
			console.log('Creating deep link');

			const { provider } = req.body;

			const deepLink = await Web3Service.createDeepLink(id);
			res.respond({
				data: deepLink,
				message: 'Deep link created successfully',
			});
		} catch(error) {
			res.respond({
				status: 500,
				message: error.message,
			});
		}
	}
}

export default Web3Controller;
