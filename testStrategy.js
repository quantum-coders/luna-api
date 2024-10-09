import DappRadarService from "./services/dapp-radar.service.js";
import MarketAnalyserService from "./services/market-analyser.service.js";
import AiService from "./services/ai.service.js";
import {prisma} from "@thewebchimp/primate";

/**
 * Main function to run the trading analysis and generate reports based on strategy configurations.
 */
async function main() {
	try {
		// Define multiple strategy configurations for analysis
		const strategyConfigs = [
			{
				name: "Breakout Strategy with Bollinger Bands and RSI",
				description: "Detects breakouts when the price moves outside Bollinger Bands, confirmed by RSI.",
				indicators: {
					bollinger: {period: 20, stdDev: 2},
					rsi: {period: 14}
				}
			},
			{
				name: "Momentum Strategy with MACD and RSI",
				description: "Identifies momentum using MACD and RSI to confirm strong trend direction.",
				indicators: {
					macd: {fastPeriod: 12, slowPeriod: 26, signalPeriod: 9},
					rsi: {period: 14}
				}
			},
			{
				name: "Volatility Breakout with ATR",
				description: "Uses ATR to detect breakout opportunities when the market shows increased volatility.",
				indicators: {
					atr: {period: 14},
					bollinger: {period: 20, stdDev: 2}
				}
			},
			{
				name: "Reversal Strategy with RSI Divergence",
				description: "Detects potential price reversals by identifying RSI divergence.",
				indicators: {
					rsi: {period: 14}
				}
			},
			{
				name: "Trend Following with SMA and MACD",
				description: "Follows market trends using SMA and MACD to time entries and exits.",
				indicators: {
					sma: {shortPeriod: 50, longPeriod: 200},
					macd: {fastPeriod: 12, slowPeriod: 26, signalPeriod: 9}
				}
			},
			{
				"name": "Comprehensive Multi-Indicator Strategy",
				"description": "Combines trend following (SMA, EMA), momentum (MACD, RSI), volatility (ATR, Bollinger Bands), and support/resistance levels for a complete market analysis.",
				"indicators": {
					"sma": {
						"shortPeriod": 50,
						"longPeriod": 200
					},
					"ema": {
						"period12": 12,
						"period26": 26
					},
					"macd": {
						"fastPeriod": 12,
						"slowPeriod": 26,
						"signalPeriod": 9
					},
					"rsi": {
						"period": 14
					},
					"bollinger": {
						"period": 20,
						"stdDev": 2
					},
					"atr": {
						"period": 14
					}
				}
			}

		];

		// Fetch tokens from the database (limit to 50 tokens)
		const tokensFromDb = await prisma.token.findMany({
			take: 1,
		});
		for (const token of tokensFromDb) {
			console.info("Body", {
				chain: 'solana',
				smartContract: token.address,
			});
			try {
				const res = await DappRadarService.searchDapps({
					chain: 'solana',
					smartContract: token.address,
					resultsPerPage: 10
				})
				const dapp = res.results[0];
				console.log(dapp);
				token.metadata = dapp;
			} catch (error) {
				console.error('Error al generar la estrategia:', error);
			}
		}
		console.log('Fetched tokens:', tokensFromDb);
		const chain = 'solana';
		const intervalValue = 3;  // 3 years
		const intervalUnit = 'years';  // Time unit: years

		// Calculate start and end dates using the calculateDateRange function
		const {startDate, endDate} = MarketAnalyserService.calculateDateRange(intervalValue, intervalUnit);
		const formattedStartDate = startDate.toISOString().slice(0, 10);  // 'yyyy-MM-dd'
		const formattedEndDate = endDate.toISOString().slice(0, 10);      // 'yyyy-MM-dd'

		// Iterate over each strategy configuration
		const allAnalysisResults = [];
		for (const strategyConfig of strategyConfigs) {
			console.log(`\nRunning strategy: ${strategyConfig.name}`);
			console.log(`Strategy description: ${strategyConfig.description}`);
			console.log("Strategy indicators:", JSON.stringify(strategyConfig.indicators, null, 2));

			// Iterate over each token and run the analysis with the current strategy
			for (const token of tokensFromDb) {
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
	} catch (error) {
		console.error('Error in the main function:', error);
	} finally {
		try {
			await prisma.$disconnect();
			console.log("Prisma connection disconnected.");
		} catch (disconnectError) {
			console.error("Error disconnecting Prisma:", disconnectError);
		}
	}
}

// Run the main function and handle uncaught errors
const allAnalysisCompiled = await main();

const functionsDefinitions = [
	{
		"functions": [
			{
				"name": "generateStrategyTitle",
				"description": "Generates a strategy title.",
				"parameters": {
					"type": "object",
					"properties": {
						"title": {
							"type": "string",
							"description": "The title of the strategy. Should be concise and informative."
						}
					},
					"required": ["title"]
				},
				"returns": {
					"type": "string",
					"description": "The generated strategy title."
				}
			},
			{
				"name": "generateStrategyDescription",
				"description": "Generates a strategy description.",
				"parameters": {
					"type": "object",
					"properties": {
						"description": {
							"type": "string",
							"description": "A detailed description of the strategy."
						}
					},
					"required": ["description"]
				},
				"returns": {
					"type": "string",
					"description": "The generated strategy description."
				}
			},
			{
				"name": "generateStrategyType",
				"description": "Generates the type of the strategy.",
				"parameters": {
					"type": "object",
					"properties": {
						"type": {
							"type": "string",
							"enum": ["trading", "investing", "hedging"],
							"description": "The type of strategy. Limited to specific categories."
						}
					},
					"required": ["type"]
				},
				"returns": {
					"type": "string",
					"description": "The generated strategy type."
				}
			},
			{
				"name": "identifyDataSources",
				"description": "Identifies the data sources for the strategy.",
				"parameters": {
					"type": "object",
					"properties": {
						"dataSources": {
							"type": "array",
							"items": {
								"type": "string",
								"description": "An array of strings representing data sources, e.g., APIs or databases."
							}
						}
					},
					"required": ["dataSources"]
				},
				"returns": {
					"type": "array",
					"items": {
						"type": "string"
					},
					"description": "The identified data sources."
				}
			},
			{
				"name": "generateActionSteps",
				"description": "Generates action steps for the strategy.",
				"parameters": {
					"type": "object",
					"properties": {
						"actionSteps": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"stepOrder": {
										"type": "number",
										"description": "The order of the action step."
									},
									"description": {
										"type": "string",
										"description": "A description of the action step."
									},
									"state": {
										"type": "string",
										"enum": ["pending", "completed", "failed"],
										"description": "The current state of the action step."
									},
									"actionType": {
										"type": "string",
										"enum": ["DCA Purchase", "Swap", "Stake"],
										"description": "The type of action being performed."
									}
								},
								"required": ["stepOrder", "description", "state", "actionType"]
							}
						}
					},
					"required": ["actionSteps"]
				},
				"returns": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"stepOrder": {
								"type": "number"
							},
							"description": {
								"type": "string"
							},
							"state": {
								"type": "string"
							},
							"actionType": {
								"type": "string"
							}
						}
					},
					"description": "The generated action steps."
				}
			},
			{
				"name": "generatePrerequisites",
				"description": "Generates prerequisites for the strategy.",
				"parameters": {
					"type": "object",
					"properties": {
						"prerequisites": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"description": {
										"type": "string",
										"description": "Description of the prerequisite."
									},
									"state": {
										"type": "string",
										"enum": ["pending", "completed", "failed"],
										"description": "The current state of the prerequisite."
									}
								},
								"required": ["description", "state"]
							}
						}
					},
					"required": ["prerequisites"]
				},
				"returns": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"description": {
								"type": "string"
							},
							"state": {
								"type": "string"
							}
						}
					},
					"description": "The generated prerequisites."
				}
			},
			{
				"name": "generateMonitoringNotifications",
				"description": "Generates monitoring notifications for the strategy.",
				"parameters": {
					"type": "object",
					"properties": {
						"monitoringNotifications": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"monitorType": {
										"type": "string",
										"description": "Type of monitoring to be performed."
									},
									"conditions": {
										"type": "array",
										"items": {
											"type": "string",
											"description": "Conditions that trigger notifications."
										}
									}
								},
								"required": ["monitorType", "conditions"]
							}
						}
					},
					"required": ["monitoringNotifications"]
				},
				"returns": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"monitorType": {
								"type": "string"
							},
							"conditions": {
								"type": "array",
								"items": {
									"type": "string"
								}
							}
						}
					},
					"description": "The generated monitoring notifications."
				}
			}
		]
	}

]


