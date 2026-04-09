/**
 * Stability Enhancer Module
 * 
 * Addresses instability patterns identified in production cycles:
 * 1. High failure rates in specific scenarios (chaotic_workflow, retro_driven, assessment_focused)
 * 2. Pattern-specific failures (refine, review, wsjf, standup, retro)
 * 3. High WSJF volatility (Coefficient of Variation > 0.30)
 * 
 * Implements:
 * - Enhanced error handling with exponential backoff retry
 * - Circuit breaker patterns for preventing cascading failures
 * - Volatility reduction through adaptive smoothing
 * - Pattern execution consistency tracking
 */

export interface StabilityConfig {
  /** Maximum retry attempts for failed patterns */
  maxRetryAttempts?: number;
  /** Base delay for exponential backoff (ms) */
  retryBaseDelay?: number;
  /** Maximum backoff delay (ms) */
  retryMaxDelay?: number;
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold?: number;
  /** Circuit breaker timeout (ms) */
  circuitBreakerTimeout?: number;
  /** Volatility smoothing factor (0-1, higher = more smoothing) */
  volatilitySmoothingFactor?: number;
  /** Minimum samples before stability calculation */
  minStabilitySamples?: number;
}

export interface PatternExecutionMetrics {
  pattern: string;
  circle: string;
  successCount: number;
  failureCount: number;
  lastExecutionTime: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  averageDuration: number;
  isCircuitOpen: boolean;
}

export interface StabilityReport {
  overallStabilityScore: number;
  patternStability: Record<string, number>;
  volatilityScore: number;
  circuitBreakerStatus: Record<string, 'open' | 'half_open' | 'closed'>;
  recommendations: string[];
}

const DEFAULT_CONFIG: Required<StabilityConfig> = {
  maxRetryAttempts: 3,
  retryBaseDelay: 100,
  retryMaxDelay: 5000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
  volatilitySmoothingFactor: 0.3,
  minStabilitySamples: 10
};

/**
 * Stability Enhancer Class
 * Provides comprehensive stability improvements for pattern execution
 */
export class StabilityEnhancer {
  private patternMetrics: Map<string, PatternExecutionMetrics> = new Map();
  private wsjfHistory: number[] = [];
  private config: Required<StabilityConfig>;
  
