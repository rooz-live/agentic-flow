/**
 * Evidence-Driven Risk Assessment - Real-Time Risk Assessment Engine
 *
 * Implements real-time risk scoring, threshold alerts,
 * trend analysis, prediction, and dashboard with real-time updates.
 *
 * Applies Manthra: Directed thought-power for logical separation
 * Applies Yasna: Disciplined alignment through consistent interfaces
 * Applies Mithra: Binding force preventing code drift
 */

import { EventEmitter } from 'events';
import type { Evidence, EvidenceQuality } from './evidence-risk-assessment.js';
import type { ModelVersion, ModelMetrics } from './risk-model-training.js';

/**
 * Risk level
 */
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

/**
 * Risk category
 */
export type RiskCategory = 'operational' | 'security' | 'performance' | 'compliance' | 'financial' | 'strategic';

/**
 * Risk trend direction
 */
export type RiskTrendDirection = 'increasing' | 'stable' | 'decreasing' | 'unknown';

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  id: string;
  timestamp: Date;
  riskId: string;
  title: string;
  description: string;
  category: RiskCategory;
  level: RiskLevel;
  score: number; // 0 to 100
  confidence: number; // 0 to 1
  probability: number; // 0 to 1
  impact: {
    technical: number;
    operational: number;
    financial: number;
    reputational: number;
  };
  evidence: {
    supporting: string[]; // Evidence IDs
    contradicting: string[]; // Evidence IDs
    quality: EvidenceQuality;
    count: number;
  };
  predictions: {
    shortTerm: RiskPrediction;
    mediumTerm: RiskPrediction;
    longTerm: RiskPrediction;
  };
  trends: RiskTrend[];
  recommendations: string[];
  metadata: {
    modelId: string;
    modelVersion: string;
    assessmentTime: number;
    lastUpdated: Date;
  };
}

/**
 * Risk prediction
 */
export interface RiskPrediction {
  timeframe: string;
  predictedScore: number;
  predictedLevel: RiskLevel;
  confidence: number;
  factors: string[];
  methodology: string;
}

/**
 * Risk trend
 */
export interface RiskTrend {
  id: string;
  riskId: string;
  direction: RiskTrendDirection;
  changeRate: number; // per hour
  period: {
    start: Date;
    end: Date;
    duration: number; // in hours
  };
  dataPoints: {
    timestamp: Date;
    score: number;
    level: RiskLevel;
  }[];
  significance: number; // 0 to 1
  confidence: number; // 0 to 1
}

/**
 * Risk threshold alert
 */
export interface RiskThresholdAlert {
  id: string;
  timestamp: Date;
  riskId: string;
  alertType: 'threshold_exceeded' | 'threshold_approaching' | 'trend_detected' | 'prediction_alert';
  severity: 'critical' | 'high' | 'medium' | 'low';
  currentScore: number;
  threshold: number;
  level: RiskLevel;
  message: string;
  acknowledged: boolean;
  metadata: {
    triggeredBy: string;
    context: Record<string, any>;
  };
}

/**
 * Dashboard update
 */
export interface DashboardUpdate {
  timestamp: Date;
  overallRisk: {
    score: number;
    level: RiskLevel;
    trend: RiskTrendDirection;
  };
  riskCategories: {
    category: RiskCategory;
    score: number;
    level: RiskLevel;
    count: number;
    trend: RiskTrendDirection;
  }[];
  topRisks: RiskAssessment[];
  recentAlerts: RiskThresholdAlert[];
  statistics: {
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    averageScore: number;
    assessmentRate: number;
  };
}

/**
 * Real-time assessment configuration
 */
export interface RealTimeAssessmentConfig {
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  alerts: {
    enabled: boolean;
    thresholdExceeded: boolean;
    thresholdApproaching: boolean;
    trendDetection: boolean;
    predictionAlerts: boolean;
    cooldownPeriod: number; // milliseconds
  };
  predictions: {
    enabled: boolean;
    shortTermHorizon: number; // hours
    mediumTermHorizon: number; // hours
    longTermHorizon: number; // hours
    minConfidence: number;
  };
  trends: {
    enabled: boolean;
    windowSize: number; // number of data points
    minSignificance: number;
    smoothingFactor: number; // 0 to 1
  };
  dashboard: {
    enabled: boolean;
    updateInterval: number; // milliseconds
    maxTopRisks: number;
    maxRecentAlerts: number;
  };
  performance: {
    maxConcurrentAssessments: number;
    assessmentTimeout: number;
    enableCaching: boolean;
    cacheTtl: number; // milliseconds
  };
}

