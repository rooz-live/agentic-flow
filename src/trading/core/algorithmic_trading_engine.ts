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
import { FMPStableClient, StockQuote } from '../integrations/fmp_stable_client';
import * as fs from 'fs';
import * as path from 'path';

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
  equityCurve: Array<{ date: string; equity: number; drawdown: number }>;
  monthlyReturns: Array<{ month: string; return: number }>;
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
  train(data: Array<{ features: number[]; label: number }>): void;
  evaluate(testData: Array<{ features: number[]; label: number }>): {
    accuracy: number;
    precision: number;
    recall: number;
  };
}

export class AlgorithmicTradingEngine extends EventEmitter {
  private fmpClient: FMPStableClient;
  private goalieDir: string;
  private isRunning: boolean = false;
  private algorithms: Map<string, TradingAlgorithm> = new Map();
  private signalGenerators: Map<string, SignalGenerator> = new Map();
  private executionManager: ExecutionManager;
  private mlModels: Map<string, MLModel> = new Map();
  private historicalData: Map<string, MarketData[]> = new Map();
  private activeSignals: Map<string, TradingSignal> = new Map();

  constructor(fmpClient: FMPStableClient) {
    super();
    this.fmpClient = fmpClient;
    this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
    
    this.executionManager = new DefaultExecutionManager();
    
    if (!fs.existsSync(this.goalieDir)) {
      fs.mkdirSync(this.goalieDir, { recursive: true });
    }
  }

  /**
   * Start algorithmic trading engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Algorithmic trading engine is already running');
    }

    console.log('🚀 Starting Algorithmic Trading Engine...');
    this.isRunning = true;

    // Load historical data
    await this.loadHistoricalData();

    // Initialize algorithms
    await this.initializeAlgorithms();

    // Start signal generation loop
    this.startSignalGeneration();

    console.log('✅ Algorithmic Trading Engine started');
    this.emit('started');
  }

  /**
   * Stop algorithmic trading engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Algorithmic Trading Engine...');
    this.isRunning = false;

    console.log('✅ Algorithmic Trading Engine stopped');
    this.emit('stopped');
  }

  /**
   * Add a new trading algorithm
   */
  addAlgorithm(algorithm: TradingAlgorithm): void {
    this.algorithms.set(algorithm.id, algorithm);
    
    // Create signal generator based on algorithm type
    const generator = this.createSignalGenerator(algorithm);
    this.signalGenerators.set(algorithm.id, generator);
    
    console.log(`✅ Added algorithm: ${algorithm.name} (${algorithm.id})`);
    this.emit('algorithm_added', algorithm);
  }

  /**
   * Remove a trading algorithm
   */
  removeAlgorithm(algorithmId: string): void {
    this.algorithms.delete(algorithmId);
    this.signalGenerators.delete(algorithmId);
    
    console.log(`🗑️ Removed algorithm: ${algorithmId}`);
    this.emit('algorithm_removed', algorithmId);
  }

  /**
   * Run backtest for an algorithm
   */
  async runBacktest(
    algorithmId: string,
    symbol: string,
    startDate: string,
    endDate: string,
    initialCapital: number = 100000
  ): Promise<BacktestResult> {
    console.log(`📊 Running backtest for algorithm ${algorithmId} on ${symbol}...`);

    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) {
      throw new Error(`Algorithm ${algorithmId} not found`);
    }

    // Get historical data for backtest period
    const historicalData = await this.getHistoricalData(symbol, startDate, endDate);
    if (historicalData.length < 100) {
      throw new Error('Insufficient historical data for backtest');
    }

    const signalGenerator = this.signalGenerators.get(algorithmId);
    if (!signalGenerator) {
      throw new Error(`Signal generator for algorithm ${algorithmId} not found`);
    }

    // Run backtest simulation
    const result = await this.simulateBacktest(
      algorithm,
      signalGenerator,
      historicalData,
      initialCapital
    );

    // Update algorithm performance
    algorithm.performance = {
      totalReturn: result.totalReturn,
      sharpeRatio: result.sharpeRatio,
      maxDrawdown: result.maxDrawdown,
      winRate: result.winRate,
      profitFactor: result.profitFactor,
      totalTrades: result.totalTrades,
    };

