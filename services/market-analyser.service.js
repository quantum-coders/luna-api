import technicalindicators from 'technicalindicators';
import regression from 'regression';

class MarketAnalyserService {
	/**
	 * Calculates the Simple Moving Average (SMA) for the given data and period.
	 * @param {number[]} data - Array of prices.
	 * @param {number} period - Period for calculating the SMA.
	 * @returns {(number|null)[]} Array of SMA values.
	 */
	static calculateSMA(data, period) {
		if (!period) return null;
		// console.log(`Calculating SMA for period ${period}. Data points available: ${data.length}`);
		if (data.length < period) {
			console.warn(`Insufficient data to calculate SMA for period ${period}. Required: ${period}, Available: ${data.length}`);
			return [];
		}
		const sma = data.map((_, index, array) => {
			if (index < period - 1) return null;
			const sum = array.slice(index - period + 1, index + 1).reduce((sum, value) => sum + value, 0);
			return sum / period;
		});
		// console.log(`SMA calculated (last 5 values): ${sma.slice(-5)}`);
		return sma;
	}

	/**
	 * Calculates the Exponential Moving Average (EMA) for the given data and period.
	 * @param {number[]} data - Array of prices.
	 * @param {number} period - Period for calculating the EMA.
	 * @returns {number[]|null} Array of EMA values or null if period not provided.
	 */
	static calculateEMA(data, period) {
		if (!period) return null;
		// console.log(`Calculating EMA for period ${period}. Data points available: ${data.length}`);
		if (data.length < period) {
			console.warn(`Insufficient data to calculate EMA for period ${period}. Required: ${period}, Available: ${data.length}`);
			return [];
		}
		const ema = new technicalindicators.EMA({period, values: data});
		const result = ema.getResult();
		// console.log(`EMA calculated (last 5 values): ${result.slice(-5)}`);
		return result;
	}

	/**
	 * Calculates the Relative Strength Index (RSI) for the given data and period.
	 * @param {number[]} data - Array of prices.
	 * @param {number} [period=14] - Period for calculating the RSI.
	 * @returns {number[]|null} Array of RSI values or null if period not provided.
	 */
	static calculateRSI(data, period = 14) {
		if (!period) return null;
		// console.log(`Calculating RSI for period ${period}. Data points available: ${data.length}`);
		if (data.length < period) {
			console.warn(`Insufficient data to calculate RSI for period ${period}. Required: ${period}, Available: ${data.length}`);
			return [];
		}
		const rsi = new technicalindicators.RSI({values: data, period});
		const result = rsi.getResult();
		// console.log(`RSI calculated (last 5 values): ${result.slice(-5)}`);
		return result;
	}

	/**
	 * Calculates the Moving Average Convergence Divergence (MACD) for the given data.
	 * @param {number[]} data - Array of prices.
	 * @param {object} macdConfig - MACD configuration.
	 * @returns {object[]|null} Array of MACD objects or null if MACD configuration is missing.
	 */
	static calculateMACD(data, macdConfig) {
		if (!macdConfig) return null;
		// console.log("Calculating MACD.");
		if (data.length < 26) { // MACD requires at least 26 data points
			console.warn("Insufficient data to calculate MACD");
			return [];
		}
		const macdIndicator = new technicalindicators.MACD({
			values: data,
			fastPeriod: macdConfig.fastPeriod,
			slowPeriod: macdConfig.slowPeriod,
			signalPeriod: macdConfig.signalPeriod,
			SimpleMAOscillator: false,
			SimpleMASignal: false
		});
		const result = macdIndicator.getResult();
		// console.log(`MACD calculated (last 5 values): ${JSON.stringify(result.slice(-5))}`);
		return result;
	}

