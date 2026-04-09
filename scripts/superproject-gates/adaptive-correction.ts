/**
 * Adaptive Correction Module
 *
 * Implements adaptive error correction that adjusts strategies
 * based on observed error rates and patterns
 */

import { EventEmitter } from 'events';
import {
  ErrorCorrectionStrategy,
  ErrorRateStats,
  RedundancyConfig,
  ErrorCorrectionResult
} from './types';

/**
 * Adaptive correction configuration
 */
export interface AdaptiveCorrectionConfig {
  enabled: boolean;
  errorRateWindow: number; // seconds
  strategyThresholds: Map<ErrorCorrectionStrategy, number>;
  defaultStrategy: ErrorCorrectionStrategy;
  learningEnabled: boolean;
  adaptationInterval: number; // seconds
}

/**
 * Strategy performance metrics
 */
export interface StrategyPerformance {
  strategy: ErrorCorrectionStrategy;
  totalAttempts: number;
  successfulCorrections: number;
  averageConfidence: number;
  averageTime: number; // milliseconds
  lastUsed: Date;
}

/**
 * Adaptive Correction System
 * Dynamically adjusts error correction strategies based on performance
 */
export class AdaptiveCorrectionSystem extends EventEmitter {
  private config: AdaptiveCorrectionConfig;
  private performanceMetrics: Map<string, StrategyPerformance> = new Map();
  private errorRateHistory: Map<string, ErrorRateStats[]> = new Map();
  private strategyRecommendations: Map<string, ErrorCorrectionStrategy> = new Map();
  private adaptationTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AdaptiveCorrectionConfig> = {}) {
    super();
    
    this.config = {
      enabled: config.enabled ?? true,
      errorRateWindow: config.errorRateWindow ?? 300, // 5 minutes
      strategyThresholds: config.strategyThresholds ?? new Map([
        ['parity-check', 0.1],
        ['majority-voting', 0.2],
        ['consensus', 0.3],
        ['adaptive', 0.5],
        ['hybrid', 0.4]
      ]),
      defaultStrategy: config.defaultStrategy ?? 'majority-voting',
      learningEnabled: config.learningEnabled ?? true,
      adaptationInterval: config.adaptationInterval ?? 60 // 1 minute
    };

    if (this.config.enabled) {
      this.startAdaptation();
    }
  }

  /**
   * Get recommended strategy for a metric
   */
  public getRecommendedStrategy(metricId: string): ErrorCorrectionStrategy {
    // Check if we have a cached recommendation
    if (this.strategyRecommendations.has(metricId)) {
      return this.strategyRecommendations.get(metricId)!;
    }

    // Analyze error rate and recommend strategy
    const errorRate = this.getCurrentErrorRate(metricId);
    return this.recommendStrategyByErrorRate(errorRate);
  }

  /**
   * Recommend strategy based on error rate
   */
  private recommendStrategyByErrorRate(errorRate: number): ErrorCorrectionStrategy {
    const thresholds = this.config.strategyThresholds;

    // Find the most appropriate strategy for the error rate
    if (errorRate < thresholds.get('parity-check')!) {
      return 'parity-check';
    } else if (errorRate < thresholds.get('majority-voting')!) {
      return 'majority-voting';
    } else if (errorRate < thresholds.get('consensus')!) {
      return 'consensus';
    } else if (errorRate < thresholds.get('hybrid')!) {
      return 'hybrid';
    } else {
      return 'adaptive';
    }
  }

  /**
   * Record error correction result for learning
   */
  public recordCorrectionResult(
    metricId: string,
    result: ErrorCorrectionResult
  ): void {
    if (!this.config.learningEnabled) {
      return;
    }

    const strategy = result.strategy;
    const key = `${metricId}:${strategy}`;

    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, {
        strategy,
        totalAttempts: 0,
        successfulCorrections: 0,
        averageConfidence: 0,
        averageTime: 0,
        lastUsed: new Date()
      });
    }

    const metrics = this.performanceMetrics.get(key)!;
    metrics.totalAttempts++;
    metrics.lastUsed = new Date();

    if (result.success) {
      metrics.successfulCorrections++;
    }

    // Update average confidence (exponential moving average)
    const alpha = 0.3;
    metrics.averageConfidence = 
      alpha * result.confidence + 
      (1 - alpha) * metrics.averageConfidence;

    // Update recommendation based on performance
    this.updateStrategyRecommendation(metricId);

    this.emit('resultRecorded', {
      metricId,
      result,
      performance: metrics,
      timestamp: new Date()
    });
  }

  /**
   * Update strategy recommendation based on performance
   */
  private updateStrategyRecommendation(metricId: string): void {
    const strategies: ErrorCorrectionStrategy[] = [
      'parity-check',
      'majority-voting',
      'consensus',
      'hybrid',
      'adaptive'
    ];

    let bestStrategy = this.config.defaultStrategy;
    let bestScore = -1;

    strategies.forEach(strategy => {
      const key = `${metricId}:${strategy}`;
      const metrics = this.performanceMetrics.get(key);

      if (metrics && metrics.totalAttempts >= 3) {
        // Calculate score: success rate * confidence
        const successRate = metrics.successfulCorrections / metrics.totalAttempts;
        const score = successRate * metrics.averageConfidence;

        if (score > bestScore) {
          bestScore = score;
          bestStrategy = strategy;
        }
      }
    });

    this.strategyRecommendations.set(metricId, bestStrategy);
  }

  /**
   * Get current error rate for a metric
   */
  private getCurrentErrorRate(metricId: string): number {
    const history = this.errorRateHistory.get(metricId);
    
    if (!history || history.length === 0) {
      return 0;
    }

    // Get most recent stats
    return history[history.length - 1].errorRate;
  }

  /**
   * Record error rate statistics
   */
  public recordErrorRate(stats: ErrorRateStats): void {
    const metricId = stats.metricId;
    
    if (!this.errorRateHistory.has(metricId)) {
      this.errorRateHistory.set(metricId, []);
    }

    const history = this.errorRateHistory.get(metricId)!;
    history.push(stats);

    // Keep only recent stats within window
    const cutoffTime = Date.now() - (this.config.errorRateWindow * 1000);
    const recentStats = history.filter(s => 
      s.windowEnd.getTime() >= cutoffTime
    );
    
    this.errorRateHistory.set(metricId, recentStats);

    // Update recommendation based on new error rate
    this.updateStrategyRecommendation(metricId);

    this.emit('errorRateRecorded', {
      metricId,
      stats,
      timestamp: new Date()
    });
  }

  /**
   * Get performance metrics for a strategy
   */
  public getPerformanceMetrics(
    metricId: string,
    strategy: ErrorCorrectionStrategy
  ): StrategyPerformance | undefined {
    const key = `${metricId}:${strategy}`;
    return this.performanceMetrics.get(key);
  }

  /**
   * Get all performance metrics for a metric
   */
  public getAllPerformanceMetrics(metricId: string): StrategyPerformance[] {
    const metrics: StrategyPerformance[] = [];
    
    this.performanceMetrics.forEach((value, key) => {
      if (key.startsWith(`${metricId}:`)) {
        metrics.push(value);
      }
    });

    return metrics;
  }

  /**
   * Get error rate trend for a metric
   */
  public getErrorRateTrend(metricId: string): {
    current: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const history = this.errorRateHistory.get(metricId);
    
    if (!history || history.length < 3) {
      return {
        current: 0,
        average: 0,
        trend: 'stable'
      };
    }

    const recent = history.slice(-10);
    const current = recent[recent.length - 1].errorRate;
    const average = recent.reduce((sum, s) => sum + s.errorRate, 0) / recent.length;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (recent.length >= 3) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, s) => sum + s.errorRate, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s.errorRate, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) {
        trend = 'increasing';
      } else if (secondAvg < firstAvg * 0.9) {
        trend = 'decreasing';
      }
    }

    return { current, average, trend };
  }

  /**
   * Suggest redundancy level adjustment
   */
  public suggestRedundancyAdjustment(
    metricId: string,
    currentLevel: number
  ): {
    recommended: number;
    reason: string;
  } {
    const trend = this.getErrorRateTrend(metricId);
    const errorRate = trend.current;

    let recommended = currentLevel;
    let reason = 'No adjustment needed';

    if (errorRate > 0.3 || trend.trend === 'increasing') {
      recommended = Math.min(currentLevel + 1, 7);
      reason = 'High error rate or increasing trend detected';
    } else if (errorRate < 0.05 && trend.trend === 'decreasing' && currentLevel > 2) {
      recommended = Math.max(currentLevel - 1, 2);
      reason = 'Low error rate and decreasing trend detected';
    }

    return { recommended, reason };
  }

  /**
   * Start adaptation loop
   */
  private startAdaptation(): void {
    if (this.adaptationTimer) {
      return;
    }

    this.adaptationTimer = setInterval(() => {
      this.performAdaptation();
    }, this.config.adaptationInterval * 1000);

    this.emit('adaptationStarted', {
      interval: this.config.adaptationInterval,
      timestamp: new Date()
    });
  }

  /**
   * Stop adaptation loop
   */
  public stopAdaptation(): void {
    if (this.adaptationTimer) {
      clearInterval(this.adaptationTimer);
      this.adaptationTimer = null;
    }

    this.emit('adaptationStopped', {
      timestamp: new Date()
    });
  }

  /**
   * Perform adaptation cycle
   */
  private performAdaptation(): void {
    // Analyze all metrics and update recommendations
    this.errorRateHistory.forEach((_, metricId) => {
      this.updateStrategyRecommendation(metricId);
    });

    this.emit('adaptationCycle', {
      timestamp: new Date()
    });
  }

  /**
   * Get configuration
   */
  public getConfig(): AdaptiveCorrectionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<AdaptiveCorrectionConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart adaptation if interval changed
    if (updates.adaptationInterval !== undefined) {
      this.stopAdaptation();
      if (this.config.enabled) {
        this.startAdaptation();
      }
    }

    this.emit('configUpdated', {
      config: this.config,
      timestamp: new Date()
    });
  }

  /**
   * Get adaptation summary
   */
  public getSummary(): {
    totalMetrics: number;
    totalStrategiesTracked: number;
    averageSuccessRate: number;
    averageConfidence: number;
    adaptationEnabled: boolean;
  } {
    let totalAttempts = 0;
    let totalSuccesses = 0;
    let totalConfidence = 0;
    let strategyCount = 0;

    this.performanceMetrics.forEach(metrics => {
      totalAttempts += metrics.totalAttempts;
      totalSuccesses += metrics.successfulCorrections;
      totalConfidence += metrics.averageConfidence;
      strategyCount++;
    });

    const averageSuccessRate = totalAttempts > 0 
      ? totalSuccesses / totalAttempts 
      : 0;
    const averageConfidence = strategyCount > 0 
      ? totalConfidence / strategyCount 
      : 0;

    return {
      totalMetrics: this.errorRateHistory.size,
      totalStrategiesTracked: strategyCount,
      averageSuccessRate,
      averageConfidence,
      adaptationEnabled: this.config.enabled
    };
  }
}
