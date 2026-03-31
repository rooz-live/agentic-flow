#!/usr/bin/env tsx
/**
 * Financial Trading System Integration Entry Point
 *
 * Main integration file that exports all trading system components
 * and provides unified access to the comprehensive financial trading
 * analysis and portfolio optimization system.
 */
// Core trading components - import classes for use, export both classes and types
import { TradingEngine } from './core/trading_engine';
import { RiskManager } from './core/risk_manager';
import { PortfolioOptimizer } from './core/portfolio_optimizer';
import { MarketDataProcessor } from './core/market_data_processor';
import { OptionsStrategyEngine } from './core/options_strategy_engine';
import { AlgorithmicTradingEngine } from './core/algorithmic_trading_engine';
import { PerformanceAnalytics } from './core/performance_analytics';
import { ComplianceManager } from './core/compliance_manager';
// Re-export classes
export { TradingEngine, RiskManager, PortfolioOptimizer, MarketDataProcessor, OptionsStrategyEngine, AlgorithmicTradingEngine, PerformanceAnalytics, ComplianceManager };
// UI components
export { default as TradingDashboard } from './ui/trading_dashboard';
// Re-export existing SOXL/SOXS trader for compatibility
export { SOXLSOXSTrader } from './soxl_soxs_trader';
/**
 * Unified Trading System Factory
 *
 * Provides a single entry point for creating and configuring
 * the complete trading system with all components integrated.
 */
export class TradingSystemFactory {
    /**
     * Create a complete trading system with all components
     */
    static createTradingSystem(config) {
        // Create core trading engine
        const engineConfig = {
            apiKey: process.env.FMP_API_KEY,
            maxPositions: 10,
            maxLeverage: 2.0,
            riskTolerance: 0.15,
            rebalanceFrequency: 'weekly',
            strategies: ['mean_reversion', 'momentum', 'semiconductor_sector'],
            enableOptions: true,
            enableAlgorithmic: true,
            complianceLevel: 'moderate',
            ...config,
        };
        const tradingEngine = new TradingEngine(engineConfig);
        // Create supporting components
        const riskManager = new RiskManager(engineConfig);
        const portfolioOptimizer = new PortfolioOptimizer(engineConfig);
        const marketDataProcessor = new MarketDataProcessor(tradingEngine['fmpClient'], {
            updateInterval: 60000, // 1 minute
            dataSources: ['fmp'],
            technicalIndicators: ['sma', 'ema', 'rsi', 'macd', 'bollinger', 'volume'],
            sentimentSources: ['news', 'social'],
            economicIndicators: true,
            sectorAnalysis: true,
            cacheSize: 1000,
        });
        const optionsEngine = new OptionsStrategyEngine({
            maxCapitalPerTrade: 10000,
            maxDaysToExpiration: 60,
            minDaysToExpiration: 7,
            targetReturn: 0.15,
            maxRisk: 0.05,
            volatilityThreshold: 0.3,
            probabilityOfProfitMin: 0.6,
            strategies: ['COVERED_CALL', 'PROTECTIVE_PUT', 'VERTICAL_SPREAD'],
        });
        const algorithmicEngine = new AlgorithmicTradingEngine(tradingEngine['fmpClient']);
        const performanceAnalytics = new PerformanceAnalytics(process.env.GOALIE_DIR || '.goalie');
        const complianceManager = new ComplianceManager({
            jurisdiction: 'US',
            accountType: 'MARGIN',
            riskTolerance: 'MODERATE',
            autoBlockViolations: true,
            requireApprovalFor: ['LARGE_ORDERS', 'MARGIN_TRADES'],
            reportingFrequency: 'REAL_TIME',
            auditRetention: 2555,
            dataEncryption: true,
            gdprCompliance: true,
            soxCompliance: true,
            miFIDCompliance: false,
        });
        return {
            engine: tradingEngine,
            riskManager,
            portfolioOptimizer,
            marketDataProcessor,
            optionsEngine,
            algorithmicEngine,
            performanceAnalytics,
            complianceManager,
        };
    }
    /**
     * Create a specialized trading system for specific use cases
     */
    static createSpecializedSystem(type) {
        const baseConfig = {
            apiKey: process.env.FMP_API_KEY,
            maxPositions: 10,
            maxLeverage: 2.0,
            riskTolerance: 0.15,
            rebalanceFrequency: 'weekly',
        };
        switch (type) {
            case 'SEMICONDUCTOR':
                return this.createTradingSystem({
                    ...baseConfig,
                    strategies: ['semiconductor_sector'],
                    enableOptions: false,
                    enableAlgorithmic: false,
                    complianceLevel: 'conservative',
                });
            case 'OPTIONS':
                return this.createTradingSystem({
                    ...baseConfig,
                    strategies: ['mean_reversion'],
                    enableOptions: true,
                    enableAlgorithmic: false,
                    complianceLevel: 'moderate',
                });
            case 'ALGORITHMIC':
                return this.createTradingSystem({
                    ...baseConfig,
                    strategies: ['momentum', 'mean_reversion'],
                    enableOptions: false,
                    enableAlgorithmic: true,
                    complianceLevel: 'aggressive',
                });
            case 'RISK_MANAGEMENT':
                return this.createTradingSystem({
                    ...baseConfig,
                    strategies: ['replenishment'],
                    enableOptions: true,
                    enableAlgorithmic: false,
                    complianceLevel: 'conservative',
                    maxLeverage: 1.5,
                    riskTolerance: 0.1,
                });
            default:
                return this.createTradingSystem(baseConfig);
        }
    }
    /**
     * Create a development/testing trading system
     */
    static createDevelopmentSystem() {
        return this.createTradingSystem({
            apiKey: process.env.FMP_API_KEY || 'demo_key',
            maxPositions: 5,
            maxLeverage: 1.0,
            riskTolerance: 0.05,
            rebalanceFrequency: 'daily',
            strategies: ['momentum'],
            enableOptions: false,
            enableAlgorithmic: false,
            complianceLevel: 'conservative',
        });
    }
}
/**
 * Trading System Utilities
 *
 * Utility functions for common trading system operations
 */
