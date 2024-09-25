import { ethers } from 'ethers';
import { prisma } from "@thewebchimp/primate";

/**
 * A service class for handling wallet-related operations.
 */
class WalletService {

    /**
     * Validates a wallet address based on the network type.
     *
     * @param {string} wallet - The wallet address to validate.
     * @param {string} network - The network type (e.g., 'solana', 'ethereum').
     * @returns {boolean} `true` if the wallet address is valid, otherwise `false`.
     */
    static validateWallet(wallet, network) {
        try {
            // If the network is Solana, use a specific regular expression
            if (network.toLowerCase() === 'solana') {
                return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet);
            }

            // For EVM and Polkadot, use ethers' isAddress function
            return ethers.utils.isAddress(wallet);
        } catch (error) {
            return false;
        }
    }

    /**
     * Retrieves an existing wallet entry or creates a new one in the database.
     *
     * @param {Object} params - The parameters object.
     * @param {number} params.idUser - The ID of the user.
     * @param {string} params.address - The wallet address.
     * @param {string} params.network - The network of the wallet (e.g., Ethereum, Solana).
     * @returns {Promise<{wallet: string, isNew: boolean}>} - An object containing the wallet address and a flag indicating if a new record was created.
     * @throws {Error} - Throws an error if any parameter is missing or if the wallet address is invalid.
     */
    static async getOrCreate({ idUser, address, network }) {
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
            };
        } catch (e) {
            throw e;
        }
    }
}

export default WalletService;
