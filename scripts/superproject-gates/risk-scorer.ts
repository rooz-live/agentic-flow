/**
 * Risk Scoring and Impact Assessment Algorithms
 * 
 * Implements comprehensive risk scoring algorithms and impact assessment
 * for ROAM risk assessment framework
 */

import { EventEmitter } from 'events';
import {
  Risk,
  RiskSeverity,
  RiskProbability,
  RiskImpactArea,
  RiskAssessmentConfig,
  RiskAssessmentEvent,
  RiskThresholds
} from './types';

export interface RiskScoringRequest {
  riskId: string;
  probability: RiskProbability;
  severity: RiskSeverity;
  impactArea: RiskImpactArea[];
  businessImpact: number; // 0-100
  technicalImpact: number; // 0-100
  operationalImpact: number; // 0-100
  financialImpact: number; // 0-100
  estimatedCostOfDelay?: number;
  contextualFactors?: ContextualFactor[];
}

export interface ContextualFactor {
  name: string;
  weight: number; // 0-1, multiplier for risk score
  description: string;
  category: 'environmental' | 'organizational' | 'technical' | 'external' | 'temporal';
}

export interface RiskScoringResult {
  riskId: string;
  overallScore: number;
  componentScores: {
    probability: number;
    severity: number;
    businessImpact: number;
    technicalImpact: number;
    operationalImpact: number;
    financialImpact: number;
    contextualAdjustment: number;
  };
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  costOfDelay: number;
  recommendedActions: string[];
  confidence: number; // 0-100
  calculatedAt: Date;
  scoringMethod: string;
}

export interface ImpactAssessmentConfig {
  financialImpactMultiplier: number;
  reputationImpactMultiplier: number;
  complianceImpactMultiplier: number;
  customerImpactMultiplier: number;
  operationalImpactMultiplier: number;
  strategicImpactMultiplier: number;
  timeDecayFactor: number; // How risk score changes over time
  probabilityWeight: number;
  severityWeight: number;
  impactWeight: number;
}

export class RiskScorer extends EventEmitter {
  private config: RiskAssessmentConfig;
  private impactConfig: ImpactAssessmentConfig;
  private contextualFactors: Map<string, ContextualFactor[]> = new Map();

  constructor(config: RiskAssessmentConfig, impactConfig?: Partial<ImpactAssessmentConfig>) {
    super();
    this.config = config;
    this.impactConfig = {
      financialImpactMultiplier: 1.0,
      reputationImpactMultiplier: 0.8,
      complianceImpactMultiplier: 1.2,
      customerImpactMultiplier: 0.9,
      operationalImpactMultiplier: 1.0,
      strategicImpactMultiplier: 0.7,
      timeDecayFactor: 0.95,
      probabilityWeight: 0.3,
      severityWeight: 0.3,
      impactWeight: 0.4,
      ...impactConfig
    };
    this.initializeContextualFactors();
  }

  private initializeContextualFactors(): void {
    // Environmental factors
    this.addContextualFactor('market_volatility', {
      name: 'Market Volatility',
      weight: 1.2,
      description: 'High market volatility increases risk impact',
      category: 'environmental'
    });

    this.addContextualFactor('regulatory_changes', {
      name: 'Regulatory Changes',
      weight: 1.3,
      description: 'Regulatory environment changes increase risk',
      category: 'environmental'
    });

    // Organizational factors
    this.addContextualFactor('organizational_change', {
      name: 'Organizational Change',
      weight: 1.1,
      description: 'Organizational changes increase operational risk',
      category: 'organizational'
    });

    this.addContextualFactor('resource_constraints', {
      name: 'Resource Constraints',
      weight: 1.15,
      description: 'Limited resources increase risk impact',
      category: 'organizational'
    });

    // Technical factors
    this.addContextualFactor('technical_complexity', {
      name: 'Technical Complexity',
      weight: 1.25,
      description: 'High technical complexity increases risk',
      category: 'technical'
    });

    this.addContextualFactor('legacy_dependencies', {
      name: 'Legacy Dependencies',
      weight: 1.2,
      description: 'Legacy system dependencies increase risk',
      category: 'technical'
    });

    // External factors
    this.addContextualFactor('supply_chain_risk', {
      name: 'Supply Chain Risk',
      weight: 1.1,
      description: 'Supply chain disruptions increase operational risk',
      category: 'external'
    });

    this.addContextualFactor('cybersecurity_threats', {
      name: 'Cybersecurity Threats',
      weight: 1.3,
      description: 'High cybersecurity threat level increases risk',
      category: 'external'
    });

    // Temporal factors
    this.addContextualFactor('seasonal_demand', {
      name: 'Seasonal Demand',
      weight: 1.05,
      description: 'Seasonal demand variations affect risk',
      category: 'temporal'
    });

    this.addContextualFactor('project_phase', {
      name: 'Project Phase',
      weight: 1.1,
      description: 'Project phase affects risk level',
      category: 'temporal'
    });
  }

