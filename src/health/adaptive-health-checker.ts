/**
 * Adaptive Health Checker - P0-3 Implementation
 * ==============================================
 * Automatically adjusts health check frequency based on anomaly rates.
 * Integrates with ay-dynamic-sleep.sh for system-aware delays.
 * 
 * Features:
 * - Exponential speedup when anomaly rate > 10%
 * - Exponential backoff when anomaly rate < 1%
 * - System load-aware sleep intervals
 * - Configurable min/max interval bounds
 */

import { execSync } from 'child_process';
import {
  performHealthCheck,
  refreshDynamicThresholds,
  checkDegradation,
  checkCascadeFailure,
  getDivergenceRateStatus
} from '../runtime/processGovernorEnhanced';

export interface AdaptiveHealthCheckerConfig {
  baseIntervalMs?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  anomalyThresholdHigh?: number;
  anomalyThresholdLow?: number;
  circle?: string;
  ceremony?: string;
  logPath?: string;
}

export interface AnomalyRate {
  window: number;
  anomalyCount: number;
  totalChecks: number;
  rate: number;
}

export class AdaptiveHealthChecker {
  private checkInterval: number;
  private minInterval: number;
  private maxInterval: number;
  private anomalyThresholdHigh: number;
  private anomalyThresholdLow: number;
  private circle: string;
  private ceremony: string;
  private logPath: string;
  private isRunning: boolean = false;
  
  constructor(config: AdaptiveHealthCheckerConfig = {}) {
    this.checkInterval = config.baseIntervalMs || 60000; // 60 seconds
    this.minInterval = config.minIntervalMs || 5000;     // 5 seconds
    this.maxInterval = config.maxIntervalMs || 300000;   // 5 minutes
    this.anomalyThresholdHigh = config.anomalyThresholdHigh || 0.1; // 10%
    this.anomalyThresholdLow = config.anomalyThresholdLow || 0.01;  // 1%
    this.circle = config.circle || 'orchestrator';
    this.ceremony = config.ceremony || 'standup';
    this.logPath = config.logPath || '.goalie/adaptive-health-log.jsonl';
  }
  
  /**
   * Start the adaptive health check loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Adaptive health checker already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`✅ Starting adaptive health checker (base interval: ${this.checkInterval}ms)`);
    
    await this.runAdaptiveLoop();
  }
  
  /**
   * Stop the adaptive health check loop
   */
  stop(): void {
    this.isRunning = false;
    console.log('🛑 Stopping adaptive health checker');
  }
  
  /**
   * Main adaptive health check loop
   */
  private async runAdaptiveLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const startTime = Date.now();
        
        // Perform health check
        const governorState = this.ensureGovernorState();
        const health = await performHealthCheck(governorState, this.circle, this.ceremony);
        
        // Calculate anomaly rate from recent checks
        const anomalyRate = this.calculateAnomalyRate(governorState);
        
        // Adjust interval based on anomaly rate
        this.adjustInterval(anomalyRate);
        
        // Log health check result
        this.logHealthCheck({
          timestamp: new Date().toISOString(),
          healthy: health.healthy,
          anomalyRate: anomalyRate.rate,
          checkInterval: this.checkInterval,
          duration: Date.now() - startTime,
          issues: health.issues.length
        });
        
