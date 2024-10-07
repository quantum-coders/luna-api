// src/DappRadarConsumerService.js

import DappRadarService from './dapp-radar.service.js';

class DappRadarConsumerService {

	/**
	 * Generic method to consume paginated endpoints.
	 * @param {Function} fetchFunction - The function from DappRadarService that performs the request.
	 * @param {Object} initialParams - Initial parameters for the request.
	 * @param {string} dataKey - The key in the response that contains the data.
	 * @returns {Promise<Array>} - An array with all the collected data.
	 */
	static async fetchAllPages(fetchFunction, initialParams = {}, dataKey = 'data') {
		const results = [];
		let page = 1;
		const perPage = 50; // Maximum number of results per page

		while (true) {
			try {
				const params = {...initialParams, page, resultsPerPage: perPage};
				const response = await fetchFunction(params);

				if (!response || !response[dataKey] || response[dataKey].length === 0) {
					break; // No more data
				}

				results.push(...response[dataKey]);

				// Check if the number of results is less than perPage to stop
				if (response[dataKey].length < perPage) {
					break;
				}

				page += 1; // Next page
			} catch (error) {
				console.error(`Error fetching page ${page}:`, error.message);
				break; // Stop loop on error
			}
		}

		return results;
	}

	/**
	 * Fetches all Dapps.
	 * @param {Object} [params] - Filtering parameters.
	 * @returns {Promise<Array>} - An array with all the Dapps.
	 */
	static async getAllDapps(params = {}) {
		return await this.fetchAllPages(DappRadarService.getDapps, params, 'dapps');
	}

	/**
	 * Fetches all aggregated metrics for Dapps.
	 * @param {Object} [params] - Filtering parameters.
	 * @returns {Promise<Array>} - An array with all aggregated metrics.
	 */
	static async getAllDappsAggregatedMetrics(params = {}) {
		return await this.fetchAllPages(DappRadarService.getDappsAggregatedMetrics, params, 'metrics');
	}

	/**
	 * Searches and fetches all Dapps that match the search parameters.
	 * @param {Object} [params] - Search parameters.
	 * @returns {Promise<Array>} - An array with all found Dapps.
	 */
	static async searchAllDapps(params = {}) {
		return await this.fetchAllPages(DappRadarService.searchDapps, params, 'dapps');
	}

	/**
	 * Fetches all top Dapps based on a specific metric.
	 * @param {string} metric - Metric to sort by (balance, transactions, uaw, volume).
	 * @param {Object} [params] - Filtering parameters.
	 * @returns {Promise<Array>} - An array with all top Dapps.
	 */
	static async getAllTopDapps(metric, params = {}) {
		const fetchFunction = (params) => DappRadarService.getTopDapps(metric, params);
		return await this.fetchAllPages(fetchFunction, params, 'dapps');
	}

	/**
	 * Fetches all NFT collections.
	 * @param {Object} [params] - Filtering parameters.
	 * @returns {Promise<Array>} - An array with all NFT collections.
	 */
	static async getAllNftCollections(params = {}) {
		return await this.fetchAllPages(DappRadarService.getNftCollections, params, 'collections');
	}

	/**
	 * Fetches all NFT marketplaces.
	 * @param {Object} [params] - Filtering parameters.
	 * @returns {Promise<Array>} - An array with all NFT marketplaces.
	 */
	static async getAllNftMarketplaces(params = {}) {
		return await this.fetchAllPages(DappRadarService.getNftMarketplaces, params, 'marketplaces');
	}

	/**
	 * Fetches all estimated NFT collections.
	 * @param {Object} [params] - Filtering parameters.
	 * @returns {Promise<Array>} - An array with all estimated NFT collections.
	 */
	static async getAllNftEstimatedCollections(params = {}) {
		return await this.fetchAllPages(DappRadarService.getNftEstimatedCollections, params, 'collections');
	}

	/**
	 * Fetches all DeFi Dapps.
	 * @param {Object} [params] - Filtering parameters.
	 * @returns {Promise<Array>} - An array with all DeFi Dapps.
	 */
	static async getAllDefiDapps(params = {}) {
		return await this.fetchAllPages(DappRadarService.getDefiDapps, params, 'dapps');
	}

}

export default DappRadarConsumerService;
