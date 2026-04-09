/**
 * Stability Metrics System
 * Calculates and tracks system stability metrics including OK rate, stability score
 */

export interface StabilityMetrics {
  okRate: number; // Percentage of successful iterations
  stabilityScore: number; // Overall stability score (0-1)
  failureRate: number; // Percentage of failed iterations
  recoveryTime: number; // Average recovery time from failures (ms)
  trend: 'improving' | 'stable' | 'degrading' | 'volatile';
  lastUpdated: string;
  recommendations: string[];
}

export interface IterationResult {
  success: boolean;
  durationMs: number;
  errorType?: string;
  errorMessage?: string;
  stackTrace?: string;
}

export class StabilityMetricsSystem {
  private results: IterationResult[] = [];
  private maxResults = 100; // Keep last 100 results for calculation

  /**
   * Record an iteration result
   */
  recordIteration(result: IterationResult): void {
    this.results.push(result);
    
    // Keep only last 100 results
    if (this.results.length > this.maxResults) {
      this.results = this.results.slice(-this.maxResults);
    }
  }

  /**
   * Calculate OK rate (percentage of successful iterations)
   */
  getOKRate(): number {
    if (this.results.length === 0) return 0;
    
    const successCount = this.results.filter(r => r.success).length;
    return Math.round((successCount / this.results.length) * 100);
  }

  /**
   * Calculate failure rate
   */
  getFailureRate(): number {
    if (this.results.length === 0) return 0;
    
    const failureCount = this.results.filter(r => !r.success).length;
    return Math.round((failureCount / this.results.length) * 100);
  }

  /**
   * Calculate average recovery time from failures
   */
  getAverageRecoveryTime(): number {
    const failures = this.results.filter(r => !r.success);
    if (failures.length === 0) return 0;
    
    const totalTime = failures.reduce((sum, r) => sum + r.durationMs, 0);
    return Math.round(totalTime / failures.length);
  }

  /**
   * Calculate stability score (0-1)
   * Based on OK rate, failure rate, and volatility
   * Enhanced with exponential smoothing and consistency tracking
   */
  getStabilityScore(): number {
    if (this.results.length < 10) return 0;
    
    const okRate = this.getOKRate();
    const failureRate = this.getFailureRate();
    
    // Base score from OK rate (target 95%)
    let score = okRate / 100;
    
    // Penalty for high failure rate (reduced penalty)
    if (failureRate > 10) {
      score -= (failureRate - 10) * 0.3; // Reduced from 0.5 to 0.3
    }
    
    // Enhanced volatility penalty with exponential smoothing
    const recentResults = this.results.slice(-20);
    if (recentResults.length >= 5) {
      const successChanges = recentResults.map(r => r.success ? 1 : 0);
      
      // Apply exponential moving average for volatility calculation
      const alpha = 0.3; // Smoothing factor
      let ema = successChanges[0];
      const smoothedValues: number[] = [ema];
      
      for (let i = 1; i < successChanges.length; i++) {
        ema = alpha * successChanges[i] + (1 - alpha) * ema;
        smoothedValues.push(ema);
      }
      
      const variance = this.calculateVariance(smoothedValues);
      
      // Reduced penalty for high variance (volatility)
      if (variance > 0.25) {
        score -= variance * 0.3; // Reduced from 0.5 to 0.3
      }
      
      // Consistency bonus for stable recent performance
      const last5 = smoothedValues.slice(-5);
      const isStable = last5.every((v, i, arr) => i === 0 || Math.abs(v - arr[i-1]) < 0.1);
      if (isStable) {
        score += 0.05; // 5% bonus for consistency
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate trend based on recent results
   */
  getTrend(): 'improving' | 'stable' | 'degrading' | 'volatile' {
    if (this.results.length < 5) return 'stable';
    
    const recentResults = this.results.slice(-10);
    const recentSuccessCount = recentResults.filter(r => r.success).length;
    const recentOKRate = recentSuccessCount / recentResults.length;
    
    // Compare recent to overall
    const overallOKRate = this.getOKRate() / 100;
    
    if (recentOKRate > overallOKRate + 0.05) {
      return 'improving';
    } else if (recentOKRate < overallOKRate - 0.05) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate variance for volatility assessment
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }

  /**
   * Get recommendations based on current metrics
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const okRate = this.getOKRate();
    const failureRate = this.getFailureRate();
    const stabilityScore = this.getStabilityScore();
    const trend = this.getTrend();
    
    // OK rate recommendations
    if (okRate < 85) {
      recommendations.push('OK rate is below 85%. Review failure patterns and implement mitigations.');
    } else if (okRate >= 95) {
      recommendations.push('Excellent OK rate achieved! Maintain current practices.');
    }
    
    // Stability score recommendations
    if (stabilityScore < 0.80) {
      recommendations.push('Stability score is below 0.80. Investigate volatility and improve consistency.');
    } else if (stabilityScore >= 0.90) {
      recommendations.push('Excellent stability achieved! Consider reducing testing frequency.');
    }
    
    // Trend recommendations
    if (trend === 'degrading') {
      recommendations.push('Recent performance is degrading. Investigate recent changes.');
    } else if (trend === 'volatile') {
      recommendations.push('High volatility detected. Implement more robust error handling.');
    }
    
    // Failure rate recommendations
    if (failureRate > 15) {
      recommendations.push('High failure rate detected. Implement circuit breaker patterns.');
    }
    
    return recommendations;
  }

  /**
   * Get full metrics summary
   */
  getMetrics(): StabilityMetrics {
    const okRate = this.getOKRate();
    const failureRate = this.getFailureRate();
    const recoveryTime = this.getAverageRecoveryTime();
    const stabilityScore = this.getStabilityScore();
    const trend = this.getTrend();
    const recommendations = this.getRecommendations();
    
    return {
      okRate,
      stabilityScore,
      failureRate,
      recoveryTime,
      trend,
      lastUpdated: new Date().toISOString(),
      recommendations,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.results = [];
    console.log('[StabilityMetrics] Metrics reset');
  }
}

// Singleton instance
let stabilityInstance: StabilityMetricsSystem | null;

export function getStabilityMetrics(): StabilityMetricsSystem {
  if (!stabilityInstance) {
    stabilityInstance = new StabilityMetricsSystem();
  }
  return stabilityInstance;
}
