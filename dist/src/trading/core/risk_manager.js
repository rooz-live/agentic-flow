#!/usr/bin/env tsx
/**
 * Comprehensive Risk Management System
 *
 * Implements advanced risk management features:
 * - Position sizing based on volatility and correlation
 * - Stop-loss mechanisms with trailing and volatility-based options
 * - Portfolio risk metrics (VaR, CVaR, maximum drawdown)
 * - Diversification analysis and optimization recommendations
 * - Stress testing for extreme market scenarios
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
export class RiskManager extends EventEmitter {
    config;
    goalieDir;
    riskLimits;
    stressScenarios;
    positionHistory = new Map();
    portfolioHistory = [];
    marketDataCache = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
        this.riskLimits = {
            maxPositionSize: 0.1, // 10% max position size
            maxPortfolioLeverage: 2.0, // 2x max leverage
            maxSectorExposure: 0.3, // 30% max sector exposure
            maxCorrelation: 0.8, // 80% max correlation
            maxDrawdown: 0.15, // 15% max drawdown
            minDiversificationRatio: 1.2, // Min diversification benefit
            volatilityThreshold: 0.4, // 40% volatility alert
        };
        this.initializeStressScenarios();
        if (!fs.existsSync(this.goalieDir)) {
            fs.mkdirSync(this.goalieDir, { recursive: true });
        }
    }
    /**
     * Initialize stress test scenarios
     */
    initializeStressScenarios() {
        this.stressScenarios = [
            {
                name: 'Market Crash',
                description: 'Severe market decline similar to 2008',
                marketShock: -0.30,
                sectorShocks: {
                    'Technology': -0.40,
                    'Financial': -0.35,
                    'Healthcare': -0.20,
                },
                volatilityIncrease: 2.5,
                correlationIncrease: 1.5,
            },
            {
                name: 'Interest Rate Shock',
                description: 'Rapid interest rate increase',
                marketShock: -0.15,
                sectorShocks: {
                    'Technology': -0.25,
                    'Real Estate': -0.30,
                    'Utilities': -0.20,
                },
                volatilityIncrease: 1.8,
                correlationIncrease: 1.3,
            },
            {
                name: 'Sector Rotation',
                description: 'Major sector rotation from growth to value',
                marketShock: -0.05,
                sectorShocks: {
                    'Technology': -0.20,
                    'Healthcare': -0.10,
                    'Energy': 0.15,
                    'Financial': 0.10,
                },
                volatilityIncrease: 1.5,
                correlationIncrease: 1.2,
            },
            {
                name: 'Volatility Spike',
                description: 'Sudden volatility increase without price change',
                marketShock: 0,
                sectorShocks: {},
                volatilityIncrease: 3.0,
                correlationIncrease: 1.8,
            },
        ];
    }
    /**
     * Adjust trading signal based on risk parameters
     */
    async adjustSignal(signal, marketData) {
        // Calculate position size based on risk parameters
        const positionSize = this.calculatePositionSize(signal, marketData);
        // Calculate stop-loss and take-profit levels
        const stopLoss = this.calculateStopLoss(signal, marketData);
        const takeProfit = this.calculateTakeProfit(signal, marketData);
        // Calculate risk-reward ratio
        const riskRewardRatio = this.calculateRiskRewardRatio(signal.price, stopLoss, takeProfit);
        // Adjust confidence based on risk metrics
        const adjustedConfidence = this.adjustConfidenceForRisk(signal.confidence, marketData);
        return {
            ...signal,
            quantity: positionSize,
            confidence: adjustedConfidence,
            riskMetrics: {
                stopLoss,
                takeProfit,
                positionSize,
                riskRewardRatio,
            },
        };
    }
    /**
     * Calculate optimal position size using Kelly Criterion and volatility
     */
    calculatePositionSize(signal, marketData) {
        const { price, confidence } = signal;
        const volatility = marketData.technicalIndicators.volatility || 0.2;
        const portfolioValue = this.getPortfolioValue();
        // Kelly Criterion: f* = (bp - q) / b
        // where b = odds, p = probability of success, q = probability of failure
        const winProbability = confidence;
        const lossProbability = 1 - confidence;
        const odds = 2; // Assuming 2:1 reward-risk ratio
        const kellyFraction = (odds * winProbability - lossProbability) / odds;
        // Apply volatility adjustment and position limits
        const volatilityAdjustedKelly = kellyFraction / (1 + volatility * 10);
        const maxPositionValue = portfolioValue * this.riskLimits.maxPositionSize;
        // Final position size
        const positionValue = Math.min(portfolioValue * volatilityAdjustedKelly, maxPositionValue);
        return Math.floor(positionValue / price);
    }
    /**
     * Calculate stop-loss level based on volatility and technical indicators
     */
    calculateStopLoss(signal, marketData) {
        const { price, action } = signal;
        const volatility = marketData.technicalIndicators.volatility || 0.2;
        const atr = marketData.technicalIndicators.atr || price * volatility;
        let stopLoss;
        if (action === 'BUY') {
            // For long positions, stop is below entry
            const volatilityStop = price - (2 * atr);
            const supportStop = marketData.technicalIndicators.support || price * 0.95;
            stopLoss = Math.max(volatilityStop, supportStop);
        }
        else {
            // For short positions, stop is above entry
            const volatilityStop = price + (2 * atr);
            const resistanceStop = marketData.technicalIndicators.resistance || price * 1.05;
            stopLoss = Math.min(volatilityStop, resistanceStop);
        }
        return stopLoss;
    }
    /**
     * Calculate take-profit level based on risk-reward ratio and technical levels
     */
    calculateTakeProfit(signal, marketData) {
        const { price, action, riskMetrics } = signal;
        const targetRiskRewardRatio = 2.5; // Target 2.5:1 risk-reward ratio
        const stopLoss = riskMetrics.stopLoss;
        let takeProfit;
        if (action === 'BUY') {
            // For long positions, target is above entry
            takeProfit = price + (price - stopLoss) * targetRiskRewardRatio;
            // Adjust for resistance levels
            const resistance = marketData.technicalIndicators.resistance;
            if (resistance && resistance < takeProfit) {
                takeProfit = resistance * 0.98; // Slightly below resistance
            }
        }
        else {
            // For short positions, target is below entry
            takeProfit = price - (stopLoss - price) * targetRiskRewardRatio;
            // Adjust for support levels
            const support = marketData.technicalIndicators.support;
            if (support && support > takeProfit) {
                takeProfit = support * 1.02; // Slightly above support
            }
        }
        return takeProfit;
    }
    /**
     * Calculate risk-reward ratio
     */
    calculateRiskRewardRatio(entryPrice, stopLoss, takeProfit) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        return risk > 0 ? reward / risk : 0;
    }
    /**
     * Adjust signal confidence based on risk factors
     */
    adjustConfidenceForRisk(confidence, marketData) {
        const volatility = marketData.technicalIndicators.volatility || 0.2;
        const volumeRatio = marketData.technicalIndicators.volume_ratio || 1;
        const sentiment = marketData.sentiment?.score || 0.5;
        let adjustedConfidence = confidence;
        // Reduce confidence for high volatility
        if (volatility > 0.4) {
            adjustedConfidence *= 0.8;
        }
        // Increase confidence for high volume
        if (volumeRatio > 1.5) {
            adjustedConfidence *= 1.1;
        }
        // Adjust based on sentiment
        if (sentiment > 0.7) {
            adjustedConfidence *= 1.05;
        }
        else if (sentiment < 0.3) {
            adjustedConfidence *= 0.9;
        }
        return Math.min(Math.max(adjustedConfidence, 0.1), 0.95);
    }
    /**
     * Calculate comprehensive portfolio risk metrics
     */
    calculatePortfolioRisk(positions) {
        const portfolioValue = this.getPortfolioValue();
        const positionRisks = this.calculatePositionRisks(positions);
        // Calculate portfolio volatility
        const portfolioVolatility = this.calculatePortfolioVolatility(positionRisks);
        // Calculate VaR and CVaR using historical simulation
        const { var95, cvar95 } = this.calculateVaR(positions, portfolioValue);
        // Calculate maximum drawdown
        const maxDrawdown = this.calculateMaxDrawdown();
        // Calculate risk-adjusted return ratios
        const returns = this.calculateReturns();
        const sharpeRatio = this.calculateSharpeRatio(returns, portfolioVolatility);
        const sortinoRatio = this.calculateSortinoRatio(returns);
        // Calculate portfolio beta and correlation
        const beta = this.calculatePortfolioBeta(positionRisks);
        const correlation = this.calculatePortfolioCorrelation(positionRisks);
        // Calculate diversification ratio
        const diversificationRatio = this.calculateDiversificationRatio(positionRisks);
        return {
            valueAtRisk: var95,
            conditionalVaR: cvar95,
            maxDrawdown,
            sharpeRatio,
            sortinoRatio,
            beta,
            correlation,
            volatility: portfolioVolatility,
            diversificationRatio,
        };
    }
    /**
     * Calculate individual position risks
     */
    calculatePositionRisks(positions) {
        const positionRisks = [];
        const portfolioValue = this.getPortfolioValue();
        for (const [symbol, quantity] of Object.entries(positions)) {
            const marketData = this.marketDataCache.get(symbol);
            if (!marketData)
                continue;
            const currentPrice = marketData.quote.price;
            const entryPrice = this.getAverageEntryPrice(symbol);
            const unrealizedPnL = (currentPrice - entryPrice) * quantity;
            const positionRisk = {
                symbol,
                positionSize: quantity,
                entryPrice,
                currentPrice,
                unrealizedPnL,
                riskContribution: Math.abs(quantity * currentPrice) / portfolioValue,
                stopLoss: 0, // Will be set when position is opened
                takeProfit: 0, // Will be set when position is opened
                trailingStop: 0,
                volatility: marketData.technicalIndicators.volatility || 0.2,
                beta: marketData.technicalIndicators.beta || 1,
                correlationToPortfolio: 0, // Will be calculated
            };
            positionRisks.push(positionRisk);
        }
        return positionRisks;
    }
    /**
     * Calculate portfolio volatility using correlation matrix
     */
    calculatePortfolioVolatility(positionRisks) {
        if (positionRisks.length === 0)
            return 0;
        const portfolioValue = this.getPortfolioValue();
        let portfolioVariance = 0;
        for (let i = 0; i < positionRisks.length; i++) {
            for (let j = 0; j < positionRisks.length; j++) {
                const weightI = (positionRisks[i].positionSize * positionRisks[i].currentPrice) / portfolioValue;
                const weightJ = (positionRisks[j].positionSize * positionRisks[j].currentPrice) / portfolioValue;
                const correlation = i === j ? 1 : this.estimateCorrelation(positionRisks[i], positionRisks[j]);
                portfolioVariance += weightI * weightJ * positionRisks[i].volatility * positionRisks[j].volatility * correlation;
            }
        }
        return Math.sqrt(portfolioVariance);
    }
    /**
     * Estimate correlation between two positions
     */
    estimateCorrelation(pos1, pos2) {
        // Simplified correlation estimation based on sector and beta
        if (pos1.symbol === pos2.symbol)
            return 1;
        // Use sector-based correlation as fallback
        const sector1 = this.getSector(pos1.symbol);
        const sector2 = this.getSector(pos2.symbol);
        if (sector1 === sector2)
            return 0.7;
        return 0.3;
    }
    /**
     * Get sector for a symbol
     */
    getSector(symbol) {
        // Simplified sector mapping - in production, use a proper sector database
        const sectorMap = {
            'AAPL': 'Technology',
            'MSFT': 'Technology',
            'GOOGL': 'Technology',
            'SOXL': 'Technology',
            'SOXS': 'Technology',
            'JPM': 'Financial',
            'BAC': 'Financial',
            'JNJ': 'Healthcare',
            'PFE': 'Healthcare',
            'XOM': 'Energy',
            'CVX': 'Energy',
        };
        return sectorMap[symbol] || 'Other';
    }
    /**
     * Calculate VaR and CVaR using historical simulation
     */
    calculateVaR(positions, portfolioValue) {
        // Generate 1000 scenarios using historical volatility
        const scenarios = this.generateScenarios(positions, 1000);
        // Sort scenarios by return
        scenarios.sort((a, b) => a - b);
        // 95% VaR is the 5th percentile
        const var95 = Math.abs(scenarios[Math.floor(scenarios.length * 0.05)]) * portfolioValue;
        // CVaR is the average of the worst 5% of scenarios
        const worst5Percent = scenarios.slice(0, Math.floor(scenarios.length * 0.05));
        const cvar95 = Math.abs(worst5Percent.reduce((sum, val) => sum + val, 0) / worst5Percent.length) * portfolioValue;
        return { var95, cvar95 };
    }
    /**
     * Generate scenarios for VaR calculation
     */
    generateScenarios(positions, count) {
        const scenarios = [];
        for (let i = 0; i < count; i++) {
            let scenarioReturn = 0;
            const portfolioValue = this.getPortfolioValue();
            for (const [symbol, quantity] of Object.entries(positions)) {
                const marketData = this.marketDataCache.get(symbol);
                if (!marketData)
                    continue;
                const volatility = marketData.technicalIndicators.volatility || 0.2;
                const weight = (quantity * marketData.quote.price) / portfolioValue;
                // Generate random return using normal distribution
                const randomReturn = this.generateNormalRandom(0, volatility);
                scenarioReturn += weight * randomReturn;
            }
            scenarios.push(scenarioReturn);
        }
        return scenarios;
    }
    /**
     * Generate normal random variable using Box-Muller transform
     */
    generateNormalRandom(mean, stdDev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * stdDev + mean;
    }
    /**
     * Calculate maximum drawdown
     */
    calculateMaxDrawdown() {
        if (this.portfolioHistory.length < 2)
            return 0;
        let maxDrawdown = 0;
        let peak = this.portfolioHistory[0];
        for (const value of this.portfolioHistory) {
            if (value > peak) {
                peak = value;
            }
            const drawdown = (peak - value) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        return maxDrawdown;
    }
    /**
     * Calculate returns series
     */
    calculateReturns() {
        const returns = [];
        for (let i = 1; i < this.portfolioHistory.length; i++) {
            const return_ = (this.portfolioHistory[i] - this.portfolioHistory[i - 1]) / this.portfolioHistory[i - 1];
            returns.push(return_);
        }
        return returns;
    }
    /**
     * Calculate Sharpe ratio
     */
    calculateSharpeRatio(returns, volatility) {
        if (returns.length === 0 || volatility === 0)
            return 0;
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const riskFreeRate = 0.02; // 2% risk-free rate (annualized)
        return (meanReturn * 252 - riskFreeRate) / (volatility * Math.sqrt(252)); // Annualized
    }
    /**
     * Calculate Sortino ratio
     */
    calculateSortinoRatio(returns) {
        if (returns.length === 0)
            return 0;
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const downsideReturns = returns.filter(r => r < 0);
        if (downsideReturns.length === 0)
            return meanReturn > 0 ? Infinity : 0;
        const downsideDeviation = Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length);
        const riskFreeRate = 0.02;
        return (meanReturn * 252 - riskFreeRate) / (downsideDeviation * Math.sqrt(252));
    }
    /**
     * Calculate portfolio beta
     */
    calculatePortfolioBeta(positionRisks) {
        if (positionRisks.length === 0)
            return 0;
        const portfolioValue = this.getPortfolioValue();
        let weightedBeta = 0;
        for (const position of positionRisks) {
            const weight = (position.positionSize * position.currentPrice) / portfolioValue;
            weightedBeta += weight * position.beta;
        }
        return weightedBeta;
    }
    /**
     * Calculate portfolio correlation to market
     */
    calculatePortfolioCorrelation(positionRisks) {
        // Simplified correlation calculation
        return this.calculatePortfolioBeta(positionRisks) / Math.sqrt(positionRisks.length);
    }
    /**
     * Calculate diversification ratio
     */
    calculateDiversificationRatio(positionRisks) {
        if (positionRisks.length === 0)
            return 1;
        const portfolioValue = this.getPortfolioValue();
        let weightedVolatility = 0;
        let portfolioVolatility = this.calculatePortfolioVolatility(positionRisks);
        for (const position of positionRisks) {
            const weight = (position.positionSize * position.currentPrice) / portfolioValue;
            weightedVolatility += weight * position.volatility;
        }
        return portfolioVolatility > 0 ? weightedVolatility / portfolioVolatility : 1;
    }
    /**
     * Run stress tests on portfolio
     */
    async runStressTests(positions) {
        const results = {};
        const portfolioValue = this.getPortfolioValue();
        for (const scenario of this.stressScenarios) {
            const scenarioResult = await this.runStressScenario(positions, scenario);
            results[scenario.name] = {
                ...scenarioResult,
                portfolioImpact: scenarioResult.portfolioValue / portfolioValue - 1,
            };
        }
        // Log stress test results
        this.logStressTestResults(results);
        return results;
    }
    /**
     * Run individual stress test scenario
     */
    async runStressScenario(positions, scenario) {
        let portfolioValue = 0;
        const positionResults = {};
        for (const [symbol, quantity] of Object.entries(positions)) {
            const marketData = this.marketDataCache.get(symbol);
            if (!marketData)
                continue;
            const currentPrice = marketData.quote.price;
            const sector = this.getSector(symbol);
            // Calculate price impact
            let priceImpact = scenario.marketShock;
            if (scenario.sectorShocks[sector]) {
                priceImpact += scenario.sectorShocks[sector];
            }
            // Apply volatility increase
            const volatility = (marketData.technicalIndicators.volatility || 0.2) * scenario.volatilityIncrease;
            const randomShock = this.generateNormalRandom(0, volatility);
            const newPrice = currentPrice * (1 + priceImpact + randomShock);
            const newPositionValue = quantity * newPrice;
            positionResults[symbol] = {
                originalPrice: currentPrice,
                newPrice,
                priceChange: (newPrice - currentPrice) / currentPrice,
                positionValue: newPositionValue,
            };
            portfolioValue += newPositionValue;
        }
        return {
            portfolioValue,
            positionResults,
            scenario,
        };
    }
    /**
     * Check for risk alerts and emit them
     */
    async checkRiskAlerts(positions) {
        const alerts = [];
        const portfolioValue = this.getPortfolioValue();
        const riskMetrics = this.calculatePortfolioRisk(positions);
        // Check position size limits
        for (const [symbol, quantity] of Object.entries(positions)) {
            const marketData = this.marketDataCache.get(symbol);
            if (!marketData)
                continue;
            const positionValue = quantity * marketData.quote.price;
            const positionWeight = positionValue / portfolioValue;
            if (positionWeight > this.riskLimits.maxPositionSize) {
                alerts.push({
                    id: `pos_size_${symbol}_${Date.now()}`,
                    type: 'POSITION_RISK',
                    severity: 'HIGH',
                    symbol,
                    message: `Position in ${symbol} exceeds maximum size limit`,
                    recommendation: `Reduce position to ${(this.riskLimits.maxPositionSize * 100).toFixed(1)}% of portfolio`,
                    timestamp: new Date().toISOString(),
                    metrics: {
                        currentWeight: positionWeight,
                        maxWeight: this.riskLimits.maxPositionSize,
                    },
                });
            }
        }
        // Check portfolio-level risks
        if (riskMetrics.maxDrawdown > this.riskLimits.maxDrawdown) {
            alerts.push({
                id: `drawdown_${Date.now()}`,
                type: 'PORTFOLIO_RISK',
                severity: 'CRITICAL',
                message: `Maximum drawdown exceeded: ${(riskMetrics.maxDrawdown * 100).toFixed(1)}%`,
                recommendation: 'Consider reducing risk exposure or implementing hedging strategies',
                timestamp: new Date().toISOString(),
                metrics: {
                    currentDrawdown: riskMetrics.maxDrawdown,
                    maxDrawdown: this.riskLimits.maxDrawdown,
                },
            });
        }
        if (riskMetrics.diversificationRatio < this.riskLimits.minDiversificationRatio) {
            alerts.push({
                id: `diversification_${Date.now()}`,
                type: 'CORRELATION_RISK',
                severity: 'MEDIUM',
                message: `Portfolio diversification ratio below minimum: ${riskMetrics.diversificationRatio.toFixed(2)}`,
                recommendation: 'Add uncorrelated assets to improve diversification',
                timestamp: new Date().toISOString(),
                metrics: {
                    currentRatio: riskMetrics.diversificationRatio,
                    minRatio: this.riskLimits.minDiversificationRatio,
                },
            });
        }
        // Emit alerts
        for (const alert of alerts) {
            this.emit('risk_alert', alert);
        }
        return alerts;
    }
    /**
     * Get portfolio value
     */
    getPortfolioValue() {
        // In a real implementation, this would fetch from portfolio management system
        return 1000000; // $1M default portfolio value
    }
    /**
     * Get average entry price for a position
     */
    getAverageEntryPrice(symbol) {
        // In a real implementation, this would fetch from trade history
        const marketData = this.marketDataCache.get(symbol);
        return marketData ? marketData.quote.price * 0.95 : 100; // Assume 5% below current price
    }
    /**
     * Log stress test results
     */
    logStressTestResults(results) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            stressTestResults: results,
        };
        const logFile = path.join(this.goalieDir, 'stress_test_results.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }
    /**
     * Update market data cache
     */
    updateMarketData(symbol, marketData) {
        this.marketDataCache.set(symbol, marketData);
        // Update price history
        const history = this.positionHistory.get(symbol) || [];
        history.push(marketData.quote.price);
        // Keep last 100 data points
        if (history.length > 100) {
            history.shift();
        }
        this.positionHistory.set(symbol, history);
    }
    /**
     * Update portfolio history
     */
    updatePortfolioHistory(portfolioValue) {
        this.portfolioHistory.push(portfolioValue);
        // Keep last 1000 data points
        if (this.portfolioHistory.length > 1000) {
            this.portfolioHistory.shift();
        }
    }
}
export default RiskManager;
//# sourceMappingURL=risk_manager.js.map