/**
 * Health Check System Integration for ROAM
 * 
 * Integrates the ROAM risk assessment framework with the health check system,
 * enabling risk-based monitoring, health metrics correlation, and automated
 * health alerts based on risk levels and mitigation effectiveness.
 */

import { EventEmitter } from 'events';
import { 
  Risk, 
  RiskAssessmentEvent,
  RiskAssessmentEventType,
  RiskLevel,
  RiskStatus,
  MitigationStrategy,
  MitigationStatus
} from '../types';
import { EventPublisher } from '../../core/event-system';
import { Logger } from '../../core/logging';
import { 
  HealthCheckSystem,
  HealthStatus,
  HealthMetric,
  HealthAlert,
  HealthCheckConfig
} from '../../core/health-checks';

/**
 * Configuration for health check integration
 */
export interface HealthCheckIntegrationConfig {
  /** Risk-health correlation configuration */
  riskHealthCorrelation: {
    /** Enable risk-health correlation analysis */
    enableCorrelation: boolean;
    
    /** Correlation threshold */
    correlationThreshold: number;
    
    /** Risk levels to monitor */
    monitoredRiskLevels: RiskLevel[];
    
    /** Health impact factors for risk levels */
    riskImpactFactors: Record<RiskLevel, {
      cpuImpact: number;
      memoryImpact: number;
      latencyImpact: number;
      errorRateImpact: number;
    }>;
  };
  
  /** Risk-based health alerts */
  riskBasedAlerts: {
    /** Enable risk-based health alerts */
    enableAlerts: boolean;
    
    /** Alert thresholds */
    thresholds: {
      riskCount: number;
      riskLevel: RiskLevel;
      healthScore: number;
      mitigationEffectiveness: number;
    };
    
    /** Alert escalation rules */
    escalationRules: Array<{
      condition: 'risk_level' | 'risk_count' | 'health_score' | 'mitigation_effectiveness';
      threshold: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      action: string;
      recipients: string[];
    }>;
  };
  
  /** Health metrics for risk assessment */
  riskHealthMetrics: {
    /** Enable risk-specific health metrics */
    enableRiskMetrics: boolean;
    
    /** Custom risk metrics */
    customMetrics: Array<{
      id: string;
      name: string;
      description: string;
      calculation: (risks: Risk[]) => number;
      threshold: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };
  
  /** Monitoring configuration */
  monitoring: {
    /** Monitoring frequency (minutes) */
    frequency: number;
    
    /** Health check integration with risk assessment */
    integrateWithRiskAssessment: boolean;
    
    /** Auto-remediation based on health */
    enableAutoRemediation: boolean;
    
    /** Remediation strategies */
    remediationStrategies: Array<{
      condition: string;
      action: string;
      priority: number;
      automated: boolean;
    }>;
  };
}

/**
 * Risk-health correlation result
 */
export interface RiskHealthCorrelation {
  /** Correlation identifier */
  correlationId: string;
  
  /** Correlation details */
  correlation: {
    riskId: string;
    riskLevel: RiskLevel;
    healthMetric: string;
    correlationCoefficient: number;
    significance: number;
    timeLag: number; // minutes
  };
  
  /** Analysis results */
  analysis: {
    strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
    direction: 'positive' | 'negative' | 'neutral';
    confidence: number; // 0-100
  };
  
  /** Recommendations */
  recommendations: Array<{
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    estimatedImpact: string;
  }>;
}

/**
 * Risk-based health alert
 */
export interface RiskBasedHealthAlert {
  /** Alert identifier */
  alertId: string;
  
  /** Alert metadata */
  metadata: {
    alertType: 'risk_level' | 'risk_count' | 'health_score' | 'mitigation_effectiveness';
    severity: 'low' | 'medium' | 'high' | 'critical';
    priority: number;
    createdAt: Date;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
  };
  
  /** Alert content */
  content: {
    description: string;
    riskIds: string[];
    riskLevels: RiskLevel[];
    healthMetrics: string[];
    threshold: number;
    actualValue: number;
    variance: number;
  };
  
  /** Alert actions */
  actions: {
    immediateActions: string[];
    recommendedActions: string[];
    escalationActions: string[];
    autoRemediation: {
      enabled: boolean;
      strategies: string[];
    };
  };
}

/**
 * Risk health metric
 */
export interface RiskHealthMetric {
  /** Metric identifier */
  id: string;
  
