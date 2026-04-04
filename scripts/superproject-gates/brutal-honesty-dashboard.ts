/**
 * Brutal Honesty Compliance Dashboard
 *
 * Real-time monitoring and reporting for brutal honesty compliance
 * across all recommendations in the system
 */

import type {
  BrutalHonestyRecommendation,
  RecommendationState,
  StressCondition,
  StressConditionType
} from './brutal-honesty-policy.js';
import type {
  BrutalHonestyValidator,
  TrackerStatistics,
  DilutionDetectionResult
} from './brutal-honesty-validator.js';
import type {
  BrutalHonestyTracker,
  TrackedRecommendation
} from './brutal-honesty-tracker.js';

/**
 * Dashboard metrics
 */
export interface DashboardMetrics {
  timestamp: Date;
  integrity: IntegrityMetrics;
  dilution: DilutionMetrics;
  hedging: HedgingMetrics;
  confidence: ConfidenceMetrics;
  lifecycle: LifecycleMetrics;
  stress: StressMetrics;
  compliance: ComplianceMetrics;
}

/**
 * Integrity metrics
 */
export interface IntegrityMetrics {
  overallIntegrityScore: number;
  recommendationsWithIntegrity: number;
  recommendationsWithDilution: number;
  recommendationsWithHedging: number;
  averageIntegrityScore: number;
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Dilution metrics
 */
export interface DilutionMetrics {
  totalDilutionIncidents: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  criticalDilutionRate: number;
  moderateDilutionRate: number;
  minorDilutionRate: number;
}

/**
 * Hedging metrics
 */
export interface HedgingMetrics {
  totalHedgingIncidents: number;
  byPhrase: Record<string, number>;
  byLocation: Record<string, number>;
  mostCommonHedgingPhrases: string[];
  hedgingRate: number;
}

/**
 * Confidence metrics
 */
export interface ConfidenceMetrics {
  averageConfidenceScore: number;
  confidenceDistribution: Record<string, number>;
  confidenceDeltaDistribution: {
    withinThreshold: number;
    warningThreshold: number;
    criticalThreshold: number;
  };
  averageConfidenceDelta: number;
  confidenceStabilityScore: number;
}

/**
 * Lifecycle metrics
 */
export interface LifecycleMetrics {
  totalRecommendations: number;
  byState: Record<RecommendationState, number>;
  byPriority: Record<string, number>;
  averageLifecycleDuration: number;
  completionRate: number;
  deferralRate: number;
  blockingRate: number;
}

/**
 * Stress metrics
 */
export interface StressMetrics {
  activeStressConditions: number;
  byType: Record<StressConditionType, number>;
  bySeverity: Record<string, number>;
  resolvedThisPeriod: number;
  averageResolutionTime: number;
}

/**
 * Compliance metrics
 */
export interface ComplianceMetrics {
  overallComplianceScore: number;
  recommendationsCompliant: number;
  recommendationsNonCompliant: number;
  complianceRate: number;
  auditFindings: number;
  openAuditFindings: number;
  resolvedAuditFindings: number;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  updateIntervalMs: number;
  historyRetentionPeriodMs: number;
  alertThresholds: {
    integrityScore: number;
    dilutionRate: number;
    hedgingRate: number;
    confidenceDelta: number;
  };
  enableAlerts: boolean;
  enableLogging: boolean;
}

/**
 * Alert notification
 */
export interface AlertNotification {
  alertId: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'integrity' | 'dilution' | 'hedging' | 'confidence' | 'compliance';
  message: string;
  metrics: Record<string, number>;
  recommendationIds?: string[];
  acknowledged: boolean;
}

/**
 * Historical data point
 */
export interface HistoricalDataPoint {
  timestamp: Date;
  metrics: Partial<DashboardMetrics>;
}

/**
 * Brutal Honesty Compliance Dashboard
 *
 * Real-time monitoring and reporting for brutal honesty compliance
 */
export class BrutalHonestyDashboard {
  private config: DashboardConfig;
  private validator: BrutalHonestyValidator;
  private tracker: BrutalHonestyTracker;
  private metricsHistory: HistoricalDataPoint[] = [];
  private activeAlerts: Map<string, AlertNotification> = new Map();
  private lastUpdateTime: Date = new Date();