    // Log backtest results
    this.logBacktestResult(result);

    console.log(`✅ Backtest completed for ${algorithmId}`);
    this.emit('backtest_completed', result);

    return result;
  }

  /**
   * Optimize algorithm parameters
   */
  async optimizeParameters(
    algorithmId: string,
    symbol: string,
    parameterRanges: Record<string, [number, number]>,
    optimizationMetric: 'sharpe' | 'return' | 'winrate' = 'sharpe'
  ): Promise<Record<string, number>> {
    console.log(`🔧 Optimizing parameters for algorithm ${algorithmId}...`);

    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) {
      throw new Error(`Algorithm ${algorithmId} not found`);
    }

    const signalGenerator = this.signalGenerators.get(algorithmId);
    if (!signalGenerator) {
      throw new Error(`Signal generator for algorithm ${algorithmId} not found`);
    }

    // Generate parameter combinations
    const parameterCombinations = this.generateParameterCombinations(parameterRanges);
    let bestParameters = algorithm.parameters;
    let bestScore = -Infinity;

    // Test each parameter combination
    for (const parameters of parameterCombinations) {
      // Update signal generator parameters
      signalGenerator.updateParameters(parameters);

      // Run backtest with these parameters
      const backtestResult = await this.runBacktest(
        algorithmId,
        symbol,
        '2023-01-01',
        '2023-12-31',
        100000
      );

      // Calculate optimization score
      let score: number;
      switch (optimizationMetric) {
        case 'sharpe':
          score = backtestResult.sharpeRatio;
          break;
        case 'return':
          score = backtestResult.annualizedReturn;
          break;
        case 'winrate':
          score = backtestResult.winRate;
          break;
        default:
          score = backtestResult.sharpeRatio;
      }

      if (score > bestScore) {
        bestScore = score;
        bestParameters = { ...parameters };
      }
    }

    // Update algorithm with best parameters
    algorithm.parameters = bestParameters;
    signalGenerator.updateParameters(bestParameters);

    console.log(`✅ Parameter optimization completed. Best score: ${bestScore.toFixed(3)}`);
    this.emit('parameters_optimized', algorithmId, bestParameters, bestScore);

    return bestParameters;
  }

  /**
   * Create signal generator based on algorithm type
   */
  private createSignalGenerator(algorithm: TradingAlgorithm): SignalGenerator {
    switch (algorithm.type) {
      case 'MOMENTUM':
        return new MomentumSignalGenerator(algorithm.parameters);
      case 'MEAN_REVERSION':
        return new MeanReversionSignalGenerator(algorithm.parameters);
      case 'ARBITRAGE':
        return new ArbitrageSignalGenerator(algorithm.parameters);
      case 'ML_PREDICTION':
        return new MLPredictionSignalGenerator(algorithm.parameters);
      case 'STATISTICAL':
        return new StatisticalSignalGenerator(algorithm.parameters);
      case 'BREAKOUT':
        return new BreakoutSignalGenerator(algorithm.parameters);
      default:
        throw new Error(`Unknown algorithm type: ${algorithm.type}`);
    }
  }

  /**
   * Simulate backtest
   */
  private async simulateBacktest(
    algorithm: TradingAlgorithm,
    signalGenerator: SignalGenerator,
    historicalData: MarketData[],
    initialCapital: number
  ): Promise<BacktestResult> {
    let capital = initialCapital;
    let position: { symbol: string; quantity: number; entryPrice: number } | null = null;
    const trades: BacktestTrade[] = [];
    const equityCurve: Array<{ date: string; equity: number; drawdown: number }> = [];
    let peak = initialCapital;
    let maxDrawdown = 0;

    // Process each day
    for (let i = 50; i < historicalData.length; i++) { // Start after enough data
      const currentData = historicalData[i];
      const lookbackData = historicalData.slice(0, i);

      // Generate signals
      const signals = await signalGenerator.generateSignals(lookbackData);
      
      // Process signals
      for (const signal of signals) {
        if (!signalGenerator.validateSignal(signal, currentData)) {
          continue;
        }

        const commission = this.executionManager.getCommission(
          signal.symbol,
          signal.quantity,
          signal.price
        );
        const slippage = this.executionManager.getSlippage(
          signal.symbol,
          signal.quantity,
          signal.price
        );

        if (signal.action === 'BUY' && !position) {
          // Enter long position
          const cost = signal.quantity * signal.price + commission;
          if (cost <= capital) {
            position = {
              symbol: signal.symbol,
              quantity: signal.quantity,
              entryPrice: signal.price + slippage,
            };
            capital -= cost;
          }
        } else if (signal.action === 'SELL' && position) {
          // Exit position
          const proceeds = position.quantity * signal.price - commission;
          const exitPrice = signal.price - slippage;
          const pnl = position.quantity * (exitPrice - position.entryPrice) - commission * 2;
          const pnlPercent = (exitPrice - position.entryPrice) / position.entryPrice;

          const trade: BacktestTrade = {
            id: `trade_${Date.now()}_${Math.random()}`,
            symbol: position.symbol,
            action: 'SELL',
            entryDate: historicalData[i - 1].quote.timestamp,
            exitDate: currentData.quote.timestamp,
            entryPrice: position.entryPrice,
            exitPrice,
            quantity: position.quantity,
            commission: commission * 2,
            slippage,
            pnl,
            pnlPercent,
            duration: i - this.findEntryIndex(historicalData, position.entryPrice),
            exitReason: 'SIGNAL',
            algorithmId: algorithm.id,
          };

          trades.push(trade);
          capital += proceeds;
          position = null;
        }
      }

      // Update equity curve
      let currentEquity = capital;
      if (position) {
        currentEquity += position.quantity * currentData.quote.price;
      }

      if (currentEquity > peak) {
        peak = currentEquity;
      }
      const drawdown = (peak - currentEquity) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      equityCurve.push({
        date: currentData.quote.timestamp,
        equity: currentEquity,
        drawdown,
      });
    }

    // Calculate final metrics
    const finalCapital = capital;
    const totalReturn = (finalCapital - initialCapital) / initialCapital;
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / historicalData.length) - 1;

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const profitFactor = losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) > 0 ?
      winningTrades.reduce((sum, t) => sum + t.pnl, 0) / 
      losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) : 0;

    const returns = equityCurve.map((point, i) => 
      i > 0 ? (point.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity : 0
    );
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortinoRatio = this.calculateSortinoRatio(returns);

    return {
      algorithmId: algorithm.id,
      symbol: historicalData[0].symbol,
      startDate: historicalData[0].quote.timestamp,
      endDate: historicalData[historicalData.length - 1].quote.timestamp,
      initialCapital,
      finalCapital,
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio,
      winRate,
      profitFactor,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageWin: winningTrades.length > 0 ? 
        winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? 
        losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? 
        Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? 
        Math.min(...losingTrades.map(t => t.pnl)) : 0,
      averageTradeDuration: trades.length > 0 ? 
        trades.reduce((sum, t) => sum + t.duration, 0) / trades.length : 0,
      trades,
      equityCurve,
      monthlyReturns: this.calculateMonthlyReturns(equityCurve),
      riskMetrics: {
        valueAtRisk: this.calculateVaR(returns, 0.05),
        conditionalVaR: this.calculateCVaR(returns, 0.05),
        volatility: this.calculateVolatility(returns),
        beta: 1.0, // Would need market data for proper calculation
      },
    };
  }

  /**
   * Generate parameter combinations for optimization
   */
  private generateParameterCombinations(ranges: Record<string, [number, number]>): Record<string, number>[] {
    const parameters: Record<string, number>[] = [];
    const keys = Object.keys(ranges);
    
    // Simple grid search - in production use more sophisticated optimization
    const steps = 5; // Test 5 values per parameter
    
    const generateCombinations = (index: number, current: Record<string, number>) => {
      if (index >= keys.length) {
        parameters.push({ ...current });
        return;
      }
      
      const key = keys[index];
      const [min, max] = ranges[key];
      const step = (max - min) / (steps - 1);
      
      for (let i = 0; i < steps; i++) {
        current[key] = min + step * i;
        generateCombinations(index + 1, current);
      }
    };
    
    generateCombinations(0, {});
    return parameters;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const riskFreeRate = 0.02; // 2% annual risk-free rate
    
    return stdDev > 0 ? (mean * 252 - riskFreeRate) / (stdDev * Math.sqrt(252)) : 0;
  }

  /**
   * Calculate Sortino ratio
   */
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downsideReturns = returns.filter(r => r < 0);
    
    if (downsideReturns.length === 0) return mean > 0 ? Infinity : 0;
    
    const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const riskFreeRate = 0.02;
    
    return downsideDeviation > 0 ? (mean * 252 - riskFreeRate) / (downsideDeviation * Math.sqrt(252)) : 0;
  }

  /**
   * Calculate Value at Risk
   */
  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    return Math.abs(sortedReturns[index] || 0);
  }

  /**
   * Calculate Conditional Value at Risk
   */
  private calculateCVaR(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    const tailReturns = sortedReturns.slice(0, index);
    
    if (tailReturns.length === 0) return 0;
    return Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length);
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(equityCurve: Array<{ date: string; equity: number }>): Array<{ month: string; return: number }> {
    const monthlyReturns: Array<{ month: string; return: number }> = [];
    
    for (let i = 1; i < equityCurve.length; i++) {
      const currentDate = new Date(equityCurve[i].date);
      const previousDate = new Date(equityCurve[i - 1].date);
      
      if (currentDate.getMonth() !== previousDate.getMonth()) {
        const monthlyReturn = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
        monthlyReturns.push({
          month: currentDate.toISOString().substring(0, 7),
          return: monthlyReturn,
        });
      }
    }
    
    return monthlyReturns;
  }

  /**
   * Find entry index in historical data
   */
  private findEntryIndex(historicalData: MarketData[], entryPrice: number): number {
    for (let i = 0; i < historicalData.length; i++) {
      if (Math.abs(historicalData[i].quote.price - entryPrice) < 0.01) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Load historical data
   */
  private async loadHistoricalData(): Promise<void> {
    // In production, load from database or API
    console.log('📊 Loading historical data...');
    
    // For now, generate synthetic data
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'SOXL', 'SOXS'];
    
    for (const symbol of symbols) {
      const data = await this.generateSyntheticHistoricalData(symbol);
      this.historicalData.set(symbol, data);
    }
    
    console.log('✅ Historical data loaded');
  }

  /**
   * Generate synthetic historical data for testing
   */
  private async generateSyntheticHistoricalData(symbol: string): Promise<MarketData[]> {
    const data: MarketData[] = [];
    let price = 100 + Math.random() * 50;
    const days = 365;
    
    for (let i = 0; i < days; i++) {
      // Random walk with trend
      const trend = 0.0005; // Slight upward trend
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility + trend;
      price *= (1 + change);
      
      const quote: StockQuote = {
        symbol,
        name: symbol,
        price,
        changesPercentage: change * 100,
        change: price * change,
        dayLow: price * (1 - Math.random() * 0.01),
        dayHigh: price * (1 + Math.random() * 0.01),
        yearHigh: price * 1.2,
        yearLow: price * 0.8,
        marketCap: price * 1000000000,
        priceAvg50: price * 0.98,
        priceAvg200: price * 0.95,
        volume: 1000000 + Math.random() * 500000,
        avgVolume: 1000000,
        timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      const technicalIndicators = {
        sma5: price * 0.998,
        sma20: price * 0.995,
        sma50: price * 0.99,
        rsi: 45 + Math.random() * 10,
        macd: price * 0.001,
        volatility: 0.25,
        volume_ratio: 0.8 + Math.random() * 0.4,
      };
      
      data.push({
        symbol,
        quote,
        technicalIndicators,
        sentiment: {
          score: 0.5 + (Math.random() - 0.5) * 0.2,
          sources: ['news'],
          timestamp: quote.timestamp,
        },
        economicIndicators: {},
      });
    }
    
    return data;
  }

  /**
   * Get historical data for a symbol
   */
  private async getHistoricalData(symbol: string, startDate: string, endDate: string): Promise<MarketData[]> {
    const data = this.historicalData.get(symbol) || [];
    
    // Filter by date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return data.filter(d => {
      const date = new Date(d.quote.timestamp);
      return date >= start && date <= end;
    });
  }

  /**
   * Initialize default algorithms
   */
  private async initializeAlgorithms(): Promise<void> {
    console.log('🔧 Initializing default algorithms...');

    // Momentum algorithm
    this.addAlgorithm({
      id: 'momentum_1',
      name: 'RSI Momentum',
      type: 'MOMENTUM',
      parameters: {
        rsiPeriod: 14,
        rsiOversold: 30,
        rsiOverbought: 70,
        volumeThreshold: 1.5,
      },
      performance: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0,
      },
      isActive: true,
      lastUpdated: new Date().toISOString(),
    });

    // Mean reversion algorithm
    this.addAlgorithm({
      id: 'mean_rev_1',
      name: 'Bollinger Mean Reversion',
      type: 'MEAN_REVERSION',
      parameters: {
        bbPeriod: 20,
        bbStdDev: 2,
        rsiPeriod: 14,
        rsiThreshold: 50,
      },
      performance: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0,
      },
      isActive: true,
      lastUpdated: new Date().toISOString(),
    });

    console.log('✅ Default algorithms initialized');
  }

  /**
   * Start signal generation loop
   */
  private startSignalGeneration(): void {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        // Generate signals for all active algorithms
        for (const [algorithmId, algorithm] of this.algorithms) {
          if (!algorithm.isActive) continue;

          const signalGenerator = this.signalGenerators.get(algorithmId);
          if (!signalGenerator) continue;

          // Get recent data
          const symbols = ['AAPL', 'MSFT', 'GOOGL']; // Would be configurable
          
          for (const symbol of symbols) {
            const historicalData = this.historicalData.get(symbol) || [];
            if (historicalData.length < 50) continue;

            const signals = await signalGenerator.generateSignals(historicalData);
            
            for (const signal of signals) {
              // Validate signal
              const currentData = historicalData[historicalData.length - 1];
              if (signalGenerator.validateSignal(signal, currentData)) {
                this.emit('signal_generated', signal);
                
                // Execute signal if configured
                // const result = await this.executionManager.executeSignal(signal);
                // this.emit('signal_executed', signal, result);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in signal generation loop:', error);
      }
    }, 60000); // Run every minute
  }

  /**
   * Log backtest result
   */
  private logBacktestResult(result: BacktestResult): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      backtestResult: result,
    };
    
    const logFile = path.join(this.goalieDir, 'backtest_results.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
}