	/**
	 * Calculates Bollinger Bands for the given data, period, and standard deviation.
	 * @param {number[]} data - Array of prices.
	 * @param {object} bollingerConfig - Bollinger Bands configuration.
	 * @returns {object[]|null} Array of Bollinger Bands objects or null if configuration is missing.
	 */
	static calculateBollingerBands(data, bollingerConfig) {
		if (!bollingerConfig) return null;
		const {period = 20, stdDev = 2} = bollingerConfig;
		// console.log(`Calculating Bollinger Bands with period ${period} and standard deviation ${stdDev}.`);
		if (data.length < period) {
			console.warn(`Insufficient data to calculate Bollinger Bands for period ${period}`);
			return [];
		}
		const bb = new technicalindicators.BollingerBands({period, values: data, stdDev});
		const result = bb.getResult();
		// console.log(`Bollinger Bands calculated (last 5 values): ${JSON.stringify(result.slice(-5))}`);
		return result;
	}

	/**
	 * Identifies support and resistance levels in the given price data.
	 * @param {number[]} data - Array of prices.
	 * @param {number} [window=20] - Window size for identifying pivots.
	 * @returns {object} Object with arrays of supports and resistances.
	 */
	static identifySupportResistance(data, window = 20) {
		// console.log(`Identifying support and resistance levels with a window of ${window}.`);
		const supports = [];
		const resistances = [];
		let lastSupport = null;
		let lastResistance = null;

		for (let i = window; i < data.length - window; i++) {
			const current = data[i];
			const lowerWindow = data.slice(i - window, i);
			const upperWindow = data.slice(i + 1, i + window + 1);
			const isSupport = current < Math.min(...lowerWindow) && current < Math.min(...upperWindow);
			const isResistance = current > Math.max(...lowerWindow) && current > Math.max(...upperWindow);

			if (isSupport && (lastSupport === null || current < lastSupport)) {
				supports.push(current);
				lastSupport = current;
				// console.log(`Support found at: ${current}`);
			}

			if (isResistance && (lastResistance === null || current > lastResistance)) {
				resistances.push(current);
				lastResistance = current;
				// console.log(`Resistance found at: ${current}`);
			}
		}

		// console.log(`Supports identified (last 3): ${supports.slice(-3)}`);
		// console.log(`Resistances identified (last 3): ${resistances.slice(-3)}`);
		return {supports, resistances};
	}

