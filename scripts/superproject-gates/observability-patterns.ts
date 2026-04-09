/**
 * Observability Patterns System
 * Implements missing observability patterns for production monitoring
 */

export interface ObservabilityPattern {
  patternId: string;
  patternName: string;
  category: 'performance' | 'reliability' | 'availability' | 'latency' | 'error_rate' | 'throughput' | 'circuit_breaker' | 'skill_usage' | 'decision_audit';
  enabled: boolean;
  lastEmitted: string | null;
  emitCount: number;
  lastValue: number | null;
}

export interface PatternMetrics {
  patternId: string;
  patternName: string;
  category: string;
  value: number;
  threshold: number;
  status: 'ok' | 'warning' | 'critical';
  timestamp: string;
  metadata: Record<string, any>;
}

export class ObservabilityPatterns {
  private patterns: Map<string, ObservabilityPattern> = new Map();
  private metrics: PatternMetrics[] = [];

  /**
   * Initialize all observability patterns
   */
  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize pattern definitions
   */
  private initializePatterns(): void {
    // Performance patterns
    this.patterns.set('p95_latency', {
      patternId: 'p95_latency',
      patternName: 'P95 Response Latency',
      category: 'latency',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    this.patterns.set('p99_latency', {
      patternId: 'p99_latency',
      patternName: 'P99 Response Latency',
      category: 'latency',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    this.patterns.set('error_rate', {
      patternId: 'error_rate',
      patternName: 'Error Rate',
      category: 'error_rate',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    this.patterns.set('throughput', {
      patternId: 'throughput',
      patternName: 'Request Throughput',
      category: 'throughput',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    // Reliability patterns
    this.patterns.set('uptime', {
      patternId: 'uptime',
      patternName: 'Service Uptime',
      category: 'availability',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    this.patterns.set('circuit_breaker_state', {
      patternId: 'circuit_breaker_state',
      patternName: 'Circuit Breaker State',
      category: 'circuit_breaker',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    // Skill usage patterns
    this.patterns.set('skill_confidence', {
      patternId: 'skill_confidence',
      patternName: 'Skill Confidence',
      category: 'skill_usage',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    this.patterns.set('skill_usage_count', {
      patternId: 'skill_usage_count',
      patternName: 'Skill Usage Count',
      category: 'skill_usage',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    // Decision audit patterns
    this.patterns.set('decision_frequency', {
      patternId: 'decision_frequency',
      patternName: 'Decision Frequency',
      category: 'decision_audit',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });

    this.patterns.set('decision_outcome_distribution', {
      patternId: 'decision_outcome_distribution',
      patternName: 'Decision Outcome Distribution',
      category: 'decision_audit',
      enabled: true,
      lastEmitted: null,
      emitCount: 0,
      lastValue: null,
    });
  }

  /**
   * Emit an observability pattern
   */
  emitPattern(patternId: string, value: number, metadata: Record<string, any> = {}): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern || !pattern.enabled) {
      console.warn(`[Observability] Pattern ${patternId} not found or disabled`);
      return;
    }

    pattern.lastEmitted = new Date().toISOString();
    pattern.emitCount++;
    pattern.lastValue = value;

    // Determine status based on threshold
    const threshold = this.getThreshold(patternId);
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    
    if (pattern.category === 'latency' && value > threshold * 1.5) {
      status = 'critical';
    } else if (pattern.category === 'error_rate' && value > threshold * 2) {
      status = 'critical';
    } else if (pattern.category === 'availability' && value < threshold * 0.95) {
      status = 'critical';
    } else if (value > threshold * 1.2 && value < threshold * 1.5) {
      status = 'warning';
    }

    const metric: PatternMetrics = {
      patternId,
      patternName: pattern.patternName,
      category: pattern.category,
      value,
      threshold,
      status,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.metrics.push(metric);
    
    console.log(`[Observability] Emitted pattern: ${patternId} = ${value} (${status})`);
  }

  /**
   * Get threshold for a pattern
   */
  private getThreshold(patternId: string): number {
    const thresholds: Record<string, number> = {
      p95_latency: 500,
      p99_latency: 1000,
      error_rate: 0.05,
      throughput: 100,
      uptime: 0.99,
      skill_confidence: 70,
      skill_usage_count: 10,
      decision_frequency: 60, // decisions per minute
    };
    
    return thresholds[patternId] || 100;
  }

  /**
   * Get all patterns
   */
  getPatterns(): ObservabilityPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get all metrics
   */
  getMetrics(): PatternMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: string): PatternMetrics[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Get metrics by status
   */
  getMetricsByStatus(status: 'ok' | 'warning' | 'critical'): PatternMetrics[] {
    return this.metrics.filter(m => m.status === status);
  }

  /**
   * Get pattern statistics
   */
  getPatternStatistics(): {
    totalPatterns: number;
    enabledPatterns: number;
    totalEmits: number;
    criticalCount: number;
    warningCount: number;
    okCount: number;
  } {
    const patterns = Array.from(this.patterns.values());
    const totalPatterns = patterns.length;
    const enabledPatterns = patterns.filter(p => p.enabled).length;
    const totalEmits = patterns.reduce((sum, p) => sum + p.emitCount, 0);
    const criticalCount = this.getMetricsByStatus('critical').length;
    const warningCount = this.getMetricsByStatus('warning').length;
    const okCount = this.getMetricsByStatus('ok').length;
    
    return {
      totalPatterns,
      enabledPatterns,
      totalEmits,
      criticalCount,
      warningCount,
      okCount,
    };
  }

  /**
   * Reset all patterns
   */
  reset(): void {
    for (const pattern of this.patterns.values()) {
      pattern.lastEmitted = null;
      pattern.emitCount = 0;
      pattern.lastValue = null;
    }
    this.metrics = [];
    console.log('[Observability] All patterns reset');
  }
}

// Singleton instance
let observabilityInstance: ObservabilityPatterns | null;

export function getObservabilityPatterns(): ObservabilityPatterns {
  if (!observabilityInstance) {
    observabilityInstance = new ObservabilityPatterns();
  }
  return observabilityInstance;
}