  constructor(
    validator: BrutalHonestyValidator,
    tracker: BrutalHonestyTracker,
    config?: Partial<DashboardConfig>
  ) {
    this.validator = validator;
    this.tracker = tracker;

    this.config = {
      updateIntervalMs: 60000, // 1 minute
      historyRetentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        integrityScore: 0.8,
        dilutionRate: 0.05,
        hedgingRate: 0.10,
        confidenceDelta: 0.10
      },
      enableAlerts: true,
      enableLogging: true,
      ...config
    };

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_DASHBOARD] Initialized with config:', {
        updateInterval: this.config.updateIntervalMs,
        alertThresholds: this.config.alertThresholds
      });
    }
  }

  /**
   * Get current dashboard metrics
   */
  getCurrentMetrics(): DashboardMetrics {
    const validatorStats = this.validator.getStatistics();
    const trackerStats = this.tracker.getStatistics();

    const metrics: DashboardMetrics = {
      timestamp: new Date(),
      integrity: this.calculateIntegrityMetrics(validatorStats),
      dilution: this.calculateDilutionMetrics(validatorStats),
      hedging: this.calculateHedgingMetrics(validatorStats),
      confidence: this.calculateConfidenceMetrics(validatorStats, trackerStats),
      lifecycle: this.calculateLifecycleMetrics(trackerStats),
      stress: this.calculateStressMetrics(),
      compliance: this.calculateComplianceMetrics(validatorStats, trackerStats)
    };

    // Store in history
    this.metricsHistory.push({
      timestamp: metrics.timestamp,
      metrics
    });

    // Enforce retention limit
    this.enforceHistoryRetention();

    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkForAlerts(metrics);
    }

    this.lastUpdateTime = new Date();

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_DASHBOARD] Current metrics:', {
        integrityScore: metrics.integrity.overallIntegrityScore,
        complianceRate: metrics.compliance.complianceRate,
        totalRecommendations: metrics.lifecycle.totalRecommendations
      });
    }

    return metrics;
  }

  /**
   * Calculate integrity metrics
   */
  private calculateIntegrityMetrics(validatorStats: any): IntegrityMetrics {
    const totalRecommendations = validatorStats.totalValidations || 0;
    const validRecommendations = validatorStats.validRecommendations || 0;
    const invalidRecommendations = validatorStats.invalidRecommendations || 0;
    const averageScore = validatorStats.averageValidationScore || 0;

    // Calculate trend
    const trend = this.calculateTrend('integrity', averageScore);

    return {
      overallIntegrityScore: averageScore,
      recommendationsWithIntegrity: validRecommendations,
      recommendationsWithDilution: invalidRecommendations,
      recommendationsWithHedging: validatorStats.totalHedgingIncidents || 0,
      averageIntegrityScore: averageScore,
      trend
    };
  }

  /**
   * Calculate dilution metrics
   */
  private calculateDilutionMetrics(validatorStats: any): DilutionMetrics {
    const totalIncidents = validatorStats.totalDilutionIncidents || 0;
    const totalRecommendations = validatorStats.totalValidations || 1;

    return {
      totalDilutionIncidents: totalIncidents,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byType: {
        text_modification: 0,
        priority_downgrade: 0,
        severity_reduction: 0
      },
      criticalDilutionRate: 0,
      moderateDilutionRate: 0,
      minorDilutionRate: totalIncidents / totalRecommendations
    };
  }

  /**
   * Calculate hedging metrics
   */
  private calculateHedgingMetrics(validatorStats: any): HedgingMetrics {
    const totalIncidents = validatorStats.totalHedgingIncidents || 0;
    const totalRecommendations = validatorStats.totalValidations || 1;

    return {
      totalHedgingIncidents: totalIncidents,
      byPhrase: {},
      byLocation: {
        title: 0,
        description: 0,
        rationale: 0
      },
      mostCommonHedgingPhrases: [],
      hedgingRate: totalIncidents / totalRecommendations
    };
  }

  /**
   * Calculate confidence metrics
   */
  private calculateConfidenceMetrics(validatorStats: any, trackerStats: any): ConfidenceMetrics {
    const averageScore = validatorStats.averageValidationScore || 0.8;
    const integrityScore = trackerStats.integrityScore || 1.0;

    return {
      averageConfidenceScore: averageScore,
      confidenceDistribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      confidenceDeltaDistribution: {
        withinThreshold: 0,
        warningThreshold: 0,
        criticalThreshold: 0
      },
      averageConfidenceDelta: 1.0 - integrityScore,
      confidenceStabilityScore: integrityScore
    };
  }

  /**
   * Calculate lifecycle metrics
   */
  private calculateLifecycleMetrics(trackerStats: any): LifecycleMetrics {
    const totalRecommendations = trackerStats.totalRecommendations || 0;
    const completed = trackerStats.completedRecommendations || 0;
    const deferred = trackerStats.deferredRecommendations || 0;
    const blocked = trackerStats.blockedRecommendations || 0;

    return {
      totalRecommendations,
      byState: trackerStats.byState || {},
      byPriority: trackerStats.byPriority || {},
      averageLifecycleDuration: trackerStats.averageLifecycleDuration || 0,
      completionRate: totalRecommendations > 0 ? completed / totalRecommendations : 0,
      deferralRate: totalRecommendations > 0 ? deferred / totalRecommendations : 0,
      blockingRate: totalRecommendations > 0 ? blocked / totalRecommendations : 0
    };
  }

  /**
   * Calculate stress metrics
   */
  private calculateStressMetrics(): StressMetrics {
    const activeConditions = this.tracker.getActiveStressConditions();

    return {
      activeStressConditions: activeConditions.length,
      byType: {
        time_pressure: 0,
        critical_incident: 0,
        authority_collapse: 0,
        consensus_failure: 0,
        comfort_zone_challenge: 0
      },
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      resolvedThisPeriod: 0,
      averageResolutionTime: 0
    };
  }

  /**
   * Calculate compliance metrics
   */
  private calculateComplianceMetrics(validatorStats: any, trackerStats: any): ComplianceMetrics {
    const totalRecommendations = validatorStats.totalValidations || 0;
    const validRecommendations = validatorStats.validRecommendations || 0;
    const flagged = validatorStats.flaggedRecommendations || 0;

    const complianceRate = totalRecommendations > 0 ? validRecommendations / totalRecommendations : 1.0;
    const overallScore = complianceRate * trackerStats.integrityScore;

    return {
      overallComplianceScore: overallScore,
      recommendationsCompliant: validRecommendations,
      recommendationsNonCompliant: totalRecommendations - validRecommendations,
      complianceRate,
      auditFindings: flagged,
      openAuditFindings: flagged,
      resolvedAuditFindings: 0
    };
  }

  /**
   * Calculate trend for a metric
   */
  private calculateTrend(metric: string, currentValue: number): 'improving' | 'stable' | 'degrading' {
    const recentHistory = this.metricsHistory.slice(-10);
    if (recentHistory.length < 3) {
      return 'stable';
    }

    const values = recentHistory
      .map(h => h.metrics[metric as keyof DashboardMetrics])
      .filter((m): m is any => m !== undefined)
      .map(m => {
        if (metric === 'integrity') return (m as any).overallIntegrityScore;
        if (metric === 'compliance') return (m as any).overallComplianceScore;
        return 0;
      });

    if (values.length < 2) {
      return 'stable';
    }

    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const latest = values[values.length - 1];

    if (latest > average * 1.05) {
      return 'improving';
    } else if (latest < average * 0.95) {
      return 'degrading';
    }

    return 'stable';
  }

  /**
   * Check for alerts based on current metrics
   */
  private checkForAlerts(metrics: DashboardMetrics): void {
    const thresholds = this.config.alertThresholds;
    const alerts: AlertNotification[] = [];

    // Integrity alert
    if (metrics.integrity.overallIntegrityScore < thresholds.integrityScore) {
      alerts.push({
        alertId: `integrity-${Date.now()}`,
        timestamp: new Date(),
        severity: 'error',
        category: 'integrity',
        message: `Integrity score below threshold: ${metrics.integrity.overallIntegrityScore.toFixed(2)} < ${thresholds.integrityScore}`,
        metrics: {
          integrityScore: metrics.integrity.overallIntegrityScore,
          threshold: thresholds.integrityScore
        }
      });
    }

    // Dilution alert
    if (metrics.dilution.minorDilutionRate > thresholds.dilutionRate) {
      alerts.push({
        alertId: `dilution-${Date.now()}`,
        timestamp: new Date(),
        severity: 'warning',
        category: 'dilution',
        message: `Dilution rate above threshold: ${(metrics.dilution.minorDilutionRate * 100).toFixed(1)}% > ${(thresholds.dilutionRate * 100).toFixed(1)}%`,
        metrics: {
          dilutionRate: metrics.dilution.minorDilutionRate,
          threshold: thresholds.dilutionRate
        }
      });
    }

    // Hedging alert
    if (metrics.hedging.hedgingRate > thresholds.hedgingRate) {
      alerts.push({
        alertId: `hedging-${Date.now()}`,
        timestamp: new Date(),
        severity: 'warning',
        category: 'hedging',
        message: `Hedging rate above threshold: ${(metrics.hedging.hedgingRate * 100).toFixed(1)}% > ${(thresholds.hedgingRate * 100).toFixed(1)}%`,
        metrics: {
          hedgingRate: metrics.hedging.hedgingRate,
          threshold: thresholds.hedgingRate
        }
      });
    }

    // Compliance alert
    if (metrics.compliance.complianceRate < thresholds.integrityScore) {
      alerts.push({
        alertId: `compliance-${Date.now()}`,
        timestamp: new Date(),
        severity: 'error',
        category: 'compliance',
        message: `Compliance rate below threshold: ${(metrics.compliance.complianceRate * 100).toFixed(1)}% < ${(thresholds.integrityScore * 100).toFixed(1)}%`,
        metrics: {
          complianceRate: metrics.compliance.complianceRate,
          threshold: thresholds.integrityScore
        }
      });
    }

    // Add alerts to active alerts
    for (const alert of alerts) {
      this.activeAlerts.set(alert.alertId, alert);

      if (this.config.enableLogging) {
        console.log(`[BRUTAL_HONESTY_DASHBOARD] Alert generated:`, {
          severity: alert.severity,
          category: alert.category,
          message: alert.message
        });
      }
    }
  }

  /**
   * Enforce history retention limit
   */
  private enforceHistoryRetention(): void {
    const cutoffTime = new Date(Date.now() - this.config.historyRetentionPeriodMs);
    this.metricsHistory = this.metricsHistory.filter(
      point => point.timestamp >= cutoffTime
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertNotification[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.activeAlerts.set(alertId, alert);

      if (this.config.enableLogging) {
        console.log(`[BRUTAL_HONESTY_DASHBOARD] Alert acknowledged: ${alertId}`);
      }
    }
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): HistoricalDataPoint[] {
    return [...this.metricsHistory];
  }

  /**
   * Get metrics history for time range
   */
  getMetricsHistoryInRange(start: Date, end: Date): HistoricalDataPoint[] {
    return this.metricsHistory.filter(
      point => point.timestamp >= start && point.timestamp <= end
    );
  }

  /**
   * Get summary report
   */
  getSummaryReport(): {
    timestamp: Date;
    summary: string;
    metrics: DashboardMetrics;
    alerts: AlertNotification[];
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const recommendations = this.generateRecommendations(metrics, activeAlerts);

    return {
      timestamp: metrics.timestamp,
      summary: this.generateSummary(metrics),
      metrics,
      alerts: activeAlerts,
      recommendations
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(metrics: DashboardMetrics): string {
    const compliancePercent = (metrics.compliance.complianceRate * 100).toFixed(1);
    const integrityPercent = (metrics.integrity.overallIntegrityScore * 100).toFixed(1);
    const totalRecs = metrics.lifecycle.totalRecommendations;

    let summary = `Brutal Honesty Compliance Summary\n`;
    summary += `================================\n`;
    summary += `Overall Compliance: ${compliancePercent}%\n`;
    summary += `Overall Integrity: ${integrityPercent}%\n`;
    summary += `Total Recommendations: ${totalRecs}\n`;
    summary += `Completed: ${(metrics.lifecycle.completionRate * 100).toFixed(1)}%\n`;
    summary += `Deferred: ${(metrics.lifecycle.deferralRate * 100).toFixed(1)}%\n`;
    summary += `Blocked: ${(metrics.lifecycle.blockingRate * 100).toFixed(1)}%\n`;
    summary += `Active Alerts: ${this.getActiveAlerts().length}\n`;
    summary += `Integrity Trend: ${metrics.integrity.trend.toUpperCase()}\n`;

    return summary;
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(
    metrics: DashboardMetrics,
    alerts: AlertNotification[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.integrity.overallIntegrityScore < 0.8) {
      recommendations.push('Review recommendation generation process for integrity issues');
    }

    if (metrics.dilution.minorDilutionRate > 0.05) {
      recommendations.push('Investigate dilution incidents in delivery chain');
    }

    if (metrics.hedging.hedgingRate > 0.10) {
      recommendations.push('Address hedging language in recommendations');
    }

    if (metrics.stress.activeStressConditions > 0) {
      recommendations.push('Review and resolve active stress conditions');
    }

    if (metrics.compliance.openAuditFindings > 0) {
      recommendations.push('Process open audit findings');
    }

    if (alerts.length > 0) {
      recommendations.push('Acknowledge and address active alerts');
    }

    return recommendations;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.metricsHistory = [];
    this.activeAlerts.clear();

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_DASHBOARD] History cleared');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_DASHBOARD] Configuration updated:', updates);
    }
  }
}

/**
 * Create default dashboard
 */
export function createDefaultBrutalHonestyDashboard(
  validator: BrutalHonestyValidator,
  tracker: BrutalHonestyTracker
): BrutalHonestyDashboard {
  return new BrutalHonestyDashboard(validator, tracker);
}

/**
 * Create dashboard from config
 */
export function createBrutalHonestyDashboardFromConfig(
  validator: BrutalHonestyValidator,
  tracker: BrutalHonestyTracker,
  config: Partial<DashboardConfig>
): BrutalHonestyDashboard {
  return new BrutalHonestyDashboard(validator, tracker, config);
}
