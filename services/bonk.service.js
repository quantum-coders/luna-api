import {
	Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import {
	getAccount, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import idl from '../assets/idl/spl_token_staking.json' assert { type: 'json' };

/**
 * BonkService class to manage staking and token transactions on the Solana blockchain.
 */
class BonkService {
	static connection = new Connection('https://api.mainnet-beta.solana.com');
	static provider = new anchor.AnchorProvider(
		BonkService.connection,
		new anchor.Wallet(Keypair.generate()), // Dummy wallet
		{ preflightCommitment: 'confirmed' },
	);
	static LOCKED_BONK_PUBLIC_KEY = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
	static PROGRAM_ID = new PublicKey('STAKEkKzbdeKkqzKpLkNQD3SUuLgshDKCD7U8duxAbB');
	static MINT_PUBLIC_KEY = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
	static VAULT_PUBLIC_KEY = new PublicKey('4XHP9YQeeXPXHAjNXuKio1na1ypcxFSqFYBHtptQticd');
	static STAKE_MINT_PUBLIC_KEY = new PublicKey('FYUjeMAFjbTzdMG91RSW5P4HT2sT7qzJQgDPiPG9ez9o');
	static TOKEN_PUBLIC_KEY = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
	static STAKE_POOL_PDA = new PublicKey('9AdEE8AAm1XgJrPEs4zkTPozr3o4U5iGbgvPwkNdLDJ3');

	static program = new anchor.Program(idl, BonkService.PROGRAM_ID, BonkService.provider);

	/**
	 * Ensures the user has sufficient balance for the transaction.
	 * @param {PublicKey} userPublicKey - The public key of the user.
	 * @param {number} requiredBalance - The required balance in SOL.
	 * @throws Will throw an error if the user's balance is insufficient.
	 */
	static async ensureSufficientBalance(userPublicKey, requiredBalance) {
		const balance = await BonkService.connection.getBalance(userPublicKey);
		if (balance < requiredBalance) {
			throw new Error('Insufficient SOL balance for transaction fees.');
		}
	}

	/**
	 * Locks BONK tokens for a specified duration.
	 * @param {PublicKey} userPublicKey - The public key of the user.
	 * @param {number} amount - The amount of BONK tokens to lock.
	 * @param {number} days - The number of days to lock the tokens for.
	 * @returns {Promise<string>} The serialized transaction as a base64 string.
	 */
	static async lockBonk(userPublicKey, amount, days) {
		const nonce = await BonkService.findCurrentNonce(userPublicKey);
		const lockupDuration = new BN(days * 24 * 60 * 60);
		const amountBN = new BN(amount).mul(new BN(1e5));

		const requiredBalance = 0.01 * LAMPORTS_PER_SOL; // Adjust based on expected fees
		await BonkService.ensureSufficientBalance(userPublicKey, requiredBalance);

		const [stakeDepositReceiptPDA] = await PublicKey.findProgramAddress(
			[
				userPublicKey.toBuffer(),
				BonkService.STAKE_POOL_PDA.toBuffer(),
				Buffer.from(new Uint8Array(new BN(nonce).toArray('le', 4))),
				Buffer.from('stakeDepositReceipt'),
			],
			BonkService.PROGRAM_ID,
		);

		const transaction = new Transaction();

		// Create or get the user's token account
		const userTokenAccountAddress = await getAssociatedTokenAddress(
			BonkService.MINT_PUBLIC_KEY,
			userPublicKey,
		);

		const bonkBalance = await getAccount(BonkService.connection, userTokenAccountAddress);

		const userTokenAccountInfo = await BonkService.connection.getAccountInfo(userTokenAccountAddress);
		if (!userTokenAccountInfo) {
			const createUserTokenAccountInstruction = createAssociatedTokenAccountInstruction(
				userPublicKey,
				userTokenAccountAddress,
				userPublicKey,
				BonkService.MINT_PUBLIC_KEY,
			);
			transaction.add(createUserTokenAccountInstruction);
		}

		// Get the associated token account for the destination using the stake mint
		const destinationTokenAccountAddress = await getAssociatedTokenAddress(
			BonkService.STAKE_MINT_PUBLIC_KEY,
			userPublicKey,
		);

		const destinationTokenAccountInfo = await BonkService.connection.getAccountInfo(destinationTokenAccountAddress);
		if (!destinationTokenAccountInfo) {
			const createDestinationTokenAccountInstruction = createAssociatedTokenAccountInstruction(
				userPublicKey,
				destinationTokenAccountAddress,
				userPublicKey,
				BonkService.STAKE_MINT_PUBLIC_KEY,
			);
			transaction.add(createDestinationTokenAccountInstruction);
		}

		// Staking instruction (using the same ATA for source and destination)
		const ix = await BonkService.program.methods
			.deposit(nonce, amountBN, lockupDuration)
			.accounts({
				payer: userPublicKey,
				owner: userPublicKey,
				from: userTokenAccountAddress,
				vault: BonkService.VAULT_PUBLIC_KEY,
				stakeMint: BonkService.STAKE_MINT_PUBLIC_KEY,
				destination: destinationTokenAccountAddress,
				stakePool: BonkService.STAKE_POOL_PDA,
				stakeDepositReceipt: stakeDepositReceiptPDA,
				tokenProgram: TOKEN_PROGRAM_ID,
				rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				systemProgram: SystemProgram.programId,
			})
			.instruction();

		// (Optional) Add additional account if necessary
		ix.keys.push({
			pubkey: new PublicKey('2PPAJ8P5JgKZjkxq4h3kFSwLcuakFYr4fbV68jGghWxi'), // Replace with the correct public key
			isSigner: false,
			isWritable: false,
		});

		transaction.add(ix);

		transaction.feePayer = userPublicKey;
		transaction.recentBlockhash = (await BonkService.connection.getLatestBlockhash()).blockhash;

		// Return the transaction to be signed later
		return transaction.serialize({
			verifySignatures: false,
			requireAllSignatures: false,
		}).toString('base64');
	}

	/**
	 * Finds the current nonce for the user.
	 * @param {PublicKey} userPublicKey - The public key of the user.
	 * @returns {Promise<number>} The current nonce.
	 */
	static async findCurrentNonce(userPublicKey) {
		let nonce = 0;
		for (let i = 0; i < 10; i++) {
			const [stakeDepositReceiptPDA] = await PublicKey.findProgramAddress(
				[
					userPublicKey.toBuffer(),
					BonkService.STAKE_POOL_PDA.toBuffer(),
					Buffer.from(new Uint8Array(new BN(i).toArray('le', 4))),
					Buffer.from('stakeDepositReceipt'),
				],
				BonkService.PROGRAM_ID,
			);
			const stakeDepositInfo = await BonkService.connection.getAccountInfo(stakeDepositReceiptPDA);
			if (!stakeDepositInfo) {
				nonce = i;
				break;
			}
		}
		return nonce;
	}
}

export default BonkService;
