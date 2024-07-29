import {Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair, Transaction} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import chalk from 'chalk';

import idl from '../assets/idl/spl_token_staking.json' assert {type: "json"};
import {Metaplex} from "@metaplex-foundation/js";
import MetaplexService from "./metaplex.service.js";

class BonkService {
    static connection = new Connection(process.env.SOLANA_RPC_URL);

    static provider = new anchor.AnchorProvider(
        BonkService.connection,
        new anchor.Wallet(Keypair.generate()), // Use a dummy wallet here, will be replaced with userKeyPair in methods
        {
            preflightCommitment: 'confirmed',
        }
    );

    static LOCKED_BONK_PUBLIC_KEY = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    static STAKE_POOL_PDA = new PublicKey('9AdEE8AAm1XgJrPEs4zkTPozr3o4U5iGbgvPwkNdLDJ3');
    static MINT_PUBLIC_KEY = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
    static VAULT_PUBLIC_KEY = new PublicKey('4XHP9YQeeXPXHAjNXuKio1na1ypcxFSqFYBHtptQticd');
    static STAKE_MINT_PUBLIC_KEY = new PublicKey('FYUjeMAFjbTzdMG91RSW5P4HT2sT7qzJQgDPiPG9ez9o');
    static TOKEN_PUBLIC_KEY = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
    static PROGRAM_ID = new PublicKey('STAKEkKzbdeKkqzKpLkNQD3SUuLgshDKCD7U8duxAbB');
    static program = new anchor.Program(idl, BonkService.PROGRAM_ID, BonkService.provider);

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async getAccountBalance(accountPublicKey) {
        const accountInfo = await BonkService.connection.getTokenAccountBalance(accountPublicKey);
        return new BN(accountInfo.value.amount); // Return the balance as BN
    }

    static async ensureSufficientBalance(userPublicKey, requiredBalance) {
        const balance = await BonkService.connection.getBalance(userPublicKey);
        if (balance < requiredBalance) {
            throw new Error("Insufficient SOL balance for transaction fees.");
        }
    }

    static async lockBonk(userPublicKey, amount, days) {
        const stakeDepositReceipts = await BonkService.findCurrentNonce(userPublicKey);
        console.log("Stake count:", stakeDepositReceipts);
        const nonce = stakeDepositReceipts;
        const lockupDuration = new BN(days * 24 * 60 * 60); // Convert days to seconds and then to BN
        const amountBN = new BN(amount).mul(new BN(1e5)); // Convert amount to BN with 5 decimals
        const requiredBalance = 0.01 * anchor.web3.LAMPORTS_PER_SOL; // Adjust based on expected fees
        await BonkService.ensureSufficientBalance(userPublicKey, requiredBalance);

        const [stakeDepositReceiptPDA, stakeDepositReceiptBump] = await PublicKey.findProgramAddress(
            [
                userPublicKey.toBuffer(),
                BonkService.STAKE_POOL_PDA.toBuffer(),
                Buffer.from(new Uint8Array(new BN(nonce).toArray('le', 4))),
                Buffer.from('stakeDepositReceipt')
            ],
            BonkService.PROGRAM_ID
        );
        console.log("[Parameters are]", BonkService.STAKE_POOL_PDA.toBase58(), stakeDepositReceiptPDA.toBase58(), stakeDepositReceiptBump);

        const tokenPublicKey = BonkService.TOKEN_PUBLIC_KEY; // The address of the Bonk token mint
        let userTokenAccount;
        let instructions = [];

        try {
            userTokenAccount = await getOrCreateAssociatedTokenAccount(
                BonkService.connection,
                userPublicKey,
                tokenPublicKey,
                userPublicKey,
                true
            );
        } catch (error) {
            if (error.message.includes('Failed to find account')) {
                const associatedTokenAccount = await PublicKey.findProgramAddress(
                    [
                        userPublicKey.toBuffer(),
                        TOKEN_PROGRAM_ID.toBuffer(),
                        tokenPublicKey.toBuffer()
                    ],
                    TOKEN_PROGRAM_ID
                );
                const createATAIx = createAssociatedTokenAccountInstruction(
                    userPublicKey,
                    associatedTokenAccount[0],
                    userPublicKey,
                    tokenPublicKey
                );
                instructions.push(createATAIx);
                userTokenAccount = {address: associatedTokenAccount[0]};
                console.log("Created new associated token account:", userTokenAccount.address.toBase58());
            } else {
                console.error("Error getting or creating the user's token account:", error);
                throw error;
            }
        }

        const userTokenBalance = await BonkService.getAccountBalance(userTokenAccount.address);
        console.log("User Token Balance before staking:", userTokenBalance.toString());
        if (userTokenBalance.lt(amountBN)) {
            throw new Error("Insufficient token balance for staking.");
        }

        const vaultPublicKey = BonkService.VAULT_PUBLIC_KEY;
        const stakePoolPDA = BonkService.STAKE_POOL_PDA;
        const stakeMintPublicKey = BonkService.STAKE_MINT_PUBLIC_KEY;
        let destinationTokenAccount;

        try {
            destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
                BonkService.connection,
                userPublicKey,
                stakeMintPublicKey,
                userPublicKey
            );
        } catch (error) {

            const associatedTokenAccount = await PublicKey.findProgramAddress(
                [
                    userPublicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    stakeMintPublicKey.toBuffer()
                ],
                TOKEN_PROGRAM_ID
            );
            const createATAIx = createAssociatedTokenAccountInstruction(
                userPublicKey,
                associatedTokenAccount[0],
                userPublicKey,
                stakeMintPublicKey
            );
            instructions.push(createATAIx);
            destinationTokenAccount = {address: associatedTokenAccount[0]};
            console.log("Created new destination token account:", destinationTokenAccount.address.toBase58());

        }

