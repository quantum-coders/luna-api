import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createCollection, fetchCollection, create, createCollectionV1 } from '@metaplex-foundation/mpl-core';
import { PublicKey } from '@solana/web3.js';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';

import {
	createNoopSigner,
	generateSigner,
	signerIdentity,
	keypairIdentity,
	transactionBuilder,
	percentAmount,
} from '@metaplex-foundation/umi';

const umi = createUmi(process.env.SOLANA_RPC_URL).use(mplCandyMachine());

class MetaplexService {
	static async createCollectionTransaction(fromPubKey, metadata = {}) {

		umi.use(signerIdentity(createNoopSigner(fromPubKey)));

		// Create the Collection NFT.
		const collectionUpdateAuthority = generateSigner(umi);
		const collectionMint = generateSigner(umi);

		const collectionNFT = await createNft(umi, {
			mint: collectionMint,
			//authority: collectionUpdateAuthority,
			name: 'My Collection NFT',
			uri: 'https://example.com/path/to/some/json/metadata.json',
			sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
			isCollection: true,
		});

		// Pass the collection address and its authority in the settings.
		const candyMachineSettings = {
			collectionMint: collectionMint.publicKey,
			collectionUpdateAuthority,
		};

		// Build the transaction using setLatestBlockhash
		const builder = await transactionBuilder().add(collectionNFT).setLatestBlockhash(umi);
		builder.setFeePayer(fromPubKey);

		// Serialize and encode the transaction
		const transaction = builder.build(umi);
		const serializedTransaction = umi.transactions.serialize(transaction);
		const encodedTransaction = Buffer.from(serializedTransaction).toString('base64');

		console.log('Encoded Transaction: ', encodedTransaction);

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
		});

		const transaction = await umi.transactions.create({
			version: 0,
			blockhash: (await umi.rpc.getLatestBlockhash()).blockhash,
			instructions: createNft.getInstructions(),
			payer: fromPubKey,
		});

		const serialized = umi.transactions.serialize(transaction);

		const encoded = Buffer.from(serialized).toString('base64');

		console.log('ENCODED: ', encoded);
		return encoded;

	}
}

export default MetaplexService;
