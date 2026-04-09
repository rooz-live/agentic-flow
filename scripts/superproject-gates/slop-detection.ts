/**
 * Slop Detection System for AFProdEngine
 * 
 * Detects and tracks "slop" - low-quality outputs, false positives,
 * and degraded execution patterns in production workflows
 */

interface SlopMetric {
  id: string;
  timestamp: Date;
  type: 'output_quality' | 'false_positive' | 'execution_degradation' | 'pattern_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-1, where 0 is perfect and 1 is complete slop
  context: {
    planId?: string;
    doId?: string;
    actId?: string;
    circle?: string;
    scenario?: string;
  };
  details: {
    expected: any;
    actual: any;
    deviation: number;
    indicators: string[];
  };
  falsePositive: boolean;
  resolved: boolean;
}

interface SlopDetectionConfig {
  enabled: boolean;
  qualityThreshold: number; // 0-1, outputs below this are flagged
  anomalyThreshold: number; // 0-1, deviations above this are anomalies
  falsePositiveRate: number; // Maximum acceptable false positive rate
  samplingRate: number; // Percentage of executions to analyze
  enablePatternLearning: boolean;
}

interface SlopDashboard {
  summary: {
    totalDetections: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    falsePositiveRate: number;
    resolvedRate: number;
  };
  trends: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  topIssues: SlopMetric[];
  recommendations: string[];
}

export class SlopDetectionSystem {
  private config: SlopDetectionConfig;
  private metrics: SlopMetric[] = [];
  private patterns: Map<string, number[]> = new Map(); // pattern -> quality scores
  private falsePositives: Set<string> = new Set();
  
  constructor(config?: Partial<SlopDetectionConfig>) {
    this.config = {
      enabled: true,
      qualityThreshold: 0.7,
      anomalyThreshold: 0.3,
      falsePositiveRate: 0.05, // Max 5% false positives
      samplingRate: 1.0, // Analyze 100% by default
      enablePatternLearning: true,
      ...config,
    };

    console.log('[SLOP] Detection system initialized');
  }

  /**
   * Analyze output quality
   */
  analyzeOutputQuality(
    output: any,
    expected: any,
    context: SlopMetric['context']
  ): SlopMetric | null {
    if (!this.config.enabled || Math.random() > this.config.samplingRate) {
      return null;
    }

    const qualityScore = this.calculateQualityScore(output, expected);
    
    if (qualityScore >= this.config.qualityThreshold) {
      // Quality is acceptable
      this.recordPatternQuality(context.scenario || 'default', qualityScore);
      return null;
    }

    const metric: SlopMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'output_quality',
      severity: this.categorizeSeverity(qualityScore),
      score: 1 - qualityScore, // Invert: low quality = high slop score
      context,
      details: {
        expected,
        actual: output,
        deviation: 1 - qualityScore,
        indicators: this.identifyQualityIssues(output, expected),
      },
      falsePositive: false,
      resolved: false,
    };

    this.metrics.push(metric);
    this.recordPatternQuality(context.scenario || 'default', qualityScore);

    console.log(`[SLOP] Low quality output detected: ${metric.id} (score: ${qualityScore.toFixed(2)})`);
    
