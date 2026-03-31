#!/usr/bin/env tsx
/**
 * Comprehensive Financial Trading Analysis and Portfolio Optimization Engine
 *
 * Core trading engine that integrates with the agentic flow ecosystem for:
 * - Multi-strategy trading analysis (mean reversion, momentum, replenishment)
 * - Portfolio optimization using modern portfolio theory
 * - Risk management with position sizing and stop-loss mechanisms
 * - Real-time market data integration and analysis
 * - Options strategies with defined risk parameters
 * - Pattern metrics integration for governance compliance
 */
import { EventEmitter } from 'events';
import { StockQuote } from '../integrations/fmp_stable_client';
export interface TradingSignal {
    id: string;
    symbol: string;
    strategy: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    price: number;
    quantity: number;
    timestamp: string;
    indicators: Record<string, number>;
    reason: string;
    riskMetrics: {
        stopLoss: number;
        takeProfit: number;
        positionSize: number;
        riskRewardRatio: number;
    };
    governance: {
        patternType: string;
        complianceScore: number;
        riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
}
export interface PortfolioAllocation {
    symbol: string;
    weight: number;
    expectedReturn: number;
    risk: number;
    sharpeRatio: number;
    correlation: Record<string, number>;
}
export interface MarketData {
    symbol: string;
    quote: StockQuote;
    technicalIndicators: Record<string, number>;
    sentiment: {
        score: number;
        sources: string[];
        timestamp: string;
    };
    economicIndicators: Record<string, number>;
}
export interface TradingEngineConfig {
    apiKey?: string;
    maxPositions: number;
    maxLeverage: number;
    riskTolerance: number;
    rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
    strategies: string[];
    enableOptions: boolean;
    enableAlgorithmic: boolean;
    complianceLevel: 'conservative' | 'moderate' | 'aggressive';
}
export declare class TradingEngine extends EventEmitter {
    private fmpClient;
    private riskManager;
    private portfolioOptimizer;
    private marketDataProcessor;
    private optionsEngine;
    private performanceAnalytics;
    private algorithmicEngine;
    private complianceManager;
    private goalieDir;
    private config;
    private isRunning;
    private portfolio;
    private marketDataCache;
    constructor(config: TradingEngineConfig);
    /**
     * Start the trading engine
     */
    start(): Promise<void>;
    /**
     * Stop the trading engine
     */
    stop(): Promise<void>;
    /**
     * Analyze a symbol and generate trading signals
     */
    analyzeSymbol(symbol: string): Promise<TradingSignal[]>;
    /**
     * Optimize portfolio allocation
     */
    optimizePortfolio(symbols: string[]): Promise<PortfolioAllocation[]>;
    /**
     * Execute a trading signal
     */
    executeSignal(signal: TradingSignal): Promise<void>;
    /**
     * Get current portfolio status
     */
    getPortfolioStatus(): {
        positions: Record<string, number>;
        totalValue: number;
        riskMetrics: any;
        performance: any;
    };
    /**
     * Generate trading signal for a specific strategy
     */
    private generateStrategySignal;
    /**
     * Generate mean reversion trading signal
     */
    private generateMeanReversionSignal;
    /**
     * Generate momentum trading signal
     */
    private generateMomentumSignal;
    /**
     * Generate replenishment trading signal
     */
    private generateReplenishmentSignal;
    /**
     * Generate semiconductor sector signal (SOXL/SOXS integration)
     */
    private generateSemiconductorSignal;
    /**
     * Setup event handlers for component integration
     */
    private setupEventHandlers;
    /**
     * Update portfolio positions
     */
    private updatePortfolio;
    /**
     * Calculate portfolio value
     */
    private calculatePortfolioValue;
    /**
     * Calculate portfolio risk
     */
    private calculatePortfolioRisk;
    /**
     * Log trade execution
     */
    private logExecution;
    /**
     * Emit governance pattern metrics
     */
    private emitGovernanceMetric;
}
export default TradingEngine;
//# sourceMappingURL=trading_engine.d.ts.map