  /** Metric metadata */
  metadata: {
    name: string;
    description: string;
    category: 'risk_level' | 'risk_count' | 'mitigation_effectiveness' | 'risk_velocity' | 'prediction_accuracy';
    unit: string;
    frequency: string;
  };
  
  /** Metric calculation */
  calculation: {
    formula: string;
    parameters: Record<string, number>;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  
  /** Current value */
  currentValue: number;
  previousValue?: number;
  trend: 'improving' | 'degrading' | 'stable';
  
  /** Health status */
  healthStatus: HealthStatus;
  lastUpdated: Date;
}

/**
 * Health Check Integration System
 */
export class HealthCheckIntegration extends EventEmitter {
  private config: HealthCheckIntegrationConfig;
  private eventPublisher: EventPublisher;
  private logger: Logger;
  private healthCheckSystem: HealthCheckSystem;
  private riskHealthCorrelations: Map<string, RiskHealthCorrelation> = new Map();
  private healthAlerts: Map<string, RiskBasedHealthAlert> = new Map();
  private riskHealthMetrics: Map<string, RiskHealthMetric> = new Map();

  constructor(
    config: HealthCheckIntegrationConfig,
    eventPublisher: EventPublisher,
    logger: Logger,
    healthCheckSystem: HealthCheckSystem
  ) {
    super();
    this.config = config;
    this.eventPublisher = eventPublisher;
    this.logger = logger;
    this.healthCheckSystem = healthCheckSystem;
    
    this.setupEventListeners();
    this.initializeRiskHealthMetrics();
  }

  /**
   * Analyze risk-health correlations
   */
  async analyzeRiskHealthCorrelations(
    risks: Risk[],
    healthMetrics: HealthMetric[]
  ): Promise<RiskHealthCorrelation[]> {
    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Analyzing risk-health correlations`, {
      riskCount: risks.length,
      healthMetricCount: healthMetrics.length
    });

    const correlations: RiskHealthCorrelation[] = [];

    if (!this.config.riskHealthCorrelation.enableCorrelation) {
      return correlations;
    }

    // Analyze correlations between risks and health metrics
    for (const risk of risks) {
      for (const metric of healthMetrics) {
        const correlation = await this.calculateRiskHealthCorrelation(risk, metric);
        
        if (Math.abs(correlation.correlationCoefficient) >= this.config.riskHealthCorrelation.correlationThreshold) {
          correlations.push(correlation);
        }
      }
    }

    // Store correlations
    for (const correlation of correlations) {
      this.riskHealthCorrelations.set(correlation.correlationId, correlation);
    }

    // Publish event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.RISK_HEALTH_CORRELATION_ANALYZED,
      timestamp: new Date(),
      data: {
        correlations: correlations.map(c => c.correlationId),
        analysisDate: new Date()
      }
    } as RiskAssessmentEvent);

    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Correlation analysis completed`, {
      significantCorrelations: correlations.length
    });

    return correlations;
  }

  /**
   * Generate risk-based health alerts
   */
  async generateRiskBasedHealthAlerts(
    risks: Risk[],
    healthMetrics: HealthMetric[]
  ): Promise<RiskBasedHealthAlert[]> {
    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Generating risk-based health alerts`, {
      riskCount: risks.length,
      healthMetricCount: healthMetrics.length
    });

    if (!this.config.riskBasedAlerts.enableAlerts) {
      return [];
    }

    const alerts: RiskBasedHealthAlert[] = [];

    // Check risk level alerts
    const criticalRisks = risks.filter(r => r.level === RiskLevel.CRITICAL);
    const highRisks = risks.filter(r => r.level === RiskLevel.HIGH);
    
    if (criticalRisks.length > 0) {
      alerts.push(await this.createRiskLevelAlert('critical', criticalRisks, healthMetrics));
    }
    
    if (highRisks.length > 0) {
      alerts.push(await this.createRiskLevelAlert('high', highRisks, healthMetrics));
    }

    // Check risk count alerts
    const totalRiskCount = risks.length;
    if (totalRiskCount >= this.config.riskBasedAlerts.thresholds.riskCount) {
      alerts.push(await this.createRiskCountAlert(totalRiskCount, risks, healthMetrics));
    }

    // Check health score alerts
    const overallHealthScore = this.calculateOverallHealthScore(healthMetrics);
    if (overallHealthScore <= this.config.riskBasedAlerts.thresholds.healthScore) {
      alerts.push(await this.createHealthScoreAlert(overallHealthScore, healthMetrics));
    }

    // Store alerts
    for (const alert of alerts) {
      this.healthAlerts.set(alert.alertId, alert);
    }

    // Publish alerts event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.HEALTH_ALERTS_GENERATED,
      timestamp: new Date(),
      data: {
        alerts: alerts.map(a => a.alertId),
        alertCount: alerts.length,
        generationDate: new Date()
      }
    } as RiskAssessmentEvent);

    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Health alerts generated`, {
      alertCount: alerts.length,
      criticalAlerts: criticalRisks.length,
      highAlerts: highRisks.length
    });