  public addContextualFactor(factorId: string, factor: ContextualFactor): void {
    const factors = this.contextualFactors.get(factorId) || [];
    factors.push(factor);
    this.contextualFactors.set(factorId, factors);
  }

  public getContextualFactors(factorId?: string): ContextualFactor[] {
    if (factorId) {
      return this.contextualFactors.get(factorId) || [];
    }
    return Array.from(this.contextualFactors.values()).flat();
  }

  public async calculateRiskScore(request: RiskScoringRequest): Promise<RiskScoringResult> {
    console.log(`[RISK-SCORER] Calculating risk score for: ${request.riskId}`);

    // Calculate component scores
    const probabilityScore = this.calculateProbabilityScore(request.probability);
    const severityScore = this.calculateSeverityScore(request.severity);
    const impactScore = this.calculateImpactScore(request);
    const contextualScore = this.calculateContextualScore(request.contextualFactors || []);

    // Calculate weighted overall score
    const overallScore = Math.round(
      (probabilityScore * this.impactConfig.probabilityWeight) +
      (severityScore * this.impactConfig.severityWeight) +
      (impactScore * this.impactConfig.impactWeight) +
      contextualScore
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallScore);

    // Calculate cost of delay
    const costOfDelay = this.calculateCostOfDelay(request);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(request, overallScore, riskLevel);

    // Calculate confidence
    const confidence = this.calculateScoringConfidence(request);

    const result: RiskScoringResult = {
      riskId: request.riskId,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      componentScores: {
        probability: probabilityScore,
        severity: severityScore,
        businessImpact: request.businessImpact,
        technicalImpact: request.technicalImpact,
        operationalImpact: request.operationalImpact,
        financialImpact: request.financialImpact,
        contextualAdjustment: contextualScore
      },
      riskLevel,
      costOfDelay,
      recommendedActions,
      confidence,
      calculatedAt: new Date(),
      scoringMethod: 'weighted_comprehensive'
    };

    // Emit event
    this.emit('riskScoreCalculated', {
      type: 'risk_assessed',
      timestamp: new Date(),
      riskId: request.riskId,
      data: { result, request },
      description: `Risk score calculated: ${overallScore} (${riskLevel})`
    } as RiskAssessmentEvent);

    console.log(`[RISK-SCORER] Risk score calculated: ${overallScore}, Level: ${riskLevel}, Confidence: ${confidence}%`);

    return result;
  }

  private calculateProbabilityScore(probability: RiskProbability): number {
    const probabilityScores: Record<RiskProbability, number> = {
      very_high: 95,
      high: 80,
      medium: 60,
      low: 30,
      very_low: 10
    };
    return probabilityScores[probability] || 50;
  }

  private calculateSeverityScore(severity: RiskSeverity): number {
    const severityScores: Record<RiskSeverity, number> = {
      critical: 95,
      high: 80,
      medium: 60,
      low: 30
    };
    return severityScores[severity] || 50;
  }

