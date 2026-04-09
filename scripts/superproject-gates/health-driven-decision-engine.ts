/**
 * Health-Driven Decision Engine
 *
 * Implements P2 Priority: Health-Driven Decision Making
 *
 * This engine weighs system health metrics as the primary factor in all operational choices.
 * It integrates health metrics from multiple sources and makes decisions based on health thresholds.
 *
 * Philosophical Foundations:
 * - Manthra: Directed thought-power ensuring logical separation and contextual awareness
 * - Yasna: Disciplined alignment through consistent interfaces and type safety
 * - Mithra: Binding force preventing code drift through centralized state management
 *
 * Health Thresholds:
 * - High health (>90%): Full automation allowed
 * - Medium health (70-90%): Partial automation with approval
 * - Low health (50-70%): Manual approval required
 * - Critical health (<50%): Emergency mode, critical actions only
 */

import { EventEmitter } from 'events';
import { getDecisionAuditLogger, createDecisionAuditEntry, DecisionType, DecisionOutcome, CircleRole } from './decision-audit.js';
import type {
  SystemMetrics,
  ComponentHealthMetrics,
  AgentDBMetrics,
  MCPProtocolMetrics,
  GovernanceSystemMetrics,
  MonitoringStackMetrics
} from '../core/metrics/component-health-provider.js';

import type { SystemHealth } from '../core/health-checks.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Health score aggregation method
 */
export type HealthScoreAggregationMethod =
  | 'weighted_average'
  | 'geometric_mean'
  | 'harmonic_mean'
  | 'minimum';

/**
 * Health level classification
 */
export type HealthLevel = 'critical' | 'low' | 'medium' | 'high';

/**
 * Decision automation level based on health
 */
export type AutomationLevel =
  | 'full_automation'
  | 'partial_automation_with_approval'
  | 'manual_approval_required'
  | 'emergency_mode';

/**
 * Health trend direction
 */
export type HealthTrendDirection = 'improving' | 'stable' | 'degrading';

/**
 * Aggregated health score from multiple sources
 */
export interface AggregatedHealthScore {
  overall: number;
  systemHealth: number;
  componentHealth: number;
  performance: number;
  security: number;
  availability: number;
  resourceUtilization: number;
  timestamp: Date;
  level: HealthLevel;
}

/**
 * Health trend analysis result
 */
export interface HealthTrendAnalysis {
  direction: HealthTrendDirection;
  changeRate: number;
  confidence: number;
  predictedScore: number;
  timeframe: number; // minutes
  recommendations: string[];
}

/**
 * Health anomaly detection result
 */
export interface HealthAnomalyDetection {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  contributingMetrics: Array<{
    name: string;
    value: number;
    expectedValue: number;
    deviation: number;
  }>;
  timestamp: Date;
}

/**
 * Decision request with health context
 */
export interface DecisionRequest {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  requiresApproval: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Decision response with health-based recommendations
 */
export interface DecisionResponse {
  requestId: string;
  approved: boolean;
  automationLevel: AutomationLevel;
  healthScore: AggregatedHealthScore;
  reasoning: string;
  conditions: string[];
  riskAssessment: {
    overall: 'critical' | 'high' | 'medium' | 'low';
    factors: Array<{
      name: string;
      impact: 'positive' | 'negative' | 'neutral';
      value: number;
    }>;
  };
  resourceAllocation: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  priorityAdjustment: number;
  recommendations: string[];
  warnings: string[];
  timestamp: Date;
}

/**
 * Health-based decision rule
 */
export interface HealthDecisionRule {
  id: string;
  name: string;
  description: string;
  healthLevel: HealthLevel;
  automationLevel: AutomationLevel;
  conditions: Array<{
    metric: string;
    operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
    value: number;
  }>;
  actions: string[];
  priority: number;
}

/**
 * Decision execution context with health monitoring
 */
export interface DecisionExecutionContext {
  decisionId: string;
  preExecutionHealth: AggregatedHealthScore;
  startTime: Date;
  healthMonitoringEnabled: boolean;
  rollbackTriggered: boolean;
  rollbackReason?: string;
  healthCheckpoints: Array<{
    timestamp: Date;
    healthScore: AggregatedHealthScore;
    status: 'ok' | 'warning' | 'critical';
  }>;
}

/**
 * Health-based optimization recommendation
 */
export interface HealthOptimizationRecommendation {
  id: string;
  type: 'resource_scaling' | 'maintenance_scheduling' | 'capacity_planning' | 'performance_tuning';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  currentHealth: AggregatedHealthScore;
  expectedImprovement: number;
  estimatedImpact: {
    healthScore: number;
    performance: number;
    cost: number;
  };
  actions: Array<{
    name: string;
    description: string;
    estimatedDuration: number;
    resourceImpact: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
  }>;
  timestamp: Date;
}

/**
 * Health dashboard data
 */
export interface HealthDashboardData {
  currentHealth: AggregatedHealthScore;
  healthTrend: HealthTrendAnalysis;
  anomalyDetection: HealthAnomalyDetection;
  recentDecisions: DecisionResponse[];
  optimizationRecommendations: HealthOptimizationRecommendation[];
  healthHistory: Array<{
    timestamp: Date;
    healthScore: AggregatedHealthScore;
  }>;
  decisionOutcomeCorrelation: Array<{
    decisionId: string;
    healthScore: number;
    outcome: 'success' | 'partial' | 'failed';
    healthImpact: number;
  }>;
  lastUpdated: Date;
}

/**
 * Decision audit trail entry
 */
export interface DecisionAuditTrail {
  id: string;
  decisionId: string;
  timestamp: Date;
  healthScore: AggregatedHealthScore;
  decision: string;
  approved: boolean;
  automationLevel: AutomationLevel;
  reasoning: string;
  executionContext?: DecisionExecutionContext;
  outcome?: {
    status: 'success' | 'partial' | 'failed';
    healthImpact: number;
    rollbackTriggered: boolean;
  };
  evidence: Array<{
    type: 'metric' | 'rule' | 'trend' | 'anomaly';
    data: unknown;
    timestamp: Date;
  }>;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Configuration for Health-Driven Decision Engine
 */
export interface HealthDrivenDecisionEngineConfig {
  healthHistoryMaxSize?: number;
  auditTrailMaxSize?: number;
  healthTrendWindow?: number;
  anomalyDetectionThreshold?: number;
  healthWeights?: Partial<HealthDrivenDecisionEngine['healthWeights']>;
}

/**
 * Create default health-driven decision engine
 */
export function createDefaultHealthDrivenDecisionEngine(): HealthDrivenDecisionEngine {
  return new HealthDrivenDecisionEngine();
}

/**
 * Create health-driven decision engine from configuration
 */
export function createHealthDrivenDecisionEngineFromConfig(
  config: HealthDrivenDecisionEngineConfig
): HealthDrivenDecisionEngine {
  return new HealthDrivenDecisionEngine(config);
}

// ============================================================================
// HEALTH-DRIVEN DECISION ENGINE
// ============================================================================

export class HealthDrivenDecisionEngine extends EventEmitter {
  private healthHistory: Array<{ timestamp: Date; healthScore: AggregatedHealthScore }> = [];
  private decisionRules: Map<string, HealthDecisionRule> = new Map();
  private decisionAuditTrail: DecisionAuditTrail[] = [];
  private activeExecutions: Map<string, DecisionExecutionContext> = new Map();
  private optimizationRecommendations: HealthOptimizationRecommendation[] = [];
  private healthHistoryMaxSize: number = 1000;
  private auditTrailMaxSize: number = 5000;
  private healthTrendWindow: number = 10; // Number of data points for trend analysis
  private anomalyDetectionThreshold: number = 2.5; // Z-score threshold

