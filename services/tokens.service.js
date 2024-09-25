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
}

export default TokensService;
