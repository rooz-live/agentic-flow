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
import { TradingSignal, MarketData } from './trading_engine';
export interface RiskMetrics {
    valueAtRisk: number;
    conditionalVaR: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    beta: number;
    correlation: number;
    volatility: number;
    diversificationRatio: number;
}
export interface PositionRisk {
    symbol: string;
    positionSize: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    riskContribution: number;
    stopLoss: number;
    takeProfit: number;
    trailingStop: number;
    volatility: number;
    beta: number;
    correlationToPortfolio: number;
}
export interface RiskAlert {
    id: string;
    type: 'POSITION_RISK' | 'PORTFOLIO_RISK' | 'MARKET_RISK' | 'CORRELATION_RISK';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    symbol?: string;
    message: string;
    recommendation: string;
    timestamp: string;
    metrics: Record<string, number>;
}
export interface RiskLimits {
    maxPositionSize: number;
    maxPortfolioLeverage: number;
    maxSectorExposure: number;
    maxCorrelation: number;
    maxDrawdown: number;
    minDiversificationRatio: number;
    volatilityThreshold: number;
}
export interface StressTestScenario {
    name: string;
    description: string;
    marketShock: number;
    sectorShocks: Record<string, number>;
    volatilityIncrease: number;
    correlationIncrease: number;
}
export declare class RiskManager extends EventEmitter {
    private config;
    private goalieDir;
    private riskLimits;
    private stressScenarios;
    private positionHistory;
    private portfolioHistory;
    private marketDataCache;
    constructor(config: any);
    /**
     * Initialize stress test scenarios
     */
    private initializeStressScenarios;
    /**
     * Adjust trading signal based on risk parameters
     */
    adjustSignal(signal: TradingSignal, marketData: MarketData): Promise<TradingSignal>;
    /**
     * Calculate optimal position size using Kelly Criterion and volatility
     */
    calculatePositionSize(signal: TradingSignal, marketData: MarketData): number;
    /**
     * Calculate stop-loss level based on volatility and technical indicators
     */
    calculateStopLoss(signal: TradingSignal, marketData: MarketData): number;
    /**
     * Calculate take-profit level based on risk-reward ratio and technical levels
     */
    calculateTakeProfit(signal: TradingSignal, marketData: MarketData): number;
    /**
     * Calculate risk-reward ratio
     */
    calculateRiskRewardRatio(entryPrice: number, stopLoss: number, takeProfit: number): number;
    /**
     * Adjust signal confidence based on risk factors
     */
    adjustConfidenceForRisk(confidence: number, marketData: MarketData): number;
    /**
     * Calculate comprehensive portfolio risk metrics
     */
    calculatePortfolioRisk(positions: Record<string, number>): RiskMetrics;
    /**
     * Calculate individual position risks
     */
    private calculatePositionRisks;
    /**
     * Calculate portfolio volatility using correlation matrix
     */
    private calculatePortfolioVolatility;
    /**
     * Estimate correlation between two positions
     */
    private estimateCorrelation;
    /**
     * Get sector for a symbol
     */
    private getSector;
    /**
     * Calculate VaR and CVaR using historical simulation
     */
    private calculateVaR;
    /**
     * Generate scenarios for VaR calculation
     */
    private generateScenarios;
    /**
     * Generate normal random variable using Box-Muller transform
     */
    private generateNormalRandom;
    /**
     * Calculate maximum drawdown
     */
    private calculateMaxDrawdown;
    /**
     * Calculate returns series
     */
    private calculateReturns;
    /**
     * Calculate Sharpe ratio
     */
    private calculateSharpeRatio;
    /**
     * Calculate Sortino ratio
     */
    private calculateSortinoRatio;
    /**
     * Calculate portfolio beta
     */
    private calculatePortfolioBeta;
    /**
     * Calculate portfolio correlation to market
     */
    private calculatePortfolioCorrelation;
    /**
     * Calculate diversification ratio
     */
    private calculateDiversificationRatio;
    /**
     * Run stress tests on portfolio
     */
    runStressTests(positions: Record<string, number>): Promise<Record<string, any>>;
    /**
     * Run individual stress test scenario
     */
    private runStressScenario;
    /**
     * Check for risk alerts and emit them
     */
    checkRiskAlerts(positions: Record<string, number>): Promise<RiskAlert[]>;
    /**
     * Get portfolio value
     */
    private getPortfolioValue;
    /**
     * Get average entry price for a position
     */
    private getAverageEntryPrice;
    /**
     * Log stress test results
     */
    private logStressTestResults;
    /**
     * Update market data cache
     */
    updateMarketData(symbol: string, marketData: MarketData): void;
    /**
     * Update portfolio history
     */
    updatePortfolioHistory(portfolioValue: number): void;
}
export default RiskManager;
//# sourceMappingURL=risk_manager.d.ts.map