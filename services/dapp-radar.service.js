import 'dotenv/config';
class DappRadarService {
  // Base URL
  static baseURL = 'https://apis.dappradar.com/v2';

  /**
   * Gets the API key from environment variables.
   * @returns {string} - The API key.
   */
  static get apiKey() {
    return process.env.DAPPRADAR_API_KEY;
  }

  // Get headers
  static get headers() {
    const headers = {
      'Accept': 'application/json',
    };
    if (DappRadarService.apiKey) {
      headers['X-API-KEY'] = DappRadarService.apiKey;
    }
    return headers;
  }

  // Dapps

  /**
   * Retrieves a list of multiple dapps.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain to filter dapps.
   * @param {number} [params.page] - Specific page number (min 1).
   * @param {number} [params.resultsPerPage] - Number of results per page (10, 25, or 50).
   * @returns {Promise<Object>} - The response data.
   */
  static async getDapps(params = {}) {
    console.info("Information about params: ", params);
    console.info("Information about base URL: ", DappRadarService.baseURL);
    const url = new URL(`${DappRadarService.baseURL}/dapps`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    console.info("Information about response: ", response);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const res =  response.json();

  }

  /**
   * Retrieves data for a single dapp.
   * @param {number} dappId - The ID of the dapp.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {string} [params.range] - Range (24h, 7d, 30d).
   * @returns {Promise<Object>} - The response data.
   */
  static async getDapp(dappId, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/dapps/${dappId}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves historical data for a given dapp.
   * @param {number} dappId - The ID of the dapp.
   * @param {string} metric - Metric to retrieve (transactions, uaw, volume).
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain (for multichain dapps).
   * @param {string} [params.dateFrom] - Start date (yyyy-MM-dd).
   * @param {string} [params.dateTo] - End date (yyyy-MM-dd).
   * @returns {Promise<Object>} - The response data.
   */
  static async getDappHistory(dappId, metric, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/dapps/${dappId}/history/${metric}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves a list of dapps with aggregated metrics.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain to filter dapps.
   * @param {string} [params.range] - Range (24h, 7d, 30d).
   * @param {number} [params.page] - Specific page number (min 1).
   * @param {number} [params.resultsPerPage] - Number of results per page (10, 25, or 50).
   * @returns {Promise<Object>} - The response data.
   */
  static async getDappsAggregatedMetrics(params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/dapps/aggregated/metrics`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves all supported categories in the dapp rankings.
   * @returns {Promise<Object>} - The response data.
   */
  static async getDappCategories() {
    const url = new URL(`${DappRadarService.baseURL}/dapps/categories`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves all supported chains in the dapp rankings.
   * @returns {Promise<Object>} - The response data.
   */
  static async getDappChains() {
    const url = new URL(`${DappRadarService.baseURL}/dapps/chains`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Searches for dapps based on provided parameters.
   * @param {Object} params - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {string} [params.smartContract] - Search dapps by smart contract.
   * @param {string} [params.website] - Search dapps by exact website.
   * @param {string} [params.name] - Search dapps by name/title.
   * @param {number} [params.page] - Specific page number (min 1).
   * @param {number} [params.resultsPerPage] - Number of results per page (10, 25, or 50).
   * @returns {Promise<Object>} - The response data.
   */
  static async searchDapps(params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/dapps/search`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    console.log("URL: ", url.toString());
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves the top dapps based on a specific metric.
   * @param {string} metric - Metric to sort by (balance, transactions, uaw, volume).
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {string} [params.category] - Specific category.
   * @param {string} [params.range] - Range (24h, 7d, 30d).
   * @param {number} [params.top] - Number of top results (10, 25, 50, 100).
   * @returns {Promise<Object>} - The response data.
   */
  static async getTopDapps(metric, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/dapps/top/${metric}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // NFTs

  /**
   * Retrieves a list of multiple NFT collections.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.range] - Range (15min, 30min, 1h, 24h, 7d, 30d, all).
   * @param {string} [params.sort] - Sort by (avgPrice, traders, volume, sales, marketCap, floorPrice).
   * @param {string} [params.order] - Sorting order (asc, desc).
   * @param {string} [params.chain] - Specific chain.
   * @param {number} [params.page] - Specific page number (min 1).
   * @param {number} [params.resultsPerPage] - Number of results per page (10, 25, 50).
   * @param {string} [params.address] - Collection smart contract address.
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftCollections(params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/nfts/collections`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves data for a single NFT collection.
   * @param {number} collectionId - The ID of the NFT collection.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {string} [params.range] - Range (15min, 30min, 1h, 24h, 7d, 30d, all).
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftCollection(collectionId, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/nfts/collections/${collectionId}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves all chains that are supported in the NFT collections page.
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftCollectionChains() {
    const url = new URL(`${DappRadarService.baseURL}/nfts/collections/chains`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves a list of multiple NFT marketplaces.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {string} [params.range] - Range (1h, 24h, 7d, 30d, all).
   * @param {string} [params.sort] - Sort by (avgPrice, traders, volume).
   * @param {string} [params.order] - Sorting order (asc, desc).
   * @param {number} [params.page] - Specific page number (min 1).
   * @param {number} [params.resultsPerPage] - Number of results per page (10, 25, 50).
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftMarketplaces(params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/nfts/marketplaces`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves all chains that are supported in the NFT marketplaces page.
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftMarketplaceChains() {
    const url = new URL(`${DappRadarService.baseURL}/nfts/marketplaces/chains`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves metadata of a specific NFT.
   * @param {string} chain - The chain.
   * @param {string} address - The collection smart contract address.
   * @param {string} nftId - The NFT ID.
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftMetadata(chain, address, nftId) {
    const url = new URL(`${DappRadarService.baseURL}/nfts/metadata/${chain}/${address}/${nftId}`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves all chains that support NFT metadata.
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftMetadataChains() {
    const url = new URL(`${DappRadarService.baseURL}/nfts/metadata/chains`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves estimated collection price.
   * @param {number} collectionId - The collection ID.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain (for multichain collections).
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftCollectionEstimatedValue(collectionId, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/nfts/value-estimator/${collectionId}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves estimated NFT price.
   * @param {number} collectionId - The collection ID.
   * @param {string} nftId - The NFT ID.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain (for multichain collections).
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftItemEstimatedValue(collectionId, nftId, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/nfts/value-estimator/${collectionId}/${nftId}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves all chains that support estimated NFT values.
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftValueEstimatorChains() {
    const url = new URL(`${DappRadarService.baseURL}/nfts/value-estimator/chains`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves multiple NFT collections with estimated prices support.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {number} [params.page] - Specific page number (min 1).
   * @param {number} [params.resultsPerPage] - Number of results per page (10, 25, 50).
   * @returns {Promise<Object>} - The response data.
   */
  static async getNftEstimatedCollections(params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/nfts/value-estimator/collections`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Tokens

  /**
   * Retrieves all chains that support Tokens.
   * @returns {Promise<Object>} - The response data.
   */
  static async getTokenChains() {
    const url = new URL(`${DappRadarService.baseURL}/tokens/chains`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Fetches historical prices of a token in USD.
   * @param {string} chain - The token chain.
   * @param {string} address - The token smart contract address.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.dateFrom] - Start date (yyyy-MM-dd).
   * @param {string} [params.dateTo] - End date (yyyy-MM-dd).
   * @returns {Promise<Object>} - The response data.
   */
  static async getTokenHistoricalPrice(chain, address, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/tokens/historical-price/${chain}/${address}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves current token static information.
   * @param {string} chain - The token chain.
   * @param {string} address - The token smart contract address.
   * @returns {Promise<Object>} - The response data.
   */
  static async getTokenInfo(chain, address) {
    const url = new URL(`${DappRadarService.baseURL}/tokens/info/${chain}/${address}`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves token metrics in a 24h range.
   * @param {string} chain - The token chain.
   * @param {string} address - The token smart contract address.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.range] - Range (24h).
   * @returns {Promise<Object>} - The response data.
   */
  static async getTokenMetrics(chain, address, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/tokens/metrics/${chain}/${address}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves the current price of a token in USD.
   * @param {string} chain - The token chain.
   * @param {string} address - The token smart contract address.
   * @returns {Promise<Object>} - The response data.
   */
  static async getTokenPrice(chain, address) {
    const url = new URL(`${DappRadarService.baseURL}/tokens/price/${chain}/${address}`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // DeFi

  /**
   * Retrieves all chains that support DeFi.
   * @returns {Promise<Object>} - The response data.
   */
  static async getDefiChains() {
    const url = new URL(`${DappRadarService.baseURL}/defi/chains`);
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves a list of multiple DeFi dapps.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {string} [params.range] - Range (24h, 7d, 30d).
   * @param {string} [params.sort] - Sort by (tokenPrice, marketCap, adjustedTvl, tvl, marketCapTvl).
   * @param {string} [params.order] - Sorting order (asc, desc).
   * @param {number} [params.page] - Specific page number (min 1).
   * @param {number} [params.resultsPerPage] - Number of results per page (10, 25, 50).
   * @returns {Promise<Object>} - The response data.
   */
  static async getDefiDapps(params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/defi/dapps`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Retrieves DeFi metrics for a specific dapp.
   * @param {number} dappId - The dapp ID.
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.chain] - Specific chain.
   * @param {string} [params.range] - Range (24h, 7d, 30d).
   * @returns {Promise<Object>} - The response data.
   */
  static async getDefiDapp(dappId, params = {}) {
    const url = new URL(`${DappRadarService.baseURL}/defi/dapps/${dappId}`);
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    const response = await fetch(url.toString(), { headers: DappRadarService.headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}


export default DappRadarService;