/**
 * Default execution manager implementation
 */
class DefaultExecutionManager implements ExecutionManager {
  async executeSignal(signal: TradingSignal): Promise<ExecutionResult> {
    // Simulate execution
    const slippage = this.getSlippage(signal.symbol, signal.quantity, signal.price);
    const commission = this.getCommission(signal.symbol, signal.quantity, signal.price);
    
    return {
      success: true,
      orderId: `order_${Date.now()}_${Math.random()}`,
      executedPrice: signal.price + slippage,
      executedQuantity: signal.quantity,
      commission,
      slippage,
      timestamp: new Date().toISOString(),
    };
  }

  getSlippage(symbol: string, quantity: number, price: number): number {
    // Simplified slippage model
    const volume = 1000000; // Would get from market data
    const volumeRatio = quantity / volume;
    
    if (volumeRatio > 0.01) {
      return price * 0.001; // 0.1% slippage for large orders
    } else {
      return price * 0.0005; // 0.05% slippage for small orders
    }
  }

  getCommission(symbol: string, quantity: number, price: number): number {
    // Simplified commission model
    const notional = quantity * price;
    return Math.max(1, notional * 0.001); // 0.1% commission, $1 minimum
  }
}

/**
 * Signal generator implementations
 */
class MomentumSignalGenerator implements SignalGenerator {
  constructor(private parameters: Record<string, any>) {}

