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

	static async encodeWalletPayload(req, res) {
		try {
			console.log('Encoding wallet payload');

			const { encryptionPK, payload } = req.body;

			const encodedPayload = Web3Service.encodeWalletPayload(encryptionPK, payload);
			res.respond({
				data: encodedPayload,
				message: 'Payload encoded successfully',
			});
		} catch(error) {
			res.respond({
				status: 500,
				message: error.message,
			});
		}
	}

	static async decodeWalletPayload(req, res) {
		try {
			console.log('Decoding wallet payload');

			const { encryptionPK, nonce, payload } = req.body;

			const decodedPayload = Web3Service.decodeWalletPayload(encryptionPK, nonce, payload);
			res.respond({
				data: decodedPayload,
				message: 'Payload decoded successfully',
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
