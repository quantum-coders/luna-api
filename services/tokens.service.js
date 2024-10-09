import {prisma} from "@thewebchimp/primate";
import {JupiterService} from "./jupiter.service.js";

/**
 * A service class for fetching token data from the Jup API.
 */
class TokensService {

	/**
	 * Retrieves tokens from the Jup API.
	 *
	 * @param {string|null} [id=null] - The ID of the token to retrieve. If null, retrieves all verified tokens.
	 * @returns {Promise<Object>} A promise that resolves to the token data in JSON format.
	 * @throws {Error} If the fetch operation fails or if the response is not okay.
	 */
	static async getTokens(id = null) {
		try {
			let tokens;
			if (id) {
				tokens = await fetch(`https://tokens.jup.ag/token/${id}`);
			} else {
				tokens = await fetch('https://tokens.jup.ag/tokens?tags=verified');
			}

			if (!tokens.ok) {
				throw new Error('Failed to retrieve tokens');
			}

			return await tokens.json();
		} catch (error) {
			throw new Error(error.message);
		}
	}


	static async getTokenFromDatabase(address = null) {
		try{
			if(address) {
				return await prisma.token.findUnique({
					where: {
						address: address
					}
				});
			}else{
				return await prisma.token.findMany();
			}
		}catch (e) {
			throw new Error(e.message);
		}
	}

	static async sincronizeTokensToDatabase() {
		const tokens = await TokensService.getTokens();
		for (const token of tokens) {
			const newToken = await prisma.token.upsert({
				where: {address: token.address},
				update: {
					name: token.name,
					symbol: token.symbol,
					decimals: token.decimals,
					logoURI: token.logoURI,
					tags: JSON.stringify(token.tags), // Convertimos el array a string
					dailyVolume: token.daily_volume,
					freezeAuthority: token.freeze_authority,
					mintAuthority: token.mint_authority,
					permanentDelegate: token.permanent_delegate,
					mintedAt: token.minted_at ? new Date(token.minted_at) : null,
					coingeckoId: token.extensions?.coingeckoId,
					metas: JSON.stringify(token.extensions || {}), // Guardamos todas las extensiones en metas
					modified: new Date(),
				},
				create: {
					address: token.address,
					name: token.name,
					symbol: token.symbol,
					decimals: token.decimals,
					logoURI: token.logoURI,
					tags: JSON.stringify(token.tags), // Convertimos el array a string
					dailyVolume: token.daily_volume,
					freezeAuthority: token.freeze_authority,
					mintAuthority: token.mint_authority,
					permanentDelegate: token.permanent_delegate,
					mintedAt: token.minted_at ? new Date(token.minted_at) : null,
					coingeckoId: token.extensions?.coingeckoId,
					metas: JSON.stringify(token.extensions || {}), // Guardamos todas las extensiones en metas
					created: new Date(),
					modified: new Date(),
				},
			});
			console.info(`Upserted token ${newToken.name} (${newToken.symbol})`);
		}
	}

	static async getQuote(inputMint, outputMint) {
		try {
			if (!inputMint || !outputMint) {
				throw new Error('Invalid input or output mint');
			}
			const res =  await JupiterService.queryPriceApi(`ids=${inputMint},${outputMint}`);
			return res;
		} catch(e){
			throw new Error('Error :', e.message);
		}
	}
}

export default TokensService;
