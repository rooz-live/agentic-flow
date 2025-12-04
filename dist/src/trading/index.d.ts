#!/usr/bin/env tsx
/**
 * Financial Trading System Integration Entry Point
 *
 * Main integration file that exports all trading system components
 * and provides unified access to the comprehensive financial trading
 * analysis and portfolio optimization system.
 */
export { TradingEngine, TradingSignal, MarketData, PortfolioAllocation, TradingEngineConfig } from './core/trading_engine';
export { RiskManager, RiskMetrics, PositionRisk, RiskAlert, RiskLimits } from './core/risk_manager';
export { PortfolioOptimizer, OptimizationResult, OptimizationConstraints, AssetReturns } from './core/portfolio_optimizer';
export { MarketDataProcessor, TechnicalIndicators, NewsItem, EconomicIndicator, SectorData } from './core/market_data_processor';
export { OptionsStrategyEngine, OptionContract, OptionsStrategy, OptionLeg, VolatilitySurface } from './core/options_strategy_engine';
export { AlgorithmicTradingEngine, BacktestResult, TradingAlgorithm, SignalGenerator, ExecutionManager } from './core/algorithmic_trading_engine';
export { PerformanceAnalytics, PerformanceMetrics, TradeRecord, BenchmarkData, PerformanceAttribution } from './core/performance_analytics';
export { ComplianceManager, ComplianceRule, ComplianceContext, ComplianceCheckResult, ComplianceReport } from './core/compliance_manager';
export { default as TradingDashboard } from './ui/trading_dashboard';
export { SOXLSOXSTrader } from './soxl_soxs_trader';
/**
 * Unified Trading System Factory
 *
 * Provides a single entry point for creating and configuring
 * the complete trading system with all components integrated.
 */
export declare class TradingSystemFactory {
    /**
     * Create a complete trading system with all components
     */
    static createTradingSystem(config?: Partial<TradingEngineConfig>): {
        engine: TradingEngine;
        riskManager: RiskManager;
        portfolioOptimizer: PortfolioOptimizer;
        marketDataProcessor: MarketDataProcessor;
        optionsEngine: OptionsStrategyEngine;
        algorithmicEngine: AlgorithmicTradingEngine;
        performanceAnalytics: PerformanceAnalytics;
        complianceManager: ComplianceManager;
    };
    /**
     * Create a specialized trading system for specific use cases
     */
    static createSpecializedSystem(type: 'SEMICONDUCTOR' | 'OPTIONS' | 'ALGORITHMIC' | 'RISK_MANAGEMENT'): {
        engine: TradingEngine;
        [key: string]: any;
    };
    /**
     * Create a development/testing trading system
     */
    static createDevelopmentSystem(): {
        engine: TradingEngine;
        [key: string]: any;
    };
}
/**
 * Trading System Utilities
 *
 * Utility functions for common trading system operations
 */
export declare class TradingSystemUtils {
    /**
     * Validate trading configuration
     */
    static validateConfig(config: Partial<TradingEngineConfig>): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Get default configuration for account type
     */
    static getDefaultConfig(accountType?: 'CASH' | 'MARGIN' | 'RETIREMENT'): Partial<TradingEngineConfig>;
    /**
     * Calculate recommended position size based on risk tolerance
     */
    static calculateRecommendedPositionSize(portfolioValue: number, riskTolerance: number, symbolVolatility: number): number;
    /**
     * Generate trading system health check
     */
    static generateHealthCheck(system: {
        engine: TradingEngine;
        [key: string]: any;
    }): {
        status: 'HEALTHY' | 'WARNING' | 'ERROR';
        checks: Array<{
            component: string;
            status: 'PASS' | 'FAIL' | 'WARNING';
            message: string;
            timestamp: string;
        }>;
        summary: {
            totalChecks: number;
            passedChecks: number;
            failedChecks: number;
            warningChecks: number;
        };
    };
}
/**
 * Trading System Constants
 */
export declare const TRADING_CONSTANTS: {
    readonly MARKET_OPEN_TIME: "09:30";
    readonly MARKET_CLOSE_TIME: "16:00";
    readonly MAX_POSITION_SIZE_PERCENT: 0.1;
    readonly MAX_LEVERAGE: 5;
    readonly MIN_RISK_TOLERANCE: 0.01;
    readonly MAX_RISK_TOLERANCE: 1;
    readonly MIN_SHARPE_RATIO: 0.5;
    readonly MAX_DRAWDOWN: 0.2;
    readonly MIN_WIN_RATE: 0.4;
    readonly MAX_DAILY_TRADES: 100;
    readonly MAX_CONCENTRATION: 0.3;
    readonly AUDIT_RETENTION_DAYS: 2555;
    readonly DEFAULT_RSI_PERIOD: 14;
    readonly DEFAULT_MACD_FAST: 12;
    readonly DEFAULT_MACD_SLOW: 26;
    readonly DEFAULT_BB_PERIOD: 20;
    readonly DEFAULT_BB_STD_DEV: 2;
    readonly DEFAULT_OPTIONS_DTE: 30;
    readonly MIN_OPTIONS_DTE: 7;
    readonly MAX_OPTIONS_DTE: 365;
    readonly TRADE_HISTORY_RETENTION_DAYS: 365;
    readonly PERFORMANCE_HISTORY_RETENTION_DAYS: 1095;
    readonly AUDIT_LOG_RETENTION_DAYS: 2555;
};
/**
 * Trading System Types
 */
export type TradingSystemStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'ERROR';
export type TradingSystemMode = 'SIMULATION' | 'PAPER_TRADING' | 'LIVE_TRADING';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * Export all components for easy access
 */
export { TradingSystemFactory, TradingSystemUtils, TRADING_CONSTANTS, };
export default TradingSystemFactory;
//# sourceMappingURL=index.d.ts.map