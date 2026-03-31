#!/usr/bin/env tsx
/**
 * Portfolio Optimization Engine using Modern Portfolio Theory
 *
 * Implements advanced portfolio optimization techniques:
 * - Markowitz mean-variance optimization
 * - Efficient frontier calculation
 * - Risk-adjusted return optimization
 * - Multiple asset classes support
 * - Rebalancing strategies
 * - Black-Litterman model integration
 * - Robust optimization with constraints
 */
import { MarketData, PortfolioAllocation } from './trading_engine';
export interface OptimizationConstraints {
    minWeight: number;
    maxWeight: number;
    maxTurnover: number;
    minDiversification: number;
    sectorLimits: Record<string, number>;
    leverageLimit: number;
    betaRange: [number, number];
}
export interface OptimizationResult {
    allocations: PortfolioAllocation[];
    expectedReturn: number;
    portfolioRisk: number;
    sharpeRatio: number;
    efficientFrontier: Array<{
        risk: number;
        return: number;
        weights: number[];
    }>;
    optimizationMethod: string;
    constraints: OptimizationConstraints;
    metadata: {
        convergenceTime: number;
        iterations: number;
        status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
        warnings: string[];
    };
}
export interface AssetReturns {
    symbol: string;
    returns: number[];
    expectedReturn: number;
    volatility: number;
    beta: number;
    sector: string;
    marketCap: number;
    liquidity: number;
}
export interface CorrelationMatrix {
    symbols: string[];
    matrix: number[][];
}
export declare class PortfolioOptimizer {
    private config;
    private goalieDir;
    private riskFreeRate;
    private lookbackPeriod;
    constructor(config: any);
    /**
     * Optimize portfolio allocation using multiple methods
     */
    optimize(marketDataList: MarketData[], config: any): Promise<PortfolioAllocation[]>;
    /**
     * Prepare asset returns data for optimization
     */
    private prepareAssetReturns;
    /**
     * Calculate correlation matrix between assets
     */
    private calculateCorrelationMatrix;
    /**
     * Calculate correlation between two return series
     */
    private calculateCorrelation;
    /**
     * Define optimization constraints
     */
    private defineConstraints;
    /**
     * Run multiple optimization methods
     */
    private runOptimizations;
    /**
     * Markowitz mean-variance optimization
     */
    private markowitzOptimization;
    /**
     * Maximum Sharpe ratio optimization
     */
    private maxSharpeOptimization;
    /**
     * Risk parity optimization
     */
    private riskParityOptimization;
    /**
     * Minimum variance optimization
     */
    private minVarianceOptimization;
    /**
     * Equal weight optimization (1/n portfolio)
     */
    private equalWeightOptimization;
    /**
     * Build covariance matrix from volatilities and correlations
     */
    private buildCovarianceMatrix;
    /**
     * Solve quadratic program for mean-variance optimization
     */
    private solveQuadraticProgram;
    /**
     * Solve for maximum Sharpe ratio weights
     */
    private solveMaxSharpeWeights;
    /**
     * Solve for risk parity weights
     */
    private solveRiskParityWeights;
    /**
     * Solve for minimum variance weights
     */
    private solveMinVarianceWeights;
    /**
     * Calculate efficient frontier
     */
    private calculateEfficientFrontier;
    /**
     * Solve for target return
     */
    private solveForTargetReturn;
    /**
     * Select best optimization result
     */
    private selectBestOptimization;
    /**
     * Convert optimization result to PortfolioAllocation format
     */
    private convertToPortfolioAllocation;
    /**
     * Get correlation vector for an asset
     */
    private getCorrelationVector;
    /**
     * Generate synthetic historical returns
     */
    private generateHistoricalReturns;
    /**
     * Generate normal random variable
     */
    private generateNormalRandom;
    /**
     * Calculate expected return from returns series
     */
    private calculateExpectedReturn;
    /**
     * Calculate volatility from returns series
     */
    private calculateVolatility;
    /**
     * Get sector for a symbol
     */
    private getSector;
    /**
     * Log optimization results
     */
    private logOptimizationResults;
}
export default PortfolioOptimizer;
//# sourceMappingURL=portfolio_optimizer.d.ts.map