  // Health weights for aggregation
  private healthWeights = {
    systemHealth: 0.25,
    componentHealth: 0.25,
    performance: 0.20,
    security: 0.15,
    availability: 0.10,
    resourceUtilization: 0.05
  };

  // Health thresholds
  private healthThresholds = {
    critical: 50,
    low: 70,
    medium: 90,
    high: 100
  };

  constructor(config?: {
    healthHistoryMaxSize?: number;
    auditTrailMaxSize?: number;
    healthTrendWindow?: number;
    anomalyDetectionThreshold?: number;
    healthWeights?: Partial<typeof this.healthWeights>;
  }) {
    super();

    if (config?.healthHistoryMaxSize) {
      this.healthHistoryMaxSize = config.healthHistoryMaxSize;
    }
    if (config?.auditTrailMaxSize) {
      this.auditTrailMaxSize = config.auditTrailMaxSize;
    }
    if (config?.healthTrendWindow) {
      this.healthTrendWindow = config.healthTrendWindow;
    }
    if (config?.anomalyDetectionThreshold) {
      this.anomalyDetectionThreshold = config.anomalyDetectionThreshold;
    }
    if (config?.healthWeights) {
      this.healthWeights = { ...this.healthWeights, ...config.healthWeights };
    }

    this.initializeDefaultDecisionRules();
    console.log('[HEALTH-ENGINE] Health-Driven Decision Engine initialized');
  }

  // ============================================================================
  // HEALTH METRICS INTEGRATION
  // ============================================================================

  /**
   * Aggregate health metrics from multiple sources into a single health score
   */
  public aggregateHealthMetrics(
    systemHealth: SystemHealth,
    performanceMetrics?: SystemMetrics,
    securityMetrics?: Record<string, number>,
    availabilityMetrics?: Record<string, number>
  ): AggregatedHealthScore {
    const timestamp = new Date();

    // Extract component health scores
    const componentScores = this.extractComponentScores(systemHealth);

    // Calculate individual health dimensions
    const systemHealthScore = this.calculateSystemHealthScore(systemHealth);
    const componentHealthScore = this.calculateComponentHealthScore(componentScores);
    const performanceScore = this.calculatePerformanceScore(performanceMetrics, componentScores);
    const securityScore = this.calculateSecurityScore(securityMetrics, systemHealth);
    const availabilityScore = this.calculateAvailabilityScore(availabilityMetrics, componentScores);
    const resourceUtilizationScore = this.calculateResourceUtilizationScore(performanceMetrics);

    // Aggregate overall health score using weighted average
    const overall = this.aggregateScores({
      systemHealth: systemHealthScore,
      componentHealth: componentHealthScore,
      performance: performanceScore,
      security: securityScore,
      availability: availabilityScore,
      resourceUtilization: resourceUtilizationScore
    }, 'weighted_average');

    const healthScore: AggregatedHealthScore = {
      overall,
      systemHealth: systemHealthScore,
      componentHealth: componentHealthScore,
      performance: performanceScore,
      security: securityScore,
      availability: availabilityScore,
      resourceUtilization: resourceUtilizationScore,
      timestamp,
      level: this.determineHealthLevel(overall)
    };

    // Store in health history
    this.addToHealthHistory(healthScore);

    console.log(`[HEALTH-ENGINE] Health metrics aggregated - Overall: ${overall.toFixed(1)}% (${healthScore.level})`);

    return healthScore;
  }

  /**
   * Extract component health scores from system health
   */
  private extractComponentScores(systemHealth: SystemHealth): Record<string, number> {
    const scores: Record<string, number> = {};

    // Map component status to numeric scores
    const statusToScore: Record<string, number> = {
      healthy: 100,
      warning: 70,
      critical: 30,
      unknown: 50
    };

    scores.orchestration = statusToScore[systemHealth.components.orchestration.status];
    scores.agentdb = statusToScore[systemHealth.components.agentdb.status];
    scores.mcp = statusToScore[systemHealth.components.mcp.status];
    scores.governance = statusToScore[systemHealth.components.governance.status];
    scores.monitoring = statusToScore[systemHealth.components.monitoring.status];

    return scores;
  }

  /**
   * Calculate system health score
   */
  private calculateSystemHealthScore(systemHealth: SystemHealth): number {
    // Consider overall status and component statuses
    const statusWeight = 0.4;
    const metricsWeight = 0.6;

    const statusScore = systemHealth.overall === 'healthy' ? 100 :
                      systemHealth.overall === 'warning' ? 70 : 30;

    // Calculate metrics score from system metrics
    const metrics = systemHealth.metrics;
    const metricsScore = (
      (100 - metrics.cpu) * 0.3 + // Lower CPU usage is better
      (100 - metrics.memory) * 0.3 + // Lower memory usage is better
      (100 - metrics.disk) * 0.2 + // Lower disk usage is better
      (100 - Math.min(metrics.network / 10, 100)) * 0.1 + // Lower latency is better
      Math.min(metrics.uptime / 86400 * 100, 100) * 0.1 // Higher uptime is better
    );

    return statusScore * statusWeight + metricsScore * metricsWeight;
  }