    return alerts;
  }

  /**
   * Monitor risk-specific health metrics
   */
  async monitorRiskHealthMetrics(
    risks: Risk[]
  ): Promise<RiskHealthMetric[]> {
    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Monitoring risk health metrics`, {
      riskCount: risks.length
    });

    if (!this.config.riskHealthMetrics.enableRiskMetrics) {
      return [];
    }

    const metrics: RiskHealthMetric[] = [];

    // Calculate risk-specific metrics
    for (const customMetric of this.config.riskHealthMetrics.customMetrics) {
      const value = customMetric.calculation(risks);
      const previousValue = this.riskHealthMetrics.get(customMetric.id)?.currentValue;
      
      const metric: RiskHealthMetric = {
        id: customMetric.id,
        metadata: {
          name: customMetric.name,
          description: customMetric.description,
          category: 'risk_count',
          unit: customMetric.unit,
          frequency: this.config.monitoring.frequency
        },
        calculation: {
          formula: customMetric.id,
          parameters: {},
          threshold: customMetric.threshold,
          severity: this.determineMetricSeverity(value, customMetric.threshold)
        },
        currentValue: value,
        previousValue,
        trend: this.calculateTrend(value, previousValue),
        healthStatus: this.determineHealthStatus(value, customMetric.threshold),
        lastUpdated: new Date()
      };

      metrics.push(metric);
      this.riskHealthMetrics.set(customMetric.id, metric);
    }

    // Publish metrics event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.RISK_HEALTH_METRICS_UPDATED,
      timestamp: new Date(),
      data: {
        metrics: metrics.map(m => m.id),
        metricCount: metrics.length,
        updateDate: new Date()
      }
    } as RiskAssessmentEvent);

    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Health metrics updated`, {
      metricCount: metrics.length
    });

