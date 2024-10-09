import {Connection, Keypair, PublicKey, Transaction,} from '@solana/web3.js';
import {LimitOrderProvider} from '@jup-ag/limit-order-sdk';
import {DCA, Network} from '@jup-ag/dca-sdk';
import fetch from 'cross-fetch';
import BN from 'bn.js';
import 'dotenv/config';
import {getMint} from "@solana/spl-token";

class JupiterService {
	static connection = new Connection(process.env.SOLANA_RPC_URL);
	static limitOrder = new LimitOrderProvider(this.connection);

	/**
	 * Fetches DCA (Dollar-Cost Averaging) data.
	 * @param {string} dcaPubKey - The public key of the DCA.
	 * @returns {Promise<Object>} - Raw DCA data.
	 */
	static async getDCA(dcaPubKey) {
		const connection = new Connection(process.env.SOLANA_RPC_URL);
		const dca = new DCA(connection, Network.MAINNET);
		const dcaDataRaw = await dca.fetchDCA(new PublicKey(dcaPubKey));
		return dcaDataRaw;
	}

	/**
	 * Creates a DCA and returns the encoded transaction.
	 * @param {string} payerPublicKey - The public key of the payer.
	 * @param {string} inputMint - The mint address of the input token.
	 * @param {string} outputMint - The mint address of the output token.
	 * @param {bigint} inAmount - The total amount for DCA.
	 * @param {bigint} inAmountPerCycle - The amount per DCA cycle.
	 * @param {bigint} cycleSecondsApart - The time interval between cycles.
	 * @returns {Promise<string>} - Encoded transaction in base64 format.
	 */
	static async createDCA(
		payerPublicKey,
		inputMint,
		outputMint,
		inAmount,
		inAmountPerCycle,
		cycleSecondsApart
	) {
		const payer = new PublicKey(payerPublicKey);
		const connection = new Connection(process.env.SOLANA_RPC_URL);
		const dca = new DCA(connection, Network.MAINNET);

		const params = {
			payer,
			user: payer,
			inAmount,
			inAmountPerCycle,
			cycleSecondsApart,
			inputMint: new PublicKey(inputMint),
			outputMint: new PublicKey(outputMint),
			minOutAmountPerCycle: null,
			maxOutAmountPerCycle: null,
			startAt: null
		};

		const {tx} = await dca.createDcaV2(params);

		// Return serialized transaction in base64 format
		return tx.serialize().toString('base64');
	}

	/**
	 * Closes a DCA and returns the encoded transaction.
	 * @param {string} payerPublicKey - The public key of the payer.
	 * @param {string} dcaPubKey - The public key of the DCA to close.
	 * @returns {Promise<string>} - Encoded transaction in base64 format.
	 */
	static async closeDCA(payerPublicKey, dcaPubKey) {
		const payer = new PublicKey(payerPublicKey);
		const connection = new Connection(process.env.SOLANA_RPC_URL);
		const dca = new DCA(connection, Network.MAINNET);

		const params = {
			user: payer,
			dca: new PublicKey(dcaPubKey),
		};

		const {tx} = await dca.closeDCA(params);

		// Return serialized transaction in base64 format
		return tx.serialize().toString('base64');
	}