	/**
	 * Interprets the results and generates a detailed explanation, including predictions for different timeframes.
	 * @param {object} analysis - The technical analysis results.
	 * @returns {string} A detailed explanation of the analysis and predictions for short, medium, and long term.
	 */
	static interpretAnalysis(analysis) {
		let interpretation = "Based on the technical analysis:\n";

		// Trend interpretation
		if (analysis.trend === 'Bullish') {
			interpretation += "- The general trend is bullish because the short-term SMA is higher than the long-term SMA, indicating an upward trend.\n";
		} else if (analysis.trend === 'Bearish') {
			interpretation += "- The general trend is bearish because the short-term SMA is lower than the long-term SMA, indicating a downward trend.\n";
		} else {
			interpretation += "- The general trend is neutral as the SMAs are close to each other or inconclusive.\n";
		}

		// RSI interpretation
		if (analysis.rsi !== null) {
			if (analysis.rsi > 70) {
				interpretation += `- The RSI value (${analysis.rsi}) is in the overbought zone, indicating potential selling pressure in the short term.\n`;
			} else if (analysis.rsi < 30) {
				interpretation += `- The RSI value (${analysis.rsi}) is in the oversold zone, indicating potential buying pressure in the short term.\n`;
			} else {
				interpretation += `- The RSI value (${analysis.rsi}) indicates a neutral market in the short term.\n`;
			}
		}

		// MACD interpretation
		if (analysis.macd) {
			interpretation += analysis.macd.MACD > analysis.macd.signal ?
				`- The MACD (${analysis.macd.MACD}) is higher than the signal (${analysis.macd.signal}), indicating a medium-term bullish signal.\n` :
				`- The MACD (${analysis.macd.MACD}) is lower than the signal (${analysis.macd.signal}), indicating a medium-term bearish signal.\n`;
		}

		// Bollinger Bands interpretation
		if (analysis.bollinger_bands) {
			const price = analysis.current_price;
			interpretation += price > analysis.bollinger_bands.upper ?
				"- The price is above the upper Bollinger Band, indicating short-term overbought conditions.\n" :
				price < analysis.bollinger_bands.lower ?
					"- The price is below the lower Bollinger Band, indicating short-term oversold conditions.\n" :
					"- The price is within the Bollinger Bands, indicating price stability in the short term.\n";
		}

		// Volatility interpretation
		if (analysis.volatility !== null) {
			interpretation += `- The current volatility is ${analysis.volatility.toFixed(4)}, which is considered ${analysis.volatility > 0.5 ? "high" : "low"} for this asset.\n`;
		}

		// Short-term prediction (Next Day)
		interpretation += `- The prediction for the next day is ${analysis.prediction_next_day > analysis.current_price ? "bullish" : "bearish"}, with a target price of ${analysis.prediction_next_day.toFixed(6)}.\n`;

		// Medium-term prediction (1 Week)
		const weeklyPrediction = analysis.prediction_next_day * 1.05;  // Example: Predict a 5% growth for weekly trend
		interpretation += `- The medium-term prediction (1 week) is ${weeklyPrediction > analysis.current_price ? "bullish" : "bearish"}, with a target price of ${weeklyPrediction.toFixed(6)}.\n`;

		// Long-term prediction (1 Month)
		const monthlyPrediction = analysis.prediction_next_day * 1.10;  // Example: Predict a 10% growth for monthly trend
		interpretation += `- The long-term prediction (1 month) is ${monthlyPrediction > analysis.current_price ? "bullish" : "bearish"}, with a target price of ${monthlyPrediction.toFixed(6)}.\n`;

		return interpretation;
	}


