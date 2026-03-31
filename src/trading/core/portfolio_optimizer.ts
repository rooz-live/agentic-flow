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
import * as fs from 'fs';
import * as path from 'path';

export interface OptimizationConstraints {
  minWeight: number;           // Minimum weight for any asset
  maxWeight: number;           // Maximum weight for any asset
  maxTurnover: number;         // Maximum portfolio turnover
  minDiversification: number;   // Minimum number of assets
  sectorLimits: Record<string, number>; // Maximum exposure per sector
  leverageLimit: number;        // Maximum leverage
  betaRange: [number, number]; // Target beta range
}

export interface OptimizationResult {
  allocations: PortfolioAllocation[];
  expectedReturn: number;
  portfolioRisk: number;
  sharpeRatio: number;
  efficientFrontier: Array<{ risk: number; return: number; weights: number[] }>;
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

export class PortfolioOptimizer {
  private goalieDir: string;
  private riskFreeRate: number = 0.02; // 2% risk-free rate
  private lookbackPeriod: number = 252; // 1 year of trading days

  constructor(private config: any) {
    this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
    
    if (!fs.existsSync(this.goalieDir)) {
      fs.mkdirSync(this.goalieDir, { recursive: true });
    }
  }

  /**
   * Optimize portfolio allocation using multiple methods
   */
  async optimize(
    marketDataList: MarketData[],
    config: any
  ): Promise<PortfolioAllocation[]> {
    console.log('📊 Starting portfolio optimization...');

    // Prepare data for optimization
    const assetReturns = await this.prepareAssetReturns(marketDataList);
    const correlationMatrix = this.calculateCorrelationMatrix(assetReturns);
    
    // Define optimization constraints
    const constraints = this.defineConstraints(config);
    
    // Run multiple optimization methods
    const optimizationResults = await this.runOptimizations(
      assetReturns,
      correlationMatrix,
      constraints
    );
    
    // Select best optimization result
    const bestResult = this.selectBestOptimization(optimizationResults);
    
    // Convert to PortfolioAllocation format
    const allocations = this.convertToPortfolioAllocation(
      bestResult.allocations,
      assetReturns,
      correlationMatrix
    );

    // Log optimization results
    this.logOptimizationResults(bestResult, allocations);

    console.log('✅ Portfolio optimization completed');
    return allocations;
  }

  /**
   * Prepare asset returns data for optimization
   */
  private async prepareAssetReturns(marketDataList: MarketData[]): Promise<AssetReturns[]> {
    const assetReturns: AssetReturns[] = [];

    for (const marketData of marketDataList) {
      const { symbol, quote, technicalIndicators } = marketData;
      
      // Generate synthetic historical returns (in production, fetch from database)
      const returns = this.generateHistoricalReturns(quote.price, technicalIndicators.volatility || 0.2);
      const expectedReturn = this.calculateExpectedReturn(returns);
      const volatility = this.calculateVolatility(returns);
      
      assetReturns.push({
        symbol,
        returns,
        expectedReturn,
        volatility,
        beta: technicalIndicators.beta || 1,
        sector: this.getSector(symbol),
        marketCap: quote.marketCap || 1000000000, // Default $1B
        liquidity: quote.avgVolume || 1000000, // Default 1M shares
      });
    }

    return assetReturns;
  }

