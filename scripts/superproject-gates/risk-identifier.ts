/**
 * Risk Identification and Categorization System
 * 
 * Implements risk identification, categorization, and initial assessment
 * for the ROAM risk assessment framework
 */

import { EventEmitter } from 'events';
import {
  Risk,
  ROAMCategory,
  RiskSeverity,
  RiskProbability,
  RiskImpactArea,
  RiskStatus,
  RiskAssessmentConfig,
  RiskAssessmentEvent,
  RiskThresholds
} from './types';

export interface RiskIdentificationRequest {
  title: string;
  description: string;
  impactArea: RiskImpactArea[];
  estimatedBusinessImpact?: number;
  estimatedTechnicalImpact?: number;
  estimatedOperationalImpact?: number;
  estimatedFinancialImpact?: number;
  estimatedCostOfDelay?: number;
  source?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RiskPattern {
  id: string;
  name: string;
  description: string;
  category: ROAMCategory;
  severity: RiskSeverity;
  probability: RiskProbability;
  impactArea: RiskImpactArea[];
  keywords: string[];
  indicators: string[];
  suggestedMitigation: string;
  suggestedCategory: ROAMCategory;
  confidence: number; // 0-100
}

export class RiskIdentifier extends EventEmitter {
  private riskPatterns: Map<string, RiskPattern> = new Map();
  private config: RiskAssessmentConfig;
  private identifiedRisks: Map<string, Risk> = new Map();

  constructor(config: RiskAssessmentConfig) {
    super();
    this.config = config;
    this.initializeRiskPatterns();
  }

  private initializeRiskPatterns(): void {
    // Technical risk patterns
    this.addRiskPattern({
      id: 'tech-debt-accumulation',
      name: 'Technical Debt Accumulation',
      description: 'Accumulation of technical debt that may impact system maintainability and performance',
      category: 'owned',
      severity: 'high',
      probability: 'high',
      impactArea: ['technical', 'operational'],
      keywords: ['technical debt', 'code quality', 'refactoring', 'legacy', 'maintenance'],
      indicators: ['increasing bug count', 'slowing development velocity', 'frequent production issues'],
      suggestedMitigation: 'Schedule regular refactoring and code quality improvements',
      suggestedCategory: 'owned',
      confidence: 85
    });

    this.addRiskPattern({
      id: 'security-vulnerability',
      name: 'Security Vulnerability',
      description: 'Potential security vulnerabilities in the system',
      category: 'mitigated',
      severity: 'critical',
      probability: 'medium',
      impactArea: ['technical', 'financial', 'reputational'],
      keywords: ['security', 'vulnerability', 'breach', 'authentication', 'authorization'],
      indicators: ['unpatched dependencies', 'weak authentication', 'data exposure'],
      suggestedMitigation: 'Implement security scanning and regular security audits',
      suggestedCategory: 'mitigated',
      confidence: 90
    });

    this.addRiskPattern({
      id: 'performance-degradation',
      name: 'Performance Degradation',
      description: 'System performance degradation affecting user experience',
      category: 'owned',
      severity: 'medium',
      probability: 'medium',
      impactArea: ['technical', 'business'],
      keywords: ['performance', 'slow', 'latency', 'response time', 'throughput'],
      indicators: ['increasing response times', 'user complaints', 'timeout errors'],
      suggestedMitigation: 'Implement performance monitoring and optimization',
      suggestedCategory: 'owned',
      confidence: 80
    });

    // Business risk patterns
    this.addRiskPattern({
      id: 'budget-overrun',
      name: 'Budget Overrun',
      description: 'Project or operational costs exceeding allocated budget',
      category: 'owned',
      severity: 'high',
      probability: 'medium',
      impactArea: ['financial', 'business'],
      keywords: ['budget', 'cost', 'overrun', 'financial', 'expense'],
      indicators: ['increasing costs', 'budget alerts', 'resource overallocation'],
      suggestedMitigation: 'Implement regular budget reviews and cost controls',
      suggestedCategory: 'owned',
      confidence: 75
    });

    this.addRiskPattern({
      id: 'market-competition',
      name: 'Market Competition',
      description: 'Increased competition affecting market position',
      category: 'accepted',
      severity: 'medium',
      probability: 'high',
      impactArea: ['business', 'reputational'],
      keywords: ['competition', 'market', 'competitor', 'market share'],
      indicators: ['losing market share', 'new competitors', 'price pressure'],
      suggestedMitigation: 'Focus on differentiation and value proposition',
      suggestedCategory: 'accepted',
      confidence: 70
    });

    // Operational risk patterns
    this.addRiskPattern({
      id: 'key-person-dependency',
      name: 'Key Person Dependency',
      description: 'Critical dependency on key personnel',
      category: 'mitigated',
      severity: 'high',
      probability: 'medium',
      impactArea: ['operational', 'business'],
      keywords: ['key person', 'dependency', 'knowledge silo', 'single point of failure'],
      indicators: ['single expert', 'knowledge concentration', 'no documentation'],
      suggestedMitigation: 'Implement knowledge sharing and cross-training',
      suggestedCategory: 'mitigated',
      confidence: 85
    });

    this.addRiskPattern({
      id: 'process-inefficiency',
      name: 'Process Inefficiency',
      description: 'Inefficient processes affecting productivity',
      category: 'owned',
      severity: 'medium',
      probability: 'high',
      impactArea: ['operational', 'financial'],
      keywords: ['process', 'inefficiency', 'workflow', 'bottleneck', 'manual'],
      indicators: ['slow processes', 'manual workarounds', 'frequent errors'],
      suggestedMitigation: 'Process optimization and automation',
      suggestedCategory: 'owned',
      confidence: 75
    });

    // Compliance risk patterns
    this.addRiskPattern({
      id: 'compliance-violation',
      name: 'Compliance Violation',
      description: 'Potential violations of regulatory or compliance requirements',
      category: 'mitigated',
      severity: 'critical',
      probability: 'low',
      impactArea: ['compliance', 'financial', 'reputational'],
      keywords: ['compliance', 'regulation', 'audit', 'legal', 'gdpr', 'hipaa'],
      indicators: ['audit findings', 'regulatory changes', 'non-compliance'],
      suggestedMitigation: 'Implement compliance monitoring and regular audits',
      suggestedCategory: 'mitigated',
      confidence: 90
    });
  }

