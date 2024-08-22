import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {createCollection, fetchCollection, create, createCollectionV1} from '@metaplex-foundation/mpl-core';
import {PublicKey} from '@solana/web3.js';
import {mplCandyMachine} from '@metaplex-foundation/mpl-candy-machine'

import {
	createNoopSigner,
	generateSigner,
	signerIdentity,
	keypairIdentity,
	transactionBuilder
} from "@metaplex-foundation/umi";

const umi = createUmi(process.env.SOLANA_RPC_URL);

class MetaplexService {
	static async createCollectionTransaction2(fromPubKey, metadata = {}) {
		// create a collection signer
		umi.use(signerIdentity(createNoopSigner(fromPubKey)));
		umi.use(mplCandyMachine())
		const collectionSigner = generateSigner(umi)

		const collectionMetadata = {
			name: metadata.name || 'My Collection',
			uri: metadata.uri || 'https://mycollection.com',
			...metadata,
		};

		const createCollectionObject = await createCollection(umi, {
			collection: collectionSigner,
			name: collectionMetadata.name,
			uri: collectionMetadata.uri,
		});

		const transaction = await umi.transactions.create(
			{
				version: 0,
				blockhash: (await umi.rpc.getLatestBlockhash()).blockhash,
				instructions: createCollectionObject.getInstructions(),
				payer: fromPubKey,
			}
		)

		// partially sign the transaction using the collection signer
		const serializedTransaction = umi.transactions.serialize(transaction)

		const encoded = Buffer.from(serializedTransaction).toString('base64')

		console.log("TESTING ENCODING.....: ", encoded)

		return encoded
	}

	static async createCollectionTransaction(fromPubKey, metadata = {}) {
		// Initialize Umi instance and use necessary plugins
		umi.use(signerIdentity(createNoopSigner(fromPubKey)));

		// Generate a signer for the collection
		const collectionSigner = generateSigner(umi);
		umi.use(keypairIdentity(collectionSigner))
		// Define collection metadata
		const collectionMetadata = {
			name: metadata.name || 'My Collection',
			uri: metadata.uri || 'https://mycollection.com',
			...metadata,
		};

		// Create the collection object
		const createCollectionObject = await createCollectionV1(umi, {
			collection: collectionSigner,
			name: collectionMetadata.name,
			uri: collectionMetadata.uri,
		});

		// Build the transaction using setLatestBlockhash
		const builder = await transactionBuilder().add(createCollectionObject).setLatestBlockhash(umi);
		builder.setFeePayer(fromPubKey);
		console.log("------------------------CHECKPOINT----------------------")

		// Serialize and encode the transaction
		const transaction = builder.build(umi)
		const serializedTransaction = umi.transactions.serialize(transaction);
		const encodedTransaction = Buffer.from(serializedTransaction).toString('base64');

		console.log("Encoded Transaction: ", encodedTransaction);

		return encodedTransaction;
	}

	static async mintNftFromCollection(fromPubKey, collectionPubKey, metadata = {}) {

		const payer = new PublicKey(fromPubKey);
		const signer = createNoopSigner(payer);
		umi.use(signerIdentity(signer));
		const createNft = await create(umi, {
			asset: fromPubKey,
			collection: collectionPubKey,
			name: metadata.name || 'My NFT',
			uri: metadata.uri || 'https://mynft.com',
		})

		const transaction = await umi.transactions.create({
			version: 0,
			blockhash: (await umi.rpc.getLatestBlockhash()).blockhash,
			instructions: createNft.getInstructions(),
			payer: fromPubKey,
		})

		const serialized = umi.transactions.serialize(transaction)

		const encoded = Buffer.from(serialized).toString('base64')

		console.log("ENCODED: ", encoded)
		return encoded

	}
}

export default MetaplexService;
