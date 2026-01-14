/**
 * Health Check System - Adaptive Monitoring
 * =========================================
 * Implements "lived embodied hygiene" by scaling check frequency
 * based on system stress and anomaly rates.
 */

export interface HealthMetric {
  failRate: number;
  p99Latency: number;
  anomalyRate: number;
  timestamp: string;
}

export interface HealthCheckConfig {
  baseIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  anomalyThreshold: number;
}

export class HealthCheckSystem {
  private config: HealthCheckConfig;
  private currentIntervalMs: number;
  private metrics: HealthMetric[] = [];

  constructor(config?: Partial<HealthCheckConfig>) {
    this.config = {
      baseIntervalMs: config?.baseIntervalMs || 60000, // 1 minute
      minIntervalMs: config?.minIntervalMs || 5000,    // 5 seconds (high stress)
      maxIntervalMs: config?.maxIntervalMs || 300000, // 5 minutes (idle/healthy)
      anomalyThreshold: config?.anomalyThreshold || 0.15
    };
    this.currentIntervalMs = this.config.baseIntervalMs;
  }

  /**
   * Calculate anomaly rate based on recent metrics
   */
  public calculateAnomalyRate(recentMetrics: { success: boolean; latency: number }[]): number {
    if (recentMetrics.length === 0) return 0;

    const failures = recentMetrics.filter(m => !m.success).length;
    const failRate = failures / recentMetrics.length;

    // Latency spike detection (simple p90/p99 heuristic)
    const latencies = recentMetrics.map(m => m.latency).sort((a, b) => a - b);
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Anomaly if p99 > 3x average
    const latencyAnomaly = p99 > avg * 3 ? 0.5 : 0;

    // Proportional failure anomaly (0.0 to 1.0)
    // If failRate > 0.1, contributes significantly
    const failAnomaly = failRate > 0.1 ? Math.min(0.8, failRate * 1.5) : 0;

    const totalAnomaly = Math.min(1.0, latencyAnomaly + failAnomaly);

    this.metrics.push({
      failRate,
      p99Latency: p99,
      anomalyRate: totalAnomaly,
      timestamp: new Date().toISOString()
    });

    if (this.metrics.length > 100) this.metrics.shift();

    return totalAnomaly;
  }

  /**
   * Get adaptive check frequency based on system stress
   */
  public getAdaptiveInterval(): number {
    if (this.metrics.length === 0) return this.config.baseIntervalMs;

    const recent = this.metrics[this.metrics.length - 1];

    // Scale interval inversely with anomaly rate
    // anomalyRate = 1.0 -> minIntervalMs
    // anomalyRate = 0.0 -> maxIntervalMs
    const scale = 1.0 - recent.anomalyRate;
    const adaptiveInterval = this.config.minIntervalMs + (this.config.maxIntervalMs - this.config.minIntervalMs) * scale;

    this.currentIntervalMs = Math.round(adaptiveInterval);
    return this.currentIntervalMs;
  }

  /**
   * Check if a check should be performed now
   */
  public shouldCheck(lastCheckTs: number): boolean {
    const elapsed = Date.now() - lastCheckTs;
    return elapsed >= this.currentIntervalMs;
  }

  public getStatus() {
    return {
      currentIntervalMs: this.currentIntervalMs,
      latestAnomalyRate: this.metrics[this.metrics.length - 1]?.anomalyRate || 0,
      metricCount: this.metrics.length
    };
  }
}

export default HealthCheckSystem;
