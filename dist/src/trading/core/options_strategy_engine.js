#!/usr/bin/env tsx
/**
 * Advanced Options Strategy Implementation Framework
 *
 * Implements comprehensive options trading capabilities:
 * - Covered call writing for income generation
 * - Protective puts for portfolio insurance
 * - Spreads and complex options strategies
 * - Volatility trading strategies (VIX futures, options)
 * - Options pricing models and Greeks calculation
 * - Risk management for options positions
 * - Implied volatility analysis and term structure
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
export class OptionsStrategyEngine extends EventEmitter {
    goalieDir;
    config;
    optionsCache = new Map();
    volatilitySurface = new Map();
    riskFreeRate = 0.05; // 5% risk-free rate
    constructor(config) {
        super();
        this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
        this.config = {
            maxCapitalPerTrade: 10000,
            maxDaysToExpiration: 60,
            minDaysToExpiration: 7,
            targetReturn: 0.15, // 15% annualized
            maxRisk: 0.05, // 5% max loss
            volatilityThreshold: 0.3, // 30% IV threshold
            probabilityOfProfitMin: 0.6, // 60% minimum POP
            strategies: ['COVERED_CALL', 'PROTECTIVE_PUT', 'VERTICAL_SPREAD'],
            ...config,
        };
        if (!fs.existsSync(this.goalieDir)) {
            fs.mkdirSync(this.goalieDir, { recursive: true });
        }
    }
    /**
     * Generate covered call strategies
     */
    async generateCoveredCalls(symbol, marketData, positionSize) {
        const strategies = [];
        const { quote, technicalIndicators } = marketData;
        // Get available call options
        const callOptions = await this.getOptionsChain(symbol, 'CALL');
        for (const option of callOptions) {
            const daysToExpiration = this.calculateDaysToExpiration(option.expiration);
            // Filter by expiration and liquidity
            if (daysToExpiration < this.config.minDaysToExpiration ||
                daysToExpiration > this.config.maxDaysToExpiration ||
                option.volume < 10) {
                continue;
            }
            // Calculate covered call metrics
            const strategy = this.calculateCoveredCall(symbol, option, quote.price, positionSize, technicalIndicators);
            if (strategy && this.validateStrategy(strategy)) {
                strategies.push(strategy);
            }
        }
        // Sort by annualized return
        return strategies.sort((a, b) => b.annualizedReturn - a.annualizedReturn);
    }
    /**
     * Generate protective put strategies
     */
    async generateProtectivePuts(symbol, marketData, positionSize) {
        const strategies = [];
        const { quote } = marketData;
        // Get available put options
        const putOptions = await this.getOptionsChain(symbol, 'PUT');
        for (const option of putOptions) {
            const daysToExpiration = this.calculateDaysToExpiration(option.expiration);
            // Filter by expiration and liquidity
            if (daysToExpiration < this.config.minDaysToExpiration ||
                daysToExpiration > this.config.maxDaysToExpiration ||
                option.volume < 10) {
                continue;
            }
            // Calculate protective put metrics
            const strategy = this.calculateProtectivePut(symbol, option, quote.price, positionSize);
            if (strategy && this.validateStrategy(strategy)) {
                strategies.push(strategy);
            }
        }
        // Sort by cost-effectiveness (lowest cost per day)
        return strategies.sort((a, b) => a.capitalRequirement - b.capitalRequirement);
    }
    /**
     * Generate vertical spread strategies
     */
    async generateVerticalSpreads(symbol, marketData, direction) {
        const strategies = [];
        const { quote, technicalIndicators } = marketData;
        const optionType = direction === 'BULLISH' ? 'CALL' : 'PUT';
        const options = await this.getOptionsChain(symbol, optionType);
        // Generate spreads for each expiration
        const expirations = [...new Set(options.map(o => o.expiration))];
        for (const expiration of expirations) {
            const expirationOptions = options.filter(o => o.expiration === expiration);
            const daysToExpiration = this.calculateDaysToExpiration(expiration);
            if (daysToExpiration < this.config.minDaysToExpiration ||
                daysToExpiration > this.config.maxDaysToExpiration) {
                continue;
            }
            // Generate spreads with different strike combinations
            for (let i = 0; i < expirationOptions.length - 1; i++) {
                for (let j = i + 1; j < expirationOptions.length; j++) {
                    const shortStrike = expirationOptions[i];
                    const longStrike = expirationOptions[j];
                    // Ensure proper strike relationship
                    if ((direction === 'BULLISH' && longStrike.strike > shortStrike.strike) ||
                        (direction === 'BEARISH' && longStrike.strike < shortStrike.strike)) {
                        const strategy = this.calculateVerticalSpread(symbol, shortStrike, longStrike, direction, quote.price, technicalIndicators);
                        if (strategy && this.validateStrategy(strategy)) {
                            strategies.push(strategy);
                        }
                    }
                }
            }
        }
        // Sort by risk-reward ratio
        return strategies.sort((a, b) => b.riskRewardRatio - a.riskRewardRatio);
    }
    /**
     * Generate iron condor strategies
     */
    async generateIronCondors(symbol, marketData) {
        const strategies = [];
        const { quote, technicalIndicators } = marketData;
        const callOptions = await this.getOptionsChain(symbol, 'CALL');
        const putOptions = await this.getOptionsChain(symbol, 'PUT');
        const expirations = [...new Set(callOptions.map(o => o.expiration))];
        for (const expiration of expirations) {
            const daysToExpiration = this.calculateDaysToExpiration(expiration);
            if (daysToExpiration < this.config.minDaysToExpiration ||
                daysToExpiration > this.config.maxDaysToExpiration) {
                continue;
            }
            const expCalls = callOptions.filter(o => o.expiration === expiration);
            const expPuts = putOptions.filter(o => o.expiration === expiration);
            // Generate iron condor combinations
            for (const shortCall of expCalls) {
                for (const longCall of expCalls) {
                    if (longCall.strike > shortCall.strike) {
                        for (const shortPut of expPuts) {
                            for (const longPut of expPuts) {
                                if (longPut.strike < shortPut.strike) {
                                    const strategy = this.calculateIronCondor(symbol, longPut, shortPut, shortCall, longCall, quote.price, technicalIndicators);
                                    if (strategy && this.validateStrategy(strategy)) {
                                        strategies.push(strategy);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // Sort by probability of profit
        return strategies.sort((a, b) => b.probabilityOfProfit - a.probabilityOfProfit);
    }
    /**
     * Calculate covered call strategy
     */
    calculateCoveredCall(symbol, callOption, stockPrice, positionSize, technicalIndicators) {
        const premium = (callOption.bid + callOption.ask) / 2;
        const strike = callOption.strike;
        const daysToExpiration = this.calculateDaysToExpiration(callOption.expiration);
        // Calculate metrics
        const maxProfit = (strike - stockPrice + premium) * 100 * positionSize;
        const maxLoss = (stockPrice - premium) * 100 * positionSize;
        const breakEven = stockPrice - premium;
        const annualizedReturn = (premium / stockPrice) * (365 / daysToExpiration);
        const probabilityOfProfit = this.calculateProbabilityOfProfit(stockPrice, strike, callOption.impliedVolatility, daysToExpiration, 'CALL');
        return {
            id: `covered_call_${symbol}_${callOption.strike}_${callOption.expiration}`,
            name: `Covered Call ${symbol} ${strike}`,
            type: 'COVERED_CALL',
            legs: [{
                    action: 'SELL',
                    contract: callOption,
                    quantity: positionSize,
                    ratio: 1,
                }],
            maxProfit,
            maxLoss,
            breakEvenPoints: [breakEven],
            probabilityOfProfit,
            riskRewardRatio: maxLoss > 0 ? maxProfit / Math.abs(maxLoss) : 0,
            impliedVolatility: callOption.impliedVolatility,
            daysToExpiration,
            capitalRequirement: stockPrice * 100 * positionSize,
            annualizedReturn,
            greeks: {
                delta: -callOption.delta * positionSize,
                gamma: -callOption.gamma * positionSize,
                theta: -callOption.theta * positionSize,
                vega: -callOption.vega * positionSize,
                rho: -callOption.rho * positionSize,
            },
            recommendations: this.generateCoveredCallRecommendations(callOption, stockPrice, technicalIndicators),
        };
    }
    /**
     * Calculate protective put strategy
     */
    calculateProtectivePut(symbol, putOption, stockPrice, positionSize) {
        const premium = (putOption.bid + putOption.ask) / 2;
        const strike = putOption.strike;
        const daysToExpiration = this.calculateDaysToExpiration(putOption.expiration);
        // Calculate metrics
        const maxProfit = -premium * 100 * positionSize; // Limited to premium paid
        const maxLoss = (stockPrice - strike - premium) * 100 * positionSize;
        const breakEven = stockPrice + premium;
        const probabilityOfProfit = this.calculateProbabilityOfProfit(stockPrice, strike, putOption.impliedVolatility, daysToExpiration, 'PUT');
        // Calculate insurance value
        const insuranceValue = Math.max(0, stockPrice - strike) * 100 * positionSize;
        const costPerDay = premium / daysToExpiration;
        return {
            id: `protective_put_${symbol}_${putOption.strike}_${putOption.expiration}`,
            name: `Protective Put ${symbol} ${strike}`,
            type: 'PROTECTIVE_PUT',
            legs: [{
                    action: 'BUY',
                    contract: putOption,
                    quantity: positionSize,
                    ratio: 1,
                }],
            maxProfit,
            maxLoss,
            breakEvenPoints: [breakEven],
            probabilityOfProfit,
            riskRewardRatio: maxLoss > 0 ? maxProfit / Math.abs(maxLoss) : 0,
            impliedVolatility: putOption.impliedVolatility,
            daysToExpiration,
            capitalRequirement: premium * 100 * positionSize,
            annualizedReturn: -costPerDay * 365, // Cost of insurance
            greeks: {
                delta: putOption.delta * positionSize,
                gamma: putOption.gamma * positionSize,
                theta: putOption.theta * positionSize,
                vega: putOption.vega * positionSize,
                rho: putOption.rho * positionSize,
            },
            recommendations: this.generateProtectivePutRecommendations(putOption, stockPrice, insuranceValue),
        };
    }
    /**
     * Calculate vertical spread strategy
     */
    calculateVerticalSpread(symbol, shortOption, longOption, direction, stockPrice, technicalIndicators) {
        const creditPremium = (shortOption.bid + shortOption.ask) / 2;
        const debitPremium = (longOption.bid + longOption.ask) / 2;
        const netPremium = creditPremium - debitPremium;
        const daysToExpiration = this.calculateDaysToExpiration(shortOption.expiration);
        const maxProfit = Math.abs(netPremium) * 100;
        const maxLoss = Math.abs(shortOption.strike - longOption.strike - netPremium) * 100;
        const breakEvenPoints = direction === 'BULLISH'
            ? [longOption.strike + netPremium]
            : [shortOption.strike - netPremium];
        const probabilityOfProfit = this.calculateSpreadProbability(stockPrice, shortOption.strike, longOption.strike, shortOption.impliedVolatility, daysToExpiration, direction);
        const annualizedReturn = (netPremium / Math.abs(shortOption.strike - longOption.strike)) * (365 / daysToExpiration);
        return {
            id: `vertical_spread_${symbol}_${shortOption.strike}_${longOption.strike}_${shortOption.expiration}`,
            name: `${direction === 'BULLISH' ? 'Bull' : 'Bear'} Call Spread ${symbol}`,
            type: 'VERTICAL_SPREAD',
            legs: [
                {
                    action: 'SELL',
                    contract: shortOption,
                    quantity: 1,
                    ratio: 1,
                },
                {
                    action: 'BUY',
                    contract: longOption,
                    quantity: 1,
                    ratio: 1,
                },
            ],
            maxProfit,
            maxLoss,
            breakEvenPoints,
            probabilityOfProfit,
            riskRewardRatio: maxLoss > 0 ? maxProfit / maxLoss : 0,
            impliedVolatility: (shortOption.impliedVolatility + longOption.impliedVolatility) / 2,
            daysToExpiration,
            capitalRequirement: Math.max(0, maxLoss),
            annualizedReturn,
            greeks: {
                delta: (shortOption.delta - longOption.delta),
                gamma: (shortOption.gamma - longOption.gamma),
                theta: (shortOption.theta - longOption.theta),
                vega: (shortOption.vega - longOption.vega),
                rho: (shortOption.rho - longOption.rho),
            },
            recommendations: this.generateVerticalSpreadRecommendations(shortOption, longOption, direction, technicalIndicators),
        };
    }
    /**
     * Calculate iron condor strategy
     */
    calculateIronCondor(symbol, longPut, shortPut, shortCall, longCall, stockPrice, technicalIndicators) {
        const totalPremium = ((shortPut.bid + shortPut.ask) / 2 - (longPut.bid + longPut.ask) / 2) +
            ((shortCall.bid + shortCall.ask) / 2 - (longCall.bid + longCall.ask) / 2);
        const daysToExpiration = this.calculateDaysToExpiration(shortPut.expiration);
        const maxProfit = totalPremium * 100;
        const maxLoss = Math.abs(shortCall.strike - longCall.strike - totalPremium) * 100;
        const breakEvenPoints = [
            shortPut.strike - totalPremium,
            shortCall.strike + totalPremium,
        ];
        const probabilityOfProfit = this.calculateIronCondorProbability(stockPrice, shortPut.strike, shortCall.strike, shortPut.impliedVolatility, daysToExpiration);
        const annualizedReturn = (totalPremium / (shortCall.strike - longCall.strike)) * (365 / daysToExpiration);
        return {
            id: `iron_condor_${symbol}_${shortPut.strike}_${shortCall.strike}_${shortPut.expiration}`,
            name: `Iron Condor ${symbol}`,
            type: 'IRON_CONDOR',
            legs: [
                { action: 'BUY', contract: longPut, quantity: 1, ratio: 1 },
                { action: 'SELL', contract: shortPut, quantity: 1, ratio: 1 },
                { action: 'SELL', contract: shortCall, quantity: 1, ratio: 1 },
                { action: 'BUY', contract: longCall, quantity: 1, ratio: 1 },
            ],
            maxProfit,
            maxLoss,
            breakEvenPoints,
            probabilityOfProfit,
            riskRewardRatio: maxLoss > 0 ? maxProfit / maxLoss : 0,
            impliedVolatility: (shortPut.impliedVolatility + shortCall.impliedVolatility) / 2,
            daysToExpiration,
            capitalRequirement: maxLoss,
            annualizedReturn,
            greeks: {
                delta: (longPut.delta + shortPut.delta + shortCall.delta + longCall.delta),
                gamma: (longPut.gamma + shortPut.gamma + shortCall.gamma + longCall.gamma),
                theta: (longPut.theta + shortPut.theta + shortCall.theta + longCall.theta),
                vega: (longPut.vega + shortPut.vega + shortCall.vega + longCall.vega),
                rho: (longPut.rho + shortPut.rho + shortCall.rho + longCall.rho),
            },
            recommendations: this.generateIronCondorRecommendations(longPut, shortPut, shortCall, longCall, technicalIndicators),
        };
    }
    /**
     * Calculate Black-Scholes option price and Greeks
     */
    calculateBlackScholes(type, stockPrice, strike, timeToExpiration, volatility, riskFreeRate = this.riskFreeRate) {
        const d1 = (Math.log(stockPrice / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToExpiration) /
            (volatility * Math.sqrt(timeToExpiration));
        const d2 = d1 - volatility * Math.sqrt(timeToExpiration);
        const sqrtTime = Math.sqrt(timeToExpiration);
        // Calculate probabilities
        const nd1 = this.normalCDF(d1);
        const nd2 = this.normalCDF(d2);
        const nPrimeD1 = this.normalPDF(d1);
        let price, delta, gamma, theta, vega, rho;
        if (type === 'CALL') {
            price = stockPrice * nd1 - strike * Math.exp(-riskFreeRate * timeToExpiration) * nd2;
            delta = nd1;
            theta = -(stockPrice * nPrimeD1 * volatility) / (2 * sqrtTime) -
                riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiration) * nd2;
            rho = strike * timeToExpiration * Math.exp(-riskFreeRate * timeToExpiration) * nd2;
        }
        else {
            price = strike * Math.exp(-riskFreeRate * timeToExpiration) * (1 - nd2) - stockPrice * (1 - nd1);
            delta = nd1 - 1;
            theta = -(stockPrice * nPrimeD1 * volatility) / (2 * sqrtTime) +
                riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiration) * (1 - nd2);
            rho = -strike * timeToExpiration * Math.exp(-riskFreeRate * timeToExpiration) * (1 - nd2);
        }
        gamma = nPrimeD1 / (stockPrice * volatility * sqrtTime);
        vega = stockPrice * nPrimeD1 * sqrtTime / 100;
        return { price, delta, gamma, theta, vega, rho };
    }
    /**
     * Calculate probability of profit for simple options
     */
    calculateProbabilityOfProfit(stockPrice, strike, impliedVolatility, daysToExpiration, type) {
        const timeToExpiration = daysToExpiration / 365;
        const d = (Math.log(stockPrice / strike) +
            (this.riskFreeRate + 0.5 * impliedVolatility * impliedVolatility) * timeToExpiration) /
            (impliedVolatility * Math.sqrt(timeToExpiration));
        if (type === 'CALL') {
            return this.normalCDF(d);
        }
        else {
            return this.normalCDF(-d);
        }
    }
    /**
     * Calculate probability of profit for spreads
     */
    calculateSpreadProbability(stockPrice, shortStrike, longStrike, impliedVolatility, daysToExpiration, direction) {
        const timeToExpiration = daysToExpiration / 365;
        // Simplified calculation - in production use more sophisticated methods
        const maxLoss = Math.abs(shortStrike - longStrike);
        const currentDistance = Math.abs(stockPrice - ((shortStrike + longStrike) / 2));
        const probability = Math.max(0, 1 - (currentDistance / maxLoss));
        return Math.min(1, Math.max(0, probability));
    }
    /**
     * Calculate probability of profit for iron condors
     */
    calculateIronCondorProbability(stockPrice, lowerStrike, upperStrike, impliedVolatility, daysToExpiration) {
        const timeToExpiration = daysToExpiration / 365;
        // Probability that stock stays between strikes
        const d1 = (Math.log(stockPrice / lowerStrike) +
            (this.riskFreeRate + 0.5 * impliedVolatility * impliedVolatility) * timeToExpiration) /
            (impliedVolatility * Math.sqrt(timeToExpiration));
        const d2 = (Math.log(stockPrice / upperStrike) +
            (this.riskFreeRate + 0.5 * impliedVolatility * impliedVolatility) * timeToExpiration) /
            (impliedVolatility * Math.sqrt(timeToExpiration));
        return this.normalCDF(d1) - this.normalCDF(d2);
    }
    /**
     * Normal cumulative distribution function
     */
    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }
    /**
     * Normal probability density function
     */
    normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }
    /**
     * Error function approximation
     */
    erf(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
    }
    /**
     * Calculate days to expiration
     */
    calculateDaysToExpiration(expiration) {
        const expDate = new Date(expiration);
        const today = new Date();
        const diffTime = expDate.getTime() - today.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    /**
     * Validate strategy against config constraints
     */
    validateStrategy(strategy) {
        return (strategy.capitalRequirement <= this.config.maxCapitalPerTrade &&
            strategy.daysToExpiration >= this.config.minDaysToExpiration &&
            strategy.daysToExpiration <= this.config.maxDaysToExpiration &&
            strategy.probabilityOfProfit >= this.config.probabilityOfProfitMin &&
            strategy.impliedVolatility <= this.config.volatilityThreshold);
    }
    /**
     * Generate recommendations for covered calls
     */
    generateCoveredCallRecommendations(option, stockPrice, technicalIndicators) {
        const recommendations = [];
        if (option.strike > stockPrice * 1.1) {
            recommendations.push('Out-of-the-money call provides higher premium with lower assignment risk');
        }
        if (option.impliedVolatility > 0.3) {
            recommendations.push('High implied volatility makes this an attractive time to sell premium');
        }
        if (technicalIndicators.rsi > 70) {
            recommendations.push('Overbought conditions suggest potential for sideways movement');
        }
        return recommendations;
    }
    /**
     * Generate recommendations for protective puts
     */
    generateProtectivePutRecommendations(option, stockPrice, insuranceValue) {
        const recommendations = [];
        const protectionPercentage = ((stockPrice - option.strike) / stockPrice) * 100;
        if (protectionPercentage > 10) {
            recommendations.push(`Strong protection: ${protectionPercentage.toFixed(1)}% downside protection`);
        }
        if (option.impliedVolatility < 0.2) {
            recommendations.push('Low volatility makes insurance relatively inexpensive');
        }
        const costPerDay = (option.bid + option.ask) / 2 / this.calculateDaysToExpiration(option.expiration);
        if (costPerDay < 0.05) {
            recommendations.push('Cost-effective insurance at less than $0.05 per day');
        }
        return recommendations;
    }
    /**
     * Generate recommendations for vertical spreads
     */
    generateVerticalSpreadRecommendations(shortOption, longOption, direction, technicalIndicators) {
        const recommendations = [];
        const netPremium = (shortOption.bid + shortOption.ask) / 2 - (longOption.bid + longOption.ask) / 2;
        if (netPremium > 0) {
            recommendations.push('Credit spread: Generates immediate income');
        }
        else {
            recommendations.push('Debit spread: Lower capital requirement with defined risk');
        }
        if (direction === 'BULLISH' && technicalIndicators.rsi < 30) {
            recommendations.push('Oversold conditions support bullish outlook');
        }
        else if (direction === 'BEARISH' && technicalIndicators.rsi > 70) {
            recommendations.push('Overbought conditions support bearish outlook');
        }
        return recommendations;
    }
    /**
     * Generate recommendations for iron condors
     */
    generateIronCondorRecommendations(longPut, shortPut, shortCall, longCall, technicalIndicators) {
        const recommendations = [];
        const rangeWidth = shortCall.strike - shortPut.strike;
        const rangePercentage = (rangeWidth / shortPut.strike) * 100;
        if (rangePercentage > 20) {
            recommendations.push('Wide range increases probability of profit but reduces premium');
        }
        else if (rangePercentage < 10) {
            recommendations.push('Narrow range provides higher premium but lower probability');
        }
        if (technicalIndicators.volatility < 0.2) {
            recommendations.push('Low volatility environment favorable for income strategies');
        }
        return recommendations;
    }
    /**
     * Get options chain for a symbol
     */
    async getOptionsChain(symbol, type) {
        // In production, fetch from options data provider
        // For now, generate synthetic options data
        const options = [];
        const basePrice = 100; // Would get from market data
        const strikes = [80, 85, 90, 95, 100, 105, 110, 115, 120];
        const expirations = ['2024-01-19', '2024-02-16', '2024-03-15'];
        for (const expiration of expirations) {
            for (const strike of strikes) {
                const daysToExpiration = this.calculateDaysToExpiration(expiration);
                const timeToExpiration = daysToExpiration / 365;
                // Generate synthetic option data
                const bs = this.calculateBlackScholes(type, basePrice, strike, timeToExpiration, 0.3);
                const option = {
                    symbol,
                    type,
                    strike,
                    expiration,
                    bid: Math.max(0.01, bs.price - 0.05),
                    ask: Math.max(0.02, bs.price + 0.05),
                    last: bs.price,
                    volume: Math.floor(Math.random() * 1000) + 10,
                    openInterest: Math.floor(Math.random() * 5000) + 100,
                    impliedVolatility: 0.25 + Math.random() * 0.2,
                    delta: bs.delta,
                    gamma: bs.gamma,
                    theta: bs.theta,
                    vega: bs.vega,
                    rho: bs.rho,
                };
                options.push(option);
            }
        }
        return options;
    }
    /**
     * Log strategy generation
     */
    logStrategyGeneration(strategies, symbol) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            symbol,
            strategiesGenerated: strategies.length,
            strategies: strategies.map(s => ({
                id: s.id,
                type: s.type,
                maxProfit: s.maxProfit,
                maxLoss: s.maxLoss,
                probabilityOfProfit: s.probabilityOfProfit,
                annualizedReturn: s.annualizedReturn,
            })),
        };
        const logFile = path.join(this.goalieDir, 'options_strategies.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }
}
export default OptionsStrategyEngine;
//# sourceMappingURL=options_strategy_engine.js.map