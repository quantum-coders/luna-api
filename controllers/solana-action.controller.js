import SolanaTransactionBuilder from '../services/solana-transactions.service.js';
import {PublicKey} from '@solana/web3.js';
import {ACTIONS_CORS_HEADERS} from '@solana/actions';
import BonkService from '../services/bonk.service.js';
import UserService from '../entities/users/user.service.js';
import BlinkService from '../services/blink.service.js';
import {PrimateService} from '@thewebchimp/primate';
import MetaplexService from "../services/metaplex.service.js";
import {JupiterService} from "../services/jupiter.service.js";
import BN from "bn.js";

class SolanaActionController {
	static async handleAction(req, res) {

		const path = req.path;
		const method = req.method.toUpperCase();
		const body = req.body;

		if (path === '/actions.json') {
			return SolanaActionController.handleGetActionsJson(req, res);
		}

		try {
			switch (method) {
				case 'POST':
					return await SolanaActionController.handlePostAction(path, req, res);
				case 'GET':
					return await SolanaActionController.handleGetAction(path, req, res);
				case 'OPTIONS':
					return await SolanaActionController.handleGetAction(path, req, res);
				default:
					return res.respond({
						status: 405,
						message: 'Method Not Allowed',
					});
			}
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing request: ' + error.message,
			});
		}
	}

	static handleGetActionsJson(req, res) {
		const actionsJson = {
			'rules': [
				{
					'pathPattern': '/blinks/create-candy-machine',
					'apiPath': '/blinks/create-candy-machine',
				},
				{
					'pathPattern': '/blinks/transfer-sol',
					'apiPath': '/blinks/transfer-sol',
				},
				{
					'pathPattern': '/blinks/stake',
					'apiPath': '/blinks/stake',
				},
				{
					'pathPattern': '/blinks/memo',
					'apiPath': '/blinks/memo',
				},
				{
					'pathPattern': '/blinks/swap',
					'apiPath': '/blinks/swap',
				},
				{
					'pathPattern': '/blinks/stake-bonk',
					'apiPath': '/blinks/stake-bonk',
				},
				{
					'pathPattern': '/blinks/mint-nft',
					'apiPath': '/blinks/mint-nft',
				},
				{
					'pathPattern': '/blinks/create-nft-collection',
					'apiPath': '/blinks/create-nft-collection',
				},
				{
					'pathPatter': '/blinks/create-limit-order',
					'apiPath': '/blinks/create-limit-order',
				}

			],
		};

		res.set({
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		});

		return res.json(actionsJson);
	}

	static async handleGetAction(path, req, res) {
		const actionMapping = SolanaActionController.getActionMapping();

		// check if path starts with cb-
		if (path.startsWith('/cb-')) {
			// remove cb- from path
			path = path.replace('/cb-', '');

			// get blink by uid
			const blink = await PrimateService.findBy({uid: path}, 'blink');

			if (!blink) {
				return res.respond({
					status: 404,
					message: 'Blink not found',
				});
			}

			return res.json(blink.data);
		}

		const json = actionMapping[path];

		// Prepare custom data

		if (req.query.primaryColor) {
			json.primaryColor = req.query.primaryColor.replace('%23', '#');
		}

		if (req.query.logo) json.logo = req.query.logo;
		if (req.query.icon) json.icon = req.query.icon;
		if (req.query.title) json.title = req.query.title;
		if (req.query.background) json.background = req.query.background;
		if (req.query.description) json.description = req.query.description;

		if (req.query.actions?.label) json.links.actions[0].label = req.query.actions.label;

		// check if we have req.query.p
		if (req.query.p) {
			// for each key in req.query.p
			for (const key in req.query.p) {
				// search key in json.links.actions[0].parameters, it should be the name
				let parameter = json.links.actions[0].parameters.find(p => p.name === key);
				const index = json.links.actions[0].parameters.findIndex(p => p.name === key);

				json.links.actions[0].parameters[index] = {...parameter, ...req.query.p[key]};
			}
		}

		if (actionMapping[path]) {
			return res.json(actionMapping[path]);
		} else {
			return res.respond({
				status: 404,
				message: 'Not Found',
			});
		}
	}

	static async handlePostAction(path, req, res) {
		const actionMapping = {
			'/transfer-sol': SolanaActionController.handlePostTransferSol,
			'/stake': SolanaActionController.handlePostStake,
			'/memo': SolanaActionController.handlePostMemo,
			'/swap': SolanaActionController.handlePostSwap,
			'/stake-bonk': SolanaActionController.handlePostBonkStake,
			'/mint-nft': SolanaActionController.handlePostMintNFT,
			'/create-limit-order': SolanaActionController.handleCreateLimitOrder,
			// TODO: Refactor Nfts implementation
			'/create-nft-collection': SolanaActionController.handlePostCreateNFTCollection,
			'/create-candy-machine': SolanaActionController.handlePostCreateCandyMachine,
			'/insert-items': SolanaActionController.handlePostInsertItems,
			'/create-guard': SolanaActionController.handlePostCreateGuard,

		};

		const actionHandler = actionMapping[path];
		if (actionHandler) {
			return actionHandler(req, res);
		} else {
			return res.respond({
				status: 404,
				message: 'Not Found',
			});
		}
	}

	static getActionMapping() {
		return {
			'/create-candy-machine': {
				title: 'Create Candy Machine',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Create candy machine',
				links: {
					actions: [
						{
							label: 'Create Candy Machine',
							href: '/blinks/create-candy-machine?collection={collection}&metadata={metadata}',
							parameters: [
								{
									label: 'Collection Pubkey',
									name: 'collection',
									required: true,
								},
								{
									label: 'metadata',
									name: 'metadata',
									required: true,
								},
							]
						}
					]
				}
			},
			'/mint-nft': {
				title: 'Mint NFT',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Mint a new NFT',
				links: {
					actions: [
						{
							label: 'Mint NFT',
							href: '/blinks/mint-nft?collection={collection}&candyMachine={candyMachine}',
							parameters: [
								{
									label: 'Candy Machine Pubkey',
									name: 'candyMachine',
									required: true,
								},
								{
									label: 'Collection',
									name: 'collection',
									required: true,
								},
							]
						}
					]
				}
			},
			'/create-nft-collection': {
				title: 'Create NFT Collection',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Create a new NFT collection',
				links: {
					actions: [
						{
							label: 'Create NFT Collection',
							href: '/blinks/create-nft-collection?metadata={metadata}',
							parameters: [
								{
									label: 'metadata',
									name: 'metadata',
									required: true,
								}
							]
						}
					]
				}
			},
			'/transfer-sol': {
				title: 'Transfer Native SOL',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Transfer SOL to another Solana wallet',
				links: {
					actions: [
						{
							label: 'Transfer SOL',
							href: '/blinks/transfer-sol?to={to}&amount={amount}',
							parameters: [
								{
									label: 'Account to transfer to',
									name: 'to',
									required: true,
								},
								{
									label: 'Amount of SOL to transfer',
									name: 'amount',
									required: true,
								},
							],
						},
					],
				},
			},
			'/stake': {
				title: 'Stake SOL',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Stake SOL to help secure the Solana network.',
				links: {
					actions: [
						{
							label: 'Stake SOL',
							href: '/blinks/stake?validatorPubkey={validatorPubkey}&amount={amount}',
							parameters: [
								{
									label: 'Validator Pubkey',
									name: 'validatorPubkey',
									required: true,
								},
								{
									label: 'Amount of SOL to stake',
									name: 'amount',
									required: true,
								},
							],
						},
					],
				},
			},
			'/memo': {
				title: 'Add Memo',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Add a memo to the blockchain.',
				label: 'Add Memo',
				links: {
					actions: [
						{
							label: 'Add Memo',
							href: '/blinks/memo?message={message}',
							parameters: [
								{
									label: 'Message',
									name: 'message',
									required: true,
								},
							],
						},
					],
				},
			},
			'/swap': {
				title: 'Swap Tokens',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Swap tokens using the Jupiter API.',
				links: {
					actions: [
						{
							label: 'Swap Tokens',
							href: '/blinks/swap?inputMint={inputMint}&outputMint={outputMint}&amount={amount}&slippageBps={slippageBps}',
							parameters: [
								{
									label: 'Input Mint',
									name: 'inputMint',
									required: true,
								},
								{
									label: 'Output Mint',
									name: 'outputMint',
									required: true,
								},
								{
									label: 'Amount',
									name: 'amount',
									required: true,
								},
								{
									label: 'Slippage',
									name: 'slippageBps',
									required: false,
								},
							],
						},
					],
				},
			},
			'/stake-bonk': {
				title: 'Stake BONK',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Stake BONK to earn rewards.',
				links: {
					actions: [
						{
							label: 'Stake BONK',
							href: '/blinks/stake-bonk?amount={amount}&days={days}',
							parameters: [
								{
									label: 'Amount of BONK to stake',
									name: 'amount',
									required: true,
								},
								{
									label: 'Lockup duration in days',
									name: 'days',
									required: true,
								},
							],
						},
					],
				},
			},
			'/insert-items': {
				title: 'Add Config Lines',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Add config lines to a candy machine.',
				links: {
					actions: [
						{
							label: 'Add Config Lines',
							href: '/blinks/insert-items?configLines={configLines}&candyMachine={candyMachine}',
							parameters: [
								{
									label: 'Candy Machine Pubkey',
									name: 'candyMachine',
									required: true,
								},
								{
									label: 'Config Lines',
									name: 'configLines',
									required: true,
								},
							],
						},
					],
				},
			},
			'/create-guard': {
				title: 'Create Guard',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Create a guard.',
				links: {
					actions: [
						{
							label: 'Create Guard',
							href: '/blinks/create-guard?candyMachine={candyMachine}',
							parameters: [
								{
									label: 'Candy Machine Pubkey',
									name: 'candyMachine',
									required: true,
								},
							],
						},
					],
				},
			},
			'/create-limit-order': {
				title: 'Create Limit Order',
				icon: 'https://app.lunadefi.ai/blinks-image.jpg',
				description: 'Create a limit order.',
				links: {
					actions: [
						{
							label: 'Create limit order',
							href: '/blinks/create-limit-order?inputMint={inputMint}&outputMint={outputMint}&inAmount={inAmount}&outAmount={outAmount}&expiredAt={expiredAt}',
							parameters: [
								{
									label: 'Input Mint',
									name: 'inputMint',
									required: true,
								},
								{
									label: 'Output Mint',
									name: 'outputMint',
									required: true,
								},
								{
									label: 'Input Amount',
									name: 'inAmount',
									required: true,
								},
								{
									label: 'Output Amount',
									name: 'outAmount',
									required: true,
								},
								{
									label: 'Expiration Timestamp',
									name: 'expiredAt',
									required: false,
								},
							],
						},
					],
				},
			}
		};
	}

	static async handleCreateLimitOrder(req, res) {
		const {account} = req.body;
		const inputMint = req.query.inputMint;
		const outputMint = req.query.outputMint;
		const inAmount = req.query.inAmount;
		const outAmount = req.query.outAmount;
		let expiredAt = req.query.expiredAt;

		if (!account || !inputMint || !outputMint || !inAmount || !outAmount) {
			return res.respond({
				status: 400,
				message: `Bad Request: parameter missing: ${!account ? 'account' : !inputMint ? 'inputMint' : !outputMint ? 'outputMint' : !inAmount ? 'inAmount' : 'outAmount'}`,
			});
		}

		console.info("expiredAt format: ", expiredAt);
		// convert expiredAt to seconds
		if (expiredAt) {
			const expirationTimeInSeconds = new Date(expiredAt).getTime() / 1000;
			expiredAt = new BN(Math.floor((new Date().valueOf() / 1000) + expirationTimeInSeconds));
		}
		console.info("expiredAt: ", expiredAt);
		try {
			const encodedTransaction = await JupiterService.createLimitOrder(
				account,
				inAmount,
				outAmount,
				inputMint,
				outputMint,
				expiredAt,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostInsertItems(req, res) {
		const {account} = req.body;
		const candyMachine = req.query.candyMachine;
		const configLines = req.query.configLines;

		if (!account || !candyMachine || !configLines) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields',
			});
		}

		try {
			const encodedTransaction = await MetaplexService.addConfigLines(
				account,
				candyMachine,
				configLines,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostBonkStake(req, res) {
		const {account} = req.body;
		const amount = req.query.amount; // Assuming amount in BONK
		const days = req.query.days; // Add days parameter for lockup duration

		if (!account || !amount || !days) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields',
			});
		}

		try {
			const userPublicKey = new PublicKey(account);

			// Use BonkService to create the lockBonk transaction
			const encodedTransaction = await BonkService.lockBonk(userPublicKey, amount, days);

			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'LockBonk transaction created successfully',
			});

		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostSwap(req, res) {
		const {account} = req.body;
		const inputMint = req.query.inputMint;
		const outputMint = req.query.outputMint;
		const amount = req.query.amount;
		let slippageBps = req.query.amount;

		if (slippageBps === null || isNaN(slippageBps)) {
			slippageBps = 0.05;
		}

		if (slippageBps > 0.1) {
			slippageBps = 0.05;
		}

		if (!account || !inputMint || !outputMint || !amount) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields, field missing: ' + (!account ? 'account' : !inputMint ? 'inputMint' : !outputMint ? 'outputMint' : 'amount'),
			});
		}
		try {
			console.info(`Parameters are: ${account}, ${inputMint}, ${outputMint}, ${amount}, ${slippageBps}`);
			const encodedTransaction = await SolanaTransactionBuilder.buildSwapTransaction(
				new PublicKey(account),
				inputMint,
				outputMint,
				amount,
				slippageBps,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostTransferSol(req, res) {
		const {account} = req.body;

		const to = req.query.to;
		const amount = req.query.amount;

		if (!account || !to || !amount) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields',
			});
		}

		try {
			const encodedTransaction = await SolanaTransactionBuilder.buildTransferSolTransaction(
				new PublicKey(account),
				new PublicKey(to),
				amount,
			);

			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 400,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostStake(req, res) {
		const {account} = req.body;
		const validatorPubkey = req.query.validatorPubkey;
		const amount = req.query.amount;

		if (!account || !validatorPubkey || !amount) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields',
			});
		}

		try {
			const encodedTransaction = await SolanaTransactionBuilder.buildStakeTransaction(
				new PublicKey(account),
				new PublicKey(validatorPubkey),
				amount,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostMemo(req, res) {

		const {account} = req.body;
		const message = req.query.message;

		if (!account || !message) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields',
			});
		}

		try {
			const encodedTransaction = await SolanaTransactionBuilder.buildMemoTransaction(
				new PublicKey(account),
				message,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}


	static async handlePostMintNFT(req, res) {
		const {account} = req.body;
		const candyMachine = req.query.candyMachine;
		const collection = req.query.collection;

		if (!account || !candyMachine || !collection) {
			return res.respond({
				status: 400,
				message: `Bad Request: parameter missing: ${!account ? 'account' : !candyMachine ? 'candyMachine' : 'collection'}`,
			});
		}

		try {


			const encodedTransaction = await MetaplexService.mintNFT(
				account,
				candyMachine,
				collection,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}

	}

	static async handlePostCreateNFTCollection(req, res) {
		const {account} = req.body;
		const metadata = req.query.metadata;

		if (!account || !metadata) {
			return res.respond({
				status: 400,
				message: `Bad Request: parameter missing: ${!account ? 'account' : 'metadata'}`,
			});
		}

		try {
			const encodedTransaction = await MetaplexService.createCollectionTransaction(
				account,
				metadata,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostCreateCandyMachine(req, res) {
		const {account} = req.body;
		const metadata = req.query.metadata;
		const collection = req.query.collection;

		if (!account || !metadata || !collection) {
			return res.respond({
				status: 400,
				message: `Bad Request: parameter missing: ${!account ? 'account' : !metadata ? 'metadata' : 'collection'}`,
			});
		}

		try {
			const encodedTransaction = await MetaplexService.createCandyMachine(
				account,
				collection,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostCreateGuard(req, res) {
		const {account} = req.body;
		const candyMachine = req.query.candyMachine;

		if (!account || !candyMachine) {
			return res.respond({
				status: 400,
				message: `Bad Request: parameter missing: ${!account ? 'account' : 'candyMachine'}`,
			});
		}

		try {
			const encodedTransaction = await MetaplexService.createGuardAndWrap(
				account,
				candyMachine,
			);
			return res.respond({
				status: 200,
				data: {transaction: encodedTransaction},
				props: {transaction: encodedTransaction},
				message: 'Transaction created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async createBlink(req, res) {

		// Get user from req
		const signedUser = req.user.payload;
		if (!signedUser) {
			return res.respond({
				status: 401,
				message: 'Unauthorized',
			});
		}

		const user = await UserService.findById(signedUser.id);
		if (!user) {
			return res.respond({
				status: 404,
				message: 'User not found',
			});
		}

		try {
			const blink = await BlinkService.createBlink(user, req.body);

			return res.respond({
				status: 200,
				data: blink,
				message: 'Blink created successfully',
			});
		} catch (error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error creating blink: ' + error.message,
			});
		}
	}

}

export default SolanaActionController;
