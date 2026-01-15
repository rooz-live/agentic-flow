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
import { createFMPStableClient, StockQuote } from '../integrations/fmp_stable_client';
import { RiskManager } from './risk_manager';
import { PortfolioOptimizer } from './portfolio_optimizer';
import { MarketDataProcessor } from './market_data_processor';
import { OptionsStrategyEngine } from './options_strategy_engine';
import { PerformanceAnalytics } from './performance_analytics';
import { AlgorithmicTradingEngine } from './algorithmic_trading_engine';
import { ComplianceManager } from './compliance_manager';
import * as fs from 'fs';
import * as path from 'path';

export interface TradingSignal {
  id: string;
  symbol: string;
  strategy: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
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
  riskTolerance: number; // 0-1
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  strategies: string[];
  enableOptions: boolean;
  enableAlgorithmic: boolean;
  complianceLevel: 'conservative' | 'moderate' | 'aggressive';
}

export class TradingEngine extends EventEmitter {
  private fmpClient;
  private riskManager: RiskManager;
  private portfolioOptimizer: PortfolioOptimizer;
  private marketDataProcessor: MarketDataProcessor;
  private optionsEngine: OptionsStrategyEngine;
  private performanceAnalytics: PerformanceAnalytics;
  private algorithmicEngine: AlgorithmicTradingEngine;
  private complianceManager: ComplianceManager;
  private goalieDir: string;
  private config: TradingEngineConfig;
  private isRunning: boolean = false;
  private portfolio: Map<string, number> = new Map();
  private marketDataCache: Map<string, MarketData> = new Map();

  constructor(config: TradingEngineConfig) {
    super();
    this.config = config;
    this.fmpClient = createFMPStableClient(config.apiKey);
    this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');

    // Initialize components
    this.riskManager = new RiskManager(config);
    this.portfolioOptimizer = new PortfolioOptimizer(config);
    this.marketDataProcessor = new MarketDataProcessor(this.fmpClient);
    this.optionsEngine = new OptionsStrategyEngine(config);
    this.performanceAnalytics = new PerformanceAnalytics(this.goalieDir);
    this.algorithmicEngine = new AlgorithmicTradingEngine(config);
    // Map TradingEngineConfig to ComplianceConfig
    this.complianceManager = new ComplianceManager({
      accountType: 'MARGIN',
      riskTolerance: config.complianceLevel === 'conservative' ? 'CONSERVATIVE' :
                     config.complianceLevel === 'aggressive' ? 'AGGRESSIVE' : 'MODERATE',
      jurisdiction: 'US',
      autoBlockViolations: true,
      requireApprovalFor: ['LARGE_ORDERS'],
      reportingFrequency: 'REAL_TIME',
      auditRetention: 2555,
      dataEncryption: true,
      gdprCompliance: true,
      soxCompliance: true,
      miFIDCompliance: false,
    });

    if (!fs.existsSync(this.goalieDir)) {
      fs.mkdirSync(this.goalieDir, { recursive: true });
    }
  }