export class TradingSystemUtils {
    /**
     * Validate trading configuration
     */
    static validateConfig(config) {
        const errors = [];
        if (!config.apiKey && !process.env.FMP_API_KEY) {
            errors.push('API key is required');
        }
        if (config.maxPositions && config.maxPositions > 50) {
            errors.push('Maximum positions cannot exceed 50');
        }
        if (config.maxLeverage && config.maxLeverage > 5) {
            errors.push('Maximum leverage cannot exceed 5x');
        }
        if (config.riskTolerance && (config.riskTolerance < 0.01 || config.riskTolerance > 1)) {
            errors.push('Risk tolerance must be between 0.01 and 1.0');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Get default configuration for account type
     */
    static getDefaultConfig(accountType = 'MARGIN') {
        switch (accountType) {
            case 'CASH':
                return {
                    maxLeverage: 1.0,
                    riskTolerance: 0.05,
                    strategies: ['mean_reversion', 'momentum'],
                    enableOptions: false,
                    complianceLevel: 'conservative',
                };
            case 'MARGIN':
                return {
                    maxLeverage: 2.0,
                    riskTolerance: 0.15,
                    strategies: ['mean_reversion', 'momentum', 'semiconductor_sector'],
                    enableOptions: true,
                    enableAlgorithmic: true,
                    complianceLevel: 'moderate',
                };
            case 'RETIREMENT':
                return {
                    maxLeverage: 1.5,
                    riskTolerance: 0.08,
                    strategies: ['mean_reversion'],
                    enableOptions: false,
                    enableAlgorithmic: false,
                    complianceLevel: 'conservative',
                    rebalanceFrequency: 'monthly',
                };
            default:
                return {};
        }
    }
    /**
     * Calculate recommended position size based on risk tolerance
     */
    static calculateRecommendedPositionSize(portfolioValue, riskTolerance, symbolVolatility) {
        // Simplified position sizing based on volatility and risk tolerance
        const riskPerShare = symbolVolatility * Math.sqrt(252); // Annualized risk
        const maxPositionValue = portfolioValue * riskTolerance;
        const maxShares = Math.floor(maxPositionValue / (riskPerShare * 100)); // 1% risk per position
        return Math.max(1, maxShares);
    }
    /**
     * Generate trading system health check
     */
    static generateHealthCheck(system) {
        const checks = [];
        let passedChecks = 0;
        let failedChecks = 0;
        let warningChecks = 0;
        // Check trading engine
        try {
            const portfolioStatus = system.engine.getPortfolioStatus();
            checks.push({
                component: 'Trading Engine',
                status: 'PASS',
                message: 'Portfolio status accessible',
                timestamp: new Date().toISOString(),
            });
            passedChecks++;
        }
        catch (error) {
            checks.push({
                component: 'Trading Engine',
                status: 'FAIL',
                message: `Error accessing portfolio: ${error}`,
                timestamp: new Date().toISOString(),
            });
            failedChecks++;
        }
        // Check risk manager
        try {
            const riskMetrics = system.riskManager.calculatePortfolioRisk({});
            checks.push({
                component: 'Risk Manager',
                status: 'PASS',
                message: 'Risk calculations functional',
                timestamp: new Date().toISOString(),
            });
            passedChecks++;
        }
        catch (error) {
            checks.push({
                component: 'Risk Manager',
                status: 'FAIL',
                message: `Error in risk manager: ${error}`,
                timestamp: new Date().toISOString(),
            });
            failedChecks++;
        }
        // Check portfolio optimizer
        try {
            const allocation = system.portfolioOptimizer.optimize([], {});
            checks.push({
                component: 'Portfolio Optimizer',
                status: 'PASS',
                message: 'Portfolio optimization functional',
                timestamp: new Date().toISOString(),
            });
            passedChecks++;
        }
        catch (error) {
            checks.push({
                component: 'Portfolio Optimizer',
                status: 'FAIL',
                message: `Error in portfolio optimizer: ${error}`,
                timestamp: new Date().toISOString(),
            });
            failedChecks++;
        }
        // Determine overall status
        let status = 'HEALTHY';
        if (failedChecks > 0) {
            status = 'ERROR';
        }
        else if (warningChecks > 0) {
            status = 'WARNING';
        }
        return {
            status,
            checks,
            summary: {
                totalChecks: checks.length,
                passedChecks,
                failedChecks,
                warningChecks,
            },
        };
    }
}
/**
 * Trading System Constants
 */
export const TRADING_CONSTANTS = {
    // Market hours
    MARKET_OPEN_TIME: '09:30',
    MARKET_CLOSE_TIME: '16:00',
    // Risk limits
    MAX_POSITION_SIZE_PERCENT: 0.1, // 10% max position size
    MAX_LEVERAGE: 5.0, // 5x maximum leverage
    MIN_RISK_TOLERANCE: 0.01, // 1% minimum risk tolerance
    MAX_RISK_TOLERANCE: 1.0, // 100% maximum risk tolerance
    // Performance thresholds
    MIN_SHARPE_RATIO: 0.5, // Minimum acceptable Sharpe ratio
    MAX_DRAWDOWN: 0.2, // 20% maximum drawdown
    MIN_WIN_RATE: 0.4, // 40% minimum win rate
    // Compliance thresholds
    MAX_DAILY_TRADES: 100, // Maximum daily trades
    MAX_CONCENTRATION: 0.3, // 30% maximum concentration
    AUDIT_RETENTION_DAYS: 2555, // 7 years audit retention
    // Technical analysis defaults
    DEFAULT_RSI_PERIOD: 14,
    DEFAULT_MACD_FAST: 12,
    DEFAULT_MACD_SLOW: 26,
    DEFAULT_BB_PERIOD: 20,
    DEFAULT_BB_STD_DEV: 2,
    // Options defaults
    DEFAULT_OPTIONS_DTE: 30, // Default days to expiration
    MIN_OPTIONS_DTE: 7, // Minimum days to expiration
    MAX_OPTIONS_DTE: 365, // Maximum days to expiration
    // Data retention
    TRADE_HISTORY_RETENTION_DAYS: 365,
    PERFORMANCE_HISTORY_RETENTION_DAYS: 1095, // 3 years
    AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years
};
// TradingSystemFactory and TradingSystemUtils already declared above
// Default export for backward compatibility
export default TradingSystemFactory;
//# sourceMappingURL=index.js.map