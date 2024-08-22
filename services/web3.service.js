import 'dotenv/config';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

class Web3Service {

	static generatePublicKey(provider, url) {

		const secretKey = new Uint8Array(process.env.WALLET_SECRET.split(',').map(Number));

		// Derive the public key from the secret key
		const keyPair = nacl.sign.keyPair.fromSeed(secretKey);

		console.log('Public key:', keyPair, keyPair.publicKey);

		return bs58.encode(keyPair.publicKey);
	}

	static encodeWalletPayload(encryptionPK, payload) {

		const secretKey = new Uint8Array(process.env.WALLET_SECRET.split(',').map(Number));
		const sharedSecret = nacl.box.before(bs58.decode(encryptionPK), secretKey);

		const nonce = nacl.randomBytes(24);

		const encryptedPayload = nacl.box.after(
			Buffer.from(JSON.stringify(payload)),
			nonce,
			sharedSecret,
		);

		return {
			nonce: bs58.encode(nonce),
			payload: bs58.encode(encryptedPayload),
		};
	}

	static decodeWalletPayload(encryptionPK, nonce, payload) {

		const secretKey = new Uint8Array(process.env.WALLET_SECRET.split(',').map(Number));
		const sharedSecret = nacl.box.before(bs58.decode(encryptionPK), secretKey);

		const decryptedData = nacl.box.open.after(bs58.decode(payload), bs58.decode(nonce), sharedSecret);
		if(!decryptedData) {
			throw new Error('Unable to decrypt data');
		}
		return JSON.parse(Buffer.from(decryptedData).toString('utf8'));
	}
}

export default Web3Service;
