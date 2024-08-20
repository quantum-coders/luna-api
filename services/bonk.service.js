import {
	Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import {
	getAccount, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import idl from '../assets/idl/spl_token_staking.json' assert { type: 'json' };
import chalk from 'chalk'; // Import chalk

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

	static async ensureSufficientBalance(userPublicKey, requiredBalance) {
		const balance = await BonkService.connection.getBalance(userPublicKey);
		if(balance < requiredBalance) {
			throw new Error('Insufficient SOL balance for transaction fees.');
		}
	}

	static async lockBonk(userPublicKey, amount, days) {
		console.log(chalk.green('lockBonk called with:'), chalk.blue(JSON.stringify({
			userPublicKey: userPublicKey.toBase58(),
			amount,
			days,
		})));

		const nonce = await BonkService.findCurrentNonce(userPublicKey);
		console.log(chalk.green('Nonce found:'), chalk.blue(nonce));

		const lockupDuration = new BN(days * 24 * 60 * 60);
		const amountBN = new BN(amount).mul(new BN(1e5));
		console.log(chalk.green('lockupDuration:'), chalk.blue(lockupDuration.toString()));
		console.log(chalk.green('amountBN:'), chalk.blue(amountBN.toString()));

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
		console.log(chalk.green('stakeDepositReceiptPDA:'), chalk.blue(stakeDepositReceiptPDA.toBase58()));

		const transaction = new Transaction();

		// Crear o obtener la cuenta de token del usuario
		const userTokenAccountAddress = await getAssociatedTokenAddress(
			BonkService.MINT_PUBLIC_KEY,
			userPublicKey,
		);
		console.log(chalk.green('userTokenAccountAddress:'), chalk.blue(userTokenAccountAddress.toBase58()));
		/// console log bonk balance
		const bonkBalance = await getAccount(BonkService.connection, userTokenAccountAddress);
		console.log(chalk.green('------------>bonkBalance:'), chalk.blue(bonkBalance.amount.toString()));

		const userTokenAccountInfo = await BonkService.connection.getAccountInfo(userTokenAccountAddress);
		if(!userTokenAccountInfo) {
			console.log(chalk.yellow('Creating user token account'));
			const createUserTokenAccountInstruction = createAssociatedTokenAccountInstruction(
				userPublicKey, // Pagador de la transacción (puede ser diferente al dueño de la ATA)
				userTokenAccountAddress,
				userPublicKey, // Dueño de la ATA
				BonkService.MINT_PUBLIC_KEY,
			);
			transaction.add(createUserTokenAccountInstruction);
		} else {
			console.log(chalk.green('User token account already exists'));
		}

		/// now get the associated token account for destination which uses stake mint
		const destinationTokenAccountAddress = await getAssociatedTokenAddress(
			BonkService.STAKE_MINT_PUBLIC_KEY,
			userPublicKey,
		);
		console.log(chalk.green('destinationTokenAccountAddress:'), chalk.blue(destinationTokenAccountAddress.toBase58()));
		const destinationTokenAccountInfo = await BonkService.connection.getAccountInfo(destinationTokenAccountAddress);
		if(!destinationTokenAccountInfo) {
			console.log(chalk.yellow('Creating destination token account'));
			const createDestinationTokenAccountInstruction = createAssociatedTokenAccountInstruction(
				userPublicKey, // Pagador de la transacción (puede ser diferente al dueño de la ATA)
				destinationTokenAccountAddress,
				userPublicKey, // Dueño de la ATA
				BonkService.STAKE_MINT_PUBLIC_KEY,
			);
			transaction.add(createDestinationTokenAccountInstruction);
		}

		// Instrucción de staking (usando la misma ATA para origen y destino)
		const ix = await BonkService.program.methods
			.deposit(nonce, amountBN, lockupDuration)
			.accounts({
				payer: userPublicKey, // Pagador de la transacción (puede ser diferente al dueño de la ATA)
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

		// (Opcional) Agregar la cuenta adicional si es necesario
		ix.keys.push({
			pubkey: new PublicKey('2PPAJ8P5JgKZjkxq4h3kFSwLcuakFYr4fbV68jGghWxi'), // Reemplaza con la clave pública correcta
			isSigner: false,
			isWritable: false,
		});

		transaction.add(ix);

		transaction.feePayer = userPublicKey; // El pagador de la tarifa puede ser diferente al propietario de la ATA
		transaction.recentBlockhash = (await BonkService.connection.getLatestBlockhash()).blockhash;

		// return the transaction to be able to sign it later
		return transaction.serialize({
			verifySignatures: false,
			requireAllSignatures: false,
		}).toString('base64');
	}

	static async findCurrentNonce(userPublicKey) {
		console.log(chalk.green('Finding current nonce for userPublicKey:'), chalk.blue(userPublicKey.toBase58()));
		let nonce = 0;
		for(let i = 0; i < 10; i++) {
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
			if(!stakeDepositInfo) {
				nonce = i;
				break;
			}
		}
		console.log(chalk.green('Current nonce:'), chalk.blue(nonce));
		return nonce;
	}
}

export default BonkService;