/**
 * Real-Time Risk Assessment Engine
 *
 * Provides real-time risk scoring, threshold alerts,
 * trend analysis, prediction, and dashboard updates.
 */
export class RealTimeRiskAssessmentEngine extends EventEmitter {
  private config: RealTimeAssessmentConfig;
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private riskTrends: Map<string, RiskTrend> = new Map();
  private alerts: RiskThresholdAlert[] = [];
  private acknowledgedAlerts: Set<string> = new Set();
  private currentModel: ModelVersion | null = null;
  private assessmentHistory: Map<string, RiskAssessment[]> = new Map();
  private cache: Map<string, { assessment: RiskAssessment; expires: number }> = new Map();
  private isRunning: boolean = false;
  private dashboardInterval: NodeJS.Timeout | null = null;
  private alertCooldowns: Map<string, number> = new Map();

  constructor(config?: Partial<RealTimeAssessmentConfig>) {
    super();

    this.config = this.createDefaultConfig(config);

    console.log('[REALTIME-RISK] Real-Time Risk Assessment Engine initialized');
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(config?: Partial<RealTimeAssessmentConfig>): RealTimeAssessmentConfig {
    const defaultConfig: RealTimeAssessmentConfig = {
      thresholds: {
        critical: 80,
        high: 60,
        medium: 40,
        low: 20
      },
      alerts: {
        enabled: true,
        thresholdExceeded: true,
        thresholdApproaching: true,
        trendDetection: true,
        predictionAlerts: true,
        cooldownPeriod: 300000 // 5 minutes
      },
      predictions: {
        enabled: true,
        shortTermHorizon: 1, // 1 hour
        mediumTermHorizon: 24, // 24 hours
        longTermHorizon: 168, // 1 week
        minConfidence: 0.6
      },
      trends: {
        enabled: true,
        windowSize: 20,
        minSignificance: 0.6,
        smoothingFactor: 0.3
      },
      dashboard: {
        enabled: true,
        updateInterval: 5000, // 5 seconds
        maxTopRisks: 10,
        maxRecentAlerts: 20
      },
      performance: {
        maxConcurrentAssessments: 10,
        assessmentTimeout: 5000,
        enableCaching: true,
        cacheTtl: 60000 // 1 minute
      }
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Start real-time assessment
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[REALTIME-RISK] Real-time assessment already running');
      return;
    }

    this.isRunning = true;
    console.log('[REALTIME-RISK] Starting real-time risk assessment engine');

    // Start dashboard updates
    if (this.config.dashboard.enabled) {
      this.startDashboardUpdates();
    }

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Assess risk from evidence
   */
  public async assessRisk(
    riskId: string,
    title: string,
    description: string,
    category: RiskCategory,
    evidence: Evidence[],
    model?: ModelVersion
  ): Promise<RiskAssessment> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = this.getCacheKey(riskId, evidence);
    if (this.config.performance.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.expires > Date.now()) {
        return cached.assessment;
      }
    }

    // Filter and score evidence
    const supportingEvidence = evidence.filter(e => e.validationStatus === 'valid');
    const contradictingEvidence = evidence.filter(e => e.validationStatus === 'invalid');

    // Calculate risk score
    const score = this.calculateRiskScore(supportingEvidence, contradictingEvidence);

    // Determine risk level
    const level = this.getRiskLevel(score);

    // Calculate confidence
    const confidence = this.calculateConfidence(supportingEvidence);

    // Calculate impact
    const impact = this.calculateImpact(evidence, category);

    // Generate predictions
    const predictions = this.config.predictions.enabled
      ? this.generatePredictions(score, level, evidence)
      : this.getDefaultPredictions();

    // Generate trends
    const trends = this.config.trends.enabled
      ? await this.generateTrends(riskId, score)
      : [];

    // Generate recommendations
    const recommendations = this.generateRecommendations(score, level, category, trends);

    const assessment: RiskAssessment = {
      id: `${riskId}-${Date.now()}`,
      timestamp: new Date(),
      riskId,
      title,
      description,
      category,
      level,
      score,
      confidence,
      probability: score / 100,
      impact,
      evidence: {
        supporting: supportingEvidence.map(e => e.id),
        contradicting: contradictingEvidence.map(e => e.id),
        quality: this.getOverallQuality(supportingEvidence),
        count: evidence.length
      },
      predictions,
      trends,
      recommendations,
      metadata: {
        modelId: model?.modelId || 'unknown',
        modelVersion: model?.version || 'unknown',
        assessmentTime: Date.now() - startTime,
        lastUpdated: new Date()
      }
    };

    // Store assessment
    this.riskAssessments.set(assessment.id, assessment);

    // Update history
    if (!this.assessmentHistory.has(riskId)) {
      this.assessmentHistory.set(riskId, []);
    }
    this.assessmentHistory.get(riskId)!.push(assessment);

    // Check thresholds and generate alerts
    await this.checkThresholds(assessment);

    // Cache result
    if (this.config.performance.enableCaching) {
      this.cache.set(cacheKey, {
        assessment,
        expires: Date.now() + this.config.performance.cacheTtl
      });
    }

    // Emit event
    this.emit('assessed', assessment);

    console.log(`[REALTIME-RISK] Assessed risk: ${riskId} (score: ${score.toFixed(1)}, level: ${level})`);
    return assessment;
  }

