import {
    Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import {
    getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import idl from '../assets/idl/spl_token_staking.json' assert {type: 'json'};
import MetaplexService from "./metaplex.service.js";

class BonkService {
    static connection = new Connection(process.env.SOLANA_RPC_URL);
    static provider = new anchor.AnchorProvider(
        BonkService.connection,
        new anchor.Wallet(Keypair.generate()), // Dummy wallet
        {preflightCommitment: 'confirmed'}
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
        console.log(`Balance for ${userPublicKey.toBase58()}: ${balance}`);
        if (balance < requiredBalance) {
            throw new Error("Insufficient SOL balance for transaction fees.");
        }
    }

    static async lockBonk(userPublicKey, amount, days) {
        console.log('lockBonk called with:', { userPublicKey: userPublicKey.toBase58(), amount, days });

        const nonce = await BonkService.findCurrentNonce(userPublicKey);
        console.log('Nonce found:', nonce);

        const lockupDuration = new BN(days * 24 * 60 * 60); // Convert days to seconds and then to BN
        const amountBN = new BN(amount).mul(new BN(1e5)); // Convert amount to BN with 5 decimals
        console.log('lockupDuration:', lockupDuration.toString());
        console.log('amountBN:', amountBN.toString());

        const requiredBalance = 0.01 * LAMPORTS_PER_SOL; // Adjust based on expected fees
        await BonkService.ensureSufficientBalance(userPublicKey, requiredBalance);

        const [stakeDepositReceiptPDA] = await PublicKey.findProgramAddress(
            [
                userPublicKey.toBuffer(),
                BonkService.STAKE_POOL_PDA.toBuffer(),
                Buffer.from(new Uint8Array(new BN(nonce).toArray('le', 4))),
                Buffer.from('stakeDepositReceipt')
            ],
            BonkService.PROGRAM_ID
        );
        console.log('stakeDepositReceiptPDA:', stakeDepositReceiptPDA.toBase58());

        const transaction = new Transaction();

        // Create or get the user token account manually
        const userTokenAccountAddress = await PublicKey.findProgramAddress(
            [
                userPublicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                BonkService.TOKEN_PUBLIC_KEY.toBuffer()
            ],
            TOKEN_PROGRAM_ID
        );

        const userTokenAccountInfo = await BonkService.connection.getAccountInfo(userTokenAccountAddress[0]);
        if (!userTokenAccountInfo) {
            const createUserTokenAccountInstruction = createAssociatedTokenAccountInstruction(
                userPublicKey,
                userTokenAccountAddress[0],
                userPublicKey,
                BonkService.TOKEN_PUBLIC_KEY
            );
            transaction.add(createUserTokenAccountInstruction);
        }

        // Create or get the destination token account manually
        const destinationTokenAccountAddress = await PublicKey.findProgramAddress(
            [
                userPublicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                BonkService.STAKE_MINT_PUBLIC_KEY.toBuffer()
            ],
            TOKEN_PROGRAM_ID
        );
        let  createDestinationTokenAccountInstruction;
        const destinationTokenAccountInfo = await BonkService.connection.getAccountInfo(destinationTokenAccountAddress[0]);
        if (!destinationTokenAccountInfo) {
            createDestinationTokenAccountInstruction = createAssociatedTokenAccountInstruction(
                userPublicKey,
                destinationTokenAccountAddress[0],
                userPublicKey,
                BonkService.STAKE_MINT_PUBLIC_KEY
            );
            transaction.add(createDestinationTokenAccountInstruction);
        }

        // Add the staking instruction after creating the token accounts
        const ix = await BonkService.program.methods
            .deposit(nonce, amountBN, lockupDuration)
            .accounts({
                payer: userPublicKey,
                owner: userPublicKey,
                from: userTokenAccountAddress[0],
                vault: BonkService.VAULT_PUBLIC_KEY,
                stakeMint: BonkService.STAKE_MINT_PUBLIC_KEY,
                destination: destinationTokenAccountAddress[0],
                stakePool: BonkService.STAKE_POOL_PDA,
                stakeDepositReceipt: stakeDepositReceiptPDA,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        ix.keys.push({
            pubkey: new PublicKey("2PPAJ8P5JgKZjkxq4h3kFSwLcuakFYr4fbV68jGghWxi"),
            isSigner: false,
            isWritable: false,
        });

        transaction.add(ix);
        /// reverse the order of the transaction
        transaction[0] = transaction[1];
        transaction[1] = createDestinationTokenAccountInstruction;
        transaction.feePayer = userPublicKey;
        transaction.recentBlockhash = (await BonkService.connection.getLatestBlockhash()).blockhash;
        console.log('Transaction prepared:', transaction);

        return transaction; // Return the unsigned transaction
    }

    static async findCurrentNonce(userPublicKey) {
        let nonce = 0;
        for (let i = 0; i < 10; i++) {
            const [stakeDepositReceiptPDA] = await PublicKey.findProgramAddress(
                [
                    userPublicKey.toBuffer(),
                    BonkService.STAKE_POOL_PDA.toBuffer(),
                    Buffer.from(new Uint8Array(new BN(i).toArray('le', 4))),
                    Buffer.from('stakeDepositReceipt')
                ],
                BonkService.PROGRAM_ID
            );
            const stakeDepositInfo = await BonkService.connection.getAccountInfo(stakeDepositReceiptPDA);
            if (!stakeDepositInfo) {
                nonce = i;
                break;
            }
        }
        console.log(`Nonce found for ${userPublicKey.toBase58()}: ${nonce}`);
        return nonce;
    }
}

export default BonkService;