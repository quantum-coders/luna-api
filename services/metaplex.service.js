import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    createCandyMachineV2,
    mplCandyMachine,
    addConfigLines,
    mintV2,
    fetchCandyMachine,
    findCandyGuardPda,
    createCandyGuard,
    wrap,
} from '@metaplex-foundation/mpl-candy-machine';

import {
    createNoopSigner,
    generateSigner,
    percentAmount,
    publicKey,
    signerIdentity,
    some
} from '@metaplex-foundation/umi';
import {
    createNft,
    TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import { sol } from "@metaplex-foundation/js";

const umi = createUmi(process.env.SOLANA_RPC_URL);

class MetaplexService {
    /**
     * Creates a collection NFT transaction.
     * @param {string} fromPubKey - The public key of the sender.
     * @param {Object} metadataString - JSON string containing metadata for the NFT.
     * @returns {Promise<string>} - A promise that resolves to the base64 encoded serialized transaction.
     */
    static async createCollectionTransaction(fromPubKey, metadataString = {}) {
        umi.use(signerIdentity(createNoopSigner(fromPubKey)));
        umi.use(mplCandyMachine());

        const collectionMint = generateSigner(umi);
        const metadata = JSON.parse(metadataString);

        const inputConfig = {
            mint: collectionMint,
            name: metadata.name || 'My Collection NFT',
            symbol: metadata.symbol || '',
            uri: metadata.uri || 'https://example.com/path/to/some/json/metadata.json',
            description: metadata.description || '',
            image: metadata.image || '',
            animation_url: metadata.animation_url || '',
            external_url: metadata.external_url || '',
            attributes: metadata.attributes || [],
            sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
            isCollection: true,
        };

        const collectionNFT = await createNft(umi, inputConfig);
        const { blockhash } = await umi.rpc.getLatestBlockhash();

        const transaction = await umi.transactions.create({
            version: 2,
            blockhash,
            instructions: collectionNFT.getInstructions(),
            payer: fromPubKey,
        });

        const signedTransaction = await collectionMint.signTransaction(transaction);
        const serializedTransaction = umi.transactions.serialize(signedTransaction);
        return Buffer.from(serializedTransaction).toString('base64');
    }

    /**
     * Creates a Candy Machine transaction.
     * @param {string} fromPubKey - The public key of the sender.
     * @param {string} collectionMintPubKey - The public key of the collection mint.
     * @param {Object} metadata - Metadata for the Candy Machine.
     * @returns {Promise<string>} - A promise that resolves to the base64 encoded serialized transaction.
     */
    static async createCandyMachine(fromPubKey, collectionMintPubKey, metadata = {}) {
        umi.use(mplCandyMachine());
        umi.use(signerIdentity(createNoopSigner(fromPubKey)));

        const candyMachine = generateSigner(umi);
        const { blockhash } = await umi.rpc.getLatestBlockhash();

        const candyMachineCreation = await createCandyMachineV2(umi, {
            candyMachine,
            collectionMint: collectionMintPubKey,
            collectionUpdateAuthority: umi.identity,
            tokenStandard: TokenStandard.NonFungible,
            mutable: true,
            sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
            itemsAvailable: 2,
            symbol: 'CANDY',
            maxEditionSupply: 0,
            creators: [
                {
                    address: umi.identity.publicKey,
                    verified: true,
                    percentageShare: 100,
                },
            ],
            configLineSettings: some({
                prefixName: 'Candy',
                nameLength: 2,
                prefixUri: 'https://example.com/',
                uriLength: 100,
                isSequential: false,
            }),
        });

        const transaction = await umi.transactions.create({
            blockhash,
            instructions: candyMachineCreation.getInstructions(),
            payer: fromPubKey,
        });

        const signedTransaction = await candyMachine.signTransaction(transaction);
        const serializedTransaction = umi.transactions.serialize(signedTransaction);
        return Buffer.from(serializedTransaction).toString('base64');
    }

    /**
     * Creates a Candy Guard and wraps it with a Candy Machine.
     * @param {string} fromPubKey - The public key of the sender.
     * @param {string} candyMachinePubKey - The public key of the Candy Machine.
     * @returns {Promise<string>} - A promise that resolves to the base64 encoded serialized transaction.
     */
    static async createGuardAndWrap(fromPubKey, candyMachinePubKey) {
        umi.use(mplCandyMachine());
        umi.use(signerIdentity(createNoopSigner(fromPubKey)));

        const base = generateSigner(umi);
        const guardResult = await createCandyGuard(umi, {
            base,
            guards: {
                solPayment: { lamports: sol(0.001), destination: fromPubKey },
            },
        });

        const candyGuard = findCandyGuardPda(umi, { base: base.publicKey });
        const wrapObject = await wrap(umi, {
            candyMachine: candyMachinePubKey,
            candyGuard,
        });

        const instructions = [
            ...guardResult.getInstructions(),
            ...wrapObject.getInstructions(),
        ];

        const { blockhash } = await umi.rpc.getLatestBlockhash();

        const transaction = await umi.transactions.create({
            blockhash,
            instructions: instructions,
            payer: fromPubKey,
        });

        const signedTransaction = await base.signTransaction(transaction);
        const serializedTransaction = umi.transactions.serialize(signedTransaction);
        return Buffer.from(serializedTransaction).toString('base64');
    }

    /**
     * Adds configuration lines to a Candy Machine.
     * @param {string} fromPubKey - The public key of the sender.
     * @param {string} candyMachinePubKey - The public key of the Candy Machine.
     * @param {Array<Object>} configLines - An array of configuration lines to add.
     * @returns {Promise<string>} - A promise that resolves to the base64 encoded serialized transaction.
     */
    static async addConfigLines(fromPubKey, candyMachinePubKey, configLines = []) {
        umi.use(mplCandyMachine());
        umi.use(signerIdentity(createNoopSigner(fromPubKey)));

        const candyMachine = publicKey(candyMachinePubKey);
        const configLinesResult = await addConfigLines(umi, {
            candyMachine: candyMachine,
            index: 0,
            configLines: [
                { name: '#1', uri: 'https://example.com/nft1.json' },
                { name: '#2', uri: 'https://example.com/nft2.json' },
            ],
        });

        const { blockhash } = await umi.rpc.getLatestBlockhash();

        const transaction = await umi.transactions.create({
            blockhash,
            instructions: configLinesResult.getInstructions(),
            payer: fromPubKey,
        });

        const serializedTransaction = umi.transactions.serialize(transaction);
        return Buffer.from(serializedTransaction).toString('base64');
    }

    /**
     * Mints an NFT from a Candy Machine.
     * @param {string} fromPubKey - The public key of the sender.
     * @param {Object} candyMachine - The Candy Machine object.
     * @param {string} collectionMintPubKey - The public key of the collection mint.
     * @returns {Promise<string>} - A promise that resolves to the base64 encoded serialized transaction.
     */
    static async mintNFT(fromPubKey, candyMachine, collectionMintPubKey) {
        umi.use(mplCandyMachine());
        umi.use(signerIdentity(createNoopSigner(fromPubKey)));

        const candyMachineInfo = await fetchCandyMachine(umi, candyMachine);

        const asset = generateSigner(umi);
        const mintResult = await mintV2(umi, {
            candyMachine: candyMachineInfo.publicKey,
            nftMint: asset,
            collectionMint: candyMachineInfo.collectionMint,
            collectionUpdateAuthority: umi.identity,
            candyGuard: candyMachine.mintAuthority,
        });

        const { blockhash } = await umi.rpc.getLatestBlockhash();

        const transaction = await umi.transactions.create({
            blockhash,
            instructions: mintResult.getInstructions(),
            payer: fromPubKey,
        });

        const signedTransaction = await asset.signTransaction(transaction);
        const serializedTransaction = umi.transactions.serialize(signedTransaction);
        return Buffer.from(serializedTransaction).toString('base64');
    }
}

export default MetaplexService;
