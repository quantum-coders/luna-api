import {Connection, PublicKey} from "@solana/web3.js";
import 'dotenv/config';
import {prisma} from "@thewebchimp/primate";
import DappRadarService from "./dapp-radar.service.js";
import MarketAnalyserService from "./market-analyser.service.js";

class PortfolioService {
	static solanaConnection = new Connection(process.env.SOLANA_RPC_URL);

	static async getTokensByAddress(address) {
		try {
			const publicKey = new PublicKey(address);
			const tokenAccounts = await this.solanaConnection.getParsedTokenAccountsByOwner(publicKey, {
				programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
			});
			const tokens = tokenAccounts.value.map((accountInfo) => {
				const tokenAmount = accountInfo.account.data.parsed.info.tokenAmount.uiAmount;
				const tokenMint = accountInfo.account.data.parsed.info.mint;

				return {
					mint: tokenMint,
					amount: tokenAmount
				};
			});
			console.info(`Tokens for address ${address}:`, tokens);
			return tokens;
		} catch (error) {
			console.error(error);
		}
	}

	static async getVerifiedTokensByAddress(address) {
		try {
			const tokens = await this.getTokensByAddress(address);
			/// for each token query tokens prisma bd and extract just the verified ones which are in the db
			/// return the verified tokens
			const verifiedTokens = [];
			for (const token of tokens) {
				const tokenSearch = await prisma.token.findUnique({
					where: {
						address: token.mint
					}
				});
				if (tokenSearch) {
					try {
						const res = await DappRadarService.searchDapps({
							chain: 'solana',
							smartContract: tokenSearch.address,
							resultsPerPage: 10
						})
						const dapp = res?.results[0];
						if (dapp) {
							tokenSearch.metadata = dapp;
						}
					} catch (e) {
						console.error(e);
					}
					verifiedTokens.push(tokenSearch);
				}
			}
			console.info(`Verified tokens for address ${address}:`, verifiedTokens);
			return verifiedTokens;
		} catch (e) {
			console.error(e);
		}
	}

	static getAnalysisConfig(keys = null) {
		const strategyConfigs = [
			{
				key: "breakout_rsi",
				name: "Breakout Strategy with Bollinger Bands and RSI",
				description: "Detects breakouts when the price moves outside Bollinger Bands, confirmed by RSI.",
				indicators: {
					bollinger: {period: 20, stdDev: 2},
					rsi: {period: 14}
				}
			},
			{
				key: "momentum_macd_rsi",
				name: "Momentum Strategy with MACD and RSI",
				description: "Identifies momentum using MACD and RSI to confirm strong trend direction.",
				indicators: {
					macd: {fastPeriod: 12, slowPeriod: 26, signalPeriod: 9},
					rsi: {period: 14}
				}
			},
			{
				key: "volatility_atr",
				name: "Volatility Breakout with ATR",
				description: "Uses ATR to detect breakout opportunities when the market shows increased volatility.",
				indicators: {
					atr: {period: 14},
					bollinger: {period: 20, stdDev: 2}
				}
			},
			{
				key: "reversal_rsi",
				name: "Reversal Strategy with RSI Divergence",
				description: "Detects potential price reversals by identifying RSI divergence.",
				indicators: {
					rsi: {period: 14}
				}
			},
			{
				key: "trend_sma_macd",
				name: "Trend Following with SMA and MACD",
				description: "Follows market trends using SMA and MACD to time entries and exits.",
				indicators: {
					sma: {shortPeriod: 50, longPeriod: 200},
					macd: {fastPeriod: 12, slowPeriod: 26, signalPeriod: 9}
				}
			},
			{
				key: "comprehensive",
				name: "Comprehensive Multi-Indicator Strategy",
				description: "Combines trend following (SMA, EMA), momentum (MACD, RSI), volatility (ATR, Bollinger Bands), and support/resistance levels for a complete market analysis.",
				indicators: {
					sma: {shortPeriod: 50, longPeriod: 200},
					ema: {period12: 12, period26: 26},
					macd: {fastPeriod: 12, slowPeriod: 26, signalPeriod: 9},
					rsi: {period: 14},
					bollinger: {period: 20, stdDev: 2},
					atr: {period: 14}
				}
			}
		];

		if (keys) {
			return strategyConfigs.filter((config) => keys.includes(config.key));
		}

		return strategyConfigs;

	}

