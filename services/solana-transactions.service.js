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
    TransactionInstruction
} from '@solana/web3.js';
import dotenv from 'dotenv';
import {Wallet} from "@coral-xyz/anchor";

dotenv.config();

const connection = new Connection(process.env.SOLANA_RPC_URL);

class SolanaTransactionBuilder {
    constructor(connection) {
        this.connection = connection;
    }

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

        const {blockhash, lastValidBlockHeight} = await this.connection.getLatestBlockhash();
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

    async buildMemoTransaction(fromPubkey, message) {
        const transaction = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 1000,
            }),
            new TransactionInstruction({
                programId: new PublicKey(process.env.MEMO_PROGRAM_ID),
                data: Buffer.from(message, "utf8"),
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

    async buildSwapTransaction(publicKey, inputMint, outputMint, amount, destinationWallet = null) {

        const walletPublicKey = new PublicKey(publicKey);
        let urlGet = `${process.env.JUPITER_QUOTE_API_URL}`;
        urlGet += `?inputMint=${inputMint}&outputMint=${outputMint}`;
        urlGet += `&amount=${amount}&slippageBps=${slippageBps}`;
        urlGet += `&swapMode=ExactIn`;

        const quoteResponseData = await fetch(urlGet);
        const quoteResponse = await quoteResponseData.json();

        const response = await fetch(`${process.env.JUPITER_SWAP_API_URL}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto',
                quoteResponse,
                userPublicKey: walletPublicKey.toString(),
                wrapAndUnwrapSol: true,
            })
        });
        const jsonResponse = await response.json();
        if (jsonResponse?.error || !jsonResponse?.swapTransaction) {
            throw new Error(jsonResponse.error);
        }
        return jsonResponse.swapTransaction;
    }
}

export default new SolanaTransactionBuilder(connection);
