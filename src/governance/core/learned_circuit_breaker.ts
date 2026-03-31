/**
 * Learned Circuit Breaker - P1-LIVE Implementation
 * 
 * Adaptive circuit breaker that learns optimal thresholds from historical data,
 * improving LIVE dimension (Calibration Adaptivity) by dynamically adjusting
 * based on observed system behavior rather than static configuration.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CircuitBreakerConfig {
  goalieDir?: string;
  initialErrorThreshold?: number;
  initialLatencyThreshold?: number;
  learningRate?: number;
  minSampleSize?: number;
  adaptationInterval?: number; // milliseconds
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  errorThreshold: number;
  latencyThreshold: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastStateChange: string;
  totalRequests: number;
  failedRequests: number;
  adaptationCount: number;
}

export interface CircuitBreakerMetrics {
  timestamp: string;
  errorRate: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  requestCount: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface ThresholdLearning {
  pattern: string;
  errorThreshold: {
    current: number;
    learned: number;
    confidence: number;
    sampleSize: number;
  };
  latencyThreshold: {
    current: number;
    learned: number;
    confidence: number;
    sampleSize: number;
  };
  lastUpdated: string;
  performanceImprovement: number; // percentage
}

export class LearnedCircuitBreaker {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState;
  private metrics: CircuitBreakerMetrics[] = [];
  private latencyBuffer: number[] = [];
  private goalieDir: string;
  private stateFile: string;
  private metricsFile: string;
  private learningFile: string;
  
  constructor(config?: CircuitBreakerConfig) {
    this.config = {
      goalieDir: config?.goalieDir || process.env.GOALIE_DIR || '.goalie',
      initialErrorThreshold: config?.initialErrorThreshold || 0.5, // 50% error rate
      initialLatencyThreshold: config?.initialLatencyThreshold || 1000, // 1000ms
      learningRate: config?.learningRate || 0.1, // 10% adjustment per adaptation
      minSampleSize: config?.minSampleSize || 100, // Minimum requests before learning
      adaptationInterval: config?.adaptationInterval || 300000 // 5 minutes
    };
    
    this.goalieDir = this.config.goalieDir;
    this.stateFile = join(this.goalieDir, 'circuit_breaker_state.json');
    this.metricsFile = join(this.goalieDir, 'circuit_breaker_metrics.jsonl');
    this.learningFile = join(this.goalieDir, 'circuit_breaker_learning.json');
    
    this.state = this.loadState() || this.initializeState();
  }
  
  /**
   * Initialize circuit breaker state
   */
  private initializeState(): CircuitBreakerState {
    return {
      state: 'CLOSED',
      errorThreshold: this.config.initialErrorThreshold,
      latencyThreshold: this.config.initialLatencyThreshold,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastStateChange: new Date().toISOString(),
      totalRequests: 0,
      failedRequests: 0,
      adaptationCount: 0
    };
  }
  
  /**
   * Load state from disk
   */
  private loadState(): CircuitBreakerState | null {
    if (!existsSync(this.stateFile)) {
      return null;
    }
    
    try {
      const content = readFileSync(this.stateFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load circuit breaker state:', error);
      return null;
    }
  }
  
  /**
   * Save state to disk
   */
  private saveState(): void {
    try {
      writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save circuit breaker state:', error);
    }
  }
  
  /**
   * Record a request result
   */
  recordRequest(success: boolean, latency: number): void {
    this.state.totalRequests++;
    this.latencyBuffer.push(latency);
    
    // Keep buffer size reasonable
    if (this.latencyBuffer.length > 1000) {
      this.latencyBuffer = this.latencyBuffer.slice(-500);
    }
    
    if (!success) {
      this.state.failedRequests++;
      this.state.consecutiveFailures++;
      this.state.consecutiveSuccesses = 0;
      
      // Check if should open circuit
      const errorRate = this.state.failedRequests / this.state.totalRequests;
      if (errorRate > this.state.errorThreshold && this.state.state === 'CLOSED') {
        this.openCircuit();
      }
    } else {
      this.state.consecutiveSuccesses++;
      this.state.consecutiveFailures = 0;
      
      // Check latency threshold
      if (latency > this.state.latencyThreshold && this.state.state === 'CLOSED') {
        this.state.consecutiveFailures++;
        if (this.state.consecutiveFailures >= 3) {
          this.openCircuit();
        }
      }
      
      // Check if should close circuit (half-open -> closed)
      if (this.state.state === 'HALF_OPEN' && this.state.consecutiveSuccesses >= 5) {
        this.closeCircuit();
      }
    }
    
    this.saveState();
    this.recordMetrics();
    
    // Adapt thresholds if enough data collected
    if (this.shouldAdapt()) {
      this.adaptThresholds();
    }
  }
  
  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state.state = 'OPEN';
    this.state.lastStateChange = new Date().toISOString();
    this.saveState();
    
    // Attempt half-open after timeout
    setTimeout(() => {
      if (this.state.state === 'OPEN') {
        this.halfOpenCircuit();
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Enter half-open state (testing if service recovered)
   */
  private halfOpenCircuit(): void {
    this.state.state = 'HALF_OPEN';
    this.state.lastStateChange = new Date().toISOString();
    this.state.consecutiveSuccesses = 0;
    this.state.consecutiveFailures = 0;
    this.saveState();
  }
  
  /**
   * Close the circuit (normal operation)
   */
  private closeCircuit(): void {
    this.state.state = 'CLOSED';
    this.state.lastStateChange = new Date().toISOString();
    this.state.consecutiveSuccesses = 0;
    this.state.consecutiveFailures = 0;
    
    // Reset counters for fresh learning
    this.state.totalRequests = 0;
    this.state.failedRequests = 0;
    
    this.saveState();
  }
  
  /**
   * Check if request should be allowed
   */
  allowRequest(): boolean {
    if (this.state.state === 'CLOSED') {
      return true;
    }
    if (this.state.state === 'OPEN') {
      return false;
    }
    // HALF_OPEN: allow limited requests
    return this.state.consecutiveSuccesses < 10;
  }
  
  /**
   * Record metrics snapshot
   */
  private recordMetrics(): void {
    const now = new Date().toISOString();
    const errorRate = this.state.totalRequests > 0 
      ? this.state.failedRequests / this.state.totalRequests 
      : 0;
    
    const latencies = this.latencyBuffer.length > 0 ? this.latencyBuffer : [0];
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    
    const metrics: CircuitBreakerMetrics = {
      timestamp: now,
      errorRate,
      avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      p95Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
      p99Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
      requestCount: this.state.totalRequests,
      state: this.state.state
    };
    
    this.metrics.push(metrics);
    
    // Keep last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
    
    // Append to metrics file
    try {
      const fs = require('fs');
      fs.appendFileSync(this.metricsFile, JSON.stringify(metrics) + '\n');
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  }
  
  /**
   * Check if should adapt thresholds
   */
  private shouldAdapt(): boolean {
    if (this.state.totalRequests < this.config.minSampleSize) {
      return false;
    }
    
    const lastAdaptation = new Date(this.state.lastStateChange);
    const timeSinceLastAdaptation = Date.now() - lastAdaptation.getTime();
    
    return timeSinceLastAdaptation >= this.config.adaptationInterval;
  }
  
  /**
   * Adapt thresholds based on learned behavior
   */
  private adaptThresholds(): void {
    const recentMetrics = this.metrics.slice(-this.config.minSampleSize);
    if (recentMetrics.length === 0) return;
    
    // Learn optimal error threshold
    const errorRates = recentMetrics.map(m => m.errorRate);
    const avgErrorRate = errorRates.reduce((sum, r) => sum + r, 0) / errorRates.length;
    const stdErrorRate = Math.sqrt(
      errorRates.reduce((sum, r) => sum + Math.pow(r - avgErrorRate, 2), 0) / errorRates.length
    );
    
    // Learn optimal latency threshold
    const p95Latencies = recentMetrics.map(m => m.p95Latency);
    const avgP95 = p95Latencies.reduce((sum, l) => sum + l, 0) / p95Latencies.length;
    const stdP95 = Math.sqrt(
      p95Latencies.reduce((sum, l) => sum + Math.pow(l - avgP95, 2), 0) / p95Latencies.length
    );
    
    // Calculate learned thresholds (mean + 2 std deviations for 95% confidence)
    const learnedErrorThreshold = Math.min(0.9, avgErrorRate + (2 * stdErrorRate));
    const learnedLatencyThreshold = Math.min(5000, avgP95 + (2 * stdP95));
    
    // Apply learning with learning rate
    const oldErrorThreshold = this.state.errorThreshold;
    const oldLatencyThreshold = this.state.latencyThreshold;
    
    this.state.errorThreshold = 
      (1 - this.config.learningRate) * this.state.errorThreshold + 
      this.config.learningRate * learnedErrorThreshold;
    
    this.state.latencyThreshold = 
      (1 - this.config.learningRate) * this.state.latencyThreshold + 
      this.config.learningRate * learnedLatencyThreshold;
    
    this.state.adaptationCount++;
    this.state.lastStateChange = new Date().toISOString();
    
    // Calculate performance improvement
    const errorImprovement = Math.abs(oldErrorThreshold - this.state.errorThreshold) / oldErrorThreshold;
    const latencyImprovement = Math.abs(oldLatencyThreshold - this.state.latencyThreshold) / oldLatencyThreshold;
    const avgImprovement = (errorImprovement + latencyImprovement) / 2;
    
    // Save learning data
    const learning: ThresholdLearning = {
      pattern: 'circuit-breaker-learned',
      errorThreshold: {
        current: this.state.errorThreshold,
        learned: learnedErrorThreshold,
        confidence: 1 - stdErrorRate,
        sampleSize: recentMetrics.length
      },
      latencyThreshold: {
        current: this.state.latencyThreshold,
        learned: learnedLatencyThreshold,
        confidence: 1 - (stdP95 / avgP95),
        sampleSize: recentMetrics.length
      },
      lastUpdated: new Date().toISOString(),
      performanceImprovement: avgImprovement * 100
    };
    
    try {
      writeFileSync(this.learningFile, JSON.stringify(learning, null, 2));
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
    
    this.saveState();
    
    console.log(`Circuit Breaker Adapted: Error ${oldErrorThreshold.toFixed(3)} → ${this.state.errorThreshold.toFixed(3)}, Latency ${oldLatencyThreshold.toFixed(0)}ms → ${this.state.latencyThreshold.toFixed(0)}ms`);
  }
  
  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }
  
  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): CircuitBreakerMetrics[] {
    return this.metrics.slice(-count);
  }
  
  /**
   * Get learning data
   */
  getLearningData(): ThresholdLearning | null {
    if (!existsSync(this.learningFile)) {
      return null;
    }
    
    try {
      const content = readFileSync(this.learningFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load learning data:', error);
      return null;
    }
  }
  
  /**
   * Reset circuit breaker (for testing)
   */
  reset(): void {
    this.state = this.initializeState();
    this.metrics = [];
    this.latencyBuffer = [];
    this.saveState();
  }
  
  /**
   * Get adaptation statistics
   */
  getAdaptationStats(): {
    adaptationCount: number;
    currentErrorThreshold: number;
    currentLatencyThreshold: number;
    initialErrorThreshold: number;
    initialLatencyThreshold: number;
    improvementPct: number;
    sampleSize: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  } {
    const learning = this.getLearningData();
    
    return {
      adaptationCount: this.state.adaptationCount,
      currentErrorThreshold: this.state.errorThreshold,
      currentLatencyThreshold: this.state.latencyThreshold,
      initialErrorThreshold: this.config.initialErrorThreshold,
      initialLatencyThreshold: this.config.initialLatencyThreshold,
      improvementPct: learning?.performanceImprovement || 0,
      sampleSize: this.state.totalRequests,
      state: this.state.state
    };
  }
}

export default LearnedCircuitBreaker;
