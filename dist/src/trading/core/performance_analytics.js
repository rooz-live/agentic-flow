#!/usr/bin/env tsx
/**
 * Performance Analytics and Tracking System
 *
 * Implements comprehensive performance tracking:
 * - Real-time P&L tracking and attribution
 * - Sharpe ratio, Sortino ratio, and other risk-adjusted metrics
 * - Benchmarking against market indices and strategies
 * - Trade execution quality and cost analysis
 * - Performance attribution and factor analysis
 * - Portfolio health monitoring and alerts
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
export class PerformanceAnalytics extends EventEmitter {
    goalieDir;
    config;
    trades = [];
    portfolioValue = [];
    benchmarkData = new Map();
    performanceHistory = [];
    alerts = [];
    constructor(goalieDir, config) {
        super();
        this.goalieDir = goalieDir;
        this.config = {
            benchmarkSymbols: ['SPY', 'QQQ', 'IWM', 'VTI'],
            riskFreeRate: 0.02, // 2% risk-free rate
            rebalanceFrequency: 'daily',
            alertThresholds: {
                maxDrawdown: 0.15, // 15% max drawdown
                maxVolatility: 0.25, // 25% max volatility
                minSharpe: 0.5, // Minimum Sharpe ratio
                maxConcentration: 0.3, // 30% max concentration
            },
            attributionFactors: ['market', 'size', 'value', 'momentum', 'quality', 'volatility'],
            ...config,
        };
        this.loadHistoricalData();
    }
    /**
     * Add a trade record
     */
    addTrade(trade) {
        this.trades.push(trade);
        this.updatePerformanceMetrics();
        this.checkPerformanceAlerts();
        this.emit('trade_added', trade);
        this.logTrade(trade);
    }
    /**
     * Update portfolio value
     */
    updatePortfolioValue(value, timestamp) {
        this.portfolioValue.push({ value, timestamp: timestamp || new Date().toISOString() });
        // Keep last 1000 data points
        if (this.portfolioValue.length > 1000) {
            this.portfolioValue.shift();
        }
        this.updatePerformanceMetrics();
        this.checkPerformanceAlerts();
        this.emit('portfolio_updated', value);
    }
    /**
     * Get current performance metrics
     */
    getCurrentPerformance() {
        return this.calculatePerformanceMetrics();
    }
    /**
     * Get performance attribution for a period
     */
    getPerformanceAttribution(startDate, endDate) {
        const period = `${startDate} to ${endDate}`;
        // Calculate returns for the period
        const portfolioReturn = this.calculatePeriodReturn(startDate, endDate);
        const benchmarkReturn = this.calculateBenchmarkReturn(startDate, endDate);
        const excessReturn = portfolioReturn - benchmarkReturn;
        // Calculate factor attribution
        const factorAttribution = this.calculateFactorAttribution(startDate, endDate);
        // Calculate sector attribution
        const sectorAttribution = this.calculateSectorAttribution(startDate, endDate);
        // Calculate strategy attribution
        const strategyAttribution = this.calculateStrategyAttribution(startDate, endDate);
        return {
            period,
            totalReturn: portfolioReturn,
            benchmarkReturn,
            excessReturn,
            factorAttribution,
            sectorAttribution,
            strategyAttribution,
        };
    }
    /**
     * Generate performance report
     */
    generatePerformanceReport(period) {
        const { startDate, endDate } = this.getDateRange(period);
        return {
            summary: this.getCurrentPerformance(),
            attribution: this.getPerformanceAttribution(startDate, endDate),
            benchmarks: Object.fromEntries(this.benchmarkData),
            alerts: this.getRecentAlerts(),
            recommendations: this.generateRecommendations(),
        };
    }
    /**
     * Calculate comprehensive performance metrics
     */
    calculatePerformanceMetrics() {
        const returns = this.calculateReturns();
        const trades = this.getCompletedTrades();
        // Return metrics
        const totalReturn = this.calculateTotalReturn();
        const annualizedReturn = this.calculateAnnualizedReturn(returns);
        const monthlyReturn = this.calculateMonthlyReturn();
        const dailyReturn = this.calculateDailyReturn(returns);
        // Risk-adjusted metrics
        const sharpeRatio = this.calculateSharpeRatio(returns);
        const sortinoRatio = this.calculateSortinoRatio(returns);
        const informationRatio = this.calculateInformationRatio(returns);
        const treynorRatio = this.calculateTreynorRatio(returns);
        const calmarRatio = this.calculateCalmarRatio(returns);
        // Risk metrics
        const volatility = this.calculateVolatility(returns);
        const maxDrawdown = this.calculateMaxDrawdown();
        const currentDrawdown = this.calculateCurrentDrawdown();
        const valueAtRisk = this.calculateVaR(returns, 0.05);
        const conditionalVaR = this.calculateCVaR(returns, 0.05);
        const beta = this.calculateBeta(returns);
        const trackingError = this.calculateTrackingError(returns);
        // Portfolio metrics
        const totalValue = this.getCurrentPortfolioValue();
        const cashBalance = this.getCashBalance();
        const investedCapital = totalValue - cashBalance;
        const leverage = this.calculateLeverage();
        // Trading metrics
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
        const losingTrades = trades.filter(t => (t.pnl || 0) < 0).length;
        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
        const averageWin = this.calculateAverageWin(trades);
        const averageLoss = this.calculateAverageLoss(trades);
        const profitFactor = this.calculateProfitFactor(trades);
        const largestWin = this.calculateLargestWin(trades);
        const largestLoss = this.calculateLargestLoss(trades);
        const averageTradeDuration = this.calculateAverageTradeDuration(trades);
        // Execution metrics
        const averageSlippage = this.calculateAverageSlippage(trades);
        const totalCommission = this.calculateTotalCommission(trades);
        const commissionRate = this.calculateCommissionRate(trades, totalValue);
        const executionQuality = this.calculateExecutionQuality(trades);
        // Attribution metrics
        const alpha = this.calculateAlpha(returns);
        const sectorAttribution = this.getCurrentSectorAttribution();
        const strategyAttribution = this.getCurrentStrategyAttribution();
        const factorExposure = this.getCurrentFactorExposure();
        return {
            totalReturn,
            annualizedReturn,
            monthlyReturn,
            dailyReturn,
            sharpeRatio,
            sortinoRatio,
            informationRatio,
            treynorRatio,
            calmarRatio,
            volatility,
            maxDrawdown,
            currentDrawdown,
            valueAtRisk,
            conditionalVaR,
            beta,
            trackingError,
            totalValue,
            cashBalance,
            investedCapital,
            leverage,
            totalTrades,
            winningTrades,
            losingTrades,
            winRate,
            averageWin,
            averageLoss,
            profitFactor,
            largestWin,
            largestLoss,
            averageTradeDuration,
            averageSlippage,
            totalCommission,
            commissionRate,
            executionQuality,
            alpha,
            sectorAttribution,
            strategyAttribution,
            factorExposure,
        };
    }
    /**
     * Calculate returns series
     */
    calculateReturns() {
        const returns = [];
        for (let i = 1; i < this.portfolioValue.length; i++) {
            const currentValue = typeof this.portfolioValue[i] === 'number' ? this.portfolioValue[i] : this.portfolioValue[i].value;
            const previousValue = typeof this.portfolioValue[i - 1] === 'number' ? this.portfolioValue[i - 1] : this.portfolioValue[i - 1].value;
            const return_ = (currentValue - previousValue) / previousValue;
            returns.push(return_);
        }
        return returns;
    }
    /**
     * Calculate total return
     */
    calculateTotalReturn() {
        if (this.portfolioValue.length < 2)
            return 0;
        const lastVal = this.portfolioValue[this.portfolioValue.length - 1];
        const firstVal = this.portfolioValue[0];
        const currentValue = typeof lastVal === 'number' ? lastVal : lastVal.value;
        const initialValue = typeof firstVal === 'number' ? firstVal : firstVal.value;
        return (currentValue - initialValue) / initialValue;
    }
    /**
     * Calculate annualized return
     */
    calculateAnnualizedReturn(returns) {
        if (returns.length === 0)
            return 0;
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const days = this.portfolioValue.length;
        return Math.pow(1 + meanReturn, 365) - 1;
    }
    /**
     * Calculate monthly return
     */
    calculateMonthlyReturn() {
        if (this.portfolioValue.length < 30)
            return 0;
        const lastVal = this.portfolioValue[this.portfolioValue.length - 1];
        const monthVal = this.portfolioValue[this.portfolioValue.length - 30];
        const currentValue = typeof lastVal === 'number' ? lastVal : lastVal.value;
        const monthAgoValue = typeof monthVal === 'number' ? monthVal : monthVal.value;
        return (currentValue - monthAgoValue) / monthAgoValue;
    }
    /**
     * Calculate daily return
     */
    calculateDailyReturn(returns) {
        if (returns.length === 0)
            return 0;
        return returns.reduce((sum, r) => sum + r, 0) / returns.length;
    }
    /**
     * Calculate Sharpe ratio
     */
    calculateSharpeRatio(returns) {
        if (returns.length === 0)
            return 0;
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        return stdDev > 0 ? (meanReturn * 252 - this.config.riskFreeRate) / (stdDev * Math.sqrt(252)) : 0;
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
        const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
        const downsideDeviation = Math.sqrt(downsideVariance);
        return downsideDeviation > 0 ? (meanReturn * 252 - this.config.riskFreeRate) / (downsideDeviation * Math.sqrt(252)) : 0;
    }
    /**
     * Calculate Information ratio
     */
    calculateInformationRatio(returns) {
        if (returns.length === 0)
            return 0;
        const benchmarkReturns = this.getBenchmarkReturns('SPY');
        if (benchmarkReturns.length === 0)
            return 0;
        const excessReturns = returns.map((r, i) => r - (benchmarkReturns[i] || 0));
        const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
        const excessVariance = excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) / excessReturns.length;
        const excessStdDev = Math.sqrt(excessVariance);
        return excessStdDev > 0 ? meanExcessReturn * Math.sqrt(252) / excessStdDev : 0;
    }
    /**
     * Calculate Treynor ratio
     */
    calculateTreynorRatio(returns) {
        const beta = this.calculateBeta(returns);
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        return beta !== 0 ? (meanReturn * 252 - this.config.riskFreeRate) / beta : 0;
    }
    /**
     * Calculate Calmar ratio
     */
    calculateCalmarRatio(returns) {
        const annualizedReturn = this.calculateAnnualizedReturn(returns);
        const maxDrawdown = this.calculateMaxDrawdown();
        return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    }
    /**
     * Calculate volatility
     */
    calculateVolatility(returns) {
        if (returns.length === 0)
            return 0;
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
        return Math.sqrt(variance * 252); // Annualized
    }
    /**
     * Calculate maximum drawdown
     */
    calculateMaxDrawdown() {
        if (this.portfolioValue.length < 2)
            return 0;
        let maxDrawdown = 0;
        const firstVal = this.portfolioValue[0];
        let peak = typeof firstVal === 'number' ? firstVal : firstVal.value;
        for (let i = 1; i < this.portfolioValue.length; i++) {
            const val = this.portfolioValue[i];
            const currentValue = typeof val === 'number' ? val : val.value;
            if (currentValue > peak) {
                peak = currentValue;
            }
            const drawdown = (peak - currentValue) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        return maxDrawdown;
    }
    /**
     * Calculate current drawdown
     */
    calculateCurrentDrawdown() {
        if (this.portfolioValue.length < 2)
            return 0;
        const firstVal = this.portfolioValue[0];
        let peak = typeof firstVal === 'number' ? firstVal : firstVal.value;
        let currentDrawdown = 0;
        for (let i = 1; i < this.portfolioValue.length; i++) {
            const val = this.portfolioValue[i];
            const currentValue = typeof val === 'number' ? val : val.value;
            if (currentValue > peak) {
                peak = currentValue;
            }
            const drawdown = (peak - currentValue) / peak;
            currentDrawdown = drawdown;
        }
        return currentDrawdown;
    }
    /**
     * Calculate Value at Risk
     */
    calculateVaR(returns, confidence) {
        if (returns.length === 0)
            return 0;
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index = Math.floor(returns.length * confidence);
        return Math.abs(sortedReturns[index] || 0);
    }
    /**
     * Calculate Conditional Value at Risk
     */
    calculateCVaR(returns, confidence) {
        if (returns.length === 0)
            return 0;
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index = Math.floor(returns.length * confidence);
        const tailReturns = sortedReturns.slice(0, index);
        if (tailReturns.length === 0)
            return 0;
        return Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length);
    }
    /**
     * Calculate beta
     */
    calculateBeta(returns) {
        const benchmarkReturns = this.getBenchmarkReturns('SPY');
        if (benchmarkReturns.length === 0 || returns.length === 0)
            return 1;
        const minLength = Math.min(returns.length, benchmarkReturns.length);
        const portfolioReturns = returns.slice(0, minLength);
        const marketReturns = benchmarkReturns.slice(0, minLength);
        const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
        const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
        let covariance = 0;
        let marketVariance = 0;
        for (let i = 0; i < portfolioReturns.length; i++) {
            const portfolioDiff = portfolioReturns[i] - portfolioMean;
            const marketDiff = marketReturns[i] - marketMean;
            covariance += portfolioDiff * marketDiff;
            marketVariance += marketDiff * marketDiff;
        }
        covariance /= portfolioReturns.length;
        marketVariance /= marketReturns.length;
        return marketVariance > 0 ? covariance / marketVariance : 1;
    }
    /**
     * Calculate tracking error
     */
    calculateTrackingError(returns) {
        const benchmarkReturns = this.getBenchmarkReturns('SPY');
        if (benchmarkReturns.length === 0 || returns.length === 0)
            return 0;
        const minLength = Math.min(returns.length, benchmarkReturns.length);
        const portfolioReturns = returns.slice(0, minLength);
        const marketReturns = benchmarkReturns.slice(0, minLength);
        const trackingErrors = portfolioReturns.map((r, i) => r - (marketReturns[i] || 0));
        const meanTrackingError = trackingErrors.reduce((sum, e) => sum + e, 0) / trackingErrors.length;
        const trackingErrorVariance = trackingErrors.reduce((sum, e) => sum + Math.pow(e - meanTrackingError, 2), 0) / trackingErrors.length;
        return Math.sqrt(trackingErrorVariance * 252); // Annualized
    }
    /**
     * Get benchmark returns
     */
    getBenchmarkReturns(symbol) {
        const benchmark = this.benchmarkData.get(symbol);
        return benchmark ? benchmark.returns.map(r => r.return) : [];
    }
    /**
     * Get completed trades
     */
    getCompletedTrades() {
        return this.trades.filter(trade => trade.exitDate && trade.exitPrice);
    }
    /**
     * Calculate average win
     */
    calculateAverageWin(trades) {
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
        return winningTrades.length > 0 ?
            winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    }
    /**
     * Calculate average loss
     */
    calculateAverageLoss(trades) {
        const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
        return losingTrades.length > 0 ?
            losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length : 0;
    }
    /**
     * Calculate profit factor
     */
    calculateProfitFactor(trades) {
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
        const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        return totalLosses > 0 ? totalWins / totalLosses : 0;
    }
    /**
     * Calculate largest win
     */
    calculateLargestWin(trades) {
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
        return winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0;
    }
    /**
     * Calculate largest loss
     */
    calculateLargestLoss(trades) {
        const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
        return losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0;
    }
    /**
     * Calculate average trade duration
     */
    calculateAverageTradeDuration(trades) {
        const completedTrades = this.getCompletedTrades();
        return completedTrades.length > 0 ?
            completedTrades.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTrades.length : 0;
    }
    /**
     * Calculate average slippage
     */
    calculateAverageSlippage(trades) {
        const completedTrades = this.getCompletedTrades();
        return completedTrades.length > 0 ?
            completedTrades.reduce((sum, t) => sum + t.slippage, 0) / completedTrades.length : 0;
    }
    /**
     * Calculate total commission
     */
    calculateTotalCommission(trades) {
        return trades.reduce((sum, t) => sum + t.commission, 0);
    }
    /**
     * Calculate commission rate
     */
    calculateCommissionRate(trades, totalValue) {
        const totalCommission = this.calculateTotalCommission(trades);
        return totalValue > 0 ? totalCommission / totalValue : 0;
    }
    /**
     * Calculate execution quality
     */
    calculateExecutionQuality(trades) {
        const completedTrades = this.getCompletedTrades();
        if (completedTrades.length === 0)
            return 0;
        const avgSlippage = this.calculateAverageSlippage(completedTrades);
        const winRate = completedTrades.length > 0 ?
            completedTrades.filter(t => (t.pnl || 0) > 0).length / completedTrades.length : 0;
        // Higher quality = lower slippage and higher win rate
        return Math.max(0, (1 - avgSlippage) * winRate);
    }
    /**
     * Calculate alpha
     */
    calculateAlpha(returns) {
        const beta = this.calculateBeta(returns);
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const benchmarkReturns = this.getBenchmarkReturns('SPY');
        const benchmarkMean = benchmarkReturns.length > 0 ?
            benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length : this.config.riskFreeRate;
        return meanReturn - (this.config.riskFreeRate + beta * (benchmarkMean - this.config.riskFreeRate));
    }
    /**
     * Get current portfolio value
     */
    getCurrentPortfolioValue() {
        if (this.portfolioValue.length === 0)
            return 0;
        const lastVal = this.portfolioValue[this.portfolioValue.length - 1];
        return typeof lastVal === 'number' ? lastVal : lastVal.value;
    }
    /**
     * Get cash balance
     */
    getCashBalance() {
        // Simplified - would track actual cash positions
        return this.getCurrentPortfolioValue() * 0.05; // Assume 5% cash
    }
    /**
     * Calculate leverage
     */
    calculateLeverage() {
        const totalValue = this.getCurrentPortfolioValue();
        const cashBalance = this.getCashBalance();
        const investedCapital = totalValue - cashBalance;
        return cashBalance > 0 ? investedCapital / cashBalance : 1;
    }
    /**
     * Get current sector attribution
     */
    getCurrentSectorAttribution() {
        // Simplified sector attribution
        return {
            'Technology': 0.4,
            'Financial': 0.2,
            'Healthcare': 0.15,
            'Energy': 0.1,
            'Consumer': 0.15,
        };
    }
    /**
     * Get current strategy attribution
     */
    getCurrentStrategyAttribution() {
        // Simplified strategy attribution
        return {
            'momentum': 0.3,
            'mean_reversion': 0.25,
            'arbitrage': 0.2,
            'options': 0.15,
            'algorithmic': 0.1,
        };
    }
    /**
     * Get current factor exposure
     */
    getCurrentFactorExposure() {
        // Simplified factor exposure
        return {
            'market': 1.0,
            'size': 0.2,
            'value': -0.1,
            'momentum': 0.3,
            'quality': 0.1,
            'volatility': -0.2,
        };
    }
    /**
     * Calculate period return
     */
    calculatePeriodReturn(startDate, endDate) {
        const startValue = this.getPortfolioValueAtDate(startDate);
        const endValue = this.getPortfolioValueAtDate(endDate);
        return startValue > 0 ? (endValue - startValue) / startValue : 0;
    }
    /**
     * Calculate benchmark return
     */
    calculateBenchmarkReturn(startDate, endDate) {
        // Simplified - would use actual benchmark data
        return 0.08; // 8% annual benchmark return
    }
    /**
     * Calculate factor attribution
     */
    calculateFactorAttribution(startDate, endDate) {
        // Simplified factor attribution
        return {
            market: 0.05,
            size: 0.01,
            value: -0.005,
            momentum: 0.02,
            quality: 0.01,
            volatility: -0.01,
            residual: 0.005,
        };
    }
    /**
     * Calculate sector attribution
     */
    calculateSectorAttribution(startDate, endDate) {
        // Simplified sector attribution
        return {
            'Technology': { weight: 0.4, return: 0.12, contribution: 0.048 },
            'Financial': { weight: 0.2, return: 0.08, contribution: 0.016 },
            'Healthcare': { weight: 0.15, return: 0.10, contribution: 0.015 },
            'Energy': { weight: 0.1, return: 0.15, contribution: 0.015 },
            'Consumer': { weight: 0.15, return: 0.06, contribution: 0.009 },
        };
    }
    /**
     * Calculate strategy attribution
     */
    calculateStrategyAttribution(startDate, endDate) {
        // Simplified strategy attribution
        return {
            'momentum': { weight: 0.3, return: 0.15, contribution: 0.045 },
            'mean_reversion': { weight: 0.25, return: 0.08, contribution: 0.02 },
            'arbitrage': { weight: 0.2, return: 0.12, contribution: 0.024 },
            'options': { weight: 0.15, return: 0.10, contribution: 0.015 },
            'algorithmic': { weight: 0.1, return: 0.06, contribution: 0.006 },
        };
    }
    /**
     * Get portfolio value at date
     */
    getPortfolioValueAtDate(date) {
        const targetDate = new Date(date);
        for (let i = this.portfolioValue.length - 1; i >= 0; i--) {
            const val = this.portfolioValue[i];
            const valueDate = new Date(typeof val === 'number' ? Date.now() : val.timestamp);
            if (valueDate <= targetDate) {
                return typeof val === 'number' ? val : val.value;
            }
        }
        return 0;
    }
    /**
     * Get date range for period
     */
    getDateRange(period) {
        const endDate = new Date();
        let startDate = new Date();
        switch (period) {
            case 'daily':
                startDate.setDate(endDate.getDate() - 1);
                break;
            case 'weekly':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case 'monthly':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case 'quarterly':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case 'yearly':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
        }
        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        };
    }
    /**
     * Get recent alerts
     */
    getRecentAlerts() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return this.alerts.filter(alert => new Date(alert.timestamp) > oneWeekAgo);
    }
    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const metrics = this.getCurrentPerformance();
        if (metrics.sharpeRatio < this.config.alertThresholds.minSharpe) {
            recommendations.push('Consider reducing risk or improving return to increase Sharpe ratio');
        }
        if (metrics.currentDrawdown > this.config.alertThresholds.maxDrawdown) {
            recommendations.push('Portfolio drawdown exceeds threshold - consider risk reduction');
        }
        if (metrics.volatility > this.config.alertThresholds.maxVolatility) {
            recommendations.push('Portfolio volatility is high - consider adding less volatile assets');
        }
        if (metrics.commissionRate > 0.002) {
            recommendations.push('Commission costs are high - consider negotiating better rates');
        }
        return recommendations;
    }
    /**
     * Check performance alerts
     */
    checkPerformanceAlerts() {
        const metrics = this.getCurrentPerformance();
        // Check drawdown alert
        if (metrics.currentDrawdown > this.config.alertThresholds.maxDrawdown) {
            this.createAlert('DRAWDOWN', 'HIGH', `Portfolio drawdown of ${(metrics.currentDrawdown * 100).toFixed(1)}% exceeds threshold`, metrics.currentDrawdown);
        }
        // Check volatility alert
        if (metrics.volatility > this.config.alertThresholds.maxVolatility) {
            this.createAlert('VOLATILITY', 'MEDIUM', `Portfolio volatility of ${(metrics.volatility * 100).toFixed(1)}% exceeds threshold`, metrics.volatility);
        }
        // Check Sharpe ratio alert
        if (metrics.sharpeRatio < this.config.alertThresholds.minSharpe) {
            this.createAlert('PERFORMANCE', 'LOW', `Sharpe ratio of ${metrics.sharpeRatio.toFixed(2)} below threshold`, metrics.sharpeRatio);
        }
    }
    /**
     * Create performance alert
     */
    createAlert(type, severity, message, currentValue) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random()}`,
            type,
            severity,
            message,
            threshold: this.getThresholdForType(type),
            currentValue,
            timestamp: new Date().toISOString(),
            recommendations: this.getAlertRecommendations(type),
        };
        this.alerts.push(alert);
        this.emit('performance_alert', alert);
        this.logAlert(alert);
    }
    /**
     * Get threshold for alert type
     */
    getThresholdForType(type) {
        switch (type) {
            case 'DRAWDOWN':
                return this.config.alertThresholds.maxDrawdown;
            case 'VOLATILITY':
                return this.config.alertThresholds.maxVolatility;
            case 'PERFORMANCE':
                return this.config.alertThresholds.minSharpe;
            default:
                return 0;
        }
    }
    /**
     * Get alert recommendations
     */
    getAlertRecommendations(type) {
        switch (type) {
            case 'DRAWDOWN':
                return ['Consider reducing position sizes', 'Implement stop-loss orders', 'Review risk management'];
            case 'VOLATILITY':
                return ['Add less volatile assets', 'Consider hedging strategies', 'Reduce leverage'];
            case 'PERFORMANCE':
                return ['Review investment strategy', 'Consider asset reallocation', 'Analyze market conditions'];
            default:
                return [];
        }
    }
    /**
     * Load historical data
     */
    loadHistoricalData() {
        try {
            // Load trades
            const tradesFile = path.join(this.goalieDir, 'trades.jsonl');
            if (fs.existsSync(tradesFile)) {
                const tradesData = fs.readFileSync(tradesFile, 'utf8');
                const tradesLines = tradesData.trim().split('\n');
                this.trades = tradesLines
                    .filter(line => line.trim())
                    .map(line => JSON.parse(line));
            }
            // Load portfolio values
            const portfolioFile = path.join(this.goalieDir, 'portfolio_values.jsonl');
            if (fs.existsSync(portfolioFile)) {
                const portfolioData = fs.readFileSync(portfolioFile, 'utf8');
                const portfolioLines = portfolioData.trim().split('\n');
                this.portfolioValue = portfolioLines
                    .filter(line => line.trim())
                    .map(line => JSON.parse(line));
            }
            console.log('✅ Historical performance data loaded');
        }
        catch (error) {
            console.error('❌ Error loading historical data:', error);
        }
    }
    /**
     * Log trade
     */
    logTrade(trade) {
        const logFile = path.join(this.goalieDir, 'trades.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(trade) + '\n');
    }
    /**
     * Log alert
     */
    logAlert(alert) {
        const logFile = path.join(this.goalieDir, 'performance_alerts.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(alert) + '\n');
    }
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const metrics = this.calculatePerformanceMetrics();
        this.performanceHistory.push(metrics);
        // Keep last 100 performance snapshots
        if (this.performanceHistory.length > 100) {
            this.performanceHistory.shift();
        }
        this.emit('metrics_updated', metrics);
    }
}
export default PerformanceAnalytics;
//# sourceMappingURL=performance_analytics.js.map