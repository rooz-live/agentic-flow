#!/usr/bin/env tsx
/**
 * Algorithmic Trading System with Backtesting
 *
 * Implements comprehensive algorithmic trading capabilities:
 * - Multiple trading algorithms with backtesting capabilities
 * - Machine learning integration for pattern recognition
 * - High-frequency trading data analysis
 * - Signal generation and validation systems
 * - Execution management and slippage control
 * - Performance optimization and parameter tuning
 */
import { EventEmitter } from 'events';
import { TradingSignal, MarketData } from './trading_engine';
import { FMPStableClient } from '../integrations/fmp_stable_client';
export interface TradingAlgorithm {
    id: string;
    name: string;
    type: 'MOMENTUM' | 'MEAN_REVERSION' | 'ARBITRAGE' | 'ML_PREDICTION' | 'STATISTICAL' | 'BREAKOUT';
    parameters: Record<string, any>;
    performance: {
        totalReturn: number;
        sharpeRatio: number;
        maxDrawdown: number;
        winRate: number;
        profitFactor: number;
        totalTrades: number;
    };
    isActive: boolean;
    lastUpdated: string;
}
export interface BacktestResult {
    algorithmId: string;
    symbol: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    finalCapital: number;
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    averageTradeDuration: number;
    trades: BacktestTrade[];
    equityCurve: Array<{
        date: string;
        equity: number;
        drawdown: number;
    }>;
    monthlyReturns: Array<{
        month: string;
        return: number;
    }>;
    riskMetrics: {
        valueAtRisk: number;
        conditionalVaR: number;
        volatility: number;
        beta: number;
    };
}
export interface BacktestTrade {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    commission: number;
    slippage: number;
    pnl: number;
    pnlPercent: number;
    duration: number;
    exitReason: string;
    algorithmId: string;
}
export interface SignalGenerator {
    algorithmId: string;
    generateSignals(marketData: MarketData[]): Promise<TradingSignal[]>;
    validateSignal(signal: TradingSignal, marketData: MarketData): boolean;
    getParameters(): Record<string, any>;
    updateParameters(parameters: Record<string, any>): void;
}
export interface ExecutionManager {
    executeSignal(signal: TradingSignal): Promise<ExecutionResult>;
    getSlippage(symbol: string, quantity: number, price: number): number;
    getCommission(symbol: string, quantity: number, price: number): number;
}
export interface ExecutionResult {
    success: boolean;
    orderId: string;
    executedPrice: number;
    executedQuantity: number;
    commission: number;
    slippage: number;
    timestamp: string;
    error?: string;
}
export interface MLModel {
    predict(features: number[]): number;
    train(data: Array<{
        features: number[];
        label: number;
    }>): void;
    evaluate(testData: Array<{
        features: number[];
        label: number;
    }>): {
        accuracy: number;
        precision: number;
        recall: number;
    };
}
export declare class AlgorithmicTradingEngine extends EventEmitter {
    private fmpClient;
    private goalieDir;
    private isRunning;
    private algorithms;
    private signalGenerators;
    private executionManager;
    private mlModels;
    private historicalData;
    private activeSignals;
    constructor(fmpClient: FMPStableClient);
    /**
     * Start algorithmic trading engine
     */
    start(): Promise<void>;
    /**
     * Stop algorithmic trading engine
     */
    stop(): Promise<void>;
    /**
     * Add a new trading algorithm
     */
    addAlgorithm(algorithm: TradingAlgorithm): void;
    /**
     * Remove a trading algorithm
     */
    removeAlgorithm(algorithmId: string): void;
    /**
     * Run backtest for an algorithm
     */
    runBacktest(algorithmId: string, symbol: string, startDate: string, endDate: string, initialCapital?: number): Promise<BacktestResult>;
    /**
     * Optimize algorithm parameters
     */
    optimizeParameters(algorithmId: string, symbol: string, parameterRanges: Record<string, [number, number]>, optimizationMetric?: 'sharpe' | 'return' | 'winrate'): Promise<Record<string, number>>;
    /**
     * Create signal generator based on algorithm type
     */
    private createSignalGenerator;
    /**
     * Simulate backtest
     */
    private simulateBacktest;
    /**
     * Generate parameter combinations for optimization
     */
    private generateParameterCombinations;
    /**
     * Calculate Sharpe ratio
     */
    private calculateSharpeRatio;
    /**
     * Calculate Sortino ratio
     */
    private calculateSortinoRatio;
    /**
     * Calculate Value at Risk
     */
    private calculateVaR;
    /**
     * Calculate Conditional Value at Risk
     */
    private calculateCVaR;
    /**
     * Calculate volatility
     */
    private calculateVolatility;
    /**
     * Calculate monthly returns
     */
    private calculateMonthlyReturns;
    /**
     * Find entry index in historical data
     */
    private findEntryIndex;
    /**
     * Load historical data
     */
    private loadHistoricalData;
    /**
     * Generate synthetic historical data for testing
     */
    private generateSyntheticHistoricalData;
    /**
     * Get historical data for a symbol
     */
    private getHistoricalData;
    /**
     * Initialize default algorithms
     */
    private initializeAlgorithms;
    /**
     * Start signal generation loop
     */
    private startSignalGeneration;
    /**
     * Log backtest result
     */
    private logBacktestResult;
}
export default AlgorithmicTradingEngine;
//# sourceMappingURL=algorithmic_trading_engine.d.ts.map