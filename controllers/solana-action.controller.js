import SolanaTransactionBuilder from '../services/solana-transactions.service.js';
import { PublicKey } from '@solana/web3.js';
import { ACTIONS_CORS_HEADERS } from '@solana/actions';
import BonkService from '../services/bonk.service.js';

class SolanaActionController {
	static async handleAction(req, res) {

		const path = req.path;
		const method = req.method.toUpperCase();
		const body = req.body;

		if(path === '/actions.json') {
			return SolanaActionController.handleGetActionsJson(req, res);
		}

		try {
			switch(method) {
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
		} catch(error) {
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

		const json = actionMapping[path];

		console.log(req.query);

		// Prepare custom data

		if(req.query.primaryColor) {
			json.primaryColor = req.query.primaryColor.replace('%23', '#');
		}

		if(req.query.logo) json.logo = req.query.logo;
		if(req.query.icon) json.icon = req.query.icon;
		if(req.query.title) json.title = req.query.title;
		if(req.query.background) json.background = req.query.background;
		if(req.query.description) json.description = req.query.description;

		if(req.query.actions?.label) json.links.actions[0].label = req.query.actions.label;

		// check if we have req.query.p
		if(req.query.p) {
			// for each key in req.query.p
			for(const key in req.query.p) {
				// search key in json.links.actions[0].parameters, it should be the name
				let parameter = json.links.actions[0].parameters.find(p => p.name === key);
				const index = json.links.actions[0].parameters.findIndex(p => p.name === key);

				json.links.actions[0].parameters[index] = { ...parameter, ...req.query.p[key] };
			}
		}

		if(actionMapping[path]) {
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
		};

		const actionHandler = actionMapping[path];
		if(actionHandler) {
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
							href: '/blinks/swap?inputMint={inputMint}&outputMint={outputMint}&amount={amount}',
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

		};
	}

	static async handlePostBonkStake(req, res) {
		const { account } = req.body;
		const amount = req.query.amount; // Assuming amount in BONK
		const days = req.query.days; // Add days parameter for lockup duration

		if(!account || !amount || !days) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields',
			});
		}

		try {
			const userPublicKey = new PublicKey(account);

			// Use BonkService to create the lockBonk transaction
			const encodedTransaction = await BonkService.lockBonk(userPublicKey, amount, days);

			console.log('Unsigned transaction:', encodedTransaction);


			return res.respond({
				status: 200,
				data: { transaction: encodedTransaction },
				props: { transaction: encodedTransaction },
				message: 'LockBonk transaction created successfully',
			});

		} catch(error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostSwap(req, res) {
		const { account } = req.body;
		const inputMint = req.query.inputMint;
		const outputMint = req.query.outputMint;
		const amount = req.query.amount;
		const slippageBps = req.query.slippageBps || 5000;

		if(!account || !inputMint || !outputMint || !amount) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields, field missing: ' + (!account ? 'account' : !inputMint ? 'inputMint' : !outputMint ? 'outputMint' : 'amount'),
			});
		}

		console.log("Slippage: ", slippageBps);
		try {
			const encodedTransaction = await SolanaTransactionBuilder.buildSwapTransaction(
				new PublicKey(account),
				inputMint,
				outputMint,
				amount,
				slippageBps,
			);
			return res.respond({
				status: 200,
				data: { transaction: encodedTransaction },
				props: { transaction: encodedTransaction },
				message: 'Transaction created successfully',
			});
		} catch(error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostTransferSol(req, res) {
		const { account } = req.body;

		const to = req.query.to;
		const amount = req.query.amount;

		if(!account || !to || !amount) {
			return res.respond({
				status: 400,
				message: 'Bad Request: Missing required fields',
			});
		}

		console.log(new PublicKey(account));

		try {
			const encodedTransaction = await SolanaTransactionBuilder.buildTransferSolTransaction(
				new PublicKey(account),
				new PublicKey(to),
				amount,
			);

			return res.respond({
				status: 200,
				data: { transaction: encodedTransaction },
				props: { transaction: encodedTransaction },
				message: 'Transaction created successfully',
			});
		} catch(error) {
			console.error(error);
			return res.respond({
				status: 400,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostStake(req, res) {
		const { account } = req.body;
		const validatorPubkey = req.query.validatorPubkey;
		const amount = req.query.amount;

		if(!account || !validatorPubkey || !amount) {
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
				data: { transaction: encodedTransaction },
				props: { transaction: encodedTransaction },
				message: 'Transaction created successfully',
			});
		} catch(error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}

	static async handlePostMemo(req, res) {

		const { account } = req.body;
		const message = req.query.message;

		if(!account || !message) {
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
				props: { transaction: encodedTransaction },
				message: 'Transaction created successfully',
			});
		} catch(error) {
			console.error(error);
			return res.respond({
				status: 500,
				message: 'Error processing transaction: ' + error.message,
			});
		}
	}
}

export default SolanaActionController;
