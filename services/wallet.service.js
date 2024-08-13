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

	static async create({ idUser, address, network }) {
		try {
			// Crear una nueva wallet en la base de datos
			return await prisma.wallet.create({
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
		} catch (e) {
			throw e;
		}
	}
}

export default WalletService;