  private calculateImpactScore(request: RiskScoringRequest): number {
    // Use config weights for different impact areas
    const weights = this.config.scoringWeights.impact;
    
    const weightedBusinessImpact = request.businessImpact * weights.business / 100;
    const weightedTechnicalImpact = request.technicalImpact * weights.technical / 100;
    const weightedOperationalImpact = request.operationalImpact * weights.operational / 100;
    const weightedFinancialImpact = request.financialImpact * weights.financial / 100;

    // Apply impact area multipliers
    let totalImpact = 0;
    let impactCount = 0;

    if (request.impactArea.includes('business')) {
      totalImpact += weightedBusinessImpact * this.impactConfig.strategicImpactMultiplier;
      impactCount++;
    }

    if (request.impactArea.includes('technical')) {
      totalImpact += weightedTechnicalImpact;
      impactCount++;
    }

    if (request.impactArea.includes('operational')) {
      totalImpact += weightedOperationalImpact * this.impactConfig.operationalImpactMultiplier;
      impactCount++;
    }

    if (request.impactArea.includes('financial')) {
      totalImpact += weightedFinancialImpact * this.impactConfig.financialImpactMultiplier;
      impactCount++;
    }

    if (request.impactArea.includes('reputational')) {
      totalImpact += weightedBusinessImpact * this.impactConfig.reputationImpactMultiplier;
      impactCount++;
    }

    if (request.impactArea.includes('compliance')) {
      totalImpact += weightedBusinessImpact * this.impactConfig.complianceImpactMultiplier;
      impactCount++;
    }

    return impactCount > 0 ? totalImpact / impactCount : 0;
  }

  private calculateContextualScore(contextualFactors: ContextualFactor[]): number {
    if (contextualFactors.length === 0) {
      return 0;
    }

    // Calculate average contextual adjustment
    const totalWeight = contextualFactors.reduce((sum, factor) => sum + factor.weight, 0);
    const averageWeight = totalWeight / contextualFactors.length;

    // Convert to score adjustment (0-20 points max)
    const adjustment = Math.min(20, (averageWeight - 1) * 40);
    return Math.max(0, adjustment);
  }

  private determineRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    const thresholds = this.config.thresholds;
    
    if (score >= thresholds.critical.minScore) {
      return 'critical';
    } else if (score >= thresholds.high.minScore) {
      return 'high';
    } else if (score >= thresholds.medium.minScore) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private calculateCostOfDelay(request: RiskScoringRequest): number {
    // Use provided cost of delay or calculate based on impacts
    if (request.estimatedCostOfDelay) {
      return request.estimatedCostOfDelay;
    }

    // Calculate based on financial and business impact
    const baseCost = (request.financialImpact + request.businessImpact) * 1000;
    
    // Adjust for probability and severity
    const probabilityMultiplier = this.calculateProbabilityScore(request.probability) / 100;
    const severityMultiplier = this.calculateSeverityScore(request.severity) / 100;
    
    return Math.round(baseCost * probabilityMultiplier * severityMultiplier);
  }

