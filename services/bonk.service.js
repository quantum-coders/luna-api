import {
    Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import {
    getAccount, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID,
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

        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
            BonkService.connection,
            userPublicKey,
            BonkService.TOKEN_PUBLIC_KEY,
            userPublicKey,
            true
        );
        console.log('userTokenAccount:', userTokenAccount.address.toBase58());

        const userTokenBalance = await BonkService.connection.getTokenAccountBalance(userTokenAccount.address);
        console.log('userTokenBalance:', userTokenBalance.value.amount);

        if (userTokenBalance.value.amount < amountBN.toString()) {
            throw new Error("Insufficient token balance for staking.");
        }

        // wait 3 seconds to avoid nonce collision
        await new Promise(resolve => setTimeout(resolve, 3000));

        const destinationTokenAccount = await getAssociatedTokenAddress(
            BonkService.STAKE_MINT_PUBLIC_KEY,
            userPublicKey
        );
        console.log('destinationTokenAccount:', destinationTokenAccount);
        console.log('destinationTokenAccount:', destinationTokenAccount.toBase58());

        const ix = await BonkService.program.methods
            .deposit(nonce, amountBN, lockupDuration)
            .accounts({
                payer: userPublicKey,
                owner: userPublicKey,
                from: userTokenAccount.address,
                vault: BonkService.VAULT_PUBLIC_KEY,
                stakeMint: BonkService.STAKE_MINT_PUBLIC_KEY,
                destination: destinationTokenAccount,
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

        const tx = new Transaction();
        tx.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 6851612 }));
        tx.add(ix);
        tx.feePayer = userPublicKey;
        tx.recentBlockhash = (await BonkService.connection.getLatestBlockhash()).blockhash;
        console.log('Transaction prepared:', tx);

        return tx; // Return the unsigned transaction
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