    return metric;
  }

  /**
   * Detect false positives in execution
   */
  detectFalsePositive(
    result: any,
    expectedOutcome: string,
    actualOutcome: string,
    context: SlopMetric['context']
  ): SlopMetric | null {
    if (!this.config.enabled) {
      return null;
    }

    // Check if this is a false positive
    const isFalsePositive = expectedOutcome === 'success' && actualOutcome === 'failure';
    
    if (!isFalsePositive) {
      return null;
    }

    const metric: SlopMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'false_positive',
      severity: 'high',
      score: 1.0, // False positives are always maximum slop
      context,
      details: {
        expected: expectedOutcome,
        actual: actualOutcome,
        deviation: 1.0,
        indicators: ['outcome_mismatch', 'false_positive_detected'],
      },
      falsePositive: true,
      resolved: false,
    };

    this.metrics.push(metric);
    this.falsePositives.add(metric.id);

    console.log(`[SLOP] False positive detected: ${metric.id}`);
    
    return metric;
  }

  /**
   * Detect execution degradation
   */
  detectExecutionDegradation(
    executionTime: number,
    baseline: number,
    context: SlopMetric['context']
  ): SlopMetric | null {
    if (!this.config.enabled) {
      return null;
    }

    const degradation = (executionTime - baseline) / baseline;
    
    if (degradation < this.config.anomalyThreshold) {
      return null; // Within acceptable range
    }

    const metric: SlopMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'execution_degradation',
      severity: degradation > 0.5 ? 'high' : 'medium',
      score: Math.min(degradation, 1.0),
      context,
      details: {
        expected: baseline,
        actual: executionTime,
        deviation: degradation,
        indicators: [
          `${(degradation * 100).toFixed(0)}% slower than baseline`,
          degradation > 0.5 ? 'severe_degradation' : 'moderate_degradation',
        ],
      },
      falsePositive: false,
      resolved: false,
    };

    this.metrics.push(metric);

    console.log(`[SLOP] Execution degradation detected: ${metric.id} (+${(degradation * 100).toFixed(0)}%)`);
    
    return metric;
  }

  /**
   * Detect pattern anomalies
   */
  detectPatternAnomaly(
    pattern: string,
    currentMetrics: Record<string, number>,
    context: SlopMetric['context']
  ): SlopMetric | null {
    if (!this.config.enabled || !this.config.enablePatternLearning) {
      return null;
    }

    const historicalScores = this.patterns.get(pattern) || [];
    if (historicalScores.length < 3) {
      // Not enough data for anomaly detection
      return null;
    }

    const avgQuality = historicalScores.reduce((sum, s) => sum + s, 0) / historicalScores.length;
    const currentQuality = currentMetrics.qualityScore || 0;
    const deviation = Math.abs(currentQuality - avgQuality);

    if (deviation < this.config.anomalyThreshold) {
      return null;
    }

    const metric: SlopMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'pattern_anomaly',
      severity: deviation > 0.5 ? 'high' : 'medium',
      score: deviation,
      context: { ...context, scenario: pattern },
      details: {
        expected: avgQuality,
        actual: currentQuality,
        deviation,
        indicators: [
          `${(deviation * 100).toFixed(0)}% deviation from pattern`,
          currentQuality < avgQuality ? 'quality_drop' : 'unexpected_improvement',
        ],
      },
      falsePositive: false,
      resolved: false,
    };

    this.metrics.push(metric);

    console.log(`[SLOP] Pattern anomaly detected: ${metric.id} (pattern: ${pattern})`);
    
    return metric;
  }

  /**
   * Mark metric as false positive
   */
  markAsFalsePositive(metricId: string): void {
    const metric = this.metrics.find(m => m.id === metricId);
    if (metric) {
      metric.falsePositive = true;
      this.falsePositives.add(metricId);
      console.log(`[SLOP] Metric ${metricId} marked as false positive`);
    }
  }

  /**
   * Resolve metric
   */
  resolveMetric(metricId: string): void {
    const metric = this.metrics.find(m => m.id === metricId);
    if (metric) {
      metric.resolved = true;
      console.log(`[SLOP] Metric ${metricId} resolved`);
    }
  }

  /**
   * Get dashboard data
   */
  getDashboard(): SlopDashboard {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const unresolvedMetrics = this.metrics.filter(m => !m.resolved);
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const metric of unresolvedMetrics) {
      byType[metric.type] = (byType[metric.type] || 0) + 1;
      bySeverity[metric.severity] = (bySeverity[metric.severity] || 0) + 1;
    }

    const falsePositiveRate = this.metrics.length > 0
      ? this.falsePositives.size / this.metrics.length
      : 0;

    const resolvedRate = this.metrics.length > 0
      ? this.metrics.filter(m => m.resolved).length / this.metrics.length
      : 0;

    const topIssues = unresolvedMetrics
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const recommendations = this.generateRecommendations(unresolvedMetrics, falsePositiveRate);

    return {
      summary: {
        totalDetections: unresolvedMetrics.length,
        byType,
        bySeverity,
        falsePositiveRate,
        resolvedRate,
      },
      trends: {
        last24h: this.metrics.filter(m => m.timestamp >= last24h).length,
        last7d: this.metrics.filter(m => m.timestamp >= last7d).length,
        last30d: this.metrics.filter(m => m.timestamp >= last30d).length,
      },
      topIssues,
      recommendations,
    };
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: SlopMetric['type']): SlopMetric[] {
    return this.metrics.filter(m => m.type === type && !m.resolved);
  }

  /**
   * Get metrics by severity
   */
  getMetricsBySeverity(severity: SlopMetric['severity']): SlopMetric[] {
    return this.metrics.filter(m => m.severity === severity && !m.resolved);
  }

  /**
   * Calculate false positive rate
   */
  getFalsePositiveRate(): number {
    if (this.metrics.length === 0) return 0;
    return this.falsePositives.size / this.metrics.length;
  }

  /**
   * Check if false positive rate is acceptable
   */
  isFalsePositiveRateAcceptable(): boolean {
    return this.getFalsePositiveRate() <= this.config.falsePositiveRate;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): SlopMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear resolved metrics older than N days
   */
  clearOldMetrics(days: number = 30): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const before = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => {
      if (m.resolved && m.timestamp < cutoff) {
        this.falsePositives.delete(m.id);
        return false;
      }
      return true;
    });

    const cleared = before - this.metrics.length;
    console.log(`[SLOP] Cleared ${cleared} old metrics`);
    return cleared;
  }

  /**
   * Private: Calculate quality score
   */
  private calculateQualityScore(output: any, expected: any): number {
    if (typeof output !== 'object' || typeof expected !== 'object') {
      return output === expected ? 1.0 : 0.0;
    }

    let matches = 0;
    let total = 0;

    for (const key in expected) {
      total++;
      if (output[key] === expected[key]) {
        matches++;
      } else if (typeof output[key] === 'number' && typeof expected[key] === 'number') {
        const diff = Math.abs(output[key] - expected[key]);
        const avg = (Math.abs(output[key]) + Math.abs(expected[key])) / 2;
        matches += 1 - Math.min(diff / avg, 1);
      }
    }

    return total > 0 ? matches / total : 1.0;
  }

  /**
   * Private: Identify quality issues
   */
  private identifyQualityIssues(output: any, expected: any): string[] {
    const issues: string[] = [];

    if (typeof output !== 'object' || typeof expected !== 'object') {
      if (output !== expected) {
        issues.push('value_mismatch');
      }
      return issues;
    }

    for (const key in expected) {
      if (!(key in output)) {
        issues.push(`missing_field:${key}`);
      } else if (output[key] !== expected[key]) {
        issues.push(`incorrect_value:${key}`);
      }
    }

    return issues;
  }

  /**
   * Private: Categorize severity
   */
  private categorizeSeverity(qualityScore: number): SlopMetric['severity'] {
    if (qualityScore < 0.3) return 'critical';
    if (qualityScore < 0.5) return 'high';
    if (qualityScore < 0.7) return 'medium';
    return 'low';
  }

  /**
   * Private: Record pattern quality
   */
  private recordPatternQuality(pattern: string, quality: number): void {
    if (!this.config.enablePatternLearning) return;

    const scores = this.patterns.get(pattern) || [];
    scores.push(quality);

    // Keep last 100 scores
    if (scores.length > 100) {
      scores.shift();
    }

    this.patterns.set(pattern, scores);
  }

  /**
   * Private: Generate recommendations
   */
  private generateRecommendations(
    unresolvedMetrics: SlopMetric[],
    falsePositiveRate: number
  ): string[] {
    const recommendations: string[] = [];

    const criticalCount = unresolvedMetrics.filter(m => m.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical slop issues immediately`);
    }

    if (falsePositiveRate > this.config.falsePositiveRate) {
      recommendations.push(
        `False positive rate (${(falsePositiveRate * 100).toFixed(1)}%) exceeds threshold (${(this.config.falsePositiveRate * 100).toFixed(1)}%)`
      );
      recommendations.push('Review detection thresholds or improve output validation');
    }

    const degradationCount = unresolvedMetrics.filter(m => m.type === 'execution_degradation').length;
    if (degradationCount > 5) {
      recommendations.push(`${degradationCount} execution degradation issues - investigate performance bottlenecks`);
    }

    const anomalyCount = unresolvedMetrics.filter(m => m.type === 'pattern_anomaly').length;
    if (anomalyCount > 3) {
      recommendations.push(`${anomalyCount} pattern anomalies detected - review workflow changes`);
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating within normal parameters');
    }

    return recommendations;
  }

  /**
   * Private: Generate unique ID
   */
  private generateId(): string {
    return `slop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
let slopDetectionInstance: SlopDetectionSystem | null = null;

export function initializeSlopDetection(config?: Partial<SlopDetectionConfig>): SlopDetectionSystem {
  if (!slopDetectionInstance) {
    slopDetectionInstance = new SlopDetectionSystem(config);
  }
  return slopDetectionInstance;
}

export function getSlopDetectionInstance(): SlopDetectionSystem | null {
  return slopDetectionInstance;
}