  private generateRecommendedActions(
    request: RiskScoringRequest, 
    score: number, 
    riskLevel: 'critical' | 'high' | 'medium' | 'low'
  ): string[] {
    const actions: string[] = [];

    // Base actions by risk level
    switch (riskLevel) {
      case 'critical':
        actions.push('Immediate mitigation required', 'Executive notification', 'Daily monitoring');
        break;
      case 'high':
        actions.push('Urgent mitigation planning', 'Weekly monitoring', 'Stakeholder communication');
        break;
      case 'medium':
        actions.push('Mitigation planning', 'Monthly monitoring', 'Regular reviews');
        break;
      case 'low':
        actions.push('Acceptance consideration', 'Quarterly monitoring', 'Documentation');
        break;
    }

    // Actions by impact area
    for (const impact of request.impactArea) {
      switch (impact) {
        case 'technical':
          actions.push('Technical review and assessment');
          break;
        case 'business':
          actions.push('Business impact analysis');
          break;
        case 'operational':
          actions.push('Operational procedure review');
          break;
        case 'financial':
          actions.push('Financial impact quantification');
          break;
        case 'reputational':
          actions.push('Reputation risk assessment');
          break;
        case 'compliance':
          actions.push('Compliance audit and review');
          break;
      }
    }

    // Actions by probability
    if (request.probability === 'very_high' || request.probability === 'high') {
      actions.push('Immediate preventive measures');
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  private calculateScoringConfidence(request: RiskScoringRequest): number {
    let confidence = 80; // Base confidence

    // Adjust based on data completeness
    const hasAllImpacts = request.businessImpact > 0 && 
                          request.technicalImpact > 0 && 
                          request.operationalImpact > 0 && 
                          request.financialImpact > 0;
    
    if (hasAllImpacts) {
      confidence += 10;
    } else {
      confidence -= 15;
    }

    // Adjust based on contextual factors
    if (request.contextualFactors && request.contextualFactors.length > 0) {
      confidence += 5;
    }

    // Adjust based on cost of delay
    if (request.estimatedCostOfDelay && request.estimatedCostOfDelay > 0) {
      confidence += 5;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  public async recalculateRiskScore(riskId: string, updates: Partial<RiskScoringRequest>): Promise<RiskScoringResult> {
    console.log(`[RISK-SCORER] Recalculating risk score for: ${riskId}`);

    // This would typically fetch the current risk data
    // For now, create a basic request with updates
    const request: RiskScoringRequest = {
      riskId,
      probability: 'medium',
      severity: 'medium',
      impactArea: ['technical'],
      businessImpact: 50,
      technicalImpact: 50,
      operationalImpact: 50,
      financialImpact: 50,
      ...updates
    };

    return this.calculateRiskScore(request);
  }

  public async batchCalculateRiskScores(requests: RiskScoringRequest[]): Promise<RiskScoringResult[]> {
    console.log(`[RISK-SCORER] Batch calculating ${requests.length} risk scores`);

    const results: RiskScoringResult[] = [];
    
    for (const request of requests) {
      const result = await this.calculateRiskScore(request);
      results.push(result);
    }

    // Emit batch completion event
    this.emit('batchRiskScoresCalculated', {
      type: 'batch_risk_assessed',
      timestamp: new Date(),
      data: { results, count: requests.length },
      description: `Batch risk score calculation completed for ${requests.length} risks`
    } as RiskAssessmentEvent);

    return results;
  }

  public getRiskScoreTrend(riskId: string, historicalScores: number[]): {
    trend: 'improving' | 'stable' | 'deteriorating';
    changeRate: number; // percentage change
    confidence: number; // 0-100
  } {
    if (historicalScores.length < 2) {
      return {
        trend: 'stable',
        changeRate: 0,
        confidence: 0
      };
    }

    const recentScores = historicalScores.slice(-5); // Last 5 scores
    const olderScores = historicalScores.slice(0, -5); // Earlier scores

    if (olderScores.length === 0) {
      return {
        trend: 'stable',
        changeRate: 0,
        confidence: 50
      };
    }

    const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const olderAverage = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

    const changeRate = ((recentAverage - olderAverage) / olderAverage) * 100;
    
    let trend: 'improving' | 'stable' | 'deteriorating';
    if (Math.abs(changeRate) < 5) {
      trend = 'stable';
    } else if (changeRate > 0) {
      trend = 'deteriorating';
    } else {
      trend = 'improving';
    }

    const confidence = Math.min(100, historicalScores.length * 10);

    return {
      trend,
      changeRate: Math.round(changeRate),
      confidence
    };
  }

  public compareRiskScores(scores: RiskScoringResult[]): {
    ranking: RiskScoringResult[];
    statistics: {
      average: number;
      median: number;
      min: number;
      max: number;
      standardDeviation: number;
    };
  } {
    // Sort by score (descending)
    const ranking = scores.sort((a, b) => b.overallScore - a.overallScore);

    // Calculate statistics
    const scoreValues = scores.map(result => result.overallScore);
    const average = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
    
    const sortedScores = [...scoreValues].sort((a, b) => a - b);
    const median = sortedScores.length % 2 === 0 ? 
      (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2 :
      sortedScores[Math.floor(sortedScores.length / 2)];
    
    const min = Math.min(...scoreValues);
    const max = Math.max(...scoreValues);
    
    const variance = scoreValues.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scoreValues.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      ranking,
      statistics: {
        average: Math.round(average),
        median: Math.round(median),
        min,
        max,
        standardDeviation: Math.round(standardDeviation)
      }
    };
  }

  public updateConfig(config: Partial<RiskAssessmentConfig>): void {
    this.config = { ...this.config, ...config };
    
    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.config },
      description: 'Risk scoring configuration updated'
    } as RiskAssessmentEvent);
  }

  public updateImpactConfig(config: Partial<ImpactAssessmentConfig>): void {
    this.impactConfig = { ...this.impactConfig, ...config };
    
    this.emit('impactConfigUpdated', {
      type: 'impact_config_updated',
      timestamp: new Date(),
      data: { config: this.impactConfig },
      description: 'Impact assessment configuration updated'
    } as RiskAssessmentEvent);
  }

  public getConfig(): RiskAssessmentConfig {
    return this.config;
  }

  public getImpactConfig(): ImpactAssessmentConfig {
    return this.impactConfig;
  }
}