  public addRiskPattern(pattern: RiskPattern): void {
    this.riskPatterns.set(pattern.id, pattern);
  }

  public getRiskPattern(id: string): RiskPattern | undefined {
    return this.riskPatterns.get(id);
  }

  public getAllRiskPatterns(): RiskPattern[] {
    return Array.from(this.riskPatterns.values());
  }

  public async identifyRisk(request: RiskIdentificationRequest): Promise<Risk> {
    console.log(`[RISK-IDENTIFIER] Identifying risk: ${request.title}`);

    // Generate unique risk ID
    const riskId = this.generateId('risk');

    // Analyze risk using pattern matching
    const pattern = this.matchRiskPattern(request);

    // Calculate initial scores
    const scores = this.calculateRiskScores(request, pattern);

    // Determine initial category
    const category = this.determineRiskCategory(scores, pattern);

    // Determine severity and probability
    const severity = this.determineRiskSeverity(scores);
    const probability = this.determineRiskProbability(request, pattern);

    // Create risk object
    const risk: Risk = {
      id: riskId,
      title: request.title,
      description: request.description,
      category,
      severity,
      probability,
      impactArea: request.impactArea,
      status: 'identified',
      score: scores.overall,
      businessImpact: scores.businessImpact,
      technicalImpact: scores.technicalImpact,
      operationalImpact: scores.operationalImpact,
      financialImpact: scores.financialImpact,
      estimatedCostOfDelay: request.estimatedCostOfDelay || scores.estimatedCostOfDelay,
      estimatedMitigationCost: scores.estimatedMitigationCost,
      identifiedAt: new Date(),
      lastReviewed: new Date(),
      nextReviewDate: this.calculateNextReviewDate(severity),
      tags: request.tags || [],
      dependencies: [],
      relatedRisks: [],
      mitigationStrategy: pattern?.suggestedMitigation,
      metrics: {
        initialScore: scores.overall,
        currentScore: scores.overall,
        scoreHistory: [{
          timestamp: new Date(),
          score: scores.overall,
          reason: 'Initial risk identification'
        }],
        mitigationProgress: 0,
        lastUpdated: new Date()
      },
      metadata: {
        ...request.metadata,
        source: request.source || 'manual',
        patternMatch: pattern?.id,
        patternConfidence: pattern?.confidence || 0
      }
    };

    // Store risk
    this.identifiedRisks.set(riskId, risk);

    // Emit event
    this.emit('riskIdentified', {
      type: 'risk_identified',
      timestamp: new Date(),
      riskId,
      data: { risk, pattern },
      description: `Risk identified: ${risk.title}`
    } as RiskAssessmentEvent);

    console.log(`[RISK-IDENTIFIER] Risk identified with ID: ${riskId}, Score: ${scores.overall}, Category: ${category}`);

    return risk;
  }

