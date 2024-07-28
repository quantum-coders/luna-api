import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {
    Connection,
    ComputeBudgetProgram, Transaction, sendAndConfirmTransaction, Keypair, PublicKey, SystemProgram,
} from '@solana/web3.js';
import * as ed25519 from '@noble/ed25519';
import 'dotenv/config';
import {Metaplex, keypairIdentity} from '@metaplex-foundation/js';
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAssociatedTokenAddress, TOKEN_PROGRAM_ID
} from "@solana/spl-token";

const umi = createUmi(process.env.SOLANA_RPC_URL);
umi.context = {
    ...umi.context,
    eddsa: ed25519,
};

const SOLANA_CONNECTION = new Connection(process.env.SOLANA_RPC_URL, {commitment: 'finalized'});
const METAPLEX = Metaplex.make(SOLANA_CONNECTION);

class MetaplexService {
    static async createCollectionNft(settings = {}, userKeyPair) {
        try {
            umi.identity = keypairIdentity(userKeyPair);
            METAPLEX.use(keypairIdentity(userKeyPair));
            const {nft: collectionNft, signers, instructions} = await METAPLEX.nfts().create(settings);
            return collectionNft.address.toBase58();
        } catch (error) {
            console.error(`Error:`, error);
            throw error;
        }
    }

    static async transferBonkTokens(userKeyPair, amount) {
        try {
            const BONK_TOKEN_MINT = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
            const PAYMENT_ACCOUNT = new PublicKey('Dr8Mkn8Yja4pKQamNhDLyMdEuG4g4gM7G4Et3CkUiHiA');
            umi.identity = keypairIdentity(userKeyPair);
            const userTokenAccount = await getAssociatedTokenAddress(BONK_TOKEN_MINT, userKeyPair.publicKey);
            const accountInfo = await SOLANA_CONNECTION.getAccountInfo(userTokenAccount);
            let instructions = [];
            if (!accountInfo) {
                instructions.push(createAssociatedTokenAccountInstruction(
                    userKeyPair.publicKey,
                    userTokenAccount,
                    userKeyPair.publicKey,
                    BONK_TOKEN_MINT,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                ));
            }

            // Crea la instrucción de transferencia
            instructions.push(createTransferInstruction(
                userTokenAccount,
                PAYMENT_ACCOUNT,
                userKeyPair.publicKey,
                amount * 10 ** 5,
                [],
                TOKEN_PROGRAM_ID
            ));

            // Añadir compute units
            const computeUnitsPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({microLamports: 520145});

            // Crea y envía la transacción de transferencia
            const transferTransaction = new Transaction()
                .add(computeUnitsPriceInstruction)
                .add(...instructions);

            const transferSignature = await sendAndConfirmTransaction(SOLANA_CONNECTION, transferTransaction, [userKeyPair]);
            console.log(`✅ - Transferencia realizada: ${transferSignature}`);

            return transferSignature;
        } catch (error) {
            console.error(`Error en transferencia de BONK tokens:`, error);
            throw error;
        }
    }

    static async verifyNftCollection(collectionAddress, nftAddress, userKeyPair) {
        const mintAddress = new PublicKey(nftAddress);
        const collectionMintAddress = new PublicKey(collectionAddress);
        const metaplex = Metaplex.make(SOLANA_CONNECTION);
        metaplex.use(keypairIdentity(userKeyPair));
        const res = await metaplex.nfts().verifyCollection({mintAddress, collectionMintAddress});
        console.log("Collection verified successfully");
        console.log("Collection Address:", collectionMintAddress.toBase58());
        console.log("NFT Address:", mintAddress.toBase58());
        return res
    }

}

export default MetaplexService;
