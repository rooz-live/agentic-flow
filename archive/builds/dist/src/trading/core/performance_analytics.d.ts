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
export interface PerformanceMetrics {
    totalReturn: number;
    annualizedReturn: number;
    monthlyReturn: number;
    dailyReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    informationRatio: number;
    treynorRatio: number;
    calmarRatio: number;
    volatility: number;
    maxDrawdown: number;
    currentDrawdown: number;
    valueAtRisk: number;
    conditionalVaR: number;
    beta: number;
    trackingError: number;
    totalValue: number;
    cashBalance: number;
    investedCapital: number;
    leverage: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    largestWin: number;
    largestLoss: number;
    averageTradeDuration: number;
    averageSlippage: number;
    totalCommission: number;
    commissionRate: number;
    executionQuality: number;
    alpha: number;
    sectorAttribution: Record<string, number>;
    strategyAttribution: Record<string, number>;
    factorExposure: Record<string, number>;
}
export interface TradeRecord {
    id: string;
    symbol: string;
    strategy: string;
    action: 'BUY' | 'SELL';
    entryDate: string;
    exitDate?: string;
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    commission: number;
    slippage: number;
    pnl?: number;
    pnlPercent?: number;
    duration?: number;
    exitReason?: string;
    tags: string[];
    metadata: Record<string, any>;
}
export interface BenchmarkData {
    symbol: string;
    name: string;
    returns: Array<{
        date: string;
        return: number;
    }>;
    performance: {
        totalReturn: number;
        sharpeRatio: number;
        maxDrawdown: number;
        volatility: number;
    };
}
export interface PerformanceAttribution {
    period: string;
    totalReturn: number;
    benchmarkReturn: number;
    excessReturn: number;
    factorAttribution: {
        market: number;
        size: number;
        value: number;
        momentum: number;
        quality: number;
        volatility: number;
        residual: number;
    };
    sectorAttribution: Record<string, {
        weight: number;
        return: number;
        contribution: number;
    }>;
    strategyAttribution: Record<string, {
        weight: number;
        return: number;
        contribution: number;
    }>;
}
export interface PerformanceAlert {
    id: string;
    type: 'DRAWDOWN' | 'VOLATILITY' | 'CORRELATION' | 'CONCENTRATION' | 'PERFORMANCE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    threshold: number;
    currentValue: number;
    timestamp: string;
    recommendations: string[];
}
export interface PerformanceConfig {
    benchmarkSymbols: string[];
    riskFreeRate: number;
    rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
    alertThresholds: {
        maxDrawdown: number;
        maxVolatility: number;
        minSharpe: number;
        maxConcentration: number;
    };
    attributionFactors: string[];
}
export declare class PerformanceAnalytics extends EventEmitter {
    private goalieDir;
    private config;
    private trades;
    private portfolioValue;
    private benchmarkData;
    private performanceHistory;
    private alerts;
    constructor(goalieDir: string, config?: Partial<PerformanceConfig>);
    /**
     * Add a trade record
     */
    addTrade(trade: TradeRecord): void;
    /**
     * Update portfolio value
     */
    updatePortfolioValue(value: number, timestamp?: string): void;
    /**
     * Get current performance metrics
     */
    getCurrentPerformance(): PerformanceMetrics;
    /**
     * Get performance attribution for a period
     */
    getPerformanceAttribution(startDate: string, endDate: string): PerformanceAttribution;
    /**
     * Generate performance report
     */
    generatePerformanceReport(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): {
        summary: PerformanceMetrics;
        attribution: PerformanceAttribution;
        benchmarks: Record<string, BenchmarkData>;
        alerts: PerformanceAlert[];
        recommendations: string[];
    };
    /**
     * Calculate comprehensive performance metrics
     */
    private calculatePerformanceMetrics;
    /**
     * Calculate returns series
     */
    private calculateReturns;
    /**
     * Calculate total return
     */
    private calculateTotalReturn;
    /**
     * Calculate annualized return
     */
    private calculateAnnualizedReturn;
    /**
     * Calculate monthly return
     */
    private calculateMonthlyReturn;
    /**
     * Calculate daily return
     */
    private calculateDailyReturn;
    /**
     * Calculate Sharpe ratio
     */
    private calculateSharpeRatio;
    /**
     * Calculate Sortino ratio
     */
    private calculateSortinoRatio;
    /**
     * Calculate Information ratio
     */
    private calculateInformationRatio;
    /**
     * Calculate Treynor ratio
     */
    private calculateTreynorRatio;
    /**
     * Calculate Calmar ratio
     */
    private calculateCalmarRatio;
    /**
     * Calculate volatility
     */
    private calculateVolatility;
    /**
     * Calculate maximum drawdown
     */
    private calculateMaxDrawdown;
    /**
     * Calculate current drawdown
     */
    private calculateCurrentDrawdown;
    /**
     * Calculate Value at Risk
     */
    private calculateVaR;
    /**
     * Calculate Conditional Value at Risk
     */
    private calculateCVaR;
    /**
     * Calculate beta
     */
    private calculateBeta;
    /**
     * Calculate tracking error
     */
    private calculateTrackingError;
    /**
     * Get benchmark returns
     */
    private getBenchmarkReturns;
    /**
     * Get completed trades
     */
    private getCompletedTrades;
    /**
     * Calculate average win
     */
    private calculateAverageWin;
    /**
     * Calculate average loss
     */
    private calculateAverageLoss;
    /**
     * Calculate profit factor
     */
    private calculateProfitFactor;
    /**
     * Calculate largest win
     */
    private calculateLargestWin;
    /**
     * Calculate largest loss
     */
    private calculateLargestLoss;
    /**
     * Calculate average trade duration
     */
    private calculateAverageTradeDuration;
    /**
     * Calculate average slippage
     */
    private calculateAverageSlippage;
    /**
     * Calculate total commission
     */
    private calculateTotalCommission;
    /**
     * Calculate commission rate
     */
    private calculateCommissionRate;
    /**
     * Calculate execution quality
     */
    private calculateExecutionQuality;
    /**
     * Calculate alpha
     */
    private calculateAlpha;
    /**
     * Get current portfolio value
     */
    private getCurrentPortfolioValue;
    /**
     * Get cash balance
     */
    private getCashBalance;
    /**
     * Calculate leverage
     */
    private calculateLeverage;
    /**
     * Get current sector attribution
     */
    private getCurrentSectorAttribution;
    /**
     * Get current strategy attribution
     */
    private getCurrentStrategyAttribution;
    /**
     * Get current factor exposure
     */
    private getCurrentFactorExposure;
    /**
     * Calculate period return
     */
    private calculatePeriodReturn;
    /**
     * Calculate benchmark return
     */
    private calculateBenchmarkReturn;
    /**
     * Calculate factor attribution
     */
    private calculateFactorAttribution;
    /**
     * Calculate sector attribution
     */
    private calculateSectorAttribution;
    /**
     * Calculate strategy attribution
     */
    private calculateStrategyAttribution;
    /**
     * Get portfolio value at date
     */
    private getPortfolioValueAtDate;
    /**
     * Get date range for period
     */
    private getDateRange;
    /**
     * Get recent alerts
     */
    private getRecentAlerts;
    /**
     * Generate recommendations
     */
    private generateRecommendations;
    /**
     * Check performance alerts
     */
    private checkPerformanceAlerts;
    /**
     * Create performance alert
     */
    private createAlert;
    /**
     * Get threshold for alert type
     */
    private getThresholdForType;
    /**
     * Get alert recommendations
     */
    private getAlertRecommendations;
    /**
     * Load historical data
     */
    private loadHistoricalData;
    /**
     * Log trade
     */
    private logTrade;
    /**
     * Log alert
     */
    private logAlert;
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics;
}
export default PerformanceAnalytics;
//# sourceMappingURL=performance_analytics.d.ts.map