  private matchRiskPattern(request: RiskIdentificationRequest): RiskPattern | undefined {
    let bestMatch: RiskPattern | undefined;
    let bestScore = 0;

    const text = `${request.title} ${request.description}`.toLowerCase();

    for (const pattern of this.riskPatterns.values()) {
      let score = 0;

      // Check keyword matches
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 20;
        }
      }

      // Check impact area matches
      for (const impact of pattern.impactArea) {
        if (request.impactArea.includes(impact)) {
          score += 15;
        }
      }

      // Apply confidence factor
      score = score * (pattern.confidence / 100);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }

    return bestMatch;
  }

  private calculateRiskScores(request: RiskIdentificationRequest, pattern?: RiskPattern): {
    overall: number;
    businessImpact: number;
    technicalImpact: number;
    operationalImpact: number;
    financialImpact: number;
    estimatedCostOfDelay: number;
    estimatedMitigationCost: number;
  } {
    // Base scores from request or pattern
    const businessImpact = request.estimatedBusinessImpact || pattern?.severity === 'critical' ? 80 : 
                         pattern?.severity === 'high' ? 60 : 
                         pattern?.severity === 'medium' ? 40 : 20;

    const technicalImpact = request.estimatedTechnicalImpact || 
                          request.impactArea.includes('technical') ? 70 : 30;

    const operationalImpact = request.estimatedOperationalImpact || 
                           request.impactArea.includes('operational') ? 70 : 30;

    const financialImpact = request.estimatedFinancialImpact || 
                          request.impactArea.includes('financial') ? 70 : 30;

    // Calculate weighted overall score
    const weights = this.config.scoringWeights;
    const overall = Math.round(
      (businessImpact * weights.impact.business / 100) +
      (technicalImpact * weights.impact.technical / 100) +
      (operationalImpact * weights.impact.operational / 100) +
      (financialImpact * weights.impact.financial / 100)
    );

    // Estimate cost of delay based on impact scores
    const estimatedCostOfDelay = request.estimatedCostOfDelay || 
      Math.round((businessImpact + financialImpact) * 1000); // Simple calculation

    // Estimate mitigation cost based on severity and complexity
    const estimatedMitigationCost = Math.round(
      (businessImpact + technicalImpact + operationalImpact) * 100
    );

    return {
      overall: Math.min(100, Math.max(0, overall)),
      businessImpact: Math.min(100, Math.max(0, businessImpact)),
      technicalImpact: Math.min(100, Math.max(0, technicalImpact)),
      operationalImpact: Math.min(100, Math.max(0, operationalImpact)),
      financialImpact: Math.min(100, Math.max(0, financialImpact)),
      estimatedCostOfDelay,
      estimatedMitigationCost
    };
  }

  private determineRiskCategory(scores: any, pattern?: RiskPattern): ROAMCategory {
    // Use pattern suggestion if confidence is high
    if (pattern && pattern.confidence > 80) {
      return pattern.suggestedCategory;
    }

    // Determine category based on scores and configuration
    if (scores.overall >= this.config.thresholds.critical.minScore) {
      return 'owned'; // Critical risks should be owned
    } else if (scores.overall >= this.config.thresholds.high.minScore) {
      return 'owned'; // High risks should be owned
    } else if (scores.overall >= this.config.thresholds.medium.minScore) {
      return 'mitigated'; // Medium risks should be mitigated
    } else {
      return 'accepted'; // Low risks can be accepted
    }
  }

  private determineRiskSeverity(scores: any): RiskSeverity {
    if (scores.overall >= 80) return 'critical';
    if (scores.overall >= 60) return 'high';
    if (scores.overall >= 40) return 'medium';
    return 'low';
  }

  private determineRiskProbability(request: RiskIdentificationRequest, pattern?: RiskPattern): RiskProbability {
    // Use pattern probability if available
    if (pattern) {
      return pattern.probability;
    }

    // Default probability based on impact areas
    if (request.impactArea.includes('financial') || request.impactArea.includes('reputational')) {
      return 'medium';
    }
    return 'low';
  }

  private calculateNextReviewDate(severity: RiskSeverity): Date {
    const now = new Date();
    const intervals = this.config.reviewIntervals;
    
    let daysToAdd: number;
    switch (severity) {
      case 'critical':
        daysToAdd = intervals.critical;
        break;
      case 'high':
        daysToAdd = intervals.high;
        break;
      case 'medium':
        daysToAdd = intervals.medium;
        break;
      case 'low':
        daysToAdd = intervals.low;
        break;
      default:
        daysToAdd = 30; // Default to 30 days
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  public getRisk(id: string): Risk | undefined {
    return this.identifiedRisks.get(id);
  }

  public getAllRisks(): Risk[] {
    return Array.from(this.identifiedRisks.values());
  }

  public getRisksByCategory(category: ROAMCategory): Risk[] {
    return this.getAllRisks().filter(risk => risk.category === category);
  }

  public getRisksBySeverity(severity: RiskSeverity): Risk[] {
    return this.getAllRisks().filter(risk => risk.severity === severity);
  }

  public getRisksByImpactArea(impactArea: RiskImpactArea): Risk[] {
    return this.getAllRisks().filter(risk => risk.impactArea.includes(impactArea));
  }

  public updateRisk(riskId: string, updates: Partial<Risk>): Risk | undefined {
    const risk = this.identifiedRisks.get(riskId);
    if (!risk) {
      return undefined;
    }

    const updatedRisk = { ...risk, ...updates, lastReviewed: new Date() };
    this.identifiedRisks.set(riskId, updatedRisk);

    // Emit update event
    this.emit('riskUpdated', {
      type: 'risk_assessed',
      timestamp: new Date(),
      riskId,
      data: { updates, risk: updatedRisk },
      description: `Risk updated: ${updatedRisk.title}`
    } as RiskAssessmentEvent);

    return updatedRisk;
  }

  public deleteRisk(riskId: string): boolean {
    const deleted = this.identifiedRisks.delete(riskId);
    if (deleted) {
      this.emit('riskDeleted', {
        type: 'risk_closed',
        timestamp: new Date(),
        riskId,
        data: { riskId },
        description: `Risk deleted: ${riskId}`
      } as RiskAssessmentEvent);
    }
    return deleted;
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  public getRiskStatistics(): {
    total: number;
    byCategory: Record<ROAMCategory, number>;
    bySeverity: Record<RiskSeverity, number>;
    byImpactArea: Record<RiskImpactArea, number>;
    averageScore: number;
  } {
    const risks = this.getAllRisks();
    
    const byCategory: Record<ROAMCategory, number> = {
      resolved: 0,
      owned: 0,
      accepted: 0,
      mitigated: 0
    };

    const bySeverity: Record<RiskSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const byImpactArea: Record<RiskImpactArea, number> = {
      technical: 0,
      business: 0,
      operational: 0,
      financial: 0,
      reputational: 0,
      compliance: 0
    };

    let totalScore = 0;

    for (const risk of risks) {
      byCategory[risk.category]++;
      bySeverity[risk.severity]++;
      
      for (const impact of risk.impactArea) {
        byImpactArea[impact]++;
      }
      
      totalScore += risk.score;
    }

    return {
      total: risks.length,
      byCategory,
      bySeverity,
      byImpactArea,
      averageScore: risks.length > 0 ? Math.round(totalScore / risks.length) : 0
    };
  }
}