  /**
   * Calculate component health score
   */
  private calculateComponentHealthScore(componentScores: Record<string, number>): number {
    const components = Object.values(componentScores);
    return components.reduce((sum, score) => sum + score, 0) / components.length;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(
    performanceMetrics?: SystemMetrics,
    componentScores?: Record<string, number>
  ): number {
    if (!performanceMetrics) return 100;

    const cpuScore = 100 - performanceMetrics.cpu;
    const memoryScore = 100 - performanceMetrics.memory;
    const diskScore = 100 - performanceMetrics.disk;
    const networkScore = 100 - Math.min(performanceMetrics.network / 10, 100);

    // Consider component response times if available
    let componentPerformanceScore = 100;
    if (componentScores) {
      // AgentDB response time is in metrics
      const agentdbResponseTime = componentScores.agentdb || 100;
      componentPerformanceScore = Math.max(0, 100 - agentdbResponseTime / 50);
    }

    return (
      cpuScore * 0.25 +
      memoryScore * 0.25 +
      diskScore * 0.20 +
      networkScore * 0.15 +
      componentPerformanceScore * 0.15
    );
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(
    securityMetrics?: Record<string, number>,
    systemHealth?: SystemHealth
  ): number {
    let score = 100;

    // Consider incidents in system health
    if (systemHealth) {
      const criticalIncidents = systemHealth.incidents.filter(i => i.severity === 'critical').length;
      const highIncidents = systemHealth.incidents.filter(i => i.severity === 'high').length;
      const unresolvedIncidents = systemHealth.incidents.filter(i => !i.resolved).length;

      score -= criticalIncidents * 20;
      score -= highIncidents * 10;
      score -= unresolvedIncidents * 5;
    }

    // Consider security metrics if available
    if (securityMetrics) {
      score = score * (securityMetrics.score || 1);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(
    availabilityMetrics?: Record<string, number>,
    componentScores?: Record<string, number>
  ): number {
    let score = 100;

    // Consider component health as availability indicator
    if (componentScores) {
      const avgComponentHealth = Object.values(componentScores).reduce((sum, s) => sum + s, 0) / Object.keys(componentScores).length;
      score = avgComponentHealth;
    }

    // Consider availability metrics if available
    if (availabilityMetrics) {
      score = score * (availabilityMetrics.uptime || 1);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate resource utilization score
   */
  private calculateResourceUtilizationScore(performanceMetrics?: SystemMetrics): number {
    if (!performanceMetrics) return 100;

    // Lower utilization is better for headroom
    const cpuUtilization = performanceMetrics.cpu;
    const memoryUtilization = performanceMetrics.memory;
    const diskUtilization = performanceMetrics.disk;

    // Calculate headroom score (inverse of utilization)
    const cpuHeadroom = 100 - cpuUtilization;
    const memoryHeadroom = 100 - memoryUtilization;
    const diskHeadroom = 100 - diskUtilization;

    return (
      cpuHeadroom * 0.4 +
      memoryHeadroom * 0.4 +
      diskHeadroom * 0.2
    );
  }

  /**
   * Aggregate multiple scores using specified method
   */
  private aggregateScores(
    scores: Record<string, number>,
    method: HealthScoreAggregationMethod
  ): number {
    const values = Object.values(scores);

    switch (method) {
      case 'weighted_average':
        return this.weightedAverage(scores);
      case 'geometric_mean':
        return this.geometricMean(values);
      case 'harmonic_mean':
        return this.harmonicMean(values);
      case 'minimum':
        return Math.min(...values);
      default:
        return this.weightedAverage(scores);
    }
  }

  /**
   * Calculate weighted average of scores
   */
  private weightedAverage(scores: Record<string, number>): number {
    let sum = 0;
    let totalWeight = 0;

    for (const [key, value] of Object.entries(scores)) {
      const weight = this.healthWeights[key as keyof typeof this.healthWeights] || 0;
      sum += value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? sum / totalWeight : 0;
  }

  /**
   * Calculate geometric mean of values
   */
  private geometricMean(values: number[]): number {
    if (values.length === 0) return 0;
    const product = values.reduce((acc, val) => acc * Math.max(val, 0.01), 1);
    return Math.pow(product, 1 / values.length);
  }

  /**
   * Calculate harmonic mean of values
   */
  private harmonicMean(values: number[]): number {
    if (values.length === 0) return 0;
    const reciprocalSum = values.reduce((acc, val) => acc + (val > 0 ? 1 / val : 0), 0);
    return reciprocalSum > 0 ? values.length / reciprocalSum : 0;
  }

  /**
   * Determine health level from score
   */
  private determineHealthLevel(score: number): HealthLevel {
    if (score >= this.healthThresholds.medium) return 'high';
    if (score >= this.healthThresholds.low) return 'medium';
    if (score >= this.healthThresholds.critical) return 'low';
    return 'critical';
  }

  /**
   * Add health score to history
   */
  private addToHealthHistory(healthScore: AggregatedHealthScore): void {
    this.healthHistory.push({
      timestamp: healthScore.timestamp,
      healthScore
    });

    // Trim to max size
    if (this.healthHistory.length > this.healthHistoryMaxSize) {
      this.healthHistory = this.healthHistory.slice(-this.healthHistoryMaxSize);
    }

    this.emit('healthScoreUpdated', healthScore);
  }

  // ============================================================================
  // HEALTH TREND ANALYSIS
  // ============================================================================

  /**
   * Analyze health trend from historical data
   */
  public analyzeHealthTrend(windowSize?: number): HealthTrendAnalysis {
    const window = windowSize || this.healthTrendWindow;
    const recentHistory = this.healthHistory.slice(-window);

    if (recentHistory.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        confidence: 0,
        predictedScore: this.getCurrentHealthScore()?.overall || 50,
        timeframe: window * 5, // Assume 5-minute intervals
        recommendations: ['Insufficient data for trend analysis']
      };
    }

    // Calculate trend using linear regression
    const scores = recentHistory.map(h => h.healthScore.overall);
    const timestamps = recentHistory.map(h => h.timestamp.getTime());

    const { slope, rSquared } = this.linearRegression(timestamps, scores);

    // Determine direction
    let direction: HealthTrendDirection = 'stable';
    if (slope > 0.1) direction = 'improving';
    else if (slope < -0.1) direction = 'degrading';

    // Calculate change rate (score per hour)
    const avgInterval = (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1);
    const changeRate = (slope / avgInterval) * 3600000; // Convert to per hour

    // Confidence based on R-squared and sample size
    const confidence = Math.min(1, rSquared * (recentHistory.length / window));

    // Predict future score
    const currentScore = scores[scores.length - 1];
    const predictedScore = Math.max(0, Math.min(100, currentScore + changeRate));

    // Generate recommendations
    const recommendations = this.generateTrendRecommendations(direction, changeRate, confidence);

    const analysis: HealthTrendAnalysis = {
      direction,
      changeRate,
      confidence,
      predictedScore,
      timeframe: window * 5,
      recommendations
    };

    console.log(`[HEALTH-ENGINE] Health trend analyzed - Direction: ${direction}, Change rate: ${changeRate.toFixed(2)}/hr, Confidence: ${(confidence * 100).toFixed(1)}%`);

    this.emit('healthTrendAnalyzed', analysis);

    return analysis;
  }

  /**
   * Perform linear regression on data
   */
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + (yi - predicted) ** 2;
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return { slope, intercept, rSquared };
  }

  /**
   * Generate trend-based recommendations
   */
  private generateTrendRecommendations(
    direction: HealthTrendDirection,
    changeRate: number,
    confidence: number
  ): string[] {
    const recommendations: string[] = [];

    if (direction === 'degrading') {
      if (Math.abs(changeRate) > 5) {
        recommendations.push('CRITICAL: Health is degrading rapidly - immediate investigation required');
      } else {
        recommendations.push('Health is degrading - investigate root cause');
      }
      recommendations.push('Review recent changes and deployments');
      recommendations.push('Check for resource exhaustion');
    } else if (direction === 'improving') {
      recommendations.push('Health is improving - continue current strategy');
      if (confidence > 0.8) {
        recommendations.push('Strong positive trend - consider scaling operations');
      }
    } else {
      recommendations.push('Health is stable - maintain current operations');
    }

    if (confidence < 0.5) {
      recommendations.push('Low confidence in trend - collect more data');
    }

    return recommendations;
  }

  // ============================================================================
  // HEALTH ANOMALY DETECTION
  // ============================================================================

  /**
   * Detect health anomalies using statistical analysis
   */
  public detectHealthAnomaly(currentHealth: AggregatedHealthScore): HealthAnomalyDetection {
    if (this.healthHistory.length < 10) {
      return {
        isAnomaly: false,
        severity: 'low',
        score: 0,
        contributingMetrics: [],
        timestamp: new Date()
      };
    }

    // Calculate Z-scores for each metric
    const contributingMetrics: Array<{
      name: string;
      value: number;
      expectedValue: number;
      deviation: number;
    }> = [];

    const metrics = [
      { name: 'overall', value: currentHealth.overall },
      { name: 'systemHealth', value: currentHealth.systemHealth },
      { name: 'componentHealth', value: currentHealth.componentHealth },
      { name: 'performance', value: currentHealth.performance },
      { name: 'security', value: currentHealth.security },
      { name: 'availability', value: currentHealth.availability },
      { name: 'resourceUtilization', value: currentHealth.resourceUtilization }
    ];

    for (const metric of metrics) {
      const { mean, stdDev } = this.calculateMetricStatistics(metric.name);
      const zScore = stdDev > 0 ? (metric.value - mean) / stdDev : 0;

      if (Math.abs(zScore) > this.anomalyDetectionThreshold) {
        contributingMetrics.push({
          name: metric.name,
          value: metric.value,
          expectedValue: mean,
          deviation: zScore
        });
      }
    }

    // Determine if anomaly based on contributing metrics
    const isAnomaly = contributingMetrics.length > 0;

    // Calculate overall anomaly score
    const maxDeviation = contributingMetrics.length > 0
      ? Math.max(...contributingMetrics.map(m => Math.abs(m.deviation)))
      : 0;

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (maxDeviation > 4) severity = 'critical';
    else if (maxDeviation > 3) severity = 'high';
    else if (maxDeviation > 2.5) severity = 'medium';

    const detection: HealthAnomalyDetection = {
      isAnomaly,
      severity,
      score: maxDeviation,
      contributingMetrics,
      timestamp: new Date()
    };

    if (isAnomaly) {
      console.log(`[HEALTH-ENGINE] Anomaly detected - Severity: ${severity}, Score: ${maxDeviation.toFixed(2)}`);
      this.emit('healthAnomalyDetected', detection);
    }

    return detection;
  }

  /**
   * Calculate statistics for a metric from history
   */
  private calculateMetricStatistics(metricName: string): { mean: number; stdDev: number } {
    const values = this.healthHistory.map(h => {
      switch (metricName) {
        case 'overall': return h.healthScore.overall;
        case 'systemHealth': return h.healthScore.systemHealth;
        case 'componentHealth': return h.healthScore.componentHealth;
        case 'performance': return h.healthScore.performance;
        case 'security': return h.healthScore.security;
        case 'availability': return h.healthScore.availability;
        case 'resourceUtilization': return h.healthScore.resourceUtilization;
        default: return h.healthScore.overall;
      }
    });

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  // ============================================================================
  // HEALTH-BASED DECISION RULES
  // ============================================================================

  /**
   * Evaluate a decision request against health-based rules
   */
  public evaluateDecision(request: DecisionRequest): DecisionResponse {
    const currentHealth = this.getCurrentHealthScore();

    if (!currentHealth) {
      throw new Error('No health data available for decision evaluation');
    }

    // Apply health-based decision rules
    const rule = this.findApplicableRule(currentHealth.level, request);

    // Determine automation level based on health
    const automationLevel = this.determineAutomationLevel(currentHealth.level, request);

    // Perform health-based risk assessment
    const riskAssessment = this.assessDecisionRisk(request, currentHealth);

    // Calculate resource allocation based on health
    const resourceAllocation = this.calculateResourceAllocation(request, currentHealth);

    // Adjust priority based on health
    const priorityAdjustment = this.calculatePriorityAdjustment(request, currentHealth);

    // Generate recommendations
    const recommendations = this.generateDecisionRecommendations(request, currentHealth, rule);

    // Generate warnings
    const warnings = this.generateDecisionWarnings(request, currentHealth);

    // Determine approval
    const approved = this.isDecisionApproved(request, currentHealth, rule);

    const response: DecisionResponse = {
      requestId: request.id,
      approved,
      automationLevel,
      healthScore: currentHealth,
      reasoning: this.generateDecisionReasoning(request, currentHealth, rule, approved),
      conditions: rule.conditions.map(c => `${c.metric} ${c.operator} ${c.value}`),
      riskAssessment,
      resourceAllocation,
      priorityAdjustment,
      recommendations,
      warnings,
      timestamp: new Date()
    };

    // Log to audit trail
    this.addToAuditTrail({
      id: this.generateId('audit'),
      decisionId: request.id,
      timestamp: new Date(),
      healthScore: currentHealth,
      decision: request.name,
      approved,
      automationLevel,
      reasoning: response.reasoning,
      evidence: [
        { type: 'metric', data: currentHealth, timestamp: new Date() },
        { type: 'rule', data: rule, timestamp: new Date() }
      ]
    });

    // Log to governance audit trail
    const logger = getDecisionAuditLogger();
    logger.logDecision(createDecisionAuditEntry({
      decision_id: `health-decision-${request.id}-${Date.now()}`,
      circle_role: 'assessor',
      decision_type: 'governance',
      context: {
        requestId: request.id,
        requestName: request.name,
        healthLevel: currentHealth.level,
        automationLevel,
        approved,
        riskLevel: request.riskLevel,
        priority: request.priority
      },
      outcome: approved ? 'APPROVED' : 'REJECTED',
      rationale: response.reasoning,
      alternatives_considered: [
        'Approve with full automation',
        'Approve with partial automation',
        'Reject due to health constraints',
        'Defer for manual review'
      ],
      evidence_chain: [
        { source: 'health-metrics', weight: 0.4 },
        { source: 'decision-rules', weight: 0.3 },
        { source: 'risk-assessment', weight: 0.3 }
      ]
    }));

    console.log(`[HEALTH-ENGINE] Decision evaluated - ${request.name}: ${approved ? 'APPROVED' : 'REJECTED'} (${automationLevel})`);

    this.emit('decisionEvaluated', response);

    return response;
  }

  /**
   * Find applicable decision rule for health level and request
   */
  private findApplicableRule(
    healthLevel: HealthLevel,
    request: DecisionRequest
  ): HealthDecisionRule {
    // Find rules matching health level
    const matchingRules = Array.from(this.decisionRules.values())
      .filter(rule => rule.healthLevel === healthLevel)
      .sort((a, b) => b.priority - a.priority);

    // Check if rule conditions are met
    for (const rule of matchingRules) {
      if (this.areRuleConditionsMet(rule, request)) {
        return rule;
      }
    }

    // Return default rule if no specific rule matches
    return this.getDefaultRule(healthLevel);
  }

  /**
   * Check if rule conditions are met
   */
  private areRuleConditionsMet(
    rule: HealthDecisionRule,
    request: DecisionRequest
  ): boolean {
    for (const condition of rule.conditions) {
      const value = this.getConditionValue(condition.metric, request);
      const met = this.evaluateCondition(value, condition.operator, condition.value);

      if (!met) return false;
    }

    return true;
  }

  /**
   * Get value for condition evaluation
   */
  private getConditionValue(metric: string, request: DecisionRequest): number {
    switch (metric) {
      case 'priority':
        const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityMap[request.priority];
      case 'riskLevel':
        const riskMap = { critical: 4, high: 3, medium: 2, low: 1 };
        return riskMap[request.riskLevel];
      case 'estimatedDuration':
        return request.estimatedDuration;
      case 'requiresApproval':
        return request.requiresApproval ? 1 : 0;
      default:
        return 0;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '>=': return value >= threshold;
      case '<': return value < threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Determine automation level based on health and request
   */
  private determineAutomationLevel(
    healthLevel: HealthLevel,
    request: DecisionRequest
  ): AutomationLevel {
    // Health-based automation levels
    switch (healthLevel) {
      case 'high':
        return request.requiresApproval ? 'partial_automation_with_approval' : 'full_automation';
      case 'medium':
        return 'partial_automation_with_approval';
      case 'low':
        return 'manual_approval_required';
      case 'critical':
        // Only critical actions allowed in emergency mode
        return request.priority === 'critical' ? 'manual_approval_required' : 'emergency_mode';
      default:
        return 'manual_approval_required';
    }
  }

  /**
   * Assess decision risk based on health
   */
  private assessDecisionRisk(
    request: DecisionRequest,
    health: AggregatedHealthScore
  ): DecisionResponse['riskAssessment'] {
    const factors: Array<{
      name: string;
      impact: 'positive' | 'negative' | 'neutral';
      value: number;
    }> = [];

    // Health level impact
    const healthImpact = health.overall;
    factors.push({
      name: 'Health Score',
      impact: healthImpact > 70 ? 'positive' : healthImpact > 50 ? 'neutral' : 'negative',
      value: healthImpact
    });

    // Priority impact
    const priorityValue = { critical: 4, high: 3, medium: 2, low: 1 }[request.priority];
    factors.push({
      name: 'Request Priority',
      impact: request.priority === 'critical' ? 'negative' : 'neutral',
      value: priorityValue
    });

    // Risk level impact
    const riskValue = { critical: 4, high: 3, medium: 2, low: 1 }[request.riskLevel];
    factors.push({
      name: 'Risk Level',
      impact: request.riskLevel === 'critical' ? 'negative' : 'neutral',
      value: riskValue
    });

    // Duration impact
    factors.push({
      name: 'Duration',
      impact: request.estimatedDuration > 3600 ? 'negative' : 'neutral',
      value: request.estimatedDuration
    });

    // Resource requirements impact
    const avgResourceRequirement = (
      request.resourceRequirements.cpu +
      request.resourceRequirements.memory +
      request.resourceRequirements.disk +
      request.resourceRequirements.network
    ) / 4;
    factors.push({
      name: 'Resource Requirements',
      impact: avgResourceRequirement > 80 ? 'negative' : 'neutral',
      value: avgResourceRequirement
    });

    // Calculate overall risk
    const negativeCount = factors.filter(f => f.impact === 'negative').length;
    const overall = negativeCount >= 3 ? 'critical' :
                  negativeCount >= 2 ? 'high' :
                  negativeCount >= 1 ? 'medium' : 'low';

    return { overall, factors };
  }

  /**
   * Calculate resource allocation based on health
   */
  private calculateResourceAllocation(
    request: DecisionRequest,
    health: AggregatedHealthScore
  ): DecisionResponse['resourceAllocation'] {
    // Scale resource allocation based on health
    const healthFactor = health.overall / 100;

    return {
      cpu: request.resourceRequirements.cpu * healthFactor,
      memory: request.resourceRequirements.memory * healthFactor,
      disk: request.resourceRequirements.disk * healthFactor,
      network: request.resourceRequirements.network * healthFactor
    };
  }

  /**
   * Calculate priority adjustment based on health
   */
  private calculatePriorityAdjustment(
    request: DecisionRequest,
    health: AggregatedHealthScore
  ): number {
    let adjustment = 0;

    // Boost priority for critical requests when health is good
    if (request.priority === 'critical' && health.level === 'high') {
      adjustment = -0.1; // Increase priority (lower is higher)
    }

    // Reduce priority for low-priority requests when health is poor
    if (request.priority === 'low' && health.level === 'critical') {
      adjustment = 0.2; // Decrease priority
    }

    return adjustment;
  }

  /**
   * Generate decision recommendations
   */
  private generateDecisionRecommendations(
    request: DecisionRequest,
    health: AggregatedHealthScore,
    rule: HealthDecisionRule
  ): string[] {
    const recommendations: string[] = [];

    // Add rule-based recommendations
    recommendations.push(...rule.actions);

    // Health-based recommendations
    if (health.level === 'critical') {
      recommendations.push('System in critical state - only emergency actions permitted');
      recommendations.push('Escalate to operations team immediately');
    } else if (health.level === 'low') {
      recommendations.push('System health is low - manual approval required');
      recommendations.push('Monitor execution closely for health degradation');
    } else if (health.level === 'medium') {
      recommendations.push('System health is medium - partial automation with approval');
      recommendations.push('Consider scheduling for off-peak hours');
    } else {
      recommendations.push('System health is good - full automation permitted');
    }

    // Priority-based recommendations
    if (request.priority === 'critical') {
      recommendations.push('Critical priority - expedite execution');
    }

    return recommendations;
  }

  /**
   * Generate decision warnings
   */
  private generateDecisionWarnings(
    request: DecisionRequest,
    health: AggregatedHealthScore
  ): string[] {
    const warnings: string[] = [];

    if (health.level === 'critical') {
      warnings.push('WARNING: System in critical state');
      warnings.push('WARNING: High risk of execution failure');
      warnings.push('WARNING: May trigger emergency rollback');
    }

    if (health.level === 'low' && request.priority === 'critical') {
      warnings.push('WARNING: Critical request on low health system');
    }

    if (request.estimatedDuration > 3600) {
      warnings.push('WARNING: Long-running operation may impact health');
    }

    const avgResourceRequirement = (
      request.resourceRequirements.cpu +
      request.resourceRequirements.memory +
      request.resourceRequirements.disk +
      request.resourceRequirements.network
    ) / 4;

    if (avgResourceRequirement > 80) {
      warnings.push('WARNING: High resource requirements may strain system');
    }

    return warnings;
  }

  /**
   * Determine if decision is approved
   */
  private isDecisionApproved(
    request: DecisionRequest,
    health: AggregatedHealthScore,
    rule: HealthDecisionRule
  ): boolean {
    // Critical health: only critical requests approved
    if (health.level === 'critical') {
      return request.priority === 'critical';
    }

    // Low health: manual approval required
    if (health.level === 'low') {
      return !request.requiresApproval || this.hasManualApproval(request);
    }

    // Medium and high health: approve based on rule
    return true;
  }

  /**
   * Check if request has manual approval
   */
  private hasManualApproval(request: DecisionRequest): boolean {
    // In a real implementation, this would check an approval system
    // For now, assume approval is granted if not explicitly required
    return !request.requiresApproval;
  }

  /**
   * Generate decision reasoning
   */
  private generateDecisionReasoning(
    request: DecisionRequest,
    health: AggregatedHealthScore,
    rule: HealthDecisionRule,
    approved: boolean
  ): string {
    const parts: string[] = [];

    parts.push(`Health score: ${health.overall.toFixed(1)}% (${health.level})`);
    parts.push(`Request priority: ${request.priority}`);
    parts.push(`Risk level: ${request.riskLevel}`);
    parts.push(`Automation level: ${rule.automationLevel}`);

    if (!approved) {
      parts.push('Decision rejected due to health constraints');
    } else {
      parts.push('Decision approved based on health evaluation');
    }

    return parts.join('. ');
  }

  /**
   * Get default rule for health level
   */
  private getDefaultRule(healthLevel: HealthLevel): HealthDecisionRule {
    return {
      id: `default-${healthLevel}`,
      name: `Default ${healthLevel} health rule`,
      description: `Default decision rule for ${healthLevel} health level`,
      healthLevel,
      automationLevel: this.getAutomationLevelForHealth(healthLevel),
      conditions: [],
      actions: [],
      priority: 0
    };
  }

  /**
   * Get automation level for health level
   */
  private getAutomationLevelForHealth(healthLevel: HealthLevel): AutomationLevel {
    switch (healthLevel) {
      case 'high': return 'full_automation';
      case 'medium': return 'partial_automation_with_approval';
      case 'low': return 'manual_approval_required';
      case 'critical': return 'emergency_mode';
      default: return 'manual_approval_required';
    }
  }

  /**
   * Initialize default decision rules
   */
  private initializeDefaultDecisionRules(): void {
    const defaultRules: HealthDecisionRule[] = [
      {
        id: 'high-health-full-automation',
        name: 'High Health - Full Automation',
        description: 'Allow full automation when health is high (>90%)',
        healthLevel: 'high',
        automationLevel: 'full_automation',
        conditions: [
          { metric: 'priority', operator: '<=', value: 3 }
        ],
        actions: [
          'Execute automatically',
          'Monitor for health degradation',
          'Log execution metrics'
        ],
        priority: 10
      },
      {
        id: 'medium-health-partial-automation',
        name: 'Medium Health - Partial Automation',
        description: 'Require approval for automation when health is medium (70-90%)',
        healthLevel: 'medium',
        automationLevel: 'partial_automation_with_approval',
        conditions: [
          { metric: 'priority', operator: '<=', value: 3 }
        ],
        actions: [
          'Request approval',
          'Execute after approval',
          'Monitor closely',
          'Prepare rollback plan'
        ],
        priority: 8
      },
      {
        id: 'low-health-manual-approval',
        name: 'Low Health - Manual Approval',
        description: 'Require manual approval when health is low (50-70%)',
        healthLevel: 'low',
        automationLevel: 'manual_approval_required',
        conditions: [],
        actions: [
          'Require manual approval',
          'Execute with human oversight',
          'Continuous health monitoring',
          'Immediate rollback on issues'
        ],
        priority: 6
      },
      {
        id: 'critical-health-emergency-mode',
        name: 'Critical Health - Emergency Mode',
        description: 'Emergency mode - only critical actions allowed when health is critical (<50%)',
        healthLevel: 'critical',
        automationLevel: 'emergency_mode',
        conditions: [
          { metric: 'priority', operator: '==', value: 4 }
        ],
        actions: [
          'Only critical actions permitted',
          'Emergency escalation',
          'Immediate incident response',
          'System preservation priority'
        ],
        priority: 12
      }
    ];

    for (const rule of defaultRules) {
      this.decisionRules.set(rule.id, rule);
    }

    console.log(`[HEALTH-ENGINE] Initialized ${defaultRules.length} default decision rules`);
  }

  // ============================================================================
  // DECISION EXECUTION WITH HEALTH CHECKS
  // ============================================================================

  /**
   * Start decision execution with health monitoring
   */
  public startDecisionExecution(
    decisionId: string,
    healthScore: AggregatedHealthScore
  ): DecisionExecutionContext {
    const context: DecisionExecutionContext = {
      decisionId,
      preExecutionHealth: healthScore,
      startTime: new Date(),
      healthMonitoringEnabled: true,
      rollbackTriggered: false,
      healthCheckpoints: [
        {
          timestamp: new Date(),
          healthScore,
          status: this.determineCheckpointStatus(healthScore)
        }
      ]
    };

    this.activeExecutions.set(decisionId, context);

    console.log(`[HEALTH-ENGINE] Started execution monitoring for decision ${decisionId}`);

    this.emit('executionStarted', context);

    return context;
  }

  /**
   * Monitor health during decision execution
   */
  public monitorExecutionHealth(
    decisionId: string,
    currentHealth: AggregatedHealthScore
  ): void {
    const context = this.activeExecutions.get(decisionId);

    if (!context) {
      console.warn(`[HEALTH-ENGINE] No active execution found for decision ${decisionId}`);
      return;
    }

    // Add checkpoint
    const status = this.determineCheckpointStatus(currentHealth);
    context.healthCheckpoints.push({
      timestamp: new Date(),
      healthScore: currentHealth,
      status
    });

    // Check for rollback triggers
    if (this.shouldTriggerRollback(context, currentHealth)) {
      this.triggerRollback(decisionId, 'Health degradation detected during execution');
    }

    // Emit health checkpoint event
    this.emit('executionHealthCheckpoint', {
      decisionId,
      healthScore: currentHealth,
      status
    });
  }

  /**
   * Determine checkpoint status from health score
   */
  private determineCheckpointStatus(health: AggregatedHealthScore): 'ok' | 'warning' | 'critical' {
    if (health.level === 'critical') return 'critical';
    if (health.level === 'low') return 'warning';
    return 'ok';
  }

  /**
   * Check if rollback should be triggered
   */
  private shouldTriggerRollback(
    context: DecisionExecutionContext,
    currentHealth: AggregatedHealthScore
  ): boolean {
    // Rollback if health drops significantly from pre-execution
    const healthDrop = context.preExecutionHealth.overall - currentHealth.overall;

    if (healthDrop > 20) return true; // 20% drop
    if (currentHealth.level === 'critical' && context.preExecutionHealth.level !== 'critical') return true;

    // Check for consecutive critical checkpoints
    const recentCheckpoints = context.healthCheckpoints.slice(-3);
    const criticalCount = recentCheckpoints.filter(c => c.status === 'critical').length;

    if (criticalCount >= 2) return true;

    return false;
  }

  /**
   * Trigger rollback for decision execution
   */
  public triggerRollback(decisionId: string, reason: string): void {
    const context = this.activeExecutions.get(decisionId);

    if (!context) {
      console.warn(`[HEALTH-ENGINE] No active execution found for decision ${decisionId}`);
      return;
    }

    context.rollbackTriggered = true;
    context.rollbackReason = reason;

    console.log(`[HEALTH-ENGINE] Rollback triggered for decision ${decisionId}: ${reason}`);

    this.emit('rollbackTriggered', {
      decisionId,
      reason,
      context
    });
  }

  /**
   * Complete decision execution
   */
  public completeDecisionExecution(
    decisionId: string,
    outcome: 'success' | 'partial' | 'failed',
    finalHealth?: AggregatedHealthScore
  ): void {
    const context = this.activeExecutions.get(decisionId);

    if (!context) {
      console.warn(`[HEALTH-ENGINE] No active execution found for decision ${decisionId}`);
      return;
    }

    // Calculate health impact
    const healthImpact = finalHealth
      ? finalHealth.overall - context.preExecutionHealth.overall
      : 0;

    // Update audit trail with outcome
    const auditEntry = this.decisionAuditTrail.find(a => a.decisionId === decisionId);
    if (auditEntry) {
      auditEntry.outcome = {
        status: outcome,
        healthImpact,
        rollbackTriggered: context.rollbackTriggered
      };
      auditEntry.executionContext = context;
    }

    // Remove from active executions
    this.activeExecutions.delete(decisionId);

    console.log(`[HEALTH-ENGINE] Completed execution for decision ${decisionId}: ${outcome} (health impact: ${healthImpact.toFixed(1)}%)`);

    this.emit('executionCompleted', {
      decisionId,
      outcome,
      healthImpact,
      context
    });
  }

  /**
   * Escalate decision based on health
   */
  public escalateDecision(
    decisionId: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    console.log(`[HEALTH-ENGINE] Escalating decision ${decisionId} (${severity}): ${reason}`);

    this.emit('decisionEscalated', {
      decisionId,
      reason,
      severity,
      timestamp: new Date()
    });
  }

  // ============================================================================
  // HEALTH AUDIT TRAIL
  // ============================================================================

  /**
   * Add entry to audit trail
   */
  private addToAuditTrail(entry: DecisionAuditTrail): void {
    this.decisionAuditTrail.push(entry);

    // Trim to max size
    if (this.decisionAuditTrail.length > this.auditTrailMaxSize) {
      this.decisionAuditTrail = this.decisionAuditTrail.slice(-this.auditTrailMaxSize);
    }
  }

  /**
   * Get audit trail for decision
   */
  public getDecisionAuditTrail(decisionId: string): DecisionAuditTrail | undefined {
    return this.decisionAuditTrail.find(a => a.decisionId === decisionId);
  }

  /**
   * Get all audit trail entries
   */
  public getAllAuditTrail(): DecisionAuditTrail[] {
    return [...this.decisionAuditTrail];
  }

  /**
   * Clear audit trail
   */
  public clearAuditTrail(): void {
    this.decisionAuditTrail = [];
    console.log('[HEALTH-ENGINE] Audit trail cleared');
  }

  // ============================================================================
  // HEALTH DASHBOARD DATA
  // ============================================================================

  /**
   * Get comprehensive health dashboard data
   */
  public getHealthDashboardData(): HealthDashboardData {
    const currentHealth = this.getCurrentHealthScore();
    const healthTrend = this.analyzeHealthTrend();
    const anomalyDetection = currentHealth ? this.detectHealthAnomaly(currentHealth) : {
      isAnomaly: false,
      severity: 'low',
      score: 0,
      contributingMetrics: [],
      timestamp: new Date()
    };

    return {
      currentHealth: currentHealth || this.getDefaultHealthScore(),
      healthTrend,
      anomalyDetection,
      recentDecisions: this.getRecentDecisions(10),
      optimizationRecommendations: this.getOptimizationRecommendations(),
      healthHistory: this.healthHistory.map(h => ({
        timestamp: h.timestamp,
        healthScore: h.healthScore
      })),
      decisionOutcomeCorrelation: this.getDecisionOutcomeCorrelation(),
      lastUpdated: new Date()
    };
  }

  /**
   * Get recent decisions from audit trail
   */
  private getRecentDecisions(count: number): DecisionResponse[] {
    // This would need to be tracked separately in a real implementation
    // For now, return empty array
    return [];
  }

  /**
   * Get decision outcome correlation
   */
  private getDecisionOutcomeCorrelation(): HealthDashboardData['decisionOutcomeCorrelation'] {
    // Extract from audit trail
    return this.decisionAuditTrail
      .filter(a => a.outcome !== undefined)
      .map(a => ({
        decisionId: a.decisionId,
        healthScore: a.healthScore.overall,
        outcome: a.outcome!.status,
        healthImpact: a.outcome!.healthImpact
      }));
  }

  // ============================================================================
  // HEALTH-DRIVEN OPTIMIZATION
  // ============================================================================

  /**
   * Generate health-driven optimization recommendations
   */
  public generateOptimizationRecommendations(): HealthOptimizationRecommendation[] {
    const currentHealth = this.getCurrentHealthScore();

    if (!currentHealth) {
      return [];
    }

    const recommendations: HealthOptimizationRecommendation[] = [];

    // Resource scaling recommendations
    recommendations.push(...this.generateResourceScalingRecommendations(currentHealth));

    // Maintenance scheduling recommendations
    recommendations.push(...this.generateMaintenanceSchedulingRecommendations(currentHealth));

    // Capacity planning recommendations
    recommendations.push(...this.generateCapacityPlanningRecommendations(currentHealth));

    // Performance tuning recommendations
    recommendations.push(...this.generatePerformanceTuningRecommendations(currentHealth));

    // Store recommendations
    this.optimizationRecommendations = recommendations;

    console.log(`[HEALTH-ENGINE] Generated ${recommendations.length} optimization recommendations`);

    this.emit('optimizationRecommendationsGenerated', recommendations);

    return recommendations;
  }

  /**
   * Generate resource scaling recommendations
   */
  private generateResourceScalingRecommendations(
    health: AggregatedHealthScore
  ): HealthOptimizationRecommendation[] {
    const recommendations: HealthOptimizationRecommendation[] = [];

    // CPU scaling
    if (health.performance < 70) {
      recommendations.push({
        id: this.generateId('opt'),
        type: 'resource_scaling',
        priority: health.performance < 50 ? 'critical' : 'high',
        description: 'Scale CPU resources to improve performance',
        currentHealth: health,
        expectedImprovement: 15,
        estimatedImpact: {
          healthScore: 10,
          performance: 20,
          cost: 15
        },
        actions: [
          {
            name: 'Increase CPU allocation',
            description: 'Add additional CPU cores to handle load',
            estimatedDuration: 1800,
            resourceImpact: { cpu: 20, memory: 0, disk: 0, network: 0 }
          }
        ],
        timestamp: new Date()
      });
    }

    // Memory scaling
    if (health.resourceUtilization < 70) {
      recommendations.push({
        id: this.generateId('opt'),
        type: 'resource_scaling',
        priority: health.resourceUtilization < 50 ? 'critical' : 'high',
        description: 'Scale memory resources to improve availability',
        currentHealth: health,
        expectedImprovement: 12,
        estimatedImpact: {
          healthScore: 8,
          performance: 15,
          cost: 10
        },
        actions: [
          {
            name: 'Increase memory allocation',
            description: 'Add additional memory to improve headroom',
            estimatedDuration: 1800,
            resourceImpact: { cpu: 0, memory: 20, disk: 0, network: 0 }
          }
        ],
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate maintenance scheduling recommendations
   */
  private generateMaintenanceSchedulingRecommendations(
    health: AggregatedHealthScore
  ): HealthOptimizationRecommendation[] {
    const recommendations: HealthOptimizationRecommendation[] = [];

    // Schedule maintenance during low load
    if (health.level === 'high') {
      recommendations.push({
        id: this.generateId('opt'),
        type: 'maintenance_scheduling',
        priority: 'medium',
        description: 'Schedule preventive maintenance during optimal health window',
        currentHealth: health,
        expectedImprovement: 8,
        estimatedImpact: {
          healthScore: 5,
          performance: 0,
          cost: -5 // Cost savings
        },
        actions: [
          {
            name: 'Schedule maintenance window',
            description: 'Plan maintenance during off-peak hours',
            estimatedDuration: 3600,
            resourceImpact: { cpu: 0, memory: 0, disk: 0, network: 0 }
          }
        ],
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate capacity planning recommendations
   */
  private generateCapacityPlanningRecommendations(
    health: AggregatedHealthScore
  ): HealthOptimizationRecommendation[] {
    const recommendations: HealthOptimizationRecommendation[] = [];

    // Check for resource exhaustion trends
    const trend = this.analyzeHealthTrend();

    if (trend.direction === 'degrading' && trend.changeRate < -2) {
      recommendations.push({
        id: this.generateId('opt'),
        type: 'capacity_planning',
        priority: 'high',
        description: 'Plan capacity expansion due to degrading health trend',
        currentHealth: health,
        expectedImprovement: 20,
        estimatedImpact: {
          healthScore: 15,
          performance: 25,
          cost: 20
        },
        actions: [
          {
            name: 'Assess capacity requirements',
            description: 'Evaluate current and future capacity needs',
            estimatedDuration: 3600,
            resourceImpact: { cpu: 0, memory: 0, disk: 0, network: 0 }
          },
          {
            name: 'Plan infrastructure expansion',
            description: 'Design and schedule infrastructure scaling',
            estimatedDuration: 86400,
            resourceImpact: { cpu: 0, memory: 0, disk: 0, network: 0 }
          }
        ],
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate performance tuning recommendations
   */
  private generatePerformanceTuningRecommendations(
    health: AggregatedHealthScore
  ): HealthOptimizationRecommendation[] {
    const recommendations: HealthOptimizationRecommendation[] = [];

    // Performance tuning based on component health
    if (health.componentHealth < 80) {
      recommendations.push({
        id: this.generateId('opt'),
        type: 'performance_tuning',
        priority: 'medium',
        description: 'Tune component configurations for better performance',
        currentHealth: health,
        expectedImprovement: 10,
        estimatedImpact: {
          healthScore: 8,
          performance: 15,
          cost: 5
        },
        actions: [
          {
            name: 'Optimize AgentDB configuration',
            description: 'Tune AgentDB for better hit rates and response times',
            estimatedDuration: 1800,
            resourceImpact: { cpu: 5, memory: 5, disk: 0, network: 0 }
          },
          {
            name: 'Optimize MCP connection pooling',
            description: 'Adjust MCP connection pool for better throughput',
            estimatedDuration: 1800,
            resourceImpact: { cpu: 5, memory: 5, disk: 0, network: 5 }
          }
        ],
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Get optimization recommendations
   */
  public getOptimizationRecommendations(): HealthOptimizationRecommendation[] {
    return [...this.optimizationRecommendations];
  }

  /**
   * Clear optimization recommendations
   */
  public clearOptimizationRecommendations(): void {
    this.optimizationRecommendations = [];
    console.log('[HEALTH-ENGINE] Optimization recommendations cleared');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get current health score
   */
  public getCurrentHealthScore(): AggregatedHealthScore | null {
    if (this.healthHistory.length === 0) return null;
    return this.healthHistory[this.healthHistory.length - 1].healthScore;
  }

  /**
   * Get health history
   */
  public getHealthHistory(): Array<{
    timestamp: Date;
    healthScore: AggregatedHealthScore;
  }> {
    return [...this.healthHistory];
  }

  /**
   * Get default health score
   */
  private getDefaultHealthScore(): AggregatedHealthScore {
    return {
      overall: 50,
      systemHealth: 50,
      componentHealth: 50,
      performance: 50,
      security: 50,
      availability: 50,
      resourceUtilization: 50,
      timestamp: new Date(),
      level: 'medium'
    };
  }

  /**
   * Add custom decision rule
   */
  public addDecisionRule(rule: HealthDecisionRule): void {
    this.decisionRules.set(rule.id, rule);
    console.log(`[HEALTH-ENGINE] Added decision rule: ${rule.name}`);
  }

  /**
   * Remove decision rule
   */
  public removeDecisionRule(ruleId: string): void {
    this.decisionRules.delete(ruleId);
    console.log(`[HEALTH-ENGINE] Removed decision rule: ${ruleId}`);
  }

  /**
   * Get all decision rules
   */
  public getDecisionRules(): HealthDecisionRule[] {
    return Array.from(this.decisionRules.values());
  }

  /**
   * Update health weights
   */
  public updateHealthWeights(weights: Partial<typeof this.healthWeights>): void {
    this.healthWeights = { ...this.healthWeights, ...weights };
    console.log('[HEALTH-ENGINE] Health weights updated:', this.healthWeights);
  }

  /**
   * Update health thresholds
   */
  public updateHealthThresholds(thresholds: Partial<typeof this.healthThresholds>): void {
    this.healthThresholds = { ...this.healthThresholds, ...thresholds };
    console.log('[HEALTH-ENGINE] Health thresholds updated:', this.healthThresholds);
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.healthHistory = [];
    this.decisionAuditTrail = [];
    this.activeExecutions.clear();
    this.optimizationRecommendations = [];
    console.log('[HEALTH-ENGINE] All data cleared');
  }

  /**
   * Export state
   */
  public exportState(): string {
    return JSON.stringify({
      healthHistory: this.healthHistory.map(h => ({
        timestamp: h.timestamp.toISOString(),
        healthScore: h.healthScore
      })),
      decisionRules: Array.from(this.decisionRules.entries()),
      decisionAuditTrail: this.decisionAuditTrail.map(a => ({
        ...a,
        timestamp: a.timestamp.toISOString(),
        executionContext: a.executionContext ? {
          ...a.executionContext,
          preExecutionHealth: a.executionContext.preExecutionHealth,
          startTime: a.executionContext.startTime.toISOString(),
          healthCheckpoints: a.executionContext.healthCheckpoints.map(c => ({
            ...c,
            timestamp: c.timestamp.toISOString()
          }))
        } : undefined,
        outcome: a.outcome
      })),
      optimizationRecommendations: this.optimizationRecommendations.map(r => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
        currentHealth: r.currentHealth
      })),
      config: {
        healthWeights: this.healthWeights,
        healthThresholds: this.healthThresholds,
        healthHistoryMaxSize: this.healthHistoryMaxSize,
        auditTrailMaxSize: this.auditTrailMaxSize,
        healthTrendWindow: this.healthTrendWindow,
        anomalyDetectionThreshold: this.anomalyDetectionThreshold
      }
    }, null, 2);
  }

  /**
   * Import state
   */
  public importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);

      // Import health history
      if (state.healthHistory) {
        this.healthHistory = state.healthHistory.map((h: any) => ({
          timestamp: new Date(h.timestamp),
          healthScore: h.healthScore
        }));
      }

      // Import decision rules
      if (state.decisionRules) {
        this.decisionRules = new Map(state.decisionRules);
      }

      // Import audit trail
      if (state.decisionAuditTrail) {
        this.decisionAuditTrail = state.decisionAuditTrail.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
          executionContext: a.executionContext ? {
            ...a.executionContext,
            preExecutionHealth: a.executionContext.preExecutionHealth,
            startTime: new Date(a.executionContext.startTime),
            healthCheckpoints: a.executionContext.healthCheckpoints.map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp)
            }))
          } : undefined
        }));
      }

      // Import optimization recommendations
      if (state.optimizationRecommendations) {
        this.optimizationRecommendations = state.optimizationRecommendations.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        }));
      }

      // Import config
      if (state.config) {
        this.healthWeights = state.config.healthWeights || this.healthWeights;
        this.healthThresholds = state.config.healthThresholds || this.healthThresholds;
        this.healthHistoryMaxSize = state.config.healthHistoryMaxSize || this.healthHistoryMaxSize;
        this.auditTrailMaxSize = state.config.auditTrailMaxSize || this.auditTrailMaxSize;
        this.healthTrendWindow = state.config.healthTrendWindow || this.healthTrendWindow;
        this.anomalyDetectionThreshold = state.config.anomalyDetectionThreshold || this.anomalyDetectionThreshold;
      }

      console.log('[HEALTH-ENGINE] State imported successfully');
    } catch (error) {
      console.error('[HEALTH-ENGINE] Failed to import state:', error);
      throw error;
  }
  
  // ============================================================================
  // FACTORY FUNCTIONS
  // ============================================================================
  
  /**
   * Configuration for Health-Driven Decision Engine
   */
  export interface HealthDrivenDecisionEngineConfig {
    healthHistoryMaxSize?: number;
    auditTrailMaxSize?: number;
    healthTrendWindow?: number;
    anomalyDetectionThreshold?: number;
    healthWeights?: Partial<HealthDrivenDecisionEngine['healthWeights']>;
  }
  
  /**
   * Create default health-driven decision engine
   */
  export function createDefaultHealthDrivenDecisionEngine(): HealthDrivenDecisionEngine {
    return new HealthDrivenDecisionEngine();
  }
  
  /**
   * Create health-driven decision engine from configuration
   */
  export function createHealthDrivenDecisionEngineFromConfig(
    config: HealthDrivenDecisionEngineConfig
  ): HealthDrivenDecisionEngine {
    return new HealthDrivenDecisionEngine(config);
  }
}
