import 'dotenv/config';
import axios from 'axios';

/**
 * @class ExaService
 * @description Static methods to interact with Exa API.
 */
class ExaService {
	static baseUrl = 'https://api.exa.ai';

	/**
	 * Perform a search with a query and return the results.
	 * @param {string} query - The query string.
	 * @param {Object} options - Additional search options.
	 * @param {string} [options.type='neural'] - The type of search ('keyword', 'neural', or 'magic').
	 * @param {boolean} [options.useAutoprompt=false] - If true, converts your query to an Exa query.
	 * @param {number} [options.numResults=10] - Number of search results to return.
	 * @param {boolean} [options.text=false] - If true, includes the text in the results.
	 * @returns {Promise<Object>} - The search results.
	 * @example
	 * const results = await ExaService.search('hottest AI startups', { type: 'neural', useAutoprompt: true, numResults: 10, text: true });
	 * console.log(results);
	 */
	static async search(query, options = {}) {
		try {
			const response = await axios.post(
				`${ this.baseUrl }/search`,
				{ query, ...options },
				{ headers: { 'x-api-key': process.env.EXA_API_KEY } },
			);
			return response.data;
		} catch(error) {
			console.error('Error:', error);
			throw error;
		}
	}

	/**
	 * Get contents of documents based on a list of document IDs.
	 * @param {string[]} ids - Array of document IDs obtained from searches.
	 * @returns {Promise<Object>} - The contents of the documents.
	 * @example
	 * const contents = await ExaService.getContents(['document_id_1', 'document_id_2']);
	 * console.log(contents);
	 */
	static async getContents(ids) {
		try {
			const response = await axios.post(
				`${ this.baseUrl }/contents`,
				{ ids },
				{ headers: { 'x-api-key': process.env.EXA_API_KEY } },
			);
			return response.data;
		} catch(error) {
			console.error('Error:', error);
			throw error;
		}
	}

	/**
	 * Find similar links to the provided URL.
	 * @param {string} url - The URL for which you want to find similar links.
	 * @param {Object} options - Additional options for the search.
	 * @param {number} [options.numResults=10] - Number of search results to return.
	 * @param {string[]} [options.includeDomains] - List of domains to include in the search.
	 * @param {string[]} [options.excludeDomains] - List of domains to exclude in the search.
	 * @returns {Promise<Object>} - The similar links.
	 * @example
	 * const similarLinks = await ExaService.findSimilar('https://example.com/some-article', { numResults: 5 });
	 * console.log(similarLinks);
	 */
	static async findSimilar(url, options = {}) {
		try {
			const response = await axios.post(
				`${ this.baseUrl }/findSimilar`,
				{ url, ...options },
				{ headers: { 'x-api-key': process.env.EXA_API_KEY } },
			);
			return response.data;
		} catch(error) {
			console.error('Error:', error);
			throw error;
		}
	}

	/**
	 * Generate APA references from an array of search results or document contents.
	 * @param {Object[]} items - Array of items containing search results or document contents.
	 * @returns {string[]} - Array of APA formatted references.
	 * @example
	 * const items = [
	 *   { title: 'Title 1', url: 'https://example.com', publishedDate: '2023-01-01', author: 'Author 1' },
	 *   { title: 'Title 2', url: 'https://example.com', publishedDate: '2022-01-01', author: 'Author 2' }
	 * ];
	 * const apaReferences = ExaService.generateAPA(items);
	 * console.log(apaReferences);
	 */
	static generateAPA(items) {
		return items.map(item => {
			const { title, url, publishedDate, author } = item;
			const year = publishedDate ? new Date(publishedDate).getFullYear() : 'n.d.';
			return `${ author || 'Anonymous' }. (${ year }). ${ title }. Retrieved from ${ url }`;
		});
	}
}

export default ExaService;