  constructor(config: StabilityConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a pattern execution result
   */
  recordExecution(
    pattern: string,
    circle: string,
    success: boolean,
    durationMs: number
  ): void {
    const key = `${pattern}:${circle}`;
    const existing = this.patternMetrics.get(key) || {
      pattern,
      circle,
      successCount: 0,
      failureCount: 0,
      lastExecutionTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      averageDuration: 0,
      isCircuitOpen: false
    };

    if (success) {
      existing.successCount++;
      existing.consecutiveSuccesses++;
      existing.consecutiveFailures = 0;
      
      // Close circuit if enough consecutive successes
      if (existing.consecutiveSuccesses >= 3) {
        existing.isCircuitOpen = false;
      }
    } else {
      existing.failureCount++;
      existing.consecutiveFailures++;
      existing.consecutiveSuccesses = 0;
      
      // Open circuit if threshold exceeded
      if (existing.consecutiveFailures >= this.config.circuitBreakerThreshold) {
        existing.isCircuitOpen = true;
      }
    }

    // Update average duration (exponential moving average)
    // First execution sets duration directly, subsequent executions use EMA
    if (existing.averageDuration === 0) {
      existing.averageDuration = durationMs;
    } else {
      const alpha = 0.2; // Smoothing factor
      existing.averageDuration = alpha * durationMs + (1 - alpha) * existing.averageDuration;
    }
    existing.lastExecutionTime = Date.now();

    this.patternMetrics.set(key, existing);
  }

  /**
   * Check if pattern execution should proceed (circuit breaker)
   */
  canExecute(pattern: string, circle: string): boolean {
    const key = `${pattern}:${circle}`;
    const metrics = this.patternMetrics.get(key);
    
    if (!metrics) return true;
    
    // If circuit is open, check if timeout has elapsed
    if (metrics.isCircuitOpen) {
      const timeSinceLastFailure = Date.now() - metrics.lastExecutionTime;
      if (timeSinceLastFailure > this.config.circuitBreakerTimeout) {
        // Reset circuit after timeout
        metrics.isCircuitOpen = false;
        metrics.consecutiveFailures = 0;
        this.patternMetrics.set(key, metrics);
        return true;
      }
      return false;
    }
    
    return true;
  }

  /**
   * Execute pattern with enhanced error handling and retry
   */
  async executeWithRetry<T>(
    pattern: string,
    circle: string,
    fn: () => Promise<T>,
    options: { skipCircuitCheck?: boolean } = {}
  ): Promise<{ success: boolean; result?: T; error?: Error; attempts: number }> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;
    
    // Check circuit breaker
    if (!options.skipCircuitCheck && !this.canExecute(pattern, circle)) {
      const duration = Date.now() - startTime;
      this.recordExecution(pattern, circle, false, duration);
      return {
        success: false,
        error: new Error(`Circuit breaker open for ${pattern}:${circle}`),
        attempts: 0
      };
    }

    while (attempts < this.config.maxRetryAttempts) {
      attempts++;
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        this.recordExecution(pattern, circle, true, duration);
        return { success: true, result, attempts };
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempts >= this.config.maxRetryAttempts;
        
        if (!isLastAttempt) {
          // Exponential backoff
          const delay = Math.min(
            this.config.retryBaseDelay * Math.pow(2, attempts - 1),
            this.config.retryMaxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    this.recordExecution(pattern, circle, false, duration);
    return {
      success: false,
      error: lastError,
      attempts
    };
  }

  /**
   * Record WSJF value for volatility tracking
   */
  recordWSJF(value: number): void {
    this.wsjfHistory.push(value);
    
    // Keep history bounded
    if (this.wsjfHistory.length > 100) {
      this.wsjfHistory.shift();
    }
  }

  /**
   * Calculate smoothed WSJF (reduces volatility)
   */
  getSmoothedWSJF(): number | null {
    if (this.wsjfHistory.length < this.config.minStabilitySamples) {
      return null;
    }

    // Exponential moving average with configurable smoothing
    const alpha = this.config.volatilitySmoothingFactor;
    let smoothed = this.wsjfHistory[0];
    
    for (let i = 1; i < this.wsjfHistory.length; i++) {
      smoothed = alpha * this.wsjfHistory[i] + (1 - alpha) * smoothed;
    }
    
    return smoothed;
  }

  /**
   * Calculate Coefficient of Variation (CV) for stability scoring
   */
  calculateCV(): number | null {
    if (this.wsjfHistory.length < this.config.minStabilitySamples) {
      return null;
    }

    const mean = this.wsjfHistory.reduce((a, b) => a + b, 0) / this.wsjfHistory.length;
    const variance = this.wsjfHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.wsjfHistory.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of Variation (CV = stdDev / mean)
    if (mean === 0) return 0;
    return stdDev / Math.abs(mean);
  }

  /**
   * Calculate pattern stability score (0-1)
   * Based on success rate and consistency
   */
  getPatternStability(pattern: string, circle: string): number {
    const key = `${pattern}:${circle}`;
    const metrics = this.patternMetrics.get(key);
    
    if (!metrics || metrics.successCount + metrics.failureCount === 0) {
      return 0.5; // Neutral score for no data
    }

    const total = metrics.successCount + metrics.failureCount;
    const successRate = metrics.successCount / total;
    
    // Consistency bonus based on consecutive successes
    const consistencyBonus = Math.min(metrics.consecutiveSuccesses / 10, 0.2);
    
    // Penalty for consecutive failures
    const failurePenalty = Math.min(metrics.consecutiveFailures / 5, 0.3);
    
    // Circuit breaker penalty
    const circuitPenalty = metrics.isCircuitOpen ? 0.2 : 0;
    
    let score = successRate + consistencyBonus - failurePenalty - circuitPenalty;
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get comprehensive stability report
   */
  getStabilityReport(): StabilityReport {
    const cv = this.calculateCV();
    const volatilityScore = cv !== null ? Math.max(0, 1 - cv) : 0.5;
    
    // Calculate overall stability score
    const patternScores: Record<string, number> = {};
    let totalScore = 0;
    let patternCount = 0;
    
    for (const [key, metrics] of this.patternMetrics) {
      const score = this.getPatternStability(metrics.pattern, metrics.circle);
      patternScores[key] = score;
      totalScore += score;
      patternCount++;
    }
    
    const overallStabilityScore = patternCount > 0 ? totalScore / patternCount : 0.5;
    
    // Circuit breaker status
    const circuitBreakerStatus: Record<string, 'open' | 'half_open' | 'closed'> = {};
    for (const [key, metrics] of this.patternMetrics) {
      if (metrics.isCircuitOpen) {
        circuitBreakerStatus[key] = 'open';
      } else if (metrics.consecutiveFailures >= this.config.circuitBreakerThreshold / 2) {
        circuitBreakerStatus[key] = 'half_open';
      } else {
        circuitBreakerStatus[key] = 'closed';
      }
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (cv !== null && cv > 0.30) {
      recommendations.push('High WSJF volatility detected. Consider smoothing factor adjustment.');
    }
    
    if (overallStabilityScore < 0.70) {
      recommendations.push('Overall stability below 0.70. Review pattern execution consistency.');
    }
    
    // Pattern-specific recommendations
    for (const [key, metrics] of this.patternMetrics) {
      const score = patternScores[key];
      if (score < 0.60) {
        recommendations.push(`Low stability for ${metrics.pattern}:${metrics.circle} (${score.toFixed(2)}). Consider error handling improvements.`);
      }
      if (metrics.consecutiveFailures >= 3) {
        recommendations.push(`Multiple consecutive failures for ${metrics.pattern}:${metrics.circle}. Circuit breaker active.`);
      }
    }
    
    return {
      overallStabilityScore,
      patternStability: patternScores,
      volatilityScore,
      circuitBreakerStatus,
      recommendations
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.patternMetrics.clear();
    this.wsjfHistory = [];
  }

  /**
   * Get pattern metrics for a specific pattern
   */
  getPatternMetrics(pattern: string, circle: string): PatternExecutionMetrics | undefined {
    return this.patternMetrics.get(`${pattern}:${circle}`);
  }

  /**
   * Get all pattern metrics
   */
  getAllPatternMetrics(): Map<string, PatternExecutionMetrics> {
    return new Map(this.patternMetrics);
  }
}

// Singleton instance
let stabilityEnhancerInstance: StabilityEnhancer | null = null;

/**
 * Get singleton instance of Stability Enhancer
 */
export function getStabilityEnhancer(config?: StabilityConfig): StabilityEnhancer {
  if (!stabilityEnhancerInstance) {
    stabilityEnhancerInstance = new StabilityEnhancer(config);
  }
  return stabilityEnhancerInstance;
}