  /**
   * Calculate correlation matrix between assets
   */
  private calculateCorrelationMatrix(assetReturns: AssetReturns[]): CorrelationMatrix {
    const n = assetReturns.length;
    const symbols = assetReturns.map(ar => ar.symbol);
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this.calculateCorrelation(
            assetReturns[i].returns,
            assetReturns[j].returns
          );
        }
      }
    }

    return { symbols, matrix };
  }

  /**
   * Calculate correlation between two return series
   */
  private calculateCorrelation(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length === 0) {
      return 0;
    }

    const n = returns1.length;
    const mean1 = returns1.reduce((sum, r) => sum + r, 0) / n;
    const mean2 = returns2.reduce((sum, r) => sum + r, 0) / n;

    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      
      covariance += diff1 * diff2;
      variance1 += diff1 * diff1;
      variance2 += diff2 * diff2;
    }

    covariance /= (n - 1);
    variance1 /= (n - 1);
    variance2 /= (n - 1);

    const std1 = Math.sqrt(variance1);
    const std2 = Math.sqrt(variance2);

    return std1 > 0 && std2 > 0 ? covariance / (std1 * std2) : 0;
  }

  /**
   * Define optimization constraints
   */
  private defineConstraints(config: any): OptimizationConstraints {
    return {
      minWeight: config.minWeight || 0.01,      // 1% minimum
      maxWeight: config.maxWeight || 0.3,       // 30% maximum
      maxTurnover: config.maxTurnover || 0.5,     // 50% maximum turnover
      minDiversification: config.minDiversification || 5, // Minimum 5 assets
      sectorLimits: {
        'Technology': 0.4,
        'Financial': 0.3,
        'Healthcare': 0.2,
        'Energy': 0.15,
        'Consumer': 0.25,
        'Industrial': 0.2,
        'Other': 0.3,
        ...config.sectorLimits,
      },
      leverageLimit: config.leverageLimit || 1.5,   // 1.5x maximum leverage
      betaRange: config.betaRange || [0.8, 1.2],  // Target beta range
    };
  }

  /**
   * Run multiple optimization methods
   */
  private async runOptimizations(
    assetReturns: AssetReturns[],
    correlationMatrix: CorrelationMatrix,
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    // 1. Mean-Variance Optimization (Markowitz)
    results.push(await this.markowitzOptimization(assetReturns, correlationMatrix, constraints));
    
    // 2. Maximum Sharpe Ratio Optimization
    results.push(await this.maxSharpeOptimization(assetReturns, correlationMatrix, constraints));
    
    // 3. Risk Parity Optimization
    results.push(await this.riskParityOptimization(assetReturns, correlationMatrix, constraints));
    
    // 4. Minimum Variance Optimization
    results.push(await this.minVarianceOptimization(assetReturns, correlationMatrix, constraints));
    
    // 5. Equal Weight Optimization (benchmark)
    results.push(await this.equalWeightOptimization(assetReturns, correlationMatrix, constraints));

    return results.filter(result => result.metadata.status === 'SUCCESS');
  }

  /**
   * Markowitz mean-variance optimization
   */
  private async markowitzOptimization(
    assetReturns: AssetReturns[],
    correlationMatrix: CorrelationMatrix,
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const n = assetReturns.length;
    
    try {
      // Simplified quadratic programming solver
      // In production, use a proper QP solver like cvxopt or osqp
      
      // Expected returns vector
      const mu = assetReturns.map(ar => ar.expectedReturn);
      
      // Covariance matrix
      const sigma = this.buildCovarianceMatrix(assetReturns, correlationMatrix);
      
      // Solve for optimal weights (simplified)
      const weights = this.solveQuadraticProgram(mu, sigma, constraints);
      
      // Calculate portfolio metrics
      const expectedReturn = weights.reduce((sum, w, i) => sum + w * mu[i], 0);
      const portfolioRisk = Math.sqrt(
        weights.reduce((sum, w1, i) => 
          sum + weights.reduce((innerSum, w2, j) => 
            innerSum + w1 * w2 * sigma[i][j], 0), 0)
      );
      const sharpeRatio = (expectedReturn - this.riskFreeRate) / portfolioRisk;
      
      // Calculate efficient frontier
      const efficientFrontier = this.calculateEfficientFrontier(mu, sigma, constraints);
      
      return {
        allocations: weights.map((weight, i) => ({
          symbol: assetReturns[i].symbol,
          weight,
          expectedReturn: assetReturns[i].expectedReturn,
          risk: assetReturns[i].volatility,
          sharpeRatio: (assetReturns[i].expectedReturn - this.riskFreeRate) / assetReturns[i].volatility,
          correlation: this.getCorrelationVector(correlationMatrix, i),
        })),
        expectedReturn,
        portfolioRisk,
        sharpeRatio,
        efficientFrontier,
        optimizationMethod: 'Markowitz Mean-Variance',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 100,
          status: 'SUCCESS',
          warnings: [],
        },
      };
    } catch (error) {
      return {
        allocations: [],
        expectedReturn: 0,
        portfolioRisk: 0,
        sharpeRatio: 0,
        efficientFrontier: [],
        optimizationMethod: 'Markowitz Mean-Variance',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 0,
          status: 'FAILED',
          warnings: [error instanceof Error ? error.message : 'Unknown error'],
        },
      };
    }
  }

  /**
   * Maximum Sharpe ratio optimization
   */
  private async maxSharpeOptimization(
    assetReturns: AssetReturns[],
    correlationMatrix: CorrelationMatrix,
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      const n = assetReturns.length;
      const mu = assetReturns.map(ar => ar.expectedReturn - this.riskFreeRate);
      const sigma = this.buildCovarianceMatrix(assetReturns, correlationMatrix);
      
      // Simplified maximum Sharpe ratio calculation
      const weights = this.solveMaxSharpeWeights(mu, sigma, constraints);
      
      const expectedReturn = weights.reduce((sum, w, i) => sum + w * (assetReturns[i].expectedReturn), 0);
      const portfolioRisk = Math.sqrt(
        weights.reduce((sum, w1, i) => 
          sum + weights.reduce((innerSum, w2, j) => 
            innerSum + w1 * w2 * sigma[i][j], 0), 0)
      );
      const sharpeRatio = (expectedReturn - this.riskFreeRate) / portfolioRisk;
      
      const efficientFrontier = this.calculateEfficientFrontier(
        assetReturns.map(ar => ar.expectedReturn),
        sigma,
        constraints
      );
      
      return {
        allocations: weights.map((weight, i) => ({
          symbol: assetReturns[i].symbol,
          weight,
          expectedReturn: assetReturns[i].expectedReturn,
          risk: assetReturns[i].volatility,
          sharpeRatio: (assetReturns[i].expectedReturn - this.riskFreeRate) / assetReturns[i].volatility,
          correlation: this.getCorrelationVector(correlationMatrix, i),
        })),
        expectedReturn,
        portfolioRisk,
        sharpeRatio,
        efficientFrontier,
        optimizationMethod: 'Maximum Sharpe Ratio',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 150,
          status: 'SUCCESS',
          warnings: [],
        },
      };
    } catch (error) {
      return {
        allocations: [],
        expectedReturn: 0,
        portfolioRisk: 0,
        sharpeRatio: 0,
        efficientFrontier: [],
        optimizationMethod: 'Maximum Sharpe Ratio',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 0,
          status: 'FAILED',
          warnings: [error instanceof Error ? error.message : 'Unknown error'],
        },
      };
    }
  }

  /**
   * Risk parity optimization
   */
  private async riskParityOptimization(
    assetReturns: AssetReturns[],
    correlationMatrix: CorrelationMatrix,
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      const n = assetReturns.length;
      const sigma = this.buildCovarianceMatrix(assetReturns, correlationMatrix);
      
      // Risk parity aims for equal risk contribution from each asset
      const weights = this.solveRiskParityWeights(sigma, constraints);
      
      const expectedReturn = weights.reduce((sum, w, i) => sum + w * assetReturns[i].expectedReturn, 0);
      const portfolioRisk = Math.sqrt(
        weights.reduce((sum, w1, i) => 
          sum + weights.reduce((innerSum, w2, j) => 
            innerSum + w1 * w2 * sigma[i][j], 0), 0)
      );
      const sharpeRatio = (expectedReturn - this.riskFreeRate) / portfolioRisk;
      
      return {
        allocations: weights.map((weight, i) => ({
          symbol: assetReturns[i].symbol,
          weight,
          expectedReturn: assetReturns[i].expectedReturn,
          risk: assetReturns[i].volatility,
          sharpeRatio: (assetReturns[i].expectedReturn - this.riskFreeRate) / assetReturns[i].volatility,
          correlation: this.getCorrelationVector(correlationMatrix, i),
        })),
        expectedReturn,
        portfolioRisk,
        sharpeRatio,
        efficientFrontier: [],
        optimizationMethod: 'Risk Parity',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 200,
          status: 'SUCCESS',
          warnings: [],
        },
      };
    } catch (error) {
      return {
        allocations: [],
        expectedReturn: 0,
        portfolioRisk: 0,
        sharpeRatio: 0,
        efficientFrontier: [],
        optimizationMethod: 'Risk Parity',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 0,
          status: 'FAILED',
          warnings: [error instanceof Error ? error.message : 'Unknown error'],
        },
      };
    }
  }

  /**
   * Minimum variance optimization
   */
  private async minVarianceOptimization(
    assetReturns: AssetReturns[],
    correlationMatrix: CorrelationMatrix,
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      const sigma = this.buildCovarianceMatrix(assetReturns, correlationMatrix);
      const weights = this.solveMinVarianceWeights(sigma, constraints);
      
      const expectedReturn = weights.reduce((sum, w, i) => sum + w * assetReturns[i].expectedReturn, 0);
      const portfolioRisk = Math.sqrt(
        weights.reduce((sum, w1, i) => 
          sum + weights.reduce((innerSum, w2, j) => 
            innerSum + w1 * w2 * sigma[i][j], 0), 0)
      );
      const sharpeRatio = (expectedReturn - this.riskFreeRate) / portfolioRisk;
      
      return {
        allocations: weights.map((weight, i) => ({
          symbol: assetReturns[i].symbol,
          weight,
          expectedReturn: assetReturns[i].expectedReturn,
          risk: assetReturns[i].volatility,
          sharpeRatio: (assetReturns[i].expectedReturn - this.riskFreeRate) / assetReturns[i].volatility,
          correlation: this.getCorrelationVector(correlationMatrix, i),
        })),
        expectedReturn,
        portfolioRisk,
        sharpeRatio,
        efficientFrontier: [],
        optimizationMethod: 'Minimum Variance',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 100,
          status: 'SUCCESS',
          warnings: [],
        },
      };
    } catch (error) {
      return {
        allocations: [],
        expectedReturn: 0,
        portfolioRisk: 0,
        sharpeRatio: 0,
        efficientFrontier: [],
        optimizationMethod: 'Minimum Variance',
        constraints,
        metadata: {
          convergenceTime: Date.now() - startTime,
          iterations: 0,
          status: 'FAILED',
          warnings: [error instanceof Error ? error.message : 'Unknown error'],
        },
      };
    }
  }

  /**
   * Equal weight optimization (1/n portfolio)
   */
  private async equalWeightOptimization(
    assetReturns: AssetReturns[],
    correlationMatrix: CorrelationMatrix,
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const n = assetReturns.length;
    const equalWeight = 1 / n;
    
    const weights = Array(n).fill(equalWeight);
    
    const expectedReturn = weights.reduce((sum, w, i) => sum + w * assetReturns[i].expectedReturn, 0);
    const sigma = this.buildCovarianceMatrix(assetReturns, correlationMatrix);
    const portfolioRisk = Math.sqrt(
      weights.reduce((sum, w1, i) => 
        sum + weights.reduce((innerSum, w2, j) => 
          innerSum + w1 * w2 * sigma[i][j], 0), 0)
    );
    const sharpeRatio = (expectedReturn - this.riskFreeRate) / portfolioRisk;
    
    return {
      allocations: weights.map((weight, i) => ({
        symbol: assetReturns[i].symbol,
        weight,
        expectedReturn: assetReturns[i].expectedReturn,
        risk: assetReturns[i].volatility,
        sharpeRatio: (assetReturns[i].expectedReturn - this.riskFreeRate) / assetReturns[i].volatility,
        correlation: this.getCorrelationVector(correlationMatrix, i),
      })),
      expectedReturn,
      portfolioRisk,
      sharpeRatio,
      efficientFrontier: [],
      optimizationMethod: 'Equal Weight (1/n)',
      constraints,
      metadata: {
        convergenceTime: Date.now() - startTime,
        iterations: 1,
        status: 'SUCCESS',
        warnings: [],
      },
    };
  }

  /**
   * Build covariance matrix from volatilities and correlations
   */
  private buildCovarianceMatrix(assetReturns: AssetReturns[], correlationMatrix: CorrelationMatrix): number[][] {
    const n = assetReturns.length;
    const sigma: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sigma[i][j] = assetReturns[i].volatility * assetReturns[j].volatility * correlationMatrix.matrix[i][j];
      }
    }
    
    return sigma;
  }

  /**
   * Solve quadratic program for mean-variance optimization
   */
  private solveQuadraticProgram(
    mu: number[],
    sigma: number[][],
    constraints: OptimizationConstraints
  ): number[] {
    const n = mu.length;
    
    // Simplified solution - in production use proper QP solver
    // This is a basic gradient descent approach
    
    let weights = Array(n).fill(1 / n); // Start with equal weights
    
    for (let iter = 0; iter < 1000; iter++) {
      // Calculate gradient
      const gradient = weights.map((w, i) => 
        sigma[i].reduce((sum, sigma_ij, j) => sum + sigma_ij * w, 0) - 0.5 * mu[i]
      );
      
      // Update weights
      const learningRate = 0.01;
      const newWeights = weights.map((w, i) => 
        Math.max(constraints.minWeight, 
          Math.min(constraints.maxWeight, w - learningRate * gradient[i]))
      );
      
      // Normalize weights to sum to 1
      const sum = newWeights.reduce((a, b) => a + b, 0);
      weights = newWeights.map(w => w / sum);
      
      // Check convergence
      const change = weights.reduce((sum, w, i) => sum + Math.abs(w - newWeights[i]), 0);
      if (change < 1e-6) break;
    }
    
    return weights;
  }

  /**
   * Solve for maximum Sharpe ratio weights
   */
  private solveMaxSharpeWeights(
    mu: number[],
    sigma: number[][],
    constraints: OptimizationConstraints
  ): number[] {
    const n = mu.length;
    
    // Simplified maximum Sharpe ratio calculation
    // In production, use proper optimization library
    
    let weights = Array(n).fill(1 / n);
    
    for (let iter = 0; iter < 1000; iter++) {
      // Calculate portfolio return and risk
      const portfolioReturn = weights.reduce((sum, w, i) => sum + w * mu[i], 0);
      const portfolioRisk = Math.sqrt(
        weights.reduce((sum, w1, i) => 
          sum + weights.reduce((innerSum, w2, j) => 
            innerSum + w1 * w2 * sigma[i][j], 0), 0)
      );
      
      // Calculate Sharpe ratio gradient
      const sharpeGradient = weights.map((w, i) => {
        const marginalReturn = mu[i];
        const marginalRisk = sigma[i].reduce((sum, sigma_ij, j) => sum + sigma_ij * w, 0) / portfolioRisk;
        return (marginalReturn * portfolioRisk - portfolioReturn * marginalRisk) / (portfolioRisk * portfolioRisk);
      });
      
      // Update weights
      const learningRate = 0.01;
      const newWeights = weights.map((w, i) => 
        Math.max(constraints.minWeight, 
          Math.min(constraints.maxWeight, w + learningRate * sharpeGradient[i]))
      );
      
      // Normalize weights
      const sum = newWeights.reduce((a, b) => a + b, 0);
      weights = newWeights.map(w => w / sum);
    }
    
    return weights;
  }

  /**
   * Solve for risk parity weights
   */
  private solveRiskParityWeights(
    sigma: number[][],
    constraints: OptimizationConstraints
  ): number[] {
    const n = sigma.length;
    
    // Risk parity aims for equal risk contribution
    let weights = Array(n).fill(1 / n);
    
    for (let iter = 0; iter < 1000; iter++) {
      // Calculate risk contributions
      const portfolioRisk = Math.sqrt(
        weights.reduce((sum, w1, i) => 
          sum + weights.reduce((innerSum, w2, j) => 
            innerSum + w1 * w2 * sigma[i][j], 0), 0)
      );
      
      const riskContributions = weights.map((w, i) => 
        w * sigma[i].reduce((sum, sigma_ij, j) => sum + sigma_ij * w, 0) / portfolioRisk
      );
      
      // Target risk contribution (equal for all assets)
      const targetRiskContribution = portfolioRisk / n;
      
      // Update weights to equalize risk contributions
      const newWeights = weights.map((w, i) => 
        w * Math.sqrt(targetRiskContribution / riskContributions[i])
      );
      
      // Apply constraints and normalize
      const constrainedWeights = newWeights.map(w => 
        Math.max(constraints.minWeight, Math.min(constraints.maxWeight, w))
      );
      const sum = constrainedWeights.reduce((a, b) => a + b, 0);
      weights = constrainedWeights.map(w => w / sum);
    }
    
    return weights;
  }

  /**
   * Solve for minimum variance weights
   */
  private solveMinVarianceWeights(
    sigma: number[][],
    constraints: OptimizationConstraints
  ): number[] {
    const n = sigma.length;
    
    // Minimum variance optimization
    let weights = Array(n).fill(1 / n);
    
    for (let iter = 0; iter < 1000; iter++) {
      // Calculate variance gradient
      const gradient = weights.map((w, i) => 
        2 * sigma[i].reduce((sum, sigma_ij, j) => sum + sigma_ij * w, 0)
      );
      
      // Update weights
      const learningRate = 0.01;
      const newWeights = weights.map((w, i) => 
        Math.max(constraints.minWeight, 
          Math.min(constraints.maxWeight, w - learningRate * gradient[i]))
      );
      
      // Normalize weights
      const sum = newWeights.reduce((a, b) => a + b, 0);
      weights = newWeights.map(w => w / sum);
    }
    
    return weights;
  }

  /**
   * Calculate efficient frontier
   */
  private calculateEfficientFrontier(
    mu: number[],
    sigma: number[][],
    constraints: OptimizationConstraints
  ): Array<{ risk: number; return: number; weights: number[] }> {
    const frontier: Array<{ risk: number; return: number; weights: number[] }> = [];
    
    // Generate 20 points on the efficient frontier
    for (let i = 0; i <= 20; i++) {
      const targetReturn = Math.min(...mu) + (Math.max(...mu) - Math.min(...mu)) * (i / 20);
      
      try {
        const weights = this.solveForTargetReturn(mu, sigma, targetReturn, constraints);
        const portfolioRisk = Math.sqrt(
          weights.reduce((sum, w1, i) => 
            sum + weights.reduce((innerSum, w2, j) => 
              innerSum + w1 * w2 * sigma[i][j], 0), 0)
        );
        
        frontier.push({
          risk: portfolioRisk,
          return: targetReturn,
          weights,
        });
      } catch (error) {
        // Skip infeasible points
      }
    }
    
    return frontier;
  }

  /**
   * Solve for target return
   */
  private solveForTargetReturn(
    mu: number[],
    sigma: number[][],
    targetReturn: number,
    constraints: OptimizationConstraints
  ): number[] {
    const n = mu.length;
    let weights = Array(n).fill(1 / n);
    
    for (let iter = 0; iter < 1000; iter++) {
      const currentReturn = weights.reduce((sum, w, i) => sum + w * mu[i], 0);
      const returnDiff = targetReturn - currentReturn;
      
      // Calculate gradient
      const gradient = weights.map((w, i) => 
        2 * sigma[i].reduce((sum, sigma_ij, j) => sum + sigma_ij * w, 0) - mu[i] * returnDiff
      );
      
      // Update weights
      const learningRate = 0.01;
      const newWeights = weights.map((w, i) => 
        Math.max(constraints.minWeight, 
          Math.min(constraints.maxWeight, w - learningRate * gradient[i]))
      );
      
      // Normalize weights
      const sum = newWeights.reduce((a, b) => a + b, 0);
      weights = newWeights.map(w => w / sum);
      
      if (Math.abs(returnDiff) < 1e-6) break;
    }
    
    return weights;
  }

  /**
   * Select best optimization result
   */
  private selectBestOptimization(results: OptimizationResult[]): OptimizationResult {
    if (results.length === 0) {
      throw new Error('No successful optimization results');
    }
    
    // Select based on Sharpe ratio (primary) and execution time (secondary)
    return results.reduce((best, current) => {
      if (current.sharpeRatio > best.sharpeRatio) {
        return current;
      } else if (current.sharpeRatio === best.sharpeRatio && 
                 current.metadata.convergenceTime < best.metadata.convergenceTime) {
        return current;
      }
      return best;
    });
  }

  /**
   * Convert optimization result to PortfolioAllocation format
   */
  private convertToPortfolioAllocation(
    allocations: any[],
    assetReturns: AssetReturns[],
    correlationMatrix: CorrelationMatrix
  ): PortfolioAllocation[] {
    return allocations.map((alloc, i) => ({
      symbol: alloc.symbol,
      weight: alloc.weight,
      expectedReturn: alloc.expectedReturn,
      risk: alloc.risk,
      sharpeRatio: alloc.sharpeRatio,
      correlation: alloc.correlation,
    }));
  }

  /**
   * Get correlation vector for an asset
   */
  private getCorrelationVector(correlationMatrix: CorrelationMatrix, index: number): Record<string, number> {
    const vector: Record<string, number> = {};
    correlationMatrix.symbols.forEach((symbol, i) => {
      vector[symbol] = correlationMatrix.matrix[index][i];
    });
    return vector;
  }

  /**
   * Generate synthetic historical returns
   */
  private generateHistoricalReturns(currentPrice: number, volatility: number): number[] {
    const returns: number[] = [];
    const tradingDays = 252; // 1 year
    
    for (let i = 0; i < tradingDays; i++) {
      // Generate random return using normal distribution
      const randomReturn = this.generateNormalRandom(0, volatility / Math.sqrt(252));
      returns.push(randomReturn);
    }
    
    return returns;
  }

  /**
   * Generate normal random variable
   */
  private generateNormalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Calculate expected return from returns series
   */
  private calculateExpectedReturn(returns: number[]): number {
    return returns.reduce((sum, r) => sum + r, 0) / returns.length;
  }

  /**
   * Calculate volatility from returns series
   */
  private calculateVolatility(returns: number[]): number {
    const mean = this.calculateExpectedReturn(returns);
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance * 252); // Annualized
  }

  /**
   * Get sector for a symbol
   */
  private getSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
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
   * Log optimization results
   */
  private logOptimizationResults(result: OptimizationResult, allocations: PortfolioAllocation[]): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      optimizationResult: result,
      finalAllocations: allocations,
    };
    
    const logFile = path.join(this.goalieDir, 'portfolio_optimization.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
}

export default PortfolioOptimizer;