import Web3Service from '../services/web3.service.js';

class Web3Controller {

	static async generatePublicKey(req, res) {
		try {
			console.log('Creating deep link');

			const { provider, url } = req.body;

			const deepLink = Web3Service.generatePublicKey(provider, url);
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
