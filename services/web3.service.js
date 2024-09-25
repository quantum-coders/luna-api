import 'dotenv/config';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

/**
 * A service class for performing Web3 related operations.
 */
class Web3Service {

    /**
     * Generates a public key from the provider's secret key.
     *
     * @param {Object} provider - The provider object (unused in the method but required by the API).
     * @param {string} url - The URL associated with the provider (unused in the method but required by the API).
     * @returns {string} The generated public key encoded in base58.
     */
    static generatePublicKey(provider, url) {
        const secretKey = new Uint8Array(process.env.WALLET_SECRET.split(',').map(Number));

        // Derive the public key from the secret key
        const keyPair = nacl.sign.keyPair.fromSeed(secretKey);

        console.log('Public key:', keyPair, keyPair.publicKey);

        return bs58.encode(keyPair.publicKey);
    }

    /**
     * Encodes a payload using the provided encryption public key.
     *
     * @param {string} encryptionPK - The public key used for encryption, encoded in base58.
     * @param {Object} payload - The payload to be encrypted.
     * @returns {Object} An object containing the nonce and encrypted payload, both encoded in base58.
     */
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

    /**
     * Decodes an encrypted payload using the provided encryption public key and nonce.
     *
     * @param {string} encryptionPK - The public key used for decryption, encoded in base58.
     * @param {string} nonce - The nonce used for encryption, encoded in base58.
     * @param {string} payload - The encrypted payload, encoded in base58.
     * @returns {Object} The decrypted payload.
     * @throws {Error} If the payload cannot be decrypted.
     */
    static decodeWalletPayload(encryptionPK, nonce, payload) {
        const secretKey = new Uint8Array(process.env.WALLET_SECRET.split(',').map(Number));
        const sharedSecret = nacl.box.before(bs58.decode(encryptionPK), secretKey);

        const decryptedData = nacl.box.open.after(bs58.decode(payload), bs58.decode(nonce), sharedSecret);
        if (!decryptedData) {
            throw new Error('Unable to decrypt data');
        }
        return JSON.parse(Buffer.from(decryptedData).toString('utf8'));
    }
}

export default Web3Service;