/*
const strategyObject = {
  state: "activo", // Estado definido con certeza
  title: `${strategyConfig.name} for ${token.name}`, // Datos derivados directamente de la estrategia aplicada al token
  description: strategyConfig.description, // Descripción de la estrategia con certeza
  strategyType: "trading", // Tipo de estrategia definido
  dataSources: ["DappRadar API", "Jupiter DEX API"], // Fuentes de datos con certeza
  aiGeneratedSummary: `Based on the analysis, the AI predicts a ${analysis.trend} trend for ${token.name} with a ${analysis.prediction_next_day > analysis.current_price ? "bullish" : "bearish"} outlook for the next day.`, // Resumen generado por IA basado en el análisis técnico
  potentialRewards: analysis.prediction_next_day * 1.05,  // Recompensa simulada con un margen basado en análisis
  riskLevel: analysis.volatility > 0.7 ? "alto" : "medio", // Nivel de riesgo basado en el análisis de volatilidad
  timeHorizon: "corto_plazo", // Horizonte temporal basado en los indicadores técnicos
  actionSteps: [
    {
      stepOrder: 1,
      description: "Monitor price movements and volatility patterns using automated scripts.", // Paso claro basado en la estrategia
      state: 'Not Started',
      tokenInput: { token: token.name, address: token.address },
      tokenOutput: { token: token.name, address: token.address },
      orderType: 'Swap', // this could be Swap or Limit Order or DCA Transaction
      /// if limit define expration date...et
    },
    {
      stepOrder: 2,
      description: "Place buy orders during downward Bollinger Band touches and sell at the upper Bollinger Band touches.", // Paso basado en el análisis con certeza
    },
  ],
  prerequisites: [
    { description: "Active account on Solana-compatible DEXs." }, // Requisito claro y fijo
    { description: "Basic knowledge of Bollinger Bands and RSI strategies." }, // Requisito claro basado en estrategia
  ],
  monitorings: [
    {
      monitorType: "price_difference", // Tipo de monitoreo basado en análisis técnico
      monitoringStart: new Date().toISOString(), // Monitoreo en tiempo real con certeza
      monitoringEnd: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(), // 1 hora de monitoreo
      telegramAlert: true, // Alerta con certeza
      alertConditions: {
        spreadThreshold: 0.5, // Umbral basado en análisis fijo
        priceChange: analysis.current_price * 0.05, // Condición basada en un cambio del 5% del precio actual derivado del análisis
      },
    },
  ],
};



 */
