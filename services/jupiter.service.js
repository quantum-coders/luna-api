import {Connection, Keypair, PublicKey, Transaction,} from '@solana/web3.js';
import {LimitOrderProvider} from '@jup-ag/limit-order-sdk';
import {DCA, Network} from '@jup-ag/dca-sdk';
import BN from 'bn.js';
import 'dotenv/config';
import {getMint} from '@solana/spl-token';
import {prisma} from "@thewebchimp/primate";

class JupiterService {
	static connection = new Connection(process.env.SOLANA_RPC_URL);
	static limitOrder = new LimitOrderProvider(JupiterService.connection);
	static dca = new DCA(JupiterService.connection, Network.MAINNET);

	/**
	 * Helper method to serialize transactions.
	 * @param {Transaction} tx - The transaction to serialize.
	 * @param {PublicKey} feePayer - The fee payer's public key.
	 * @param {boolean} requireAllSignatures - Whether all signatures are required.
	 * @param {boolean} verifySignatures - Whether to verify signatures.
	 * @param {Keypair} [partialSigner] - Optional partial signer.
	 * @returns {Promise<string>} - Serialized transaction in base64.
	 */
	static async serializeTransaction(
		tx,
		feePayer,
		requireAllSignatures = false,
		verifySignatures = false,
		partialSigner = null
	) {
		const transaction = tx instanceof Transaction ? tx : new Transaction(tx);
		transaction.feePayer = feePayer;

		const {blockhash} = await JupiterService.connection.getLatestBlockhash();
		transaction.recentBlockhash = blockhash;

		if (partialSigner) {
			transaction.partialSign(partialSigner);
		}

		const serializedTx = transaction.serialize({
			requireAllSignatures,
			verifySignatures,
		});

		return serializedTx.toString('base64');
	}

	/**
	 * Helper method to fetch mint data.
	 * @param {string} mintAddress - The mint address.
	 * @returns {Promise<Object>} - Mint data.
	 */
	static async fetchMintData(mintAddress) {
		const mint = new PublicKey(mintAddress);
		const mintData = await getMint(JupiterService.connection, mint);
		if (!mintData) {
			throw new Error(`Invalid mint address: ${mintAddress}`);
		}
		return mintData;
	}

	/**
	 * Fetches DCA (Dollar-Cost Averaging) data.
	 * @param {string} dcaPubKey - The public key of the DCA.
	 * @returns {Promise<Object>} - Raw DCA data.
	 */
	static async getDCA(dcaPubKey) {
		const dca = JupiterService.dca;
		return await dca.fetchDCA(new PublicKey(dcaPubKey));
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
		const dca = JupiterService.dca;

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
			startAt: null,
		};