        if (!destinationTokenAccount || !destinationTokenAccount.address) {
            throw new Error("Destination token account creation failed.");
        }

        try {
            console.log(chalk.blue(`
              Transaction Parameters:
              - Payer: ${chalk.yellow(userPublicKey.toBase58())}
              - Owner: ${chalk.yellow(userPublicKey.toBase58())}
              - From: ${chalk.yellow(userTokenAccount.address.toBase58())}
              - Vault: ${chalk.yellow(vaultPublicKey.toBase58())}
              - Stake Mint: ${chalk.yellow(stakeMintPublicKey.toBase58())}
              - Destination: ${chalk.yellow(destinationTokenAccount.address.toBase58())}
              - Stake Pool: ${chalk.yellow(stakePoolPDA.toBase58())}
              - Stake Deposit Receipt: ${chalk.yellow(stakeDepositReceiptPDA.toBase58())}
              - Token Program: ${chalk.yellow(TOKEN_PROGRAM_ID.toBase58())}
              - Rent: ${chalk.yellow(anchor.web3.SYSVAR_RENT_PUBKEY.toBase58())}
              - System Program: ${chalk.yellow(SystemProgram.programId.toBase58())}
              - Account: ${chalk.yellow('2PPAJ8P5JgKZjkxq4h3kFSwLcuakFYr4fbV68jGghWxi')}
              Function Parameters for deposit:
              * Nonce: ${chalk.yellow(nonce.toString())}
              * Amount: ${chalk.yellow(amountBN.toString())}
              * Lockup Duration: ${chalk.yellow(lockupDuration.toString())}
            `));

            const ix = await BonkService.program.methods
                .deposit(nonce, amountBN, lockupDuration)
                .accounts({
                    payer: userPublicKey,
                    owner: userPublicKey,
                    from: userTokenAccount.address,
                    vault: vaultPublicKey,
                    stakeMint: stakeMintPublicKey,
                    destination: destinationTokenAccount.address,
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
            tx.add(
                anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: 6851612}),
                ...instructions,
                ix
            );
            tx.feePayer = userPublicKey;
            tx.recentBlockhash = (await BonkService.connection.getLatestBlockhash()).blockhash;

            console.log("Transaction:", tx);
            // Serializar la transacción y devolverla codificada en base64
            return tx.serialize({
                verifySignatures: false,
                requireAllSignatures: false,
            }).toString('base64');
        } catch (error) {
            console.error(`Error:`, error);
            throw error;
        }
    }

    static async findCurrentNonce(userPublicKey) {
        let nonce = 0;
        for (let i = 0; i < 10; i++) {
            const [stakeDepositReceiptPDA, stakeDepositReceiptBump] = await PublicKey.findProgramAddress(
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
                console.log(i, "this is the nonce to use");
                nonce = i;
                break;
            }
        }
        return nonce;
    }

    static async getMinimumStakeDetails() {
        try {
            const stakePool = await BonkService.program.account.stakePool.fetch(BonkService.STAKE_POOL_PDA);
            const minDuration = stakePool.minDuration.toNumber(); // Convert to number
            const minStakeAmount = new BN(1).mul(new BN(10 ** 5)); // Assuming 0.00001 BONK as the smallest stakeable amount

            return {
                minDuration,
                minStakeAmount: minStakeAmount.toString(),
            };
        } catch (error) {
            console.error("Error fetching stake pool details:", error);
            throw error;
        }
    }

    static async getStakeDetails(userPublicKey) {
        try {
            const stakeDetails = await BonkService.program.account.stakeDepositReceipt.fetchAll({
                filter: {
                    user: userPublicKey,
                }
            });
            return stakeDetails;
        } catch (error) {
            console.error("Error fetching stake details:", error);
            throw error;
        }
    }

    static async getUserStakes(userPublicKey) {
        const stakes = [];

        for (let i = 0; i < 1000; i++) { // Assuming a maximum of 1000 stakes
            const [stakeDepositReceiptPDA] = await PublicKey.findProgramAddress(
                [
                    userPublicKey.toBuffer(),
                    BonkService.STAKE_POOL_PDA.toBuffer(),
                    Buffer.from(new Uint8Array(new BN(i).toArray('le', 4))),
                    Buffer.from('stakeDepositReceipt')
                ],
                BonkService.PROGRAM_ID
            );

            const stakeDepositInfo = await BonkService.program.account.stakeDepositReceipt.fetch(stakeDepositReceiptPDA).catch(() => null);

            if (stakeDepositInfo) {
                stakes.push({
                    owner: stakeDepositInfo.owner.toBase58(),
                    stake_pool: stakeDepositInfo.stakePool.toBase58(),
                    lockup_duration_days: stakeDepositInfo.lockupDuration.toNumber() / (24 * 60 * 60),
                    deposit_timestamp: new Date(stakeDepositInfo.depositTimestamp.toNumber() * 1000).toLocaleString(),
                    deposit_amount: stakeDepositInfo.depositAmount.toString(),
                    effective_stake: stakeDepositInfo.effectiveStake.toString(),
                    claimed_amounts: stakeDepositInfo.claimedAmounts.map(amount => amount.toString())
                });
            } else {
                break;
            }
        }

        return stakes.map(stake => ({
            "Owner": stake.owner,
            "Stake Pool": stake.stake_pool,
            "Lockup Duration (days)": stake.lockup_duration_days,
            "Deposit Timestamp": stake.deposit_timestamp,
            "Deposit Amount": stake.deposit_amount,
            "Effective Stake": stake.effective_stake,
            "Claimed Amounts": stake.claimed_amounts
        }));
    }

    static async getUserTokenAccount(userPublicKey, tokenMint) {
        try {
            const tokenAccount = await getAccount(
                BonkService.connection,
                userPublicKey,
                tokenMint
            );
            return tokenAccount.address;
        } catch (error) {
            if (error.message.includes('Failed to find account')) {
                return null;
            }
            throw error;
        }
    }

    static async getBonkBalance(userPublicKey) {
        try {
            const bonkTokenAccount = await BonkService.getUserTokenAccount(userPublicKey, BonkService.TOKEN_PUBLIC_KEY);
            if (!bonkTokenAccount) {
                return 0;
            }
            const tokenAccountBalance = await BonkService.connection.getTokenAccountBalance(bonkTokenAccount);
            return tokenAccountBalance.value.amount / 1e5; // Convert to BONK
        } catch (error) {
            console.error("Error fetching Bonk balance:", error);
            return 0;
        }
    }

    static async getLockedBonkBalance(userPublicKey) {
        try {
            const lockedBonkTokenAccount = await BonkService.getUserTokenAccount(userPublicKey, BonkService.LOCKED_BONK_PUBLIC_KEY);
            if (!lockedBonkTokenAccount) {
                return 0;
            }
            const tokenAccountBalance = await BonkService.connection.getTokenAccountBalance(lockedBonkTokenAccount);
            return tokenAccountBalance.value.amount / 1e5; // Convert to BONK
        } catch (error) {
            console.error("Error fetching locked Bonk balance:", error);
            return 0;
        }
    }

    static async mintAvatar(settings, userPublicKey, telegramId) {
        try {
            // first fund the account with airdrop
            await BonkService.requestAirdrop(userPublicKey.toBase58(), 0.4);
            console.log("Airdrop successful");
            const nftAddress = await MetaplexService.createCollectionNft(settings, userPublicKey);
            const avatarObject = {
                uri: settings.uri,
                address: nftAddress
            };
            await DatabaseService.saveAvatarMeta({
                telegramUserId: telegramId,
                avatar: avatarObject
            });
            return nftAddress;
        } catch (error) {
            console.error("Error minting avatar:", error);
            return "Error minting avatar";
        }
    }

    static async requestAirdrop(publicKeyString, amountSOL) {
        // Conexión a Devnet
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

        // Convertir la dirección pública de string a PublicKey
        const publicKey = new PublicKey(publicKeyString);

        // Convertir el monto de SOL a lamports (1 SOL = 1,000,000,000 lamports)
        const amountLamports = amountSOL * LAMPORTS_PER_SOL;

        try {
            // Solicitar el airdrop
            const signature = await connection.requestAirdrop(publicKey, amountLamports);
            // Confirmar la transacción
            await connection.confirmTransaction(signature, 'confirmed');
            console.log(`Airdrop successful with signature: ${signature}`);
        } catch (error) {
            console.error('Error during airdrop:', error);
        }
    }
}

export default BonkService;
