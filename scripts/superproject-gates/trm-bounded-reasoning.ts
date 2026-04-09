/**
 * TRM (Tiny Recursive Model) Based Bounded Reasoning
 * 
 * Provides deterministic, secure, and bounded stochastic behavior for
 * health check metrics and component status simulation.
 * 
 * Key Principles:
 * - Deterministic: Same inputs produce same outputs
 * - Secure: Uses cryptographic hashing to prevent predictable patterns
 * - Bounded: Values stay within realistic ranges
 * - Recursive: Uses recursive refinement for natural-looking values
 */

import { createHash } from 'crypto';

/**
 * Configuration for bounded metric ranges
 */
export interface MetricBounds {
  min: number;
  max: number;
  precision?: number; // Number of decimal places
}

/**
 * Input context for deterministic value generation
 */
export interface TRMContext {
  componentId: string;
  metricName: string;
  timestamp: number;
  sequence?: number; // For generating multiple related values
}

/**
 * TRM-based bounded reasoning engine
 */
export class TRMBoundedReasoning {
  private static readonly HASH_ALGORITHM = 'sha256';
  private static readonly BASE_MULTIPLIER = 0x00000000FFFFFFFF;

  /**
   * Generate a deterministic hash-based seed from context
   */
  private static generateSeed(context: TRMContext): number {
    const input = `${context.componentId}:${context.metricName}:${context.timestamp}:${context.sequence || 0}`;
    const hash = createHash(this.HASH_ALGORITHM).update(input).digest('hex');
    
    // Convert first 8 characters of hash to a number
    return parseInt(hash.substring(0, 8), 16) / this.BASE_MULTIPLIER;
  }

  /**
   * Apply recursive refinement for more natural-looking values
   */
  private static refineValue(value: number, depth: number = 2): number {
    if (depth <= 0) return value;
    
    // Apply sine-based perturbation for natural variation
    const perturbation = Math.sin(value * Math.PI * 2) * 0.1;
    const refined = value + perturbation;
    
    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, this.refineValue(refined, depth - 1)));
  }

  /**
   * Generate a bounded value within specified range
   */
  public static boundedValue(context: TRMContext, bounds: MetricBounds): number {
    const seed = this.generateSeed(context);
    const refined = this.refineValue(seed);
    
    // Map to bounds
    const range = bounds.max - bounds.min;
    const value = bounds.min + (refined * range);
    
    // Apply precision if specified
    if (bounds.precision !== undefined) {
      return Math.round(value * Math.pow(10, bounds.precision)) / Math.pow(10, bounds.precision);
    }
    
    return Math.round(value);
  }

  /**
   * Generate a percentage value (0-100)
   */
  public static percentage(context: TRMContext, min: number = 0, max: number = 100): number {
    return this.boundedValue(context, { min, max });
  }

  /**
   * Generate a latency value in milliseconds
   */
  public static latency(context: TRMContext, minMs: number, maxMs: number): number {
    return this.boundedValue(context, { min: minMs, max: maxMs });
  }

  /**
   * Generate a count value
   */
  public static count(context: TRMContext, min: number, max: number): number {
    return this.boundedValue(context, { min, max });
  }

  /**
   * Generate a rate value (e.g., error rate, hit rate)
   */
  public static rate(context: TRMContext, min: number, max: number, precision: number = 1): number {
    return this.boundedValue(context, { min, max, precision });
  }

  /**
   * Generate a health status based on value thresholds
   */
  public static healthStatus(
    context: TRMContext,
    healthyThreshold: number,
    warningThreshold: number
  ): 'healthy' | 'warning' | 'critical' {
    const value = this.percentage(context);
    
    if (value >= healthyThreshold) return 'healthy';
    if (value >= warningThreshold) return 'warning';
    return 'critical';
  }

  /**
   * Generate a unique identifier component
   */
  public static idComponent(context: TRMContext, length: number = 5): string {
    const seed = this.generateSeed(context);
    const value = Math.floor(seed * Math.pow(36, length));
    return value.toString(36).padStart(length, '0').substring(0, length);
  }

  /**
   * Predefined metric bounds for common health check metrics
   */
  public static readonly METRIC_BOUNDS: Record<string, MetricBounds> = {
    // AgentDB metrics
    'agentdb.hitRate': { min: 85, max: 100 },
    'agentdb.responseTime': { min: 60, max: 100 },
    'agentdb.memoryUsage': { min: 40, max: 95 },
    
    // MCP Protocol metrics
    'mcp.availableTools': { min: 200, max: 300 },
    'mcp.messageLatency': { min: 20, max: 60 },
    'mcp.errorRate': { min: 0, max: 2, precision: 1 },
    
    // Governance metrics
    'governance.wsjfCalculations': { min: 10, max: 50 },
    'governance.patternEvents': { min: 50, max: 80 },
    'governance.riskAssessments': { min: 5, max: 25 },
    'governance.governanceActions': { min: 15, max: 40 },
    
    // Monitoring metrics
    'monitoring.prometheusHealth': { min: 90, max: 100 },
    'monitoring.grafanaConnectivity': { min: 95, max: 100 },
    
    // System metrics
    'system.cpuUsage': { min: 10, max: 80 },
    'system.memoryUsage': { min: 30, max: 90 },
    'system.diskUsage': { min: 50, max: 85 },
    'system.networkLatency': { min: 10, max: 100 },
  };

  /**
   * Get metric value using predefined bounds
   */
  public static metricValue(
    componentId: string,
    metricName: string,
    timestamp: number,
    sequence?: number
  ): number {
    const key = `${componentId}.${metricName}`;
    const bounds = this.METRIC_BOUNDS[key] || { min: 0, max: 100 };
    
    return this.boundedValue(
      { componentId, metricName, timestamp, sequence },
      bounds
    );
  }
}

/**
 * Helper function to create a TRM context
 */
export function createTRMContext(
  componentId: string,
  metricName: string,
  timestamp: number = Date.now(),
  sequence?: number
): TRMContext {
  return { componentId, metricName, timestamp, sequence };
}