  async generateSignals(marketData: MarketData[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];
    const current = marketData[marketData.length - 1];
    const rsi = current.technicalIndicators.rsi;
    const volumeRatio = current.technicalIndicators.volume_ratio;

    if (rsi < this.parameters.rsiOversold && volumeRatio > this.parameters.volumeThreshold) {
      signals.push({
        id: `momentum_buy_${Date.now()}`,
        symbol: current.symbol,
        strategy: 'momentum',
        action: 'BUY',
        confidence: (this.parameters.rsiOversold - rsi) / this.parameters.rsiOversold,
        price: current.quote.price,
        quantity: 100,
        timestamp: current.quote.timestamp,
        indicators: current.technicalIndicators,
        reason: 'RSI oversold with high volume',
        riskMetrics: {
          stopLoss: 0,
          takeProfit: 0,
          positionSize: 0,
          riskRewardRatio: 0,
        },
        governance: {
          patternType: 'momentum',
          complianceScore: 0.8,
          riskCategory: 'MEDIUM',
        },
      });
    } else if (rsi > this.parameters.rsiOverbought && volumeRatio > this.parameters.volumeThreshold) {
      signals.push({
        id: `momentum_sell_${Date.now()}`,
        symbol: current.symbol,
        strategy: 'momentum',
        action: 'SELL',
        confidence: (rsi - this.parameters.rsiOverbought) / (100 - this.parameters.rsiOverbought),
        price: current.quote.price,
        quantity: 100,
        timestamp: current.quote.timestamp,
        indicators: current.technicalIndicators,
        reason: 'RSI overbought with high volume',
        riskMetrics: {
          stopLoss: 0,
          takeProfit: 0,
          positionSize: 0,
          riskRewardRatio: 0,
        },
        governance: {
          patternType: 'momentum',
          complianceScore: 0.8,
          riskCategory: 'MEDIUM',
        },
      });
    }

    return signals;
  }