    return metrics;
  }

  /**
   * Setup automated remediation
   */
  async setupAutomatedRemediation(
    alert: RiskBasedHealthAlert,
    risks: Risk[]
  ): Promise<void> {
    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Setting up automated remediation`, {
      alertId: alert.alertId,
      alertType: alert.metadata.alertType
    });

    if (!this.config.monitoring.enableAutoRemediation) {
      return;
    }

    // Find applicable remediation strategies
    const applicableStrategies = this.config.monitoring.remediationStrategies.filter(
      strategy => this.isStrategyApplicable(strategy, alert, risks)
    );

    // Execute automated strategies
    for (const strategy of applicableStrategies) {
      if (strategy.automated) {
        await this.executeRemediationStrategy(strategy, alert, risks);
      }
    }

    // Publish remediation event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.AUTO_REMEDIATION_EXECUTED,
      timestamp: new Date(),
      data: {
        alertId: alert.alertId,
        strategiesExecuted: applicableStrategies.filter(s => s.automated).map(s => s.action),
        manualStrategies: applicableStrategies.filter(s => !s.automated).map(s => s.action),
        executionDate: new Date()
      }
    } as RiskAssessmentEvent);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for risk assessment events
    this.eventPublisher.on(RiskAssessmentEventType.RISK_ASSESSED, async (event: RiskAssessmentEvent) => {
      if (this.config.monitoring.integrateWithRiskAssessment) {
        await this.updateRiskHealthMetrics(event);
      }
    });

    this.eventPublisher.on(RiskAssessmentEventType.RISK_LEVEL_CHANGED, async (event: RiskAssessmentEvent) => {
      if (this.config.monitoring.integrateWithRiskAssessment) {
        await this.checkRiskLevelAlerts(event);
      }
    });

    // Listen for health check events
    this.healthCheckSystem.on('healthAlert', async (alert: HealthAlert) => {
      await this.processHealthCheckAlert(alert);
    });

    this.healthCheckSystem.on('healthMetricUpdate', async (metric: HealthMetric) => {
      await this.processHealthMetricUpdate(metric);
    });
  }

  /**
   * Calculate risk-health correlation
   */
  private async calculateRiskHealthCorrelation(
    risk: Risk,
    healthMetric: HealthMetric
  ): Promise<RiskHealthCorrelation> {
    // Get historical data for correlation
    const riskHistory = await this.getRiskHistory(risk.id);
    const metricHistory = await this.getMetricHistory(healthMetric.id);
    
    if (riskHistory.length < 3 || metricHistory.length < 3) {
      return {
        correlationId: `correlation-${risk.id}-${healthMetric.id}`,
        correlation: {
          riskId: risk.id,
          riskLevel: risk.level,
          healthMetric: healthMetric.id,
          correlationCoefficient: 0,
          significance: 0,
          timeLag: 0
        },
        analysis: {
          strength: 'weak',
          direction: 'neutral',
          confidence: 0
        },
        recommendations: []
      };
    }

    // Calculate correlation coefficient
    const correlation = this.calculatePearsonCorrelation(riskHistory, metricHistory);
    
    // Determine significance
    const significance = this.calculateSignificance(correlation, Math.min(riskHistory.length, metricHistory.length));
    
    // Determine strength and direction
    const strength = this.determineCorrelationStrength(Math.abs(correlation));
    const direction = correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'neutral';

    return {
      correlationId: `correlation-${risk.id}-${healthMetric.id}`,
      correlation: {
        riskId: risk.id,
        riskLevel: risk.level,
        healthMetric: healthMetric.id,
        correlationCoefficient: correlation,
        significance: significance.confidence,
        timeLag: 5 // 5 minutes lag
      },
      analysis: {
        strength,
        direction,
        confidence: significance.confidence
      },
      recommendations: this.generateCorrelationRecommendations(correlation, strength, risk.level, healthMetric.id)
    };
  }

  /**
   * Create risk level alert
   */
  private async createRiskLevelAlert(
    level: 'critical' | 'high',
    risks: Risk[],
    healthMetrics: HealthMetric[]
  ): Promise<RiskBasedHealthAlert> {
    const riskIds = risks.map(r => r.id);
    const riskLevels = risks.map(r => r.level);
    
    const alert: RiskBasedHealthAlert = {
      alertId: `risk-level-${level}-${Date.now()}`,
      metadata: {
        alertType: 'risk_level',
        severity: level === 'critical' ? 'critical' : 'high',
        priority: level === 'critical' ? 1 : 2,
        createdAt: new Date()
      },
      content: {
        description: `${level === 'critical' ? 'Critical' : 'High'} risk level detected: ${risks.length} risk(s)`,
        riskIds,
        riskLevels,
        healthMetrics: healthMetrics.map(m => m.id),
        threshold: level === 'critical' ? 1 : 2,
        actualValue: risks.length,
        variance: 0
      },
      actions: {
        immediateActions: [
          `Immediate assessment of ${level} risks`,
          `Escalate to risk management team`
        ],
        recommendedActions: [
          `Implement mitigation strategies`,
          `Increase monitoring frequency`
        ],
        escalationActions: [
          `Notify executive leadership`,
          `Activate incident response team`
        ],
        autoRemediation: {
          enabled: this.config.monitoring.enableAutoRemediation,
          strategies: [
            `Automatic mitigation workflow activation`,
            `Resource allocation`
          ]
        }
      }
    };

    // Setup automated remediation
    await this.setupAutomatedRemediation(alert, risks);

    return alert;
  }

  /**
   * Create risk count alert
   */
  private async createRiskCountAlert(
    riskCount: number,
    risks: Risk[],
    healthMetrics: HealthMetric[]
  ): Promise<RiskBasedHealthAlert> {
    const alert: RiskBasedHealthAlert = {
      alertId: `risk-count-${Date.now()}`,
      metadata: {
        alertType: 'risk_count',
        severity: riskCount > 10 ? 'high' : 'medium',
        priority: riskCount > 10 ? 2 : 3,
        createdAt: new Date()
      },
      content: {
        description: `High risk count detected: ${riskCount} risks`,
        riskIds: risks.map(r => r.id),
        riskLevels: risks.map(r => r.level),
        healthMetrics: healthMetrics.map(m => m.id),
        threshold: this.config.riskBasedAlerts.thresholds.riskCount,
        actualValue: riskCount,
        variance: riskCount - this.config.riskBasedAlerts.thresholds.riskCount
      },
      actions: {
        immediateActions: [
          `Review risk assessment processes`,
          `Increase risk monitoring`
        ],
        recommendedActions: [
          `Implement risk reduction strategies`,
          `Consider risk transfer options`
        ],
        escalationActions: [
          `Notify governance board`,
          `Initiate risk management review`
        ],
        autoRemediation: {
          enabled: this.config.monitoring.enableAutoRemediation,
          strategies: [
            `Automated risk categorization`,
            `Dynamic risk threshold adjustment`
          ]
        }
      }
    };

    return alert;
  }

  /**
   * Create health score alert
   */
  private async createHealthScoreAlert(
    healthScore: number,
    healthMetrics: HealthMetric[]
  ): Promise<RiskBasedHealthAlert> {
    const severity = healthScore <= 50 ? 'critical' : healthScore <= 70 ? 'high' : 'medium';
    
    const alert: RiskBasedHealthAlert = {
      alertId: `health-score-${Date.now()}`,
      metadata: {
        alertType: 'health_score',
        severity,
        priority: severity === 'critical' ? 1 : severity === 'high' ? 2 : 3,
        createdAt: new Date()
      },
      content: {
        description: `Low health score detected: ${healthScore}`,
        riskIds: [],
        riskLevels: [],
        healthMetrics: healthMetrics.map(m => m.id),
        threshold: this.config.riskBasedAlerts.thresholds.healthScore,
        actualValue: healthScore,
        variance: this.config.riskBasedAlerts.thresholds.healthScore - healthScore
      },
      actions: {
        immediateActions: [
          `System health assessment`,
          `Performance optimization`
        ],
        recommendedActions: [
          `Investigate root cause of health degradation`,
          `Implement performance improvements`
        ],
        escalationActions: [
          `Notify operations team`,
          `Activate emergency procedures`
        ],
        autoRemediation: {
          enabled: this.config.monitoring.enableAutoRemediation,
          strategies: [
            `Automated performance tuning`,
            `Resource reallocation`
          ]
        }
      }
    };

    return alert;
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealthScore(healthMetrics: HealthMetric[]): number {
    if (healthMetrics.length === 0) return 100;
    
    // Simple average of health status scores
    const statusScores = healthMetrics.map(metric => {
      switch (metric.healthStatus) {
        case HealthStatus.HEALTHY: return 100;
        case HealthStatus.WARNING: return 70;
        case HealthStatus.CRITICAL: return 40;
        case HealthStatus.DOWN: return 20;
        default: return 50;
      }
    });
    
    return statusScores.reduce((sum, score) => sum + score, 0) / statusScores.length;
  }

  /**
   * Determine metric severity
   */
  private determineMetricSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    if (value >= threshold * 1.5) return 'critical';
    if (value >= threshold * 1.2) return 'high';
    if (value >= threshold) return 'medium';
    return 'low';
  }

  /**
   * Determine health status
   */
  private determineHealthStatus(value: number, threshold: number): HealthStatus {
    if (value >= threshold * 1.2) return HealthStatus.DOWN;
    if (value >= threshold) return HealthStatus.CRITICAL;
    if (value >= threshold * 0.8) return HealthStatus.WARNING;
    return HealthStatus.HEALTHY;
  }

  /**
   * Calculate trend
   */
  private calculateTrend(currentValue: number, previousValue?: number): 'improving' | 'degrading' | 'stable' {
    if (previousValue === undefined) return 'stable';
    
    const change = ((currentValue - previousValue) / previousValue) * 100;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'degrading';
    return 'stable';
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate significance
   */
  private calculateSignificance(correlation: number, sampleSize: number): any {
    const tStat = correlation * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    const pValue = 2 * (1 - this.tDistribution(Math.abs(tStat), sampleSize - 2));
    
    return {
      pValue,
      confidence: (1 - pValue) * 100
    };
  }

  /**
   * Determine correlation strength
   */
  private determineCorrelationStrength(correlation: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return 'very_strong';
    if (abs >= 0.6) return 'strong';
    if (abs >= 0.4) return 'moderate';
    return 'weak';
  }

  /**
   * Generate correlation recommendations
   */
  private generateCorrelationRecommendations(
    correlation: number,
    strength: string,
    riskLevel: RiskLevel,
    healthMetric: string
  ): string[] {
    const recommendations = [];
    
    if (strength === 'strong' || strength === 'very_strong') {
      recommendations.push(`Strong correlation between ${riskLevel} risk and ${healthMetric} health metric requires coordinated management`);
      recommendations.push(`Consider ${healthMetric} improvements to reduce risk impact`);
    }
    
    if (correlation > 0) {
      recommendations.push(`Risk level increases correlate with ${healthMetric} degradation - investigate root cause`);
    } else if (correlation < 0) {
      recommendations.push(`Risk level decreases correlate with ${healthMetric} improvement - validate effectiveness`);
    }
    
    return recommendations;
  }

  /**
   * Determine if strategy is applicable
   */
  private isStrategyApplicable(
    strategy: any,
    alert: RiskBasedHealthAlert,
    risks: Risk[]
  ): boolean {
    return strategy.condition === alert.metadata.alertType ||
           strategy.condition === 'high_risk_count' && alert.content.riskIds.length > 5 ||
           strategy.condition === 'low_health_score' && alert.metadata.severity === 'critical';
  }

  /**
   * Execute remediation strategy
   */
  private async executeRemediationStrategy(
    strategy: any,
    alert: RiskBasedHealthAlert,
    risks: Risk[]
  ): Promise<void> {
    this.logger.info(`[HEALTH_CHECK_INTEGRATION] Executing remediation strategy`, {
      strategy: strategy.action,
      alertId: alert.alertId
    });

    // Execute strategy based on type
    switch (strategy.action) {
      case 'automatic_mitigation':
        await this.executeAutomaticMitigation(alert, risks);
        break;
        
      case 'resource_reallocation':
        await this.executeResourceReallocation(alert, risks);
        break;
        
      case 'performance_optimization':
        await this.executePerformanceOptimization(alert);
        break;
    }
  }

  /**
   * Execute automatic mitigation
   */
  private async executeAutomaticMitigation(alert: RiskBasedHealthAlert, risks: Risk[]): Promise<void> {
    // Publish automatic mitigation event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.AUTO_MITIGATION_TRIGGERED,
      timestamp: new Date(),
      data: {
        alertId: alert.alertId,
        strategy: 'automatic_mitigation',
        executionDate: new Date()
      }
    } as RiskAssessmentEvent);
  }

  /**
   * Execute resource reallocation
   */
  private async executeResourceReallocation(alert: RiskBasedHealthAlert, risks: Risk[]): Promise<void> {
    // Publish resource reallocation event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.RESOURCE_REALLOCATION_TRIGGERED,
      timestamp: new Date(),
      data: {
        alertId: alert.alertId,
        strategy: 'resource_reallocation',
        executionDate: new Date()
      }
    } as RiskAssessmentEvent);
  }

  /**
   * Execute performance optimization
   */
  private async executePerformanceOptimization(alert: RiskBasedHealthAlert): Promise<void> {
    // Publish performance optimization event
    await this.eventPublisher.publish({
      type: RiskAssessmentEventType.PERFORMANCE_OPTIMIZATION_TRIGGERED,
      timestamp: new Date(),
      data: {
        alertId: alert.alertId,
        strategy: 'performance_optimization',
        executionDate: new Date()
      }
    } as RiskAssessmentEvent);
  }

  /**
   * Update risk health metrics
   */
  private async updateRiskHealthMetrics(event: RiskAssessmentEvent): Promise<void> {
    // Extract risk data from event
    const riskData = event.data as any;
    
    if (riskData && riskData.risk) {
      // Update risk-specific metrics
      await this.monitorRiskHealthMetrics([riskData.risk]);
    }
  }

  /**
   * Check risk level alerts
   */
  private async checkRiskLevelAlerts(event: RiskAssessmentEvent): Promise<void> {
    // Extract risk data from event
    const riskData = event.data as any;
    
    if (riskData && riskData.risk && riskData.risk.level) {
      // Check if risk level triggers alerts
      if (riskData.risk.level === RiskLevel.CRITICAL || riskData.risk.level === RiskLevel.HIGH) {
        const healthMetrics = Array.from(this.riskHealthMetrics.values());
        await this.generateRiskBasedHealthAlerts([riskData.risk], healthMetrics);
      }
    }
  }

  /**
   * Process health check alert
   */
  private async processHealthCheckAlert(alert: HealthAlert): Promise<void> {
    // Check if alert relates to risk assessment
    if (alert.component === 'risk-assessment') {
      // Convert health check alert to risk assessment event
      await this.eventPublisher.publish({
        type: RiskAssessmentEventType.HEALTH_ALERT_RECEIVED,
        timestamp: new Date(),
        data: {
          healthAlertId: alert.id,
          severity: alert.severity,
          message: alert.message,
          receivedDate: new Date()
        }
      } as RiskAssessmentEvent);
    }
  }

  /**
   * Process health metric update
   */
  private async processHealthMetricUpdate(metric: HealthMetric): Promise<void> {
    // Check if metric relates to risk assessment
    if (metric.metadata.category === 'risk_level' || 
        metric.metadata.category === 'risk_count' ||
        metric.metadata.category === 'mitigation_effectiveness') {
      
      // Convert health metric update to risk assessment event
      await this.eventPublisher.publish({
        type: RiskAssessmentEventType.HEALTH_METRIC_UPDATED,
        timestamp: new Date(),
        data: {
          metricId: metric.id,
          metricName: metric.metadata.name,
          value: metric.currentValue,
          healthStatus: metric.healthStatus,
          updateDate: new Date()
        }
      } as RiskAssessmentEvent);
    }
  }

  /**
   * Initialize risk health metrics
   */
  private initializeRiskHealthMetrics(): void {
    if (!this.config.riskHealthMetrics.enableRiskMetrics) {
      return;
    }

    // Initialize custom risk metrics
    for (const customMetric of this.config.riskHealthMetrics.customMetrics) {
      const metric: RiskHealthMetric = {
        id: customMetric.id,
        metadata: {
          name: customMetric.name,
          description: customMetric.description,
          category: 'risk_count',
          unit: customMetric.unit,
          frequency: this.config.monitoring.frequency
        },
        calculation: {
          formula: customMetric.id,
          parameters: {},
          threshold: customMetric.threshold,
          severity: 'medium'
        },
        currentValue: 0,
        trend: 'stable',
        healthStatus: HealthStatus.HEALTHY,
        lastUpdated: new Date()
      };

      this.riskHealthMetrics.set(customMetric.id, metric);
    }
  }

  /**
   * Get risk history (placeholder)
   */
  private async getRiskHistory(riskId: string): Promise<any[]> {
    // This would typically query from risk repository
    return [];
  }

  /**
   * Get metric history (placeholder)
   */
  private async getMetricHistory(metricId: string): Promise<number[]> {
    // This would typically query from metrics repository
    return [];
  }

  /**
   * t-distribution approximation
   */
  private tDistribution(t: number, df: number): number {
    // Simplified t-distribution approximation
    return 1 - (2 / (1 + Math.abs(t) * Math.sqrt(df / 2)));
  }

  /**
   * Get risk-health correlations
   */
  getRiskHealthCorrelations(): Map<string, RiskHealthCorrelation> {
    return new Map(this.riskHealthCorrelations);
  }

  /**
   * Get health alerts
   */
  getHealthAlerts(): Map<string, RiskBasedHealthAlert> {
    return new Map(this.healthAlerts);
  }

  /**
   * Get risk health metrics
   */
  getRiskHealthMetrics(): Map<string, RiskHealthMetric> {
    return new Map(this.riskHealthMetrics);
  }

  /**
   * Clear correlation
   */
  clearRiskHealthCorrelation(correlationId: string): void {
    this.riskHealthCorrelations.delete(correlationId);
  }

  /**
   * Clear health alert
   */
  clearHealthAlert(alertId: string): void {
    this.healthAlerts.delete(alertId);
  }

  /**
   * Clear health metric
   */
  clearRiskHealthMetric(metricId: string): void {
    this.riskHealthMetrics.delete(metricId);
  }
}