        // Sleep using dynamic sleep script (system-aware)
        const adaptedInterval = await this.getDynamicSleep(this.checkInterval);
        await this.sleep(adaptedInterval);
        
      } catch (error) {
        console.error('❌ Health check error:', error);
        // On error, back off to longer interval
        this.checkInterval = Math.min(this.maxInterval, this.checkInterval * 1.5);
        await this.sleep(this.checkInterval);
      }
    }
  }
  
  /**
   * Calculate anomaly rate from recent health checks
   */
  private calculateAnomalyRate(state: any): AnomalyRate {
    const recentPerformance = state.recentPerformance || [];
    const windowSize = Math.min(20, recentPerformance.length);
    
    if (windowSize === 0) {
      return {
        window: 0,
        anomalyCount: 0,
        totalChecks: 0,
        rate: 0
      };
    }
    
    const recentWindow = recentPerformance.slice(-windowSize);
    const anomalyCount = recentWindow.filter((p: any) => !p.success).length;
    
    return {
      window: windowSize,
      anomalyCount,
      totalChecks: windowSize,
      rate: anomalyCount / windowSize
    };
  }
  
  /**
   * Adjust check interval based on anomaly rate
   */
  private adjustInterval(anomalyRate: AnomalyRate): void {
    const oldInterval = this.checkInterval;
    
    if (anomalyRate.rate > this.anomalyThresholdHigh) {
      // High anomaly rate: check 2x more frequently
      this.checkInterval = Math.max(this.minInterval, this.checkInterval / 2);
      console.log(`⚡ High anomaly rate (${(anomalyRate.rate * 100).toFixed(1)}%), increasing frequency: ${oldInterval}ms → ${this.checkInterval}ms`);
      
    } else if (anomalyRate.rate < this.anomalyThresholdLow) {
      // Low anomaly rate: check 1.5x less frequently
      this.checkInterval = Math.min(this.maxInterval, this.checkInterval * 1.5);
      console.log(`🐌 Low anomaly rate (${(anomalyRate.rate * 100).toFixed(1)}%), decreasing frequency: ${oldInterval}ms → ${this.checkInterval}ms`);
      
    } else {
      // Normal range: maintain current interval
      console.log(`✓ Normal anomaly rate (${(anomalyRate.rate * 100).toFixed(1)}%), maintaining ${this.checkInterval}ms interval`);
    }
  }
  
  /**
   * Get dynamic sleep interval from ay-dynamic-sleep.sh (system-aware)
   */
  private async getDynamicSleep(baseMs: number): Promise<number> {
    try {
      const baseSec = baseMs / 1000;
      const scriptPath = './scripts/ay-dynamic-sleep.sh';
      
      // Check if script exists
      const { existsSync } = require('fs');
      if (!existsSync(scriptPath)) {
        console.warn(`⚠️  Dynamic sleep script not found at ${scriptPath}, using base interval`);
        return baseMs;
      }
      
      const result = execSync(
        `${scriptPath} calculate ${baseSec} auto`,
        { encoding: 'utf-8', timeout: 5000 }
      ).toString().trim();
      
      const adaptedSec = parseFloat(result);
      if (isNaN(adaptedSec) || adaptedSec <= 0) {
        console.warn('⚠️  Invalid dynamic sleep result, using base interval');
        return baseMs;
      }
      
      return adaptedSec * 1000;
      
    } catch (error) {
      console.warn('⚠️  Dynamic sleep calculation failed, using base interval:', error);
      return baseMs;
    }
  }
  
  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Ensure governor state exists (fallback)
   */
  private ensureGovernorState(): any {
    return {
      activeWork: 0,
      queuedWork: 0,
      completedWork: 0,
      failedWork: 0,
      circuitBreaker: {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
        halfOpenRequests: 0,
        windowStart: Date.now()
      },
      dynamicThresholds: null,
      lastThresholdUpdate: 0,
      recentPerformance: [],
      cascadeFailureWindow: [],
      metrics: {
        degradation_score: 0,
        cascade_failure_count: 0,
        divergence_rate_current: 0.05
      }
    };
  }
  
  /**
   * Log health check result to JSONL
   */
  private logHealthCheck(entry: any): void {
    try {
      const { appendFileSync, mkdirSync, existsSync } = require('fs');
      const { dirname } = require('path');
      
      const dir = dirname(this.logPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to log health check:', error);
    }
  }
  
  /**
   * Get current interval (for monitoring)
   */
  getCurrentInterval(): number {
    return this.checkInterval;
  }
  
  /**
   * Get configuration
   */
  getConfig(): AdaptiveHealthCheckerConfig {
    return {
      baseIntervalMs: this.checkInterval,
      minIntervalMs: this.minInterval,
      maxIntervalMs: this.maxInterval,
      anomalyThresholdHigh: this.anomalyThresholdHigh,
      anomalyThresholdLow: this.anomalyThresholdLow,
      circle: this.circle,
      ceremony: this.ceremony,
      logPath: this.logPath
    };
  }
}

export default AdaptiveHealthChecker;