	/**
	 * Performs advanced trading analysis on historical price data.
	 * @param {object[]} historicalData - Array of historical price data objects.
	 * @param {number} intervalValue - The number of intervals for the analysis period.
	 * @param {string} intervalUnit - The unit of time for the interval ('years', 'months', 'weeks', 'days').
	 * @param {number} shortSMA - The period for the short Simple Moving Average (SMA).
	 * @param {number} longSMA - The period for the long Simple Moving Average (SMA).
	 * @param {number} rsiPeriod - The period for the Relative Strength Index (RSI).
	 * @param {object} macdConfig - Configuration for MACD (fastPeriod, slowPeriod, signalPeriod).
	 * @param {object} bollingerConfig - Configuration for Bollinger Bands.
	 * @returns {object} Results of the analysis with various technical indicators and interpretations.
	 */
	static async advancedTradingAnalysis(historicalData, intervalValue, intervalUnit, shortSMA, longSMA, rsiPeriod, macdConfig, bollingerConfig) {
		// console.log(`\nStarting advanced trading analysis for the period: ${intervalValue} ${intervalUnit}`);

		if (!historicalData || !Array.isArray(historicalData)) {
			throw new Error("Invalid historical data.");
		}

		// console.log("Sample of historical data entries:", JSON.stringify(historicalData.slice(0, 5), null, 2));

		const prices = historicalData.map(d => d.price);
		// console.log(`Number of historical prices: ${prices.length}`);

		const smaShort = shortSMA ? MarketAnalyserService.calculateSMA(prices, shortSMA) : null;
		const smaLong = longSMA ? MarketAnalyserService.calculateSMA(prices, longSMA) : null;
		const ema12 = macdConfig?.fastPeriod ? MarketAnalyserService.calculateEMA(prices, macdConfig.fastPeriod) : null;
		const ema26 = macdConfig?.slowPeriod ? MarketAnalyserService.calculateEMA(prices, macdConfig.slowPeriod) : null;
		const rsi = rsiPeriod ? MarketAnalyserService.calculateRSI(prices, rsiPeriod) : null;
		const macd = macdConfig ? MarketAnalyserService.calculateMACD(prices, macdConfig) : null;
		const bollingerBands = bollingerConfig ? MarketAnalyserService.calculateBollingerBands(prices, bollingerConfig) : null;

		// console.log("Calculating daily returns.");
		const returns = prices.map((price, index) =>
			index === 0 ? 0 : (price - prices[index - 1]) / prices[index - 1]
		);
		// console.log(`Daily returns calculated (last 5): ${returns.slice(-5)}`);

		// console.log("Identifying trends based on SMA Short and SMA Long.");
		const trend = smaShort?.map((smaShortVal, index) =>
			smaShortVal !== null && smaLong && smaLong[index] !== null ? (smaShortVal > smaLong[index] ? 1 : 0) : null
		) ?? null;
		// console.log(`Trends identified (last 5): ${trend ? trend.slice(-5) : 'N/A'}`);

		// console.log("Identifying support and resistance levels.");
		const {supports, resistances} = MarketAnalyserService.identifySupportResistance(prices, 20);

		// console.log("Performing linear regression.");
		const scaledPrices = prices.map(price => price * 1e6);
		const regressionData = scaledPrices.map((price, index) => [index, price]);
		const result = regression.linear(regressionData);
		// console.log(`Regression result: Slope = ${result.equation[0]}, Intercept = ${result.equation[1]}`);

		const scaledPrediction = result.predict(prices.length)[1];
		const prediction = scaledPrediction / 1e6;
		// console.log(`Prediction for the next day: ${prediction}`);

		const lastIndex = prices.length - 1;
		// console.log(`Last price index: ${lastIndex}`);

		const analysis = {
			current_price: prices[lastIndex],
			prediction_next_day: prediction,
			trend: trend ? (trend[lastIndex] === 1 ? 'Bullish' : 'Bearish') : 'Neutral',
			rsi: rsi ? rsi[rsi.length - 1] : null,
			macd: macd ? macd[macd.length - 1] : null,
			bollinger_bands: bollingerBands ? bollingerBands[bollingerBands.length - 1] : null,
			support_levels: supports.slice(-3),
			resistance_levels: resistances.slice(-3),
			moving_averages: {
				smaShort: smaShort ? smaShort[smaShort.length - 1] : null,
				smaLong: smaLong ? smaLong[smaLong.length - 1] : null,
				ema12: ema12 ? ema12[ema12.length - 1] : null,
				ema26: ema26 ? ema26[ema26.length - 1] : null
			},
			volatility: returns.length > 1 ? Math.sqrt(returns.slice(-20).reduce((acc, r) => acc + r ** 2, 0) / 20) * Math.sqrt(252) : null
		};

		analysis.interpretation = MarketAnalyserService.interpretAnalysis(analysis);

		// console.log("Analysis completed successfully.");
		return analysis;
	}

	/**
	 * Helper method to calculate the start and end dates based on the interval value and unit.
	 * @param {number} intervalValue - The number of intervals.
	 * @param {string} intervalUnit - The unit of time ('years', 'months', 'weeks', 'days').
	 * @returns {object} An object with the calculated start and end dates.
	 */
	static calculateDateRange(intervalValue, intervalUnit) {
		const endDate = new Date();
		const startDate = new Date();

		switch (intervalUnit.toLowerCase()) {
			case 'years':
				startDate.setFullYear(endDate.getFullYear() - intervalValue);
				break;
			case 'months':
				startDate.setMonth(endDate.getMonth() - intervalValue);
				break;
			case 'weeks':
				startDate.setDate(endDate.getDate() - intervalValue * 7);
				break;
			case 'days':
				startDate.setDate(endDate.getDate() - intervalValue);
				break;
			default:
				throw new Error(`Invalid interval unit: ${intervalUnit}. Valid options are: 'years', 'months', 'weeks', 'days'.`);
		}

		return {startDate, endDate};
	}
}

export default MarketAnalyserService;