	static async generateAnalysisReport(tokens, strategyKeys = null) {
		const chain = 'solana';
		const intervalValue = 3;  // 3 years
		const intervalUnit = 'years';  // Time unit: years
		const {startDate, endDate} = MarketAnalyserService.calculateDateRange(intervalValue, intervalUnit);
		const formattedStartDate = startDate.toISOString().slice(0, 10);  // 'yyyy-MM-dd'
		const formattedEndDate = endDate.toISOString().slice(0, 10);      // 'yyyy-MM-dd'
		const strategyConfigs = this.getAnalysisConfig(strategyKeys);
		const allAnalysisResults = [];
		for (const strategyConfig of strategyConfigs) {
			console.info(`\nRunning strategy: ${strategyConfig.name}`);
			console.info(`Strategy description: ${strategyConfig.description}`);
			console.info("Strategy indicators:", JSON.stringify(strategyConfig.indicators, null, 2));
			for (const token of tokens) {
				const tokenAddress = token.address;
				console.log(`\nFetching historical data for token ${tokenAddress} on ${chain} chain from ${formattedStartDate} to ${formattedEndDate} (${intervalValue} ${intervalUnit})`);
				try {
					const historicalData = await DappRadarService.getTokenHistoricalPrice(chain, tokenAddress, {
						dateFrom: formattedStartDate,
						dateTo: formattedEndDate
					});

					if (!historicalData || !Array.isArray(historicalData.results) || historicalData.results.length === 0) {
						console.warn(`No historical data available for token ${tokenAddress}. Skipping...`);
						continue;
					}
					console.log(`Historical data fetched for token ${tokenAddress}: Number of results: ${historicalData.results.length}`);

					// Ensure data is sorted by timestamp in ascending order
					historicalData.results.sort((a, b) => a.timestamp - b.timestamp);

					console.log(`Performing advanced trading analysis for token ${tokenAddress} using strategy ${strategyConfig.name}`);

					// Pass the strategy configuration to the analysis
					const analysis = await MarketAnalyserService.advancedTradingAnalysis(
						historicalData.results,  // Historical data
						intervalValue,  // Analysis interval
						intervalUnit,   // Time unit
						strategyConfig.indicators.sma?.shortPeriod || null,  // Short SMA (if defined)
						strategyConfig.indicators.sma?.longPeriod || null,   // Long SMA (if defined)
						strategyConfig.indicators.rsi?.period || null,       // RSI (if defined)
						strategyConfig.indicators.macd || null,              // MACD parameters (if defined)
						strategyConfig.indicators.bollinger || null,         // Bollinger Bands parameters (if defined)
						strategyConfig.indicators.atr || null                // ATR parameters (if defined)
					);

					allAnalysisResults.push(analysis);
					// Show analysis results
					console.log(`\nAdvanced Trading Analysis for token ${tokenAddress} using strategy ${strategyConfig.name} (${intervalValue} ${intervalUnit}):`);
					console.log(JSON.stringify(analysis, null, 2));
				} catch (fetchError) {
					console.error(`Error fetching or analyzing data for token ${tokenAddress}:`, fetchError);
				}

			}
		}
		return allAnalysisResults;
	}

	/**
	 * Saves the analysis results into the database.
	 * @param {Int} userId - The ID of the user.
	 * @param {Int} messageId - The ID of the message associated with the analysis.
	 * @param {Array} analysisResults - The array of analysis results from generateAnalysisReport.
	 */
	static async saveAnalysisResults(userId, messageId, analysisResults) {
		for (const result of analysisResults) {
			const {token, strategyConfig, analysis, intervalValue, intervalUnit, startDate, endDate} = result;

			// Find the token in the database
			const tokenRecord = await prisma.token.findUnique({
				where: {address: token.address},
			});

			if (!tokenRecord) {
				console.error(`Token with address ${token.address} not found in database.`);
				continue;
			}

			// Create the analysis report
			const analysisReport = await prisma.analysisReport.create({
				data: {
					idToken: tokenRecord.id,
					idUser: userId,
					idMessage: messageId,
					strategyKey: strategyConfig.key,
					strategyName: strategyConfig.name,
					strategyDescription: strategyConfig.description,
					intervalValue: intervalValue,
					intervalUnit: intervalUnit,
					startDate: startDate,
					endDate: endDate,
					interpretation: analysis.interpretation,
					indicators: {
						create: this.mapIndicators(analysis),
					},
					predictions: {
						create: this.mapPredictions(analysis),
					},
					supportLevels: {
						create: analysis.support_levels.map((level) => ({priceLevel: level})),
					},
					resistanceLevels: {
						create: analysis.resistance_levels.map((level) => ({priceLevel: level})),
					},
				},
			});


			/*
						// Generate action steps based on analysis
						const steps = this.generateActionSteps(analysis, tokenRecord);

						// Create action plan
						const actionPlan = await prisma.actionPlan.create({
							data: {
								idUser: userId,
								idToken: tokenRecord.id,
								idMessage: messageId,
								strategyKey: strategyConfig.key,
								status: "active",
								steps: {
									create: steps,
								},
							},
						});
			*/

			console.log(`Analysis report and action plan saved for token ${token.address}`);
		}
	}

	/**
	 * Maps analysis indicators to the format required by the database.
	 * @param {Object} analysis - The analysis object containing indicator data.
	 * @returns {Array} - An array of indicator objects.
	 */
	static mapIndicators(analysis) {
		const indicators = [];
		if (analysis.rsi !== null && analysis.rsi !== undefined) {
			indicators.push({
				type: "rsi",
				value: analysis.rsi,
			});
		}
		if (analysis.macd) {
			indicators.push({
				type: "macd",
				value: analysis.macd,
			});
		}
		if (analysis.bollinger_bands) {
			indicators.push({
				type: "bollinger_bands",
				value: analysis.bollinger_bands,
			});
		}
		if (analysis.moving_averages) {
			indicators.push({
				type: "moving_averages",
				value: analysis.moving_averages,
			});
		}
		if (analysis.volatility !== undefined) {
			indicators.push({
				type: "volatility",
				value: analysis.volatility,
			});
		}
		// Add other indicators as needed
		return indicators;
	}

	/**
	 * Maps analysis predictions to the format required by the database.
	 * @param {Object} analysis - The analysis object containing prediction data.
	 * @returns {Array} - An array of prediction objects.
	 */
	static mapPredictions(analysis) {
		const predictions = [];
		if (analysis.prediction_next_day !== undefined) {
			predictions.push({
				timeFrame: "next_day",
				predictedPrice: analysis.prediction_next_day,
			});
		}
		if (analysis.prediction_one_week !== undefined) {
			predictions.push({
				timeFrame: "one_week",
				predictedPrice: analysis.prediction_one_week,
			});
		}
		if (analysis.prediction_one_month !== undefined) {
			predictions.push({
				timeFrame: "one_month",
				predictedPrice: analysis.prediction_one_month,
			});
		}
		return predictions;
	}
}

export default PortfolioService;
