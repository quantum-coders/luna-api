import DappRadarService from './services/dapp-radar.service.js';
// testDappRadar.js
import 'dotenv/config';


(async () => {
	try {
		// Establece la cadena a 'solana' o cualquier otra cadena que desees
		let chain = 'solana';

		// Test getDappChains
		console.log('Testing getDappChains...');
		const chains = await DappRadarService.getDappChains();
		console.log('getDappChains result:', JSON.stringify(chains, null, 2));
		// DApps

		// Test getDapps
		console.log('Testing getDapps...');
		const dapps = await DappRadarService.getDapps({
			chain,
			page: 1,
			resultsPerPage: 10,
		});
		console.log('getDapps result:', JSON.stringify(dapps, null, 2));

		// Test getDapp
		if (dapps.results && dapps.results.length > 0) {
			const dappId = dapps.results[0].dappId;
			console.log(`Testing getDapp with dappId: ${dappId}...`);
			const dapp = await DappRadarService.getDapp(dappId, {chain, range: '24h'});
			console.log('getDapp result:', JSON.stringify(dapp, null, 2));
		}

		// Test getDappHistory
		if (dapps.results && dapps.results.length > 0) {
			const dappId = dapps.results[0].dappId;
			console.log(`Testing getDappHistory with dappId: ${dappId}...`);
			const history = await DappRadarService.getDappHistory(dappId, 'transactions', {
				chain,
				dateFrom: '2023-01-01',
				dateTo: '2023-01-31',
			});
			console.log('getDappHistory result:', JSON.stringify(history, null, 2));
		}

		// Test getDappsAggregatedMetrics
		console.log('Testing getDappsAggregatedMetrics...');
		const aggregatedMetrics = await DappRadarService.getDappsAggregatedMetrics({
			chain,
			range: '24h',
			page: 1,
			resultsPerPage: 10,
		});
		console.log('getDappsAggregatedMetrics result:', JSON.stringify(aggregatedMetrics, null, 2));

		// Test getDappCategories
		console.log('Testing getDappCategories...');
		const categories = await DappRadarService.getDappCategories();
		console.log('getDappCategories result:', JSON.stringify(categories, null, 2));


		// Test searchDapps
		console.log('Testing searchDapps...');
		const searchResults = await DappRadarService.searchDapps({
			chain,
			name: 'Solana',
			page: 1,
			resultsPerPage: 10,
		});
		console.log('searchDapps result:', JSON.stringify(searchResults, null, 2));

		// Test getTopDapps
		console.log('Testing getTopDapps...');
		const topDapps = await DappRadarService.getTopDapps('volume', {
			chain,
			range: '24h',
			top: 10,
		});
		console.log('getTopDapps result:', JSON.stringify(topDapps, null, 2));

		// NFTs

		// Test getNftCollections
		console.log('Testing getNftCollections...');
		const nftCollections = await DappRadarService.getNftCollections({
			chain,
			range: '24h',
			page: 1,
			resultsPerPage: 10,
		});
		console.log('getNftCollections result:', JSON.stringify(nftCollections, null, 2));

		// Test getNftCollection
		if (nftCollections.results && nftCollections.results.length > 0) {
			const collectionId = nftCollections.results[0].collectionId;
			console.log(`Testing getNftCollection with collectionId: ${collectionId}...`);
			const nftCollection = await DappRadarService.getNftCollection(collectionId, {chain, range: '24h'});
			console.log('getNftCollection result:', JSON.stringify(nftCollection, null, 2));
		}

		// Test getNftCollectionChains
		console.log('Testing getNftCollectionChains...');
		const nftCollectionChains = await DappRadarService.getNftCollectionChains();
		console.log('getNftCollectionChains result:', JSON.stringify(nftCollectionChains, null, 2));

		// Test getNftMarketplaces
		console.log('Testing getNftMarketplaces...');
		const nftMarketplaces = await DappRadarService.getNftMarketplaces({
			chain,
			range: '24h',
			page: 1,
			resultsPerPage: 10,
		});
		console.log('getNftMarketplaces result:', JSON.stringify(nftMarketplaces, null, 2));

		// Test getNftMarketplaceChains
		console.log('Testing getNftMarketplaceChains...');
		const nftMarketplaceChains = await DappRadarService.getNftMarketplaceChains();
		console.log('getNftMarketplaceChains result:', JSON.stringify(nftMarketplaceChains, null, 2));

		// Test getNftMetadata
		if (nftCollections.results && nftCollections.results.length > 0) {
			const collection = nftCollections.results[0];
			const address = collection.address || (collection.smartContracts && collection.smartContracts[0]);
			const nftId = '1'; // Reemplaza con un NFT ID válido
			if (address) {
				console.log(`Testing getNftMetadata with address: ${address} and nftId: ${nftId}...`);
				const nftMetadata = await DappRadarService.getNftMetadata(chain, address, nftId);
				console.log('getNftMetadata result:', JSON.stringify(nftMetadata, null, 2));
			}
		}

		// Test getNftMetadataChains
		console.log('Testing getNftMetadataChains...');
		const nftMetadataChains = await DappRadarService.getNftMetadataChains();
		console.log('getNftMetadataChains result:', JSON.stringify(nftMetadataChains, null, 2));

		// Test getNftCollectionEstimatedValue
		if (nftCollections.results && nftCollections.results.length > 0) {
			const collectionId = nftCollections.results[0].collectionId;
			console.log(`Testing getNftCollectionEstimatedValue with collectionId: ${collectionId}...`);
			const estimatedValue = await DappRadarService.getNftCollectionEstimatedValue(collectionId, {chain});
			console.log('getNftCollectionEstimatedValue result:', JSON.stringify(estimatedValue, null, 2));
		}

		// Test getNftItemEstimatedValue
		if (nftCollections.results && nftCollections.results.length > 0) {
			const collectionId = nftCollections.results[0].collectionId;
			const nftId = '1'; // Reemplaza con un NFT ID válido
			console.log(`Testing getNftItemEstimatedValue with collectionId: ${collectionId} and nftId: ${nftId}...`);
			const itemEstimatedValue = await DappRadarService.getNftItemEstimatedValue(collectionId, nftId, {chain});
			console.log('getNftItemEstimatedValue result:', JSON.stringify(itemEstimatedValue, null, 2));
		}

		// Test getNftValueEstimatorChains
		console.log('Testing getNftValueEstimatorChains...');
		const nftValueEstimatorChains = await DappRadarService.getNftValueEstimatorChains();
		console.log('getNftValueEstimatorChains result:', JSON.stringify(nftValueEstimatorChains, null, 2));

// Verificar si 'solana' es soportada
		if (nftValueEstimatorChains.chains.includes('solana')) {
			console.log('Solana soporta el estimador de valor de NFT.');
		} else {
			console.log('Solana NO soporta el estimador de valor de NFT. Usando Ethereum en su lugar.');
			chain = 'ethereum';
		}

// Obtener colecciones que soportan valores estimados en la cadena seleccionada
		console.log('Testing getNftEstimatedCollections...');
		const nftEstimatedCollections = await DappRadarService.getNftEstimatedCollections({
			chain,
			page: 1,
			resultsPerPage: 10,
		});
		console.log('getNftEstimatedCollections result:', JSON.stringify(nftEstimatedCollections, null, 2));

// Seleccionar un collectionId válido
		if (nftEstimatedCollections.results && nftEstimatedCollections.results.length > 0) {
			const validCollectionId = nftEstimatedCollections.results[0].collectionId;
			console.log(`Testing getNftCollectionEstimatedValue with collectionId: ${validCollectionId} and chain: ${chain}...`);
			const estimatedValue = await DappRadarService.getNftCollectionEstimatedValue(validCollectionId, {chain});
			console.log('getNftCollectionEstimatedValue result:', JSON.stringify(estimatedValue, null, 2));
		} else {
			console.log('No se encontraron colecciones que soporten valores estimados en la cadena seleccionada.');
		}


		// Tokens

		// Test getTokenChains
		console.log('Testing getTokenChains...');
		const tokenChains = await DappRadarService.getTokenChains();
		console.log('getTokenChains result:', JSON.stringify(tokenChains, null, 2));

		// Test getTokenHistoricalPrice
		// Reemplaza 'Token_Address_Here' con una dirección de token válida en Solana
		const tokenAddress = 'Token_Address_Here';
		if (tokenChains.chains.includes(chain)) {
			console.log(`Testing getTokenHistoricalPrice for token address: ${tokenAddress}...`);
			const tokenHistoricalPrice = await DappRadarService.getTokenHistoricalPrice(chain, tokenAddress, {
				dateFrom: '2023-01-01',
				dateTo: '2023-01-31',
			});
			console.log('getTokenHistoricalPrice result:', JSON.stringify(tokenHistoricalPrice, null, 2));

			// Test getTokenInfo
			console.log(`Testing getTokenInfo for token address: ${tokenAddress}...`);
			const tokenInfo = await DappRadarService.getTokenInfo(chain, tokenAddress);
			console.log('getTokenInfo result:', JSON.stringify(tokenInfo, null, 2));

			// Test getTokenMetrics
			console.log(`Testing getTokenMetrics for token address: ${tokenAddress}...`);
			const tokenMetrics = await DappRadarService.getTokenMetrics(chain, tokenAddress, {range: '24h'});
			console.log('getTokenMetrics result:', JSON.stringify(tokenMetrics, null, 2));

			// Test getTokenPrice
			console.log(`Testing getTokenPrice for token address: ${tokenAddress}...`);
			const tokenPrice = await DappRadarService.getTokenPrice(chain, tokenAddress);
			console.log('getTokenPrice result:', JSON.stringify(tokenPrice, null, 2));
		} else {
			console.log(`Chain ${chain} does not support token endpoints.`);
		}

		// DeFi

		// Test getDefiChains
		console.log('Testing getDefiChains...');
		const defiChains = await DappRadarService.getDefiChains();
		console.log('getDefiChains result:', JSON.stringify(defiChains, null, 2));

		// Test getDefiDapps
		console.log('Testing getDefiDapps...');
		const defiDapps = await DappRadarService.getDefiDapps({
			chain,
			range: '24h',
			page: 1,
			resultsPerPage: 10,
		});
		console.log('getDefiDapps result:', JSON.stringify(defiDapps, null, 2));

		// Test getDefiDapp
		if (defiDapps.results && defiDapps.results.length > 0) {
			const defiDappId = defiDapps.results[0].dappId;
			console.log(`Testing getDefiDapp with dappId: ${defiDappId}...`);
			const defiDapp = await DappRadarService.getDefiDapp(defiDappId, {chain, range: '24h'});
			console.log('getDefiDapp result:', JSON.stringify(defiDapp, null, 2));
		}

	} catch (error) {
		console.error('Error during tests:', error);
	}
})();