  /**
   * Start the trading engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Trading engine is already running');
    }

    console.log('🚀 Starting Financial Trading Analysis Engine...');
    this.isRunning = true;

    // Initialize market data streaming
    await this.marketDataProcessor.start();
    
    // Start algorithmic trading if enabled
    if (this.config.enableAlgorithmic) {
      await this.algorithmicEngine.start();
    }

    // Set up event handlers
    this.setupEventHandlers();

    // Emit pattern metric for engine start
    this.emitGovernanceMetric('trading_engine_started', {
      config: this.config,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Trading engine started successfully');
    this.emit('started');
  }

  /**
   * Stop the trading engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Financial Trading Analysis Engine...');
    this.isRunning = false;

    await this.marketDataProcessor.stop();
    await this.algorithmicEngine.stop();

    // Emit pattern metric for engine stop
    this.emitGovernanceMetric('trading_engine_stopped', {
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Trading engine stopped');
    this.emit('stopped');
  }

  /**
   * Analyze a symbol and generate trading signals
   */
  async analyzeSymbol(symbol: string): Promise<TradingSignal[]> {
    try {
      console.log(`🔍 Analyzing ${symbol}...`);

      // Get comprehensive market data
      const marketData = await this.marketDataProcessor.getComprehensiveData(symbol);
      this.marketDataCache.set(symbol, marketData);

      // Generate signals from multiple strategies
      const signals: TradingSignal[] = [];

      for (const strategy of this.config.strategies) {
        const signal = await this.generateStrategySignal(strategy, symbol, marketData);
        if (signal) {
          // Apply risk management
          const riskAdjustedSignal = await this.riskManager.adjustSignal(signal, marketData);
          
          // Check compliance
          const complianceResult = await this.complianceManager.validateSignal(riskAdjustedSignal);
          
          if (complianceResult.approved) {
            signals.push({
              ...riskAdjustedSignal,
              governance: {
                patternType: strategy,
                complianceScore: complianceResult.score,
                riskCategory: complianceResult.riskCategory,
              },
            });
          } else {
            console.log(`⚠️  Signal rejected by compliance: ${complianceResult.reason}`);
          }
        }
      }

      // Emit pattern metrics for analysis
      this.emitGovernanceMetric('symbol_analysis_completed', {
        symbol,
        signalsCount: signals.length,
        marketData: {
          price: marketData.quote.price,
          volume: marketData.quote.volume,
          change: marketData.quote.changesPercentage,
        },
      });

      return signals;
    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Optimize portfolio allocation
   */
  async optimizePortfolio(symbols: string[]): Promise<PortfolioAllocation[]> {
    try {
      console.log('📊 Optimizing portfolio allocation...');

      // Get market data for all symbols
      const marketDataList = await Promise.all(
        symbols.map(symbol => this.marketDataProcessor.getComprehensiveData(symbol))
      );

      // Calculate optimal allocation
      const allocation = await this.portfolioOptimizer.optimize(marketDataList, this.config);

      // Emit pattern metrics for optimization
      this.emitGovernanceMetric('portfolio_optimization_completed', {
        symbols,
        allocationCount: allocation.length,
        expectedReturn: allocation.reduce((sum, a) => sum + a.expectedReturn * a.weight, 0),
        portfolioRisk: this.calculatePortfolioRisk(allocation),
      });

      return allocation;
    } catch (error) {
      console.error('❌ Error optimizing portfolio:', error);
      throw error;
    }
  }

  /**
   * Execute a trading signal
   */
  async executeSignal(signal: TradingSignal): Promise<void> {
    try {
      console.log(`📈 Executing ${signal.action} signal for ${signal.symbol}`);

      // Check compliance before execution
      const complianceResult = await this.complianceManager.validateExecution(
        signal,
        signal.price,
        signal.quantity
      );
      if (!complianceResult.approved) {
        throw new Error(`Execution rejected by compliance: ${complianceResult.reason}`);
      }

      // Calculate position size based on risk management
      const marketData = this.marketDataCache.get(signal.symbol);
      if (!marketData) {
        throw new Error(`No market data available for ${signal.symbol}`);
      }
      const positionSize = this.riskManager.calculatePositionSize(signal, marketData);

      // Update portfolio (only for BUY/SELL, not HOLD)
      if (signal.action !== 'HOLD') {
        this.updatePortfolio(signal.symbol, signal.action, positionSize);
      }

      // Log execution
      this.logExecution(signal, positionSize);

      // Emit pattern metrics for execution
      this.emitGovernanceMetric('signal_executed', {
        signalId: signal.id,
        symbol: signal.symbol,
        action: signal.action,
        quantity: positionSize,
        price: signal.price,
        confidence: signal.confidence,
        riskCategory: signal.governance.riskCategory,
      });

      console.log(`✅ Executed ${signal.action} ${positionSize} shares of ${signal.symbol} at $${signal.price}`);
      this.emit('signal_executed', signal);
    } catch (error) {
      console.error(`❌ Error executing signal:`, error);
      throw error;
    }
  }

  /**
   * Get current portfolio status
   */
  getPortfolioStatus(): {
    positions: Record<string, number>;
    totalValue: number;
    riskMetrics: any;
    performance: any;
  } {
    const positions = Object.fromEntries(this.portfolio);
    const totalValue = this.calculatePortfolioValue(positions);
    const riskMetrics = this.riskManager.calculatePortfolioRisk(positions);
    const performance = this.performanceAnalytics.getCurrentPerformance();

    return {
      positions,
      totalValue,
      riskMetrics,
      performance,
    };
  }

  /**
   * Generate trading signal for a specific strategy
   */
  private async generateStrategySignal(
    strategy: string,
    symbol: string,
    marketData: MarketData
  ): Promise<TradingSignal | null> {
    switch (strategy) {
      case 'mean_reversion':
        return this.generateMeanReversionSignal(symbol, marketData);
      case 'momentum':
        return this.generateMomentumSignal(symbol, marketData);
      case 'replenishment':
        return this.generateReplenishmentSignal(symbol, marketData);
      case 'semiconductor_sector':
        return this.generateSemiconductorSignal(symbol, marketData);
      default:
        console.warn(`Unknown strategy: ${strategy}`);
        return null;
    }
  }

  /**
   * Generate mean reversion trading signal
   */
  private generateMeanReversionSignal(symbol: string, marketData: MarketData): TradingSignal | null {
    const { quote, technicalIndicators } = marketData;
    const rsi = technicalIndicators.rsi || 50;
    const bbUpper = technicalIndicators.bb_upper || quote.price * 1.02;
    const bbLower = technicalIndicators.bb_lower || quote.price * 0.98;

    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let reason: string;

    if (rsi < 30 && quote.price < bbLower) {
      action = 'BUY';
      confidence = Math.min((30 - rsi) / 20, 0.9);
      reason = 'Oversold conditions with price below lower Bollinger Band';
    } else if (rsi > 70 && quote.price > bbUpper) {
      action = 'SELL';
      confidence = Math.min((rsi - 70) / 20, 0.9);
      reason = 'Overbought conditions with price above upper Bollinger Band';
    } else {
      action = 'HOLD';
      confidence = 0.6;
      reason = 'Neutral mean reversion conditions';
    }

    return {
      id: `mr_${symbol}_${Date.now()}`,
      symbol,
      strategy: 'mean_reversion',
      action,
      confidence,
      price: quote.price,
      quantity: 0, // Will be calculated by risk manager
      timestamp: new Date().toISOString(),
      indicators: technicalIndicators,
      reason,
      riskMetrics: {
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
        riskRewardRatio: 0,
      },
      governance: {
        patternType: 'mean_reversion',
        complianceScore: 0.8,
        riskCategory: 'MEDIUM',
      },
    };
  }

  /**
   * Generate momentum trading signal
   */
  private generateMomentumSignal(symbol: string, marketData: MarketData): TradingSignal | null {
    const { quote, technicalIndicators } = marketData;
    const macd = technicalIndicators.macd || 0;
    const macdSignal = technicalIndicators.macdSignal || 0;
    const priceChange = quote.changesPercentage || 0;

    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let reason: string;

    if (macd > macdSignal && priceChange > 2) {
      action = 'BUY';
      confidence = Math.min((macd - macdSignal) / 0.1, 0.9);
      reason = 'Positive MACD crossover with strong price momentum';
    } else if (macd < macdSignal && priceChange < -2) {
      action = 'SELL';
      confidence = Math.min((macdSignal - macd) / 0.1, 0.9);
      reason = 'Negative MACD crossover with strong downward momentum';
    } else {
      action = 'HOLD';
      confidence = 0.6;
      reason = 'Neutral momentum conditions';
    }

    return {
      id: `mom_${symbol}_${Date.now()}`,
      symbol,
      strategy: 'momentum',
      action,
      confidence,
      price: quote.price,
      quantity: 0,
      timestamp: new Date().toISOString(),
      indicators: technicalIndicators,
      reason,
      riskMetrics: {
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
        riskRewardRatio: 0,
      },
      governance: {
        patternType: 'momentum',
        complianceScore: 0.75,
        riskCategory: 'MEDIUM',
      },
    };
  }

  /**
   * Generate replenishment trading signal
   */
  private generateReplenishmentSignal(symbol: string, marketData: MarketData): TradingSignal | null {
    const { quote, technicalIndicators } = marketData;
    const currentAllocation = this.portfolio.get(symbol) || 0;
    const targetAllocation = 0.1; // 10% target allocation per position

    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let reason: string;

    if (currentAllocation < targetAllocation * 0.8) {
      action = 'BUY';
      confidence = (targetAllocation - currentAllocation) / targetAllocation;
      reason = 'Replenishing underweight position';
    } else if (currentAllocation > targetAllocation * 1.2) {
      action = 'SELL';
      confidence = (currentAllocation - targetAllocation) / targetAllocation;
      reason = 'Reducing overweight position';
    } else {
      action = 'HOLD';
      confidence = 0.8;
      reason = 'Position within target allocation range';
    }

    return {
      id: `rep_${symbol}_${Date.now()}`,
      symbol,
      strategy: 'replenishment',
      action,
      confidence,
      price: quote.price,
      quantity: 0,
      timestamp: new Date().toISOString(),
      indicators: technicalIndicators,
      reason,
      riskMetrics: {
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
        riskRewardRatio: 0,
      },
      governance: {
        patternType: 'replenishment',
        complianceScore: 0.85,
        riskCategory: 'LOW',
      },
    };
  }

  /**
   * Generate semiconductor sector signal (SOXL/SOXS integration)
   */
  private generateSemiconductorSignal(symbol: string, marketData: MarketData): TradingSignal | null {
    if (!['SOXL', 'SOXS'].includes(symbol)) {
      return null;
    }

    const { quote, technicalIndicators } = marketData;
    const rsi = technicalIndicators.rsi || 50;
    const volumeRatio = technicalIndicators.volume_ratio || 1;

    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let reason: string;

    // SOXL (3x Bull) and SOXS (3x Bear) have inverse relationship
    if (symbol === 'SOXL') {
      if (rsi < 35 && volumeRatio > 1.2) {
        action = 'BUY';
        confidence = Math.min((35 - rsi) / 15, 0.9);
        reason = 'Semiconductor bullish setup with oversold RSI and high volume';
      } else if (rsi > 65) {
        action = 'SELL';
        confidence = Math.min((rsi - 65) / 15, 0.9);
        reason = 'Semiconductor overbought conditions';
      } else {
        action = 'HOLD';
        confidence = 0.6;
        reason = 'Neutral semiconductor conditions';
      }
    } else { // SOXS
      if (rsi < 35 && volumeRatio > 1.2) {
        action = 'BUY';
        confidence = Math.min((35 - rsi) / 15, 0.9);
        reason = 'Semiconductor bearish setup with oversold RSI and high volume';
      } else if (rsi > 65) {
        action = 'SELL';
        confidence = Math.min((rsi - 65) / 15, 0.9);
        reason = 'Semiconductor bearish overbought conditions';
      } else {
        action = 'HOLD';
        confidence = 0.6;
        reason = 'Neutral semiconductor conditions';
      }
    }

    return {
      id: `semi_${symbol}_${Date.now()}`,
      symbol,
      strategy: 'semiconductor_sector',
      action,
      confidence,
      price: quote.price,
      quantity: 0,
      timestamp: new Date().toISOString(),
      indicators: technicalIndicators,
      reason,
      riskMetrics: {
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
        riskRewardRatio: 0,
      },
      governance: {
        patternType: 'semiconductor_sector',
        complianceScore: 0.8,
        riskCategory: 'HIGH', // 3x leveraged ETFs are high risk
      },
    };
  }

  /**
   * Setup event handlers for component integration
   */
  private setupEventHandlers(): void {
    this.marketDataProcessor.on('data_updated', (symbol: string, data: MarketData) => {
      this.marketDataCache.set(symbol, data);
      this.emit('market_data_updated', { symbol, data });
    });

    this.algorithmicEngine.on('signal_generated', (signal: TradingSignal) => {
      this.emit('algorithmic_signal', signal);
    });

    this.riskManager.on('risk_alert', (alert: any) => {
      this.emit('risk_alert', alert);
      this.emitGovernanceMetric('risk_alert_triggered', alert);
    });
  }

  /**
   * Update portfolio positions
   */
  private updatePortfolio(symbol: string, action: 'BUY' | 'SELL', quantity: number): void {
    const currentQuantity = this.portfolio.get(symbol) || 0;
    
    if (action === 'BUY') {
      this.portfolio.set(symbol, currentQuantity + quantity);
    } else {
      this.portfolio.set(symbol, Math.max(0, currentQuantity - quantity));
    }
  }

  /**
   * Calculate portfolio value
   */
  private calculatePortfolioValue(positions: Record<string, number>): number {
    let totalValue = 0;
    
    for (const [symbol, quantity] of Object.entries(positions)) {
      const marketData = this.marketDataCache.get(symbol);
      if (marketData) {
        totalValue += quantity * marketData.quote.price;
      }
    }
    
    return totalValue;
  }

  /**
   * Calculate portfolio risk
   */
  private calculatePortfolioRisk(allocation: PortfolioAllocation[]): number {
    // Simplified portfolio risk calculation
    return Math.sqrt(
      allocation.reduce((sum, a) => sum + Math.pow(a.risk * a.weight, 2), 0)
    );
  }

  /**
   * Log trade execution
   */
  private logExecution(signal: TradingSignal, quantity: number): void {
    const executionLog = {
      timestamp: new Date().toISOString(),
      signalId: signal.id,
      symbol: signal.symbol,
      action: signal.action,
      quantity,
      price: signal.price,
      strategy: signal.strategy,
      confidence: signal.confidence,
      reason: signal.reason,
    };

    const logFile = path.join(this.goalieDir, 'trading_executions.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(executionLog) + '\n');
  }

  /**
   * Emit governance pattern metrics
   */
  private emitGovernanceMetric(patternType: string, data: any): void {
    try {
      const metricEntry = {
        ts: new Date().toISOString(),
        run: 'trading-engine',
        run_id: `trading-${Date.now()}`,
        iteration: 0,
        circle: 'analyst',
        depth: 1,
        pattern: patternType,
        'pattern:kebab-name': patternType.replace(/_/g, '-'),
        mode: 'advisory',
        mutation: false,
        gate: 'validation',
        framework: 'financial-trading-system',
        scheduler: '',
        tags: ['Trading', 'Financial', 'Risk', 'Compliance'],
        economic: {
          cod: 3.0,
          wsjf_score: 9.0,
        },
        reason: `trading-${patternType}`,
        metrics: data,
      };

      const metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');
      fs.appendFileSync(metricsFile, JSON.stringify(metricEntry) + '\n');
    } catch (err) {
      console.error('[TradingEngine] Failed to emit governance metric:', err);
    }
  }
}

export default TradingEngine;