  /**
   * Calculate risk score from evidence
   */
  private calculateRiskScore(supporting: Evidence[], contradicting: Evidence[]): number {
    if (supporting.length === 0) {
      return 0;
    }

    // Base score from evidence quality and confidence
    let totalScore = 0;
    let totalWeight = 0;

    for (const ev of supporting) {
      const qualityScore = this.getQualityScore(ev.quality);
      const weight = ev.confidence * qualityScore;

      // Extract numeric values from evidence data
      let evidenceScore = 0;
      for (const value of Object.values(ev.data)) {
        if (typeof value === 'number') {
          evidenceScore += Math.abs(value);
        }
      }

      totalScore += evidenceScore * weight;
      totalWeight += weight;
    }

    let baseScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Normalize to 0-100
    baseScore = Math.min(100, Math.max(0, baseScore));

    // Apply penalty for contradicting evidence
    if (contradicting.length > 0) {
      const penalty = (contradicting.length / supporting.length) * 20;
      baseScore = Math.max(0, baseScore - penalty);
    }

    return baseScore;
  }

  /**
   * Get quality score
   */
  private getQualityScore(quality: EvidenceQuality): number {
    const scores: Record<EvidenceQuality, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      unverified: 0.2
    };
    return scores[quality];
  }

  /**
   * Get overall quality
   */
  private getOverallQuality(evidence: Evidence[]): EvidenceQuality {
    if (evidence.length === 0) return 'unverified';

    const avgScore = evidence.reduce((sum, e) => sum + this.getQualityScore(e.quality), 0) / evidence.length;

    if (avgScore >= 0.9) return 'critical';
    if (avgScore >= 0.75) return 'high';
    if (avgScore >= 0.6) return 'medium';
    if (avgScore >= 0.4) return 'low';
    return 'unverified';
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): RiskLevel {
    const thresholds = this.config.thresholds;

    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    if (score >= thresholds.low) return 'low';
    return 'minimal';
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    // Average confidence from evidence
    const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;

    // Boost confidence with more evidence
    const evidenceBoost = Math.min(0.2, evidence.length * 0.02);

    return Math.min(1, avgConfidence + evidenceBoost);
  }

  /**
   * Calculate impact
   */
  private calculateImpact(evidence: Evidence[], category: RiskCategory): RiskAssessment['impact'] {
    const impact: RiskAssessment['impact'] = {
      technical: 0,
      operational: 0,
      financial: 0,
      reputational: 0
    };

    for (const ev of evidence) {
      const weight = ev.confidence * this.getQualityScore(ev.quality);

      // Extract impact from evidence data
      const data = ev.data as any;
      if (data.technicalImpact) impact.technical += data.technicalImpact * weight;
      if (data.operationalImpact) impact.operational += data.operationalImpact * weight;
      if (data.financialImpact) impact.financial += data.financialImpact * weight;
      if (data.reputationalImpact) impact.reputational += data.reputationalImpact * weight;
    }

    // Normalize
    const maxImpact = Math.max(
      impact.technical,
      impact.operational,
      impact.financial,
      impact.reputational
    );

    if (maxImpact > 0) {
      impact.technical = (impact.technical / maxImpact) * 100;
      impact.operational = (impact.operational / maxImpact) * 100;
      impact.financial = (impact.financial / maxImpact) * 100;
      impact.reputational = (impact.reputational / maxImpact) * 100;
    }

    return impact;
  }

  /**
   * Generate predictions
   */
  private generatePredictions(
    currentScore: number,
    currentLevel: RiskLevel,
    evidence: Evidence[]
  ): RiskAssessment['predictions'] {
    const shortTerm = this.predictRisk(
      currentScore,
      this.config.predictions.shortTermHorizon,
      evidence
    );

    const mediumTerm = this.predictRisk(
      currentScore,
      this.config.predictions.mediumTermHorizon,
      evidence
    );

    const longTerm = this.predictRisk(
      currentScore,
      this.config.predictions.longTermHorizon,
      evidence
    );

    return {
      shortTerm,
      mediumTerm,
      longTerm
    };
  }

  /**
   * Predict risk for timeframe
   */
  private predictRisk(
    currentScore: number,
    horizon: number,
    evidence: Evidence[]
  ): RiskPrediction {
    // Extract trend from evidence
    const trend = this.extractTrendFromEvidence(evidence);

    // Calculate predicted score with trend and decay
    const trendImpact = trend.changeRate * horizon;
    const decayFactor = Math.exp(-horizon / 168); // Decay over a week
    const predictedScore = currentScore + (trendImpact * decayFactor);

    const predictedLevel = this.getRiskLevel(predictedScore);
    const confidence = Math.max(
      this.config.predictions.minConfidence,
      Math.min(1, 0.7 + (trend.confidence * 0.3))
    );

    return {
      timeframe: `${horizon}h`,
      predictedScore: Math.min(100, Math.max(0, predictedScore)),
      predictedLevel,
      confidence,
      factors: [
        `Trend: ${trend.direction}`,
        `Horizon: ${horizon}h`,
        `Decay: ${decayFactor.toFixed(2)}`
      ],
      methodology: 'linear-extrapolation-with-decay'
    };
  }

  /**
   * Extract trend from evidence
   */
  private extractTrendFromEvidence(evidence: Evidence[]): {
    direction: RiskTrendDirection;
    changeRate: number;
    confidence: number;
  } {
    if (evidence.length < 3) {
      return {
        direction: 'unknown',
        changeRate: 0,
        confidence: 0
      };
    }

    // Sort evidence by timestamp
    const sorted = [...evidence].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate trend using linear regression
    const n = sorted.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = this.getEvidenceScore(sorted[i]);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const changeRate = slope; // Score change per evidence item

    let direction: RiskTrendDirection;
    if (Math.abs(changeRate) < 0.1) {
      direction = 'stable';
    } else if (changeRate > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Calculate confidence based on R-squared
    const meanY = sumY / n;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const y = this.getEvidenceScore(sorted[i]);
      const predicted = meanY + slope * i;
      ssRes += Math.pow(y - predicted, 2);
      ssTot += Math.pow(y - meanY, 2);
    }

    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    const confidence = Math.sqrt(rSquared);

    return {
      direction,
      changeRate,
      confidence
    };
  }

  /**
   * Get evidence score
   */
  private getEvidenceScore(evidence: Evidence): number {
    let score = 0;
    for (const value of Object.values(evidence.data)) {
      if (typeof value === 'number') {
        score += Math.abs(value);
      }
    }
    return score;
  }

  /**
   * Generate trends
   */
  private async generateTrends(
    riskId: string,
    currentScore: number
  ): Promise<RiskTrend[]> {
    const history = this.assessmentHistory.get(riskId) || [];
    if (history.length < 3) {
      return [];
    }

    const windowSize = Math.min(this.config.trends.windowSize, history.length);
    const recentHistory = history.slice(-windowSize);

    // Calculate trend
    const n = recentHistory.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = recentHistory[i].score;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const changeRate = slope; // Score change per assessment

    let direction: RiskTrendDirection;
    if (Math.abs(changeRate) < 0.1) {
      direction = 'stable';
    } else if (changeRate > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Calculate significance
    const meanY = sumY / n;
    const variance = recentHistory.reduce((sum, h) => sum + Math.pow(h.score - meanY, 2), 0) / n;
    const significance = variance > 0 ? Math.abs(slope) / Math.sqrt(variance) : 0;

    // Calculate confidence
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const y = recentHistory[i].score;
      const predicted = meanY + slope * i;
      ssRes += Math.pow(y - predicted, 2);
      ssTot += Math.pow(y - meanY, 2);
    }

    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    const confidence = Math.sqrt(rSquared);

    // Create data points
    const dataPoints = recentHistory.map(h => ({
      timestamp: h.timestamp,
      score: h.score,
      level: h.level
    }));

    const trend: RiskTrend = {
      id: `trend-${riskId}-${Date.now()}`,
      riskId,
      direction,
      changeRate,
      period: {
        start: recentHistory[0].timestamp,
        end: recentHistory[recentHistory.length - 1].timestamp,
        duration: (recentHistory[recentHistory.length - 1].timestamp.getTime() - recentHistory[0].timestamp.getTime()) / (1000 * 60 * 60)
      },
      dataPoints,
      significance: Math.min(1, significance),
      confidence,
      metadata: {}
    };

    this.riskTrends.set(trend.id, trend);

    return [trend];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    score: number,
    level: RiskLevel,
    category: RiskCategory,
    trends: RiskTrend[]
  ): string[] {
    const recommendations: string[] = [];

    // Level-based recommendations
    if (level === 'critical') {
      recommendations.push('Immediate action required - risk is critical');
      recommendations.push('Escalate to appropriate stakeholders');
    } else if (level === 'high') {
      recommendations.push('Prioritize mitigation actions');
      recommendations.push('Monitor closely for escalation');
    } else if (level === 'medium') {
      recommendations.push('Plan mitigation within next sprint');
      recommendations.push('Continue monitoring');
    }

    // Trend-based recommendations
    for (const trend of trends) {
      if (trend.direction === 'increasing' && trend.significance > this.config.trends.minSignificance) {
        recommendations.push(`Risk is increasing at rate of ${trend.changeRate.toFixed(2)}/hour - consider early intervention`);
      } else if (trend.direction === 'decreasing' && trend.significance > this.config.trends.minSignificance) {
        recommendations.push('Risk is trending downward - continue current mitigation strategy');
      }
    }

    // Category-based recommendations
    const categoryRecommendations: Record<RiskCategory, string[]> = {
      operational: [
        'Review operational procedures',
        'Check system capacity and resources'
      ],
      security: [
        'Conduct security audit',
        'Review access controls'
      ],
      performance: [
        'Analyze performance bottlenecks',
        'Review resource allocation'
      ],
      compliance: [
        'Review compliance requirements',
        'Conduct gap analysis'
      ],
      financial: [
        'Assess financial impact',
        'Review budget allocations'
      ],
      strategic: [
        'Review strategic alignment',
        'Assess impact on objectives'
      ]
    };

    recommendations.push(...(categoryRecommendations[category] || []));

    return recommendations;
  }

  /**
   * Check thresholds and generate alerts
   */
  private async checkThresholds(assessment: RiskAssessment): Promise<void> {
    if (!this.config.alerts.enabled) return;

    const alerts: RiskThresholdAlert[] = [];
    const now = Date.now();

    // Check threshold exceeded
    if (this.config.alerts.thresholdExceeded) {
      if (assessment.level === 'critical') {
        const alert = this.createAlert(
          assessment,
          'threshold_exceeded',
          this.config.thresholds.critical,
          'Critical risk threshold exceeded'
        );
        if (await this.shouldTriggerAlert(alert, now)) {
          alerts.push(alert);
        }
      }
    }

    // Check threshold approaching
    if (this.config.alerts.thresholdApproaching) {
      if (assessment.level === 'high') {
        const alert = this.createAlert(
          assessment,
          'threshold_approaching',
          this.config.thresholds.high,
          'Risk approaching critical threshold'
        );
        if (await this.shouldTriggerAlert(alert, now)) {
          alerts.push(alert);
        }
      }
    }

    // Check prediction alerts
    if (this.config.alerts.predictionAlerts) {
      const shortTermPrediction = assessment.predictions.shortTerm;
      if (shortTermPrediction.predictedLevel === 'critical' &&
          shortTermPrediction.confidence > this.config.predictions.minConfidence) {
        const alert = this.createAlert(
          assessment,
          'prediction_alert',
          this.config.thresholds.critical,
          `Risk predicted to become critical within ${shortTermPrediction.timeframe}`
        );
        if (await this.shouldTriggerAlert(alert, now)) {
          alerts.push(alert);
        }
      }
    }

    // Add alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      this.emit('alertTriggered', alert);
      console.log(`[REALTIME-RISK] Alert triggered: ${alert.alertType} for risk ${assessment.riskId}`);
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    assessment: RiskAssessment,
    alertType: RiskThresholdAlert['alertType'],
    threshold: number,
    message: string
  ): RiskThresholdAlert {
    return {
      id: `alert-${assessment.riskId}-${Date.now()}`,
      timestamp: new Date(),
      riskId: assessment.riskId,
      alertType,
      severity: assessment.level === 'critical' ? 'critical' :
                assessment.level === 'high' ? 'high' :
                assessment.level === 'medium' ? 'medium' : 'low',
      currentScore: assessment.score,
      threshold,
      level: assessment.level,
      message,
      acknowledged: false,
      metadata: {
        triggeredBy: 'realtime-assessment-engine',
        context: {
          assessmentId: assessment.id,
          confidence: assessment.confidence
        }
      }
    };
  }

  /**
   * Check if alert should be triggered
   */
  private async shouldTriggerAlert(alert: RiskThresholdAlert, now: number): Promise<boolean> {
    // Check if already acknowledged
    if (this.acknowledgedAlerts.has(alert.id)) {
      return false;
    }

    // Check cooldown
    const cooldownKey = `${alert.riskId}-${alert.alertType}`;
    const lastTriggered = this.alertCooldowns.get(cooldownKey) || 0;
    const timeSinceLastTrigger = now - lastTriggered;

    if (timeSinceLastTrigger < this.config.alerts.cooldownPeriod) {
      return false;
    }

    // Update cooldown
    this.alertCooldowns.set(cooldownKey, now);

    return true;
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.acknowledgedAlerts.add(alertId);
      this.emit('alertAcknowledged', alert);
      console.log(`[REALTIME-RISK] Alert acknowledged: ${alertId}`);
    }
  }

  /**
   * Get default predictions
   */
  private getDefaultPredictions(): RiskAssessment['predictions'] {
    return {
      shortTerm: {
        timeframe: '1h',
        predictedScore: 0,
        predictedLevel: 'minimal',
        confidence: 0,
        factors: [],
        methodology: 'none'
      },
      mediumTerm: {
        timeframe: '24h',
        predictedScore: 0,
        predictedLevel: 'minimal',
        confidence: 0,
        factors: [],
        methodology: 'none'
      },
      longTerm: {
        timeframe: '168h',
        predictedScore: 0,
        predictedLevel: 'minimal',
        confidence: 0,
        factors: [],
        methodology: 'none'
      }
    };
  }

  /**
   * Get cache key
   */
  private getCacheKey(riskId: string, evidence: Evidence[]): string {
    const evidenceIds = evidence.map(e => e.id).sort().join(',');
    return `${riskId}-${evidenceIds}`;
  }

  /**
   * Start dashboard updates
   */
  private startDashboardUpdates(): void {
    this.dashboardInterval = setInterval(async () => {
      await this.updateDashboard();
    }, this.config.dashboard.updateInterval);

    console.log('[REALTIME-RISK] Dashboard updates started');
  }

  /**
   * Update dashboard
   */
  private async updateDashboard(): Promise<DashboardUpdate> {
    const timestamp = new Date();

    // Calculate overall risk
    const assessments = Array.from(this.riskAssessments.values());
    const scores = assessments.map(a => a.score);
    const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    const overallRisk = {
      score: avgScore,
      level: this.getRiskLevel(avgScore),
      trend: this.getOverallTrend(assessments)
    };

    // Calculate category breakdown
    const categoryMap = new Map<RiskCategory, RiskAssessment[]>();
    for (const assessment of assessments) {
      if (!categoryMap.has(assessment.category)) {
        categoryMap.set(assessment.category, []);
      }
      categoryMap.get(assessment.category)!.push(assessment);
    }

    const riskCategories = Array.from(categoryMap.entries()).map(([category, cats]) => {
      const catScores = cats.map(c => c.score);
      const catAvgScore = catScores.reduce((sum, s) => sum + s, 0) / catScores.length;
      return {
        category,
        score: catAvgScore,
        level: this.getRiskLevel(catAvgScore),
        count: cats.length,
        trend: this.getOverallTrend(cats)
      };
    });

    // Get top risks
    const topRisks = assessments
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.dashboard.maxTopRisks);

    // Get recent alerts
    const recentAlerts = this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, this.config.dashboard.maxRecentAlerts);

    // Calculate statistics
    const statistics = {
      totalRisks: assessments.length,
      criticalRisks: assessments.filter(a => a.level === 'critical').length,
      highRisks: assessments.filter(a => a.level === 'high').length,
      averageScore: avgScore,
      assessmentRate: this.calculateAssessmentRate(assessments)
    };

    const update: DashboardUpdate = {
      timestamp,
      overallRisk,
      riskCategories,
      topRisks,
      recentAlerts,
      statistics
    };

    this.emit('dashboardUpdated', update);

    return update;
  }

  /**
   * Get overall trend
   */
  private getOverallTrend(assessments: RiskAssessment[]): RiskTrendDirection {
    if (assessments.length < 3) return 'unknown';

    const recent = assessments.slice(-10);
    const scores = recent.map(a => a.score);

    const trend = this.extractTrendFromScores(scores);
    return trend.direction;
  }

  /**
   * Extract trend from scores
   */
  private extractTrendFromScores(scores: number[]): {
    direction: RiskTrendDirection;
    changeRate: number;
  } {
    const n = scores.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += scores[i];
      sumXY += i * scores[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (Math.abs(slope) < 0.1) {
      return { direction: 'stable', changeRate: slope };
    } else if (slope > 0) {
      return { direction: 'increasing', changeRate: slope };
    } else {
      return { direction: 'decreasing', changeRate: slope };
    }
  }

  /**
   * Calculate assessment rate
   */
  private calculateAssessmentRate(assessments: RiskAssessment[]): number {
    if (assessments.length < 2) return 0;

    const timeSpan = assessments[assessments.length - 1].timestamp.getTime() -
                    assessments[0].timestamp.getTime();
    const hours = timeSpan / (1000 * 60 * 60);

    return hours > 0 ? assessments.length / hours : 0;
  }

  /**
   * Get assessment
   */
  public getAssessment(id: string): RiskAssessment | undefined {
    return this.riskAssessments.get(id);
  }

  /**
   * Get assessments by risk ID
   */
  public getAssessmentsByRisk(riskId: string): RiskAssessment[] {
    return Array.from(this.riskAssessments.values())
      .filter(a => a.riskId === riskId);
  }

  /**
   * Get all assessments
   */
  public getAllAssessments(): RiskAssessment[] {
    return Array.from(this.riskAssessments.values());
  }

  /**
   * Get alerts
   */
  public getAlerts(): RiskThresholdAlert[] {
    return [...this.alerts];
  }

  /**
   * Get unacknowledged alerts
   */
  public getUnacknowledgedAlerts(): RiskThresholdAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get trends
   */
  public getTrends(): RiskTrend[] {
    return Array.from(this.riskTrends.values());
  }

  /**
   * Get dashboard update
   */
  public async getDashboardUpdate(): Promise<DashboardUpdate> {
    return await this.updateDashboard();
  }

  /**
   * Set current model
   */
  public setCurrentModel(model: ModelVersion): void {
    this.currentModel = model;
    this.emit('modelUpdated', model);
    console.log(`[REALTIME-RISK] Current model set: ${model.modelId}`);
  }

  /**
   * Stop real-time assessment
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop dashboard updates
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
      this.dashboardInterval = null;
    }

    this.emit('stopped', { timestamp: new Date() });
    console.log('[REALTIME-RISK] Real-time risk assessment engine stopped');
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.riskAssessments.clear();
    this.riskTrends.clear();
    this.alerts = [];
    this.acknowledgedAlerts.clear();
    this.assessmentHistory.clear();
    this.cache.clear();
    this.alertCooldowns.clear();

    this.emit('cleared', { timestamp: new Date() });
    console.log('[REALTIME-RISK] All data cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): RealTimeAssessmentConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RealTimeAssessmentConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', { config: this.config });
    console.log('[REALTIME-RISK] Configuration updated');
  }
}

/**
 * Create default real-time risk assessment engine
 */
export function createDefaultRealTimeRiskAssessmentEngine(): RealTimeRiskAssessmentEngine {
  return new RealTimeRiskAssessmentEngine();
}

/**
 * Create real-time risk assessment engine from config
 */
export function createRealTimeRiskAssessmentEngineFromConfig(
  config: Partial<RealTimeAssessmentConfig>
): RealTimeRiskAssessmentEngine {
  return new RealTimeRiskAssessmentEngine(config);
}
