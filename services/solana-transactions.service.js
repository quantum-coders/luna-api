import {
	Authorized,
	ComputeBudgetProgram,
	Connection,
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	StakeProgram,
	SystemProgram,
	Transaction,
	TransactionInstruction,
} from '@solana/web3.js';
import 'dotenv/config';
import { Wallet } from '@coral-xyz/anchor';
import { getMint } from '@solana/spl-token';

const connection = new Connection(process.env.SOLANA_RPC_URL);

/**
 * A builder class for creating and managing Solana transactions.
 */
class SolanaTransactionBuilder {
	/**
	 * Creates an instance of SolanaTransactionBuilder.
	 * @param {Connection} connection - The connection object to the Solana cluster.
	 */
	constructor(connection) {
		this.connection = connection;
	}

	/**
	 * Builds a transaction for transferring SOL from one account to another.
	 * @param {PublicKey} fromPubkey - The public key of the sender.
	 * @param {PublicKey} toPubkey - The public key of the recipient.
	 * @param {number} amount - The amount of SOL to transfer.
	 * @returns {Promise<string>} - The serialized transaction in base64 format.
	 * @throws {Error} - If the amount is insufficient to cover rent exemption.
	 */
	async buildTransferSolTransaction(fromPubkey, toPubkey, amount) {
		const minimumBalance = await this.connection.getMinimumBalanceForRentExemption(0);
		if (amount * LAMPORTS_PER_SOL < minimumBalance) {
			throw new Error(`Insufficient SOL to cover rent exemption for ${toPubkey.toBase58()}`);
		}

		const transferInstruction = SystemProgram.transfer({
			fromPubkey,
			toPubkey,
			lamports: amount * LAMPORTS_PER_SOL,
		});

		const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
		const transaction = new Transaction({
			feePayer: fromPubkey,
			blockhash,
			lastValidBlockHeight,
		}).add(transferInstruction);

		return transaction.serialize({
			verifySignatures: false,
			requireAllSignatures: false,
		}).toString('base64');
	}

	/**
	 * Builds a transaction for staking SOL to a validator.
	 * @param {PublicKey} fromPubkey - The public key of the staker.
	 * @param {PublicKey} validatorPubkey - The public key of the validator to delegate to.
	 * @param {number} amount - The amount of SOL to stake.
	 * @returns {Promise<string>} - The serialized transaction in base64 format.
	 * @throws {Error} - If the stake amount is less than the minimum required delegation.
	 */
	async buildStakeTransaction(fromPubkey, validatorPubkey, amount) {
		const minStake = await this.connection.getStakeMinimumDelegation();
		if (amount < minStake.value) {
			throw new Error(`The minimum stake amount is ${minStake.value}`);
		}

		const stakeKeypair = Keypair.generate();

		const transaction = new Transaction().add(
			StakeProgram.createAccount({
				stakePubkey: stakeKeypair.publicKey,
				authorized: new Authorized(fromPubkey, fromPubkey),
				fromPubkey,
				lamports: amount * LAMPORTS_PER_SOL,
			}),
			StakeProgram.delegate({
				stakePubkey: stakeKeypair.publicKey,
				authorizedPubkey: fromPubkey,
				votePubkey: validatorPubkey,
			}),
		);

		transaction.feePayer = fromPubkey;
		transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
		transaction.partialSign(stakeKeypair);

		return transaction.serialize({
			verifySignatures: false,
			requireAllSignatures: false,
		}).toString('base64');
	}

	/**
	 * Builds a transaction for creating a memo on the Solana blockchain.
	 * @param {PublicKey} fromPubkey - The public key of the sender.
	 * @param {string} message - The memo message to be recorded on the blockchain.
	 * @returns {Promise<string>} - The serialized transaction in base64 format.
	 */
	async buildMemoTransaction(fromPubkey, message) {
		const transaction = new Transaction().add(
			ComputeBudgetProgram.setComputeUnitPrice({
				microLamports: 1000,
			}),
			new TransactionInstruction({
				programId: new PublicKey(process.env.MEMO_PROGRAM_ID),
				data: Buffer.from(message, 'utf8'),
				keys: [],
			}),
		);

		transaction.feePayer = fromPubkey;
		transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

		return transaction.serialize({
			verifySignatures: false,
			requireAllSignatures: false,
		}).toString('base64');
	}

	/**
	 * Builds a swap transaction using the Jupiter API.
	 * @param {PublicKey} publicKey - The public key of the user initiating the swap.
	 * @param {string} inputMint - The mint address of the input token.
	 * @param {string} outputMint - The mint address of the output token.
	 * @param {number} amount - The amount of input tokens to swap.
	 * @param {number} [slippageBps=0.5] - The slippage tolerance in basis points.
	 * @param {string|null} [destinationWallet=null] - The destination wallet for the output tokens.
	 * @returns {Promise<string>} - The swap transaction serialized in base64 format.
	 * @throws {Error} - If the input or output mint is invalid, or if the slippage exceeds 10%.
	 */
	async buildSwapTransaction(publicKey,
	                           inputMint,
	                           outputMint,
	                           amount,
	                           slippageBps = 0.5,
	                           destinationWallet = null) {
		const inputMintData = await getMint(this.connection, new PublicKey(inputMint));
		const outputMintData = await getMint(this.connection, new PublicKey(outputMint));
		if (!inputMintData || !outputMintData) {
			throw new Error('Invalid input or output mint');
		}

		// Max of slippage is 10%
		if (slippageBps > 10) {
			throw new Error('Slippage must be less than 10%');
		}

		const inputDecimals = inputMintData.decimals;
		const inputAmount = amount * Math.pow(10, inputDecimals);
		const slippagePercentage = slippageBps * 100;
		console.info("slippagePercentage", slippagePercentage);
		const walletPublicKey = new PublicKey(publicKey);
		let urlGet = `${process.env.JUPITER_SWAP_QUOTE_API_URL}`;
		urlGet += `?inputMint=${inputMint}&outputMint=${outputMint}`;
		urlGet += `&amount=${inputAmount}&slippageBps=${slippagePercentage}`;
		urlGet += `&swapMode=ExactIn`;

		const quoteResponseData = await fetch(urlGet);
		const quoteResponse = await quoteResponseData.json();
		console.info('quoteResponse', quoteResponse);
		const response = await fetch(`${process.env.JUPITER_SWAP_API_URL}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dynamicComputeUnitLimit: true,
				prioritizationFeeLamports: 'auto',
				quoteResponse,
				userPublicKey: walletPublicKey.toString(),
				wrapAndUnwrapSol: true,
			}),
		});
		console.info('response', response);
		const jsonResponse = await response.json();

		if (jsonResponse?.error || !jsonResponse?.swapTransaction) {
			throw new Error(jsonResponse.error);
		}
		return jsonResponse.swapTransaction;
	}
}

export default new SolanaTransactionBuilder(connection);
