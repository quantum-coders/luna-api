import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import 'dotenv/config';

/**
 * Solana Wallet Manager Class
 */
class SolanaService {
	static connection = new Connection(process.env.SOLANA_RPC_URL);
	static tokens = null;

	/**
	 * Fetch tokens from Jupiter API
	 */
	static async fetchTokens() {
		if(!this.tokens) {
			const response = await fetch('https://token.jup.ag/all');
			this.tokens = await response.json();
		}
	}

	/**
	 * Create a new wallet
	 * @returns {Promise<Object>} - The newly created wallet's public and secret keys.
	 */
	static async createWallet() {
		const newWallet = Keypair.generate();
		const secretKeyBase64 = Buffer.from(newWallet.secretKey).toString('base64');
		return {
			publicKey: newWallet.publicKey.toString(),
			secretKey: secretKeyBase64,
			keypair: newWallet,
		};
	}

	/**
	 * Get SOL balance for a given public key
	 * @param {PublicKey} publicKey - The public key to query the balance for.
	 * @returns {Promise<Object>} - The balance and token address.
	 */
	static async getSolBalance(publicKey) {
		await this.fetchTokens();
		const balanceUnformatted = await this.connection.getBalance(new PublicKey(publicKey));
		if(!balanceUnformatted) return { mint: this.getTokenAddress('SOL'), balance: 0 };
		const balance = balanceUnformatted / 1e9;
		return {
			mint: this.getTokenAddress('SOL'),
			balance: balance.toFixed(2),
			name: 'Solana',
			symbol: 'SOL',
			decimals: 9,
			logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		};
	}

	/**
	 * Get the balance of a specific token for a given public key
	 * @param {string} publicKey - The public key to query the balance for.
	 * @param {string} mintAddress - The mint address of the token.
	 * @returns {Promise<Object>} - The balance and token address.
	 */
	static async getBalanceOfSpecificToken(publicKey, mintAddress) {
		await this.fetchTokens();
		try {
			const mintAddressString = typeof mintAddress === 'string' ? mintAddress : mintAddress.toBase58();
			const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
				new PublicKey(publicKey),
				{ programId: TOKEN_PROGRAM_ID },
			);
			const specificTokenAccount = tokenAccounts.value.find(account => {
				const accountMintAddress = account.account.data.parsed.info.mint;
				return accountMintAddress === mintAddressString;
			});

			const balance = specificTokenAccount ? specificTokenAccount.account.data.parsed.info.tokenAmount.uiAmount : 0;
			const tokenData = this.tokens.find(token => token.address === mintAddressString) || {};
			return {
				mint: mintAddressString,
				balance: balance,
				name: tokenData.name || 'Unknown',
				symbol: tokenData.symbol || 'Unknown',
				decimals: tokenData.decimals || 0,
				logoURI: tokenData.logoURI || '',
			};
		} catch(error) {
			return {
				mint: mintAddress,
				balance: 0,
				name: 'Unknown',
				symbol: 'Unknown',
				decimals: 0,
				logoURI: '',
			};
		}
	}

	/**
	 * Get all token balances for a given public key
	 * @param {string} publicKey - The public key to query the balances for.
	 * @returns {Promise<Array>} - Array of balances.
	 */
	static async getAllBalances(publicKey) {
		await this.fetchTokens();
		const solBalance = await this.getSolBalance(new PublicKey(publicKey));
		const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
			new PublicKey(publicKey),
			{ programId: TOKEN_PROGRAM_ID },
		);
		let balances = tokenAccounts.value.map(account => {
			const mintAddress = account.account.data.parsed.info.mint;
			const tokenData = this.tokens.find(token => token.address === mintAddress) || {};
			return {
				mint: mintAddress,
				balance: account.account.data.parsed.info.tokenAmount.uiAmount,
				name: tokenData.name || 'Unknown',
				symbol: tokenData.symbol || 'Unknown',
				decimals: tokenData.decimals || 0,
				logoURI: tokenData.logoURI || '',
			};
		});
		// filter out tokens without name set
		balances = balances.filter(balance => balance.name !== 'Unknown');
		balances = [ solBalance, ...balances ];
		return balances.filter(balance => balance.balance > 0);
	}

	/**
	 * Get token decimals
	 * @param {string} mintAddress - The mint address of the token.
	 * @returns {Promise<number>} - The number of decimals.
	 */
	static async getTokenDecimals(mintAddress) {
		const connection = new Connection(process.env.SOLANA_RPC_URL);
		const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
		return mintInfo.value.data.parsed.info.decimals;
	}

	/**
	 * Get token address from symbol
	 * @param {string} symbol - The token symbol.
	 * @returns {string} - The token address.
	 */
	static getTokenAddress(symbol) {
		const token = this.tokens.find(token => token.symbol === symbol);
		return token ? token.address : 'Unknown';
	}

}

export default SolanaService;