	/**
	 * Creates a limit order and returns the encoded transaction.
	 * @param {string} ownerPublicKey - The public key of the order owner.
	 * @param {string} inAmount - The input token amount for the order.
	 * @param {string} outAmount - The output token amount for the order.
	 * @param {string} inputMint - The mint address of the input token.
	 * @param {string} outputMint - The mint address of the output token.
	 * @param {number|null} expiredAt - The expiration timestamp (optional).
	 * @returns {Promise<string>} - Encoded transaction in base64 format.
	 */
	static async createLimitOrder(
		ownerPublicKey,
		inAmount,
		outAmount,
		inputMint,
		outputMint,
		expiredAt = null
	) {
		const owner = new PublicKey(ownerPublicKey);
		const base = Keypair.generate(); // Asegúrate de que este Keypair tenga fondos si es necesario
		const limitOrder = JupiterService.limitOrder;

		const inputMintData = await getMint(this.connection, new PublicKey(inputMint));
		const outputMintData = await getMint(this.connection, new PublicKey(outputMint));

		const inputDecimals = inputMintData.decimals;
		const inputAmount = inAmount * Math.pow(10, inputDecimals);

		const outputDecimals = outputMintData.decimals;
		const outputAmount = outAmount * Math.pow(10, outputDecimals);

		if (!inputMintData || !outputMintData) {
			throw new Error('Invalid input or output mint');
		}

		const params = {
			owner,
			inAmount: new BN(inputAmount),
			outAmount: new BN(outputAmount),
			inputMint: new PublicKey(inputMint),
			outputMint: new PublicKey(outputMint),
			expiredAt,
			base: base.publicKey,
		};

		console.info("Parameters are: ", params);
		const {tx} = await limitOrder.createOrder(params);

		const transaction = tx instanceof Transaction ? tx : new Transaction(tx);

		const { blockhash} = await this.connection.getLatestBlockhash();

		transaction.feePayer = owner;

		transaction.recentBlockhash = blockhash;

		transaction.partialSign(base);

		const serializedTx = transaction.serialize({
			requireAllSignatures: false, // Ajusta según tus necesidades
			verifySignatures: false,     // Ajusta según tus necesidades
		});

		return serializedTx.toString('base64');
	}

	/**
	 * Cancels a limit order and returns the encoded transaction.
	 * @param {string} ownerPublicKey - The public key of the order owner.
	 * @param {string} orderPubKey - The public key of the order to cancel.
	 * @returns {Promise<string>} - Encoded transaction in base64 format.
	 */
	static async cancelOrder(ownerPublicKey, orderPubKey) {
		const owner = new PublicKey(ownerPublicKey);
		const limitOrder = JupiterService.limitOrder;

		const params = {
			owner,
			orderPubKey: new PublicKey(orderPubKey),
		};

		const tx = await limitOrder.cancelOrder(params);

		// Return serialized transaction in base64 format
		return tx.serialize().toString('base64');
	}

	/**
	 * Fetches all open orders for the given wallet.
	 * @param {string} ownerPublicKey - The public key of the wallet.
	 * @returns {Promise<Object>} - JSON object containing open orders.
	 */
	static async getOpenOrders(ownerPublicKey) {
		const url = `${process.env.JUPITER_AG_API_URL}/limit/v1/openOrders?wallet=${ownerPublicKey}`;
		const response = await fetch(url);
		return response.json();
	}

	/**
	 * Fetches the trade history for the given wallet.
	 * @param {string} ownerPublicKey - The public key of the wallet.
	 * @returns {Promise<Object>} - JSON object containing trade history.
	 */
	static async getTradeHistory(ownerPublicKey) {
		const owner = new PublicKey(ownerPublicKey);
		const tradeHistory = await JupiterService.limitOrder.getTradeHistory({
			wallet: owner.toBase58(),
			take: 20,
		});
		return tradeHistory;
	}

	/**
	 * Fetches the order history for the given wallet.
	 * @param {string} ownerPublicKey - The public key of the wallet.
	 * @returns {Promise<Object>} - JSON object containing order history.
	 */
	static async getOrderHistory(ownerPublicKey) {
		const owner = new PublicKey(ownerPublicKey);
		const orderHistory = await JupiterService.limitOrder.getOrderHistory({
			wallet: owner.toBase58(),
			take: 20,
		});
		return orderHistory;
	}

	static async queryPriceApi(query) {
		try {
			const response = await fetch(`${process.env.JUPITER_QUOTE_API_URL}?${query}`);
			return await response.json();
		} catch (e) {
			console.error("ERROR", e);
			throw new Error(e.message);
		}
	}
}

export {JupiterService};
