class TokensService{
	static async getTokens(id = null){
		try {
			let tokens;
			if(id){
				tokens = await fetch(`https://tokens.jup.ag/token/${id}`);
			}else{
				tokens = await fetch('https://tokens.jup.ag/tokens?tags=verified');
			}
			if(!tokens.ok) {
				throw new Error('Failed to retrieve tokens');
			}
			return await tokens.json();
		} catch (error) {
			throw new Error(error.message);
		}
	}
}


export default TokensService;