		const {tx} = await dca.createDcaV2(params);
		return await JupiterService.serializeTransaction(tx, payer);
	}

	/**
	 * Closes a DCA and returns the encoded transaction.
	 * @param {string} payerPublicKey - The public key of the payer.
	 * @param {string} dcaPubKey - The public key of the DCA to close.
	 * @returns {Promise<string>} - Encoded transaction in base64 format.
	 */
	static async closeDCA(payerPublicKey, dcaPubKey) {
		const payer = new PublicKey(payerPublicKey);
		const dca = JupiterService.dca;

		const params = {
			user: payer,
			dca: new PublicKey(dcaPubKey),
		};

		const {tx} = await dca.closeDCA(params);
		return await JupiterService.serializeTransaction(tx, payer);
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
		const limitOrder = JupiterService.limitOrder;

		const [inputMintData, outputMintData] = await Promise.all([
			JupiterService.fetchMintData(inputMint),
			JupiterService.fetchMintData(outputMint),
		]);

		const inputAmount = inAmount * Math.pow(10, inputMintData.decimals);
		const outputAmount = outAmount * Math.pow(10, outputMintData.decimals);

		if (!inputMintData || !outputMintData) {
			throw new Error('Invalid input or output mint');
		}

		// Generar Keypair
		const baseKeypair = Keypair.generate();

		const params = {
			owner,
			inAmount: new BN(inputAmount),
			outAmount: new BN(outputAmount),
			inputMint: new PublicKey(inputMint),
			outputMint: new PublicKey(outputMint),
			expiredAt,
			base: baseKeypair.publicKey, // Mantener base como PublicKey
		};

		console.info('Parameters are:', params);
		const {tx} = await limitOrder.createOrder(params);

		// Serializar y firmar la transacción
		return await JupiterService.serializeTransaction(tx, owner, false, false, baseKeypair);
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

		const {tx} = await limitOrder.cancelOrder(params);
		return await JupiterService.serializeTransaction(tx, owner);
	}

	static async getOrder(orderPublicKey) {
		const limitOrder = JupiterService.limitOrder;
		return await limitOrder.getOrder(new PublicKey(orderPublicKey));
	}

	static async getOrdersByAccount(accountPublicKey) {
		try {
			console.info(`\n===== START: Fetching orders for account: ${accountPublicKey} =====\n`);

			// Step 1: Log the query intent
			console.info(`Querying the database for orders where maker = ${accountPublicKey}...`);

			// Step 2: Query the database for orders where the maker matches the accountPublicKey
			const orders = await prisma.jupiterOrder.findMany({
				where: {
					maker: accountPublicKey
				}
			});

			// Step 3: Check if any orders were found
			if (orders.length === 0) {
				console.info(`No orders found for account: ${accountPublicKey}`);
				console.info(`\n===== END: No orders found for account: ${accountPublicKey} =====\n`);
				return [];
			}

			// Step 4: Log the number of orders found
			console.info(`Found ${orders.length} order(s) for account: ${accountPublicKey}`);

			// Step 5: Iterate through the found orders and log their details
			orders.forEach((order, index) => {
				console.info(`\n----- Order #${index + 1} -----`);
				console.info(`Public Key: ${order.publicKey}`);
				console.info(`Maker: ${order.maker}`);
				console.info(`Input Mint: ${order.inputMint}`);
				console.info(`Output Mint: ${order.outputMint}`);
				console.info(`Original Making Amount: ${order.originalMakingAmount}`);
				console.info(`Original Taking Amount: ${order.originalTakingAmount}`);
				console.info(`Making Amount: ${order.makingAmount}`);
				console.info(`Taking Amount: ${order.takingAmount}`);
				console.info(`Maker Input Account: ${order.makerInputAccount}`);
				console.info(`Maker Output Account: ${order.makerOutputAccount}`);
				console.info(`Reserve: ${order.reserve}`);
				console.info(`Borrow Making Amount: ${order.borrowMakingAmount}`);
				console.info(`Expired At: ${order.expiredAt}`);
				console.info(`Base: ${order.base}`);
				console.info(`Referral: ${order.referral}`);
				console.info(`Waiting: ${order.waiting}`);
				console.info(`Created At: ${order.createdAt}`);
				console.info(`Updated At: ${order.updatedAt}`);
				console.info(`-----------------------------`);
			});

			console.info(`\n===== END: Successfully fetched and displayed ${orders.length} orders for account: ${accountPublicKey} =====\n`);
			return orders;

		} catch (error) {
			// Detailed error logging
			console.error(`Error fetching orders for account: ${accountPublicKey}: `, error);
			throw error;
		} finally {
			// Log at the end and close the connection
			console.info(`Closing database connection...\n`);
			await prisma.$disconnect();
			console.info(`Database connection closed.\n`);
		}
	}

	static async getAndSaveOrders() {
		const limitOrder = JupiterService.limitOrder;
		console.info("===== START: Fetching and Saving Orders =====");

		try {
			// Step 1: Fetch all orders
			console.info("Fetching all orders from JupiterService...");
			const orders = await limitOrder.getOrders();
			console.info(`Total orders fetched: ${orders.length}`);

			if (orders.length === 0) {
				console.info("No orders fetched. Exiting function.");
				return;
			}

			// Step 2: Iterate through the fetched orders and perform an upsert for each
			for (const [index, order] of orders.entries()) {
				console.info(`Processing Order #${index + 1}/${orders.length}`);
				console.log(`Order #${index + 1} Account Structure:`, order.account);

				// Convert PublicKey objects to strings using toBase58()
				const maker = order.account.maker ? order.account.maker.toBase58() : null;

				if (!maker) {
					console.warn(`Skipping Order #${index + 1} due to null maker.`);
					continue;
				}

				const mappedOrder = {
					publicKey: order.publicKey.toBase58(),
					maker: maker,
					inputMint: order.account.inputMint ? order.account.inputMint.toBase58() : null,
					outputMint: order.account.outputMint ? order.account.outputMint.toBase58() : null,
					originalMakingAmount: order.account.oriMakingAmount ? order.account.oriMakingAmount.toString() : null,
					originalTakingAmount: order.account.oriTakingAmount ? order.account.oriTakingAmount.toString() : null,
					makingAmount: order.account.makingAmount ? order.account.makingAmount.toString() : null,
					takingAmount: order.account.takingAmount ? order.account.takingAmount.toString() : null,
					makerInputAccount: order.account.makerInputAccount ? order.account.makerInputAccount.toBase58() : null,
					makerOutputAccount: order.account.makerOutputAccount ? order.account.makerOutputAccount.toBase58() : null,
					reserve: order.account.reserve ? order.account.reserve.toBase58() : null,
					borrowMakingAmount: order.account.borrowMakingAmount ? order.account.borrowMakingAmount.toString() : null,
					expiredAt: order.account.expiredAt ? new Date(order.account.expiredAt) : null,
					base: order.account.base ? order.account.base.toBase58() : null,
					referral: order.account.referral ? order.account.referral.toBase58() : null,
					waiting: order.account.waiting
				};

				console.info(`Upserting Order with publicKey: ${mappedOrder.publicKey}`);

				try {
					await prisma.jupiterOrder.upsert({
						where: {
							publicKey: mappedOrder.publicKey, // Unique key to find existing records
						},
						update: {
							maker: mappedOrder.maker,
							inputMint: mappedOrder.inputMint,
							outputMint: mappedOrder.outputMint,
							originalMakingAmount: mappedOrder.originalMakingAmount,
							originalTakingAmount: mappedOrder.originalTakingAmount,
							makingAmount: mappedOrder.makingAmount,
							takingAmount: mappedOrder.takingAmount,
							makerInputAccount: mappedOrder.makerInputAccount,
							makerOutputAccount: mappedOrder.makerOutputAccount,
							reserve: mappedOrder.reserve,
							borrowMakingAmount: mappedOrder.borrowMakingAmount,
							expiredAt: mappedOrder.expiredAt,
							base: mappedOrder.base,
							referral: mappedOrder.referral,
							waiting: mappedOrder.waiting,
						},
						create: mappedOrder, // Create the order if it doesn't exist
					});
					console.info(`Successfully upserted Order with publicKey: ${mappedOrder.publicKey}`);
				} catch (upsertError) {
					console.error(`Error upserting Order with publicKey: ${mappedOrder.publicKey}: `, upsertError);
				}
			}

			console.info(`===== END: Successfully upserted ${orders.length} orders to the database =====`);

		} catch (error) {
			console.error("Error fetching or saving orders: ", error);
			throw error;
		} finally {
			// Ensure Prisma client is disconnected after operations
			console.info("Closing database connection...");
			await prisma.$disconnect();
			console.info("Database connection closed.");
		}
	}

	static async getJupiterOrders(accountPublicKey) {
		const limitOrder = JupiterService.limitOrder;
		console.info(`Fetching orders for account: ${accountPublicKey}`);
		return await limitOrder.getOrderHistory({
			wallet: accountPublicKey,
			take: 10,
		});
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

export default JupiterService;