  validateSignal(signal: TradingSignal, marketData: MarketData): boolean {
    return signal.confidence > 0.6;
  }

  getParameters(): Record<string, any> {
    return { ...this.parameters };
  }

  updateParameters(parameters: Record<string, any>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }
}

class MeanReversionSignalGenerator implements SignalGenerator {
  constructor(private parameters: Record<string, any>) {}

  async generateSignals(marketData: MarketData[]): Promise<TradingSignal[]> {
    // Implementation similar to MomentumSignalGenerator but for mean reversion
    return [];
  }

  validateSignal(signal: TradingSignal, marketData: MarketData): boolean {
    return true;
  }

  getParameters(): Record<string, any> {
    return { ...this.parameters };
  }

  updateParameters(parameters: Record<string, any>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }
}

// Placeholder implementations for other signal generators
class ArbitrageSignalGenerator implements SignalGenerator {
  constructor(private parameters: Record<string, any>) {}
  async generateSignals(marketData: MarketData[]): Promise<TradingSignal[]> { return []; }
  validateSignal(signal: TradingSignal, marketData: MarketData): boolean { return true; }
  getParameters(): Record<string, any> { return {}; }
  updateParameters(parameters: Record<string, any>): void {}
}

class MLPredictionSignalGenerator implements SignalGenerator {
  constructor(private parameters: Record<string, any>) {}
  async generateSignals(marketData: MarketData[]): Promise<TradingSignal[]> { return []; }
  validateSignal(signal: TradingSignal, marketData: MarketData): boolean { return true; }
  getParameters(): Record<string, any> { return {}; }
  updateParameters(parameters: Record<string, any>): void {}
}

class StatisticalSignalGenerator implements SignalGenerator {
  constructor(private parameters: Record<string, any>) {}
  async generateSignals(marketData: MarketData[]): Promise<TradingSignal[]> { return []; }
  validateSignal(signal: TradingSignal, marketData: MarketData): boolean { return true; }
  getParameters(): Record<string, any> { return {}; }
  updateParameters(parameters: Record<string, any>): void {}
}

class BreakoutSignalGenerator implements SignalGenerator {
  constructor(private parameters: Record<string, any>) {}
  async generateSignals(marketData: MarketData[]): Promise<TradingSignal[]> { return []; }
  validateSignal(signal: TradingSignal, marketData: MarketData): boolean { return true; }
  getParameters(): Record<string, any> { return {}; }
  updateParameters(parameters: Record<string, any>): void {}
}

export default AlgorithmicTradingEngine;