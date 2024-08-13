import {ethers} from 'ethers';
import {prisma} from "@thewebchimp/primate";

class WalletService {
	static validateWallet(wallet, network) {
		try {
			// Si la red es Solana, usamos una expresión regular específica
			if (network.toLowerCase() === 'solana') {
				return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet);
			}

			// Para EVM y Polkadot, utilizamos la función isAddress de ethers
			return ethers.utils.isAddress(wallet);
		} catch (error) {
			return false;
		}
	}

	/**
	 * Static method to get or create a wallet entry in the database.
	 *
	 * @param {Object} params - The parameters object.
	 * @param {number} params.idUser - The ID of the user.
	 * @param {string} params.address - The wallet address.
	 * @param {string} params.network - The network of the wallet (e.g., Ethereum, Bitcoin).
	 * @returns {Promise<{wallet: string, isNew: boolean}>} - An object containing the wallet address and a flag indicating if a new record was created.
	 * @throws {Error} - Throws an error if any parameter is missing or if the wallet address is invalid.
	 */
	static async getOrCreate({idUser, address, network}) {
		try {

			if (!idUser || !address || !network) {
				throw new Error(`Parameter missing: ${idUser ? 'idUser' : address ? 'address' : 'network'}`);
			}


			if (!this.validateWallet(address, network)) {
				throw new Error('Invalid wallet address');
			}


			let isNew = false;
			let wallet = await prisma.wallet.findFirst({
				where: {
					address,
					network,
					idUser,
				},
			});

			if (!wallet) {
				wallet = await prisma.wallet.create({
					data: {
						address,
						network,
						user: {
							connect: {
								id: idUser,
							},
						},
					},
				});
				isNew = true;
			}

			return {
				wallet: wallet.address,
				isNew,
			}
		} catch (e) {
			throw e;
		}
	}
}

export default WalletService;
