import {
    Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import {
    getAccount, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import idl from '../assets/idl/spl_token_staking.json' assert {type: 'json'};
import MetaplexService from "./metaplex.service.js";

console.log( "WTF--------------->", new PublicKey('STAKEkKzbdeKkqzKpLkNQD3SUuLgshDKCD7U8duxAbB'));
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
        const nonce = await BonkService.findCurrentNonce(userPublicKey);
        const lockupDuration = new BN(days * 24 * 60 * 60); // Convert days to seconds and then to BN
        const amountBN = new BN(amount).mul(new BN(1e5)); // Convert amount to BN with 5 decimals
        const requiredBalance = 0.01 * LAMPORTS_PER_SOL; // Adjust based on expected fees
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

        let userTokenAccount;
        try {
            userTokenAccount = await getOrCreateAssociatedTokenAccount(
                BonkService.connection,
                userPublicKey,
                BonkService.TOKEN_PUBLIC_KEY,
                userPublicKey,
                true
            );
        } catch (error) {
            console.error("Error getting or creating the user's token account:", error);
            throw error;
        }

        const userTokenBalance = await BonkService.getAccountBalance(userTokenAccount.address);
        if (userTokenBalance.lt(amountBN)) {
            throw new Error("Insufficient token balance for staking.");
        }
        await BonkService.sleep(5000);

        let destinationTokenAccount;
        try {
            destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
                BonkService.connection,
                userPublicKey,
                BonkService.STAKE_MINT_PUBLIC_KEY,
                userPublicKey
            );
        } catch (error) {
            console.error("Error getting or creating the destination token account:", error);
            throw error;
        }

        const ix = await BonkService.program.methods
            .deposit(nonce, amountBN, lockupDuration)
            .accounts({
                payer: userPublicKey,
                owner: userPublicKey,
                from: userTokenAccount.address,
                vault: BonkService.VAULT_PUBLIC_KEY,
                stakeMint: BonkService.STAKE_MINT_PUBLIC_KEY,
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
        tx.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: 6851612}));
        tx.add(ix);
        tx.feePayer = userPublicKey;
        tx.recentBlockhash = (await BonkService.connection.getLatestBlockhash()).blockhash;

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
        return nonce;
    }

    static async getMinimumStakeDetails() {
        try {
            const stakePool = await BonkService.program.account.stakePool.fetch(BonkService.STAKE_POOL_PDA);
            const minDuration = stakePool.minDuration.toNumber();
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
            await BonkService.requestAirdrop(userPublicKey.toBase58(), 0.4);
            const nftAddress = await MetaplexService.createCollectionNft(settings, userPublicKey); // Pass userPublicKey directly
            const avatarObject = {
                uri: settings.uri,
                address: nftAddress
            };
            return nftAddress;
        } catch (error) {
            console.error("Error minting avatar:", error);
            return "Error minting avatar";
        }
    }

    static async requestAirdrop(publicKeyString, amountSOL) {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const publicKey = new PublicKey(publicKeyString);
        const amountLamports = amountSOL * LAMPORTS_PER_SOL;
        try {
            const signature = await connection.requestAirdrop(publicKey, amountLamports);
            await connection.confirmTransaction(signature, 'confirmed');
            console.log(`Airdrop successful with signature: ${signature}`);
        } catch (error) {
            console.error('Error during airdrop:', error);
        }
    }
}

export default BonkService;