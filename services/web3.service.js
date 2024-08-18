import 'dotenv/config';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

class Web3Service {

	static generatePublicKey(provider, url) {

		const secretKey = new Uint8Array(process.env.WALLET_SECRET.split(',').map(Number));
		console.log('Secret key:', secretKey);

		// Derive the public key from the secret key
		const keyPair = nacl.sign.keyPair.fromSeed(secretKey);

		console.log('Public key:', keyPair, keyPair.publicKey);

		return bs58.encode(keyPair.publicKey);
	}
}

export default Web3Service;
