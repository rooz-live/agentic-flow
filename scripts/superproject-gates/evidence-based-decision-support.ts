/**
 * Evidence-Driven Risk Assessment - Evidence-Based Decision Support
 *
 * Implements decision recommendation engine, evidence-backed confidence scores,
 * audit trail, outcome tracking, and learning feedback loop.
 *
 * Applies Manthra: Directed thought-power for logical separation
 * Applies Yasna: Disciplined alignment through consistent interfaces
 * Applies Mithra: Binding force preventing code drift
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Evidence, EvidenceQuality } from './evidence-risk-assessment.js';
import type { RiskAssessment, RiskLevel, RiskCategory } from './realtime-risk-assessment.js';

/**
 * Decision type
 */
export type DecisionType = 'mitigation' | 'acceptance' | 'transfer' | 'avoidance' | 'monitoring';

/**
 * Decision status
 */
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'completed' | 'failed';

/**
 * Decision recommendation
 */
export interface DecisionRecommendation {
  id: string;
  timestamp: Date;
  decisionType: DecisionType;
  title: string;
  description: string;
  context: {
    riskId: string;
    riskTitle: string;
    riskCategory: RiskCategory;
    riskLevel: RiskLevel;
    riskScore: number;
  };
  options: DecisionOption[];
  recommendedOption: string;
  confidence: number; // 0 to 1
  evidence: {
    supporting: string[]; // Evidence IDs
    contradicting: string[]; // Evidence IDs
    quality: EvidenceQuality;
    count: number;
    chain: EvidenceChain[];
  };
  reasoning: {
    primaryFactors: string[];
    secondaryFactors: string[];
    assumptions: string[];
    alternatives: string[];
  };
  expectedOutcomes: {
    bestCase: string;
    expectedCase: string;
    worstCase: string;
  };
  metadata: {
    modelId: string;
    modelVersion: string;
    generationTime: number;
  };
}

/**
 * Decision option
 */
export interface DecisionOption {
  id: string;
  type: DecisionType;
  title: string;
  description: string;
  estimatedCost: number;
  estimatedBenefit: number;
  estimatedEffort: number;
  estimatedDuration: number;
  riskReduction: number; // 0 to 100
  confidence: number; // 0 to 1
  pros: string[];
  cons: string[];
  dependencies: string[];
  wsjfScore?: number;
}

/**
 * Evidence chain
 */
export interface EvidenceChain {
  id: string;
  evidenceId: string;
  timestamp: Date;
  type: 'direct' | 'indirect' | 'corroborating' | 'contradicting';
  strength: number; // 0 to 1
  confidence: number; // 0 to 1
  relatedEvidence: string[];
  metadata: {
    source: string;
    method: string;
  };
}

/**
 * Decision audit entry
 */
export interface DecisionAuditEntry {
  id: string;
  timestamp: Date;
  decisionId: string;
  decisionType: DecisionType;
  action: 'created' | 'modified' | 'approved' | 'rejected' | 'implemented' | 'completed' | 'failed';
  actor: string;
  reason: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

/**
 * Decision outcome
 */
export interface DecisionOutcome {
  id: string;
  decisionId: string;
  timestamp: Date;
  status: 'success' | 'partial' | 'failure';
  actualOutcome: string;
  expectedOutcome: string;
  outcomeMatch: 'exceeded' | 'met' | 'partial' | 'missed';
  metrics: {
    costActual: number;
    costExpected: number;
    benefitActual: number;
    benefitExpected: number;
    effortActual: number;
    effortExpected: number;
    durationActual: number;
    durationExpected: number;
    riskReductionActual: number;
    riskReductionExpected: number;
  };
  lessonsLearned: string[];
  feedback: string;
  confidenceAccuracy: number; // How accurate was the confidence score
  metadata: {
    reportedBy: string;
    verifiedBy?: string;
  };
}

/**
 * Decision learning feedback
 */
export interface DecisionLearningFeedback {
  id: string;
  timestamp: Date;
  decisionId: string;
  feedbackType: 'outcome_reported' | 'confidence_corrected' | 'model_updated' | 'pattern_identified';
  data: Record<string, any>;
  impact: {
    confidenceAdjustment: number;
    accuracyImprovement: number;
    patternStrength: number;
  };
  metadata: {
    source: string;
    processed: boolean;
  };
}

/**
 * Decision support configuration
 */
export interface DecisionSupportConfig {
  recommendations: {
    enabled: boolean;
    minConfidence: number; // 0 to 1
    maxOptions: number;
    includeAlternatives: boolean;
    includeCostBenefit: boolean;
    includeWSJF: boolean;
  };
  evidence: {
    minChainLength: number;
    maxChainDepth: number;
    requireCorroboration: boolean;
    contradictionThreshold: number; // 0 to 1
  };
  audit: {
    enabled: boolean;
    includeMetadata: boolean;
    retentionDays: number;
    autoArchive: boolean;
  };
  learning: {
    enabled: boolean;
    feedbackLoop: boolean;
    patternRecognition: boolean;
    confidenceAdjustment: boolean;
    minFeedbackSamples: number;
  };
  storage: {
    decisionsPath: string;
    auditPath: string;
    outcomesPath: string;
    learningPath: string;
    compressionEnabled: boolean;
  };
}

/**
 * Evidence-Based Decision Support
 *
 * Provides decision recommendations with evidence backing,
 * audit trail, outcome tracking, and learning feedback.
 */
export class EvidenceBasedDecisionSupport extends EventEmitter {
  private config: DecisionSupportConfig;
  private recommendations: Map<string, DecisionRecommendation> = new Map();
  private decisions: Map<string, DecisionRecommendation> = new Map();
  private auditTrail: DecisionAuditEntry[] = [];
  private outcomes: Map<string, DecisionOutcome> = new Map();
  private learningFeedback: DecisionLearningFeedback[] = [];
  private evidenceChains: Map<string, EvidenceChain[]> = new Map();
  private confidenceHistory: Map<string, number[]> = new Map();
  private isRunning: boolean = false;

  constructor(config?: Partial<DecisionSupportConfig>) {
    super();

    this.config = this.createDefaultConfig(config);

    console.log('[DECISION-SUPPORT] Evidence-Based Decision Support initialized');
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(config?: Partial<DecisionSupportConfig>): DecisionSupportConfig {
    const defaultConfig: DecisionSupportConfig = {
      recommendations: {
        enabled: true,
        minConfidence: 0.6,
        maxOptions: 5,
        includeAlternatives: true,
        includeCostBenefit: true,
        includeWSJF: true
      },
      evidence: {
        minChainLength: 2,
        maxChainDepth: 5,
        requireCorroboration: true,
        contradictionThreshold: 0.3
      },
      audit: {
        enabled: true,
        includeMetadata: true,
        retentionDays: 365,
        autoArchive: true
      },
      learning: {
        enabled: true,
        feedbackLoop: true,
        patternRecognition: true,
        confidenceAdjustment: true,
        minFeedbackSamples: 10
      },
      storage: {
        decisionsPath: path.join(process.cwd(), '.goalie', 'decisions'),
        auditPath: path.join(process.cwd(), '.goalie', 'decision-audit'),
        outcomesPath: path.join(process.cwd(), '.goalie', 'decision-outcomes'),
        learningPath: path.join(process.cwd(), '.goalie', 'decision-learning'),
        compressionEnabled: true
      }
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Start decision support
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DECISION-SUPPORT] Decision support already running');
      return;
    }

    this.isRunning = true;
    console.log('[DECISION-SUPPORT] Starting evidence-based decision support');

    // Load existing data
    await this.loadExistingData();

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Generate decision recommendation
   */
  public async generateRecommendation(
    riskAssessment: RiskAssessment,
    evidence: Evidence[]
  ): Promise<DecisionRecommendation> {
    const startTime = Date.now();

    console.log(`[DECISION-SUPPORT] Generating recommendation for risk: ${riskAssessment.riskId}`);

    // Build evidence chains
    const chains = await this.buildEvidenceChains(evidence);

    // Generate decision options
    const options = await this.generateDecisionOptions(riskAssessment, evidence);

    // Select recommended option
    const recommendedOption = this.selectRecommendedOption(options);

    // Calculate confidence
    const confidence = this.calculateDecisionConfidence(
      riskAssessment,
      evidence,
      chains,
      recommendedOption
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      riskAssessment,
      evidence,
      options,
      recommendedOption
    );

    // Generate expected outcomes
    const expectedOutcomes = this.generateExpectedOutcomes(
      riskAssessment,
      recommendedOption
    );

    const recommendation: DecisionRecommendation = {
      id: uuidv4(),
      timestamp: new Date(),
      decisionType: recommendedOption.type,
      title: `Decision for ${riskAssessment.title}`,
      description: `Recommended action for ${riskAssessment.title}`,
      context: {
        riskId: riskAssessment.riskId,
        riskTitle: riskAssessment.title,
        riskCategory: riskAssessment.category,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score
      },
      options,
      recommendedOption: recommendedOption.id,
      confidence,
      evidence: {
        supporting: riskAssessment.evidence.supporting,
        contradicting: riskAssessment.evidence.contradicting,
        quality: riskAssessment.evidence.quality,
        count: evidence.length,
        chains
      },
      reasoning,
      expectedOutcomes,
      metadata: {
        modelId: riskAssessment.metadata.modelId,
        modelVersion: riskAssessment.metadata.modelVersion,
        generationTime: Date.now() - startTime
      }
    };

    // Store recommendation
    this.recommendations.set(recommendation.id, recommendation);
    this.decisions.set(recommendation.id, recommendation);

    // Add to audit trail
    await this.addToAuditTrail(recommendation.id, 'created', 'system', 'Recommendation generated');

    // Store to disk
    if (this.config.storage.decisionsPath) {
      await this.storeRecommendation(recommendation);
    }

    this.emit('recommendationGenerated', recommendation);

    console.log(`[DECISION-SUPPORT] Recommendation generated: ${recommendation.id} (confidence: ${(confidence * 100).toFixed(1)}%)`);
    return recommendation;
  }

  /**
   * Build evidence chains
   */
  private async buildEvidenceChains(evidence: Evidence[]): Promise<EvidenceChain[]> {
    const chains: EvidenceChain[] = [];
    const evidenceMap = new Map(evidence.map(e => [e.id, e]));

    // Build chains for each evidence
    for (const ev of evidence) {
      if (ev.validationStatus !== 'valid') continue;

      const chain: EvidenceChain = {
        id: uuidv4(),
        evidenceId: ev.id,
        timestamp: new Date(),
        type: 'direct',
        strength: ev.confidence * this.getQualityScore(ev.quality),
        confidence: ev.confidence,
        relatedEvidence: [],
        metadata: {
          source: ev.source,
          method: 'chain-building'
        }
      };

      // Find related evidence
      for (const [id, relatedEv] of evidenceMap) {
        if (id === ev.id) continue;

        // Check for corroboration
        const isCorroborating = this.isCorroborating(ev, relatedEv);
        if (isCorroborating) {
          chain.relatedEvidence.push(id);
          chain.strength += relatedEv.confidence * 0.2;
        }
      }

      // Check for contradictions
      const isContradicting = this.isContradicting(ev, evidence);
      if (isContradicting) {
        chain.type = 'contradicting';
        chain.strength *= (1 - this.config.evidence.contradictionThreshold);
      }

      // Check chain depth
      if (chain.relatedEvidence.length >= this.config.evidence.maxChainDepth) {
        chain.type = 'indirect';
        chain.strength *= 0.8;
      }

      // Normalize strength
      chain.strength = Math.min(1, chain.strength);

      chains.push(chain);
    }

    // Store chains
    for (const chain of chains) {
      if (!this.evidenceChains.has(chain.evidenceId)) {
        this.evidenceChains.set(chain.evidenceId, []);
      }
      this.evidenceChains.get(chain.evidenceId)!.push(chain);
    }

    return chains;
  }

  /**
   * Check if evidence is corroborating
   */
  private isCorroborating(evidence1: Evidence, evidence2: Evidence): boolean {
    // Check for similar data
    const keys1 = new Set(Object.keys(evidence1.data));
    const keys2 = new Set(Object.keys(evidence2.data));

    const intersection = new Set([...keys1].filter(k => keys2.has(k)));
    const union = new Set([...keys1, ...keys2]);

    // High overlap indicates corroboration
    return intersection.size / union.size > 0.5;
  }

  /**
   * Check if evidence is contradicting
   */
  private isContradicting(evidence: Evidence, allEvidence: Evidence[]): boolean {
    for (const other of allEvidence) {
      if (other.id === evidence.id) continue;

      // Check for contradictory values
      for (const [key, value1] of Object.entries(evidence.data)) {
        if (typeof value1 !== 'number') continue;

        const value2 = other.data[key];
        if (typeof value2 !== 'number') continue;

        // Check for significant difference
        const diff = Math.abs(value1 - value2);
        const avg = (value1 + value2) / 2;

        if (diff / avg > 0.5) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate decision options
   */
  private async generateDecisionOptions(
    riskAssessment: RiskAssessment,
    evidence: Evidence[]
  ): Promise<DecisionOption[]> {
    const options: DecisionOption[] = [];

    // Mitigation option
    const mitigationOption: DecisionOption = {
      id: uuidv4(),
      type: 'mitigation',
      title: 'Implement Mitigation',
      description: 'Take action to reduce the risk',
      estimatedCost: this.extractCost(evidence, 'mitigation'),
      estimatedBenefit: riskAssessment.score * 0.8,
      estimatedEffort: this.extractEffort(evidence, 'mitigation'),
      estimatedDuration: this.extractDuration(evidence, 'mitigation'),
      riskReduction: 0.8 + Math.random() * 0.2,
      confidence: riskAssessment.confidence * 0.9,
      pros: [
        'Directly addresses the risk',
        'Can be measured for effectiveness',
        'Reduces potential impact'
      ],
      cons: [
        'Requires resources and effort',
        'May introduce new risks',
        'Opportunity cost of alternatives'
      ],
      dependencies: this.extractDependencies(evidence, 'mitigation')
    };

    if (this.config.recommendations.includeWSJF) {
      mitigationOption.wsjfScore = this.calculateWSJF(mitigationOption);
    }

    options.push(mitigationOption);

    // Acceptance option (for low risks)
    if (riskAssessment.level === 'low' || riskAssessment.level === 'minimal') {
      const acceptanceOption: DecisionOption = {
        id: uuidv4(),
        type: 'acceptance',
        title: 'Accept Risk',
        description: 'Accept the risk as part of normal operations',
        estimatedCost: 0,
        estimatedBenefit: riskAssessment.score * 0.1,
        estimatedEffort: 0,
        estimatedDuration: 0,
        riskReduction: 0,
        confidence: riskAssessment.confidence * 0.7,
        pros: [
          'No additional cost',
          'Maintains operational flexibility',
          'Risk is within acceptable tolerance'
        ],
        cons: [
          'Risk may materialize',
          'Potential for cumulative impact',
          'Requires monitoring'
        ],
        dependencies: []
      };

      if (this.config.recommendations.includeWSJF) {
        acceptanceOption.wsjfScore = this.calculateWSJF(acceptanceOption);
      }

      options.push(acceptanceOption);
    }

    // Transfer option (if applicable)
    const transferOption: DecisionOption = {
      id: uuidv4(),
      type: 'transfer',
      title: 'Transfer Risk',
      description: 'Transfer risk to third party (insurance, outsourcing)',
      estimatedCost: this.extractCost(evidence, 'transfer'),
      estimatedBenefit: riskAssessment.score * 0.7,
      estimatedEffort: this.extractEffort(evidence, 'transfer'),
      estimatedDuration: this.extractDuration(evidence, 'transfer'),
      riskReduction: 0.6 + Math.random() * 0.2,
      confidence: riskAssessment.confidence * 0.8,
      pros: [
        'Reduces direct exposure',
        'Leverages third-party expertise',
        'Predictable cost'
      ],
      cons: [
        'Ongoing cost',
        'Loss of control',
        'Counterparty risk'
      ],
      dependencies: this.extractDependencies(evidence, 'transfer')
    };

    if (this.config.recommendations.includeWSJF) {
      transferOption.wsjfScore = this.calculateWSJF(transferOption);
    }

    options.push(transferOption);

    // Monitoring option
    const monitoringOption: DecisionOption = {
      id: uuidv4(),
      type: 'monitoring',
      title: 'Monitor Risk',
      description: 'Continue monitoring without immediate action',
      estimatedCost: this.extractCost(evidence, 'monitoring'),
      estimatedBenefit: riskAssessment.score * 0.3,
      estimatedEffort: this.extractEffort(evidence, 'monitoring'),
      estimatedDuration: this.extractDuration(evidence, 'monitoring'),
      riskReduction: 0,
      confidence: riskAssessment.confidence * 0.6,
      pros: [
        'Low cost',
        'Maintains flexibility',
        'Allows for data collection'
      ],
      cons: [
        'Risk may escalate',
        'Delayed action may increase impact',
        'Requires ongoing attention'
      ],
      dependencies: this.extractDependencies(evidence, 'monitoring')
    };

    if (this.config.recommendations.includeWSJF) {
      monitoringOption.wsjfScore = this.calculateWSJF(monitoringOption);
    }

    options.push(monitoringOption);

    // Limit options
    return options.slice(0, this.config.recommendations.maxOptions);
  }

  /**
   * Extract cost from evidence
   */
  private extractCost(evidence: Evidence[], type: DecisionType): number {
    let totalCost = 0;
    for (const ev of evidence) {
      const data = ev.data as any;
      if (data.estimatedCost) {
        totalCost += data.estimatedCost;
      }
      if (data.estimatedMitigationCost && type === 'mitigation') {
        totalCost += data.estimatedMitigationCost;
      }
    }
    return totalCost || 1000 + Math.random() * 5000;
  }

  /**
   * Extract effort from evidence
   */
  private extractEffort(evidence: Evidence[], type: DecisionType): number {
    let totalEffort = 0;
    for (const ev of evidence) {
      const data = ev.data as any;
      if (data.estimatedEffort) {
        totalEffort += data.estimatedEffort;
      }
    }
    return totalEffort || 5 + Math.random() * 15;
  }

  /**
   * Extract duration from evidence
   */
  private extractDuration(evidence: Evidence[], type: DecisionType): number {
    let totalDuration = 0;
    for (const ev of evidence) {
      const data = ev.data as any;
      if (data.estimatedDuration) {
        totalDuration += data.estimatedDuration;
      }
    }
    return totalDuration || 24 + Math.random() * 72;
  }

  /**
   * Extract dependencies from evidence
   */
  private extractDependencies(evidence: Evidence[], type: DecisionType): string[] {
    const dependencies: Set<string> = new Set();
    for (const ev of evidence) {
      const data = ev.data as any;
      if (data.dependencies && Array.isArray(data.dependencies)) {
        for (const dep of data.dependencies) {
          dependencies.add(dep);
        }
      }
    }
    return Array.from(dependencies);
  }

  /**
   * Calculate WSJF score
   */
  private calculateWSJF(option: DecisionOption): number {
    // WSJF = (User Business Value + Time Criticality + Customer Value + Risk Reduction) / Job Size
    const userBusinessValue = option.estimatedBenefit;
    const timeCriticality = 100 - option.estimatedDuration; // Shorter duration = more critical
    const customerValue = option.riskReduction * 100;
    const riskReduction = option.riskReduction * 100;
    const jobSize = option.estimatedEffort || 1;

    const wsjf = (userBusinessValue + timeCriticality + customerValue + riskReduction) / jobSize;
    return Math.max(0, wsjf);
  }

  /**
   * Select recommended option
   */
  private selectRecommendedOption(options: DecisionOption[]): DecisionOption {
    if (options.length === 0) {
      throw new Error('No decision options available');
    }

    // Sort by WSJF score if available, otherwise by confidence
    const sorted = [...options].sort((a, b) => {
      if (a.wsjfScore !== undefined && b.wsjfScore !== undefined) {
        return (b.wsjfScore || 0) - (a.wsjfScore || 0);
      }
      return b.confidence - a.confidence;
    });

    // Filter by minimum confidence
    const validOptions = sorted.filter(o => o.confidence >= this.config.recommendations.minConfidence);

    if (validOptions.length === 0) {
      return sorted[0];
    }

    return validOptions[0];
  }

  /**
   * Calculate decision confidence
   */
  private calculateDecisionConfidence(
    riskAssessment: RiskAssessment,
    evidence: Evidence[],
    chains: EvidenceChain[],
    recommendedOption: DecisionOption
  ): number {
    // Base confidence from risk assessment
    let confidence = riskAssessment.confidence;

    // Boost from evidence quality
    const validEvidence = evidence.filter(e => e.validationStatus === 'valid');
    const avgQuality = validEvidence.reduce((sum, e) => sum + this.getQualityScore(e.quality), 0) / validEvidence.length;
    confidence *= (0.5 + avgQuality * 0.5);

    // Boost from chain strength
    if (chains.length > 0) {
      const avgChainStrength = chains.reduce((sum, c) => sum + c.strength, 0) / chains.length;
      confidence *= (0.7 + avgChainStrength * 0.3);
    }

    // Boost from option confidence
    confidence *= (0.6 + recommendedOption.confidence * 0.4);

    // Normalize
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(
    riskAssessment: RiskAssessment,
    evidence: Evidence[],
    options: DecisionOption[],
    recommendedOption: DecisionOption
  ): DecisionRecommendation['reasoning'] {
    const primaryFactors: string[] = [
      `Risk level: ${riskAssessment.level}`,
      `Risk score: ${riskAssessment.score.toFixed(1)}`,
      `Evidence quality: ${riskAssessment.evidence.quality}`,
      `Confidence: ${(riskAssessment.confidence * 100).toFixed(1)}%`
    ];

    const secondaryFactors: string[] = [];
    if (riskAssessment.trends.length > 0) {
      secondaryFactors.push(`Risk trend: ${riskAssessment.trends[0].direction}`);
    }
    if (recommendedOption.wsjfScore) {
      secondaryFactors.push(`WSJF score: ${recommendedOption.wsjfScore.toFixed(1)}`);
    }

    const assumptions: string[] = [
      'Evidence is representative of current state',
      'Historical patterns will continue',
      'Resources are available for implementation'
    ];

    const alternatives: string[] = options
      .filter(o => o.id !== recommendedOption.id)
      .map(o => o.title);

    return {
      primaryFactors,
      secondaryFactors,
      assumptions,
      alternatives
    };
  }

  /**
   * Generate expected outcomes
   */
  private generateExpectedOutcomes(
    riskAssessment: RiskAssessment,
    recommendedOption: DecisionOption
  ): DecisionRecommendation['expectedOutcomes'] {
    const bestCase = `Risk reduced by ${recommendedOption.riskReduction * 100}%, cost within ${recommendedOption.estimatedCost * 0.8}`;
    const expectedCase = `Risk reduced by ${recommendedOption.riskReduction * 80}%, cost within ${recommendedOption.estimatedCost}`;
    const worstCase = `Risk reduced by ${recommendedOption.riskReduction * 60}%, cost up to ${recommendedOption.estimatedCost * 1.2}`;

    return {
      bestCase,
      expectedCase,
      worstCase
    };
  }

  /**
   * Approve decision
   */
  public async approveDecision(decisionId: string, actor: string, reason: string): Promise<void> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    // Add to audit trail
    await this.addToAuditTrail(decisionId, 'approved', actor, reason);

    // Log to governance audit trail
    const logger = getDecisionAuditLogger();
    await logger.logDecision(createDecisionAuditEntry({
      decision_id: `decision-approval-${decisionId}-${Date.now()}`,
      circle_role: 'assessor',
      decision_type: 'governance',
      context: {
        decisionId,
        decisionType: decision.decisionType,
        riskId: decision.context.riskId,
        riskLevel: decision.context.riskLevel,
        approved: true,
        actor
      },
      outcome: 'APPROVED',
      rationale: reason,
      alternatives_considered: [
        'Approve decision',
        'Reject decision',
        'Defer for more analysis'
      ],
      evidence_chain: [
        { source: 'decision-recommendation', weight: 0.6 },
        { source: 'risk-assessment', weight: 0.4 }
      ]
    }));

    this.emit('decisionApproved', { decisionId, actor, reason });
    console.log(`[DECISION-SUPPORT] Decision approved: ${decisionId} by ${actor}`);
  }

  /**
   * Reject decision
   */
  public async rejectDecision(decisionId: string, actor: string, reason: string): Promise<void> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    // Add to audit trail
    await this.addToAuditTrail(decisionId, 'rejected', actor, reason);

    // Log to governance audit trail
    const logger = getDecisionAuditLogger();
    await logger.logDecision(createDecisionAuditEntry({
      decision_id: `decision-rejection-${decisionId}-${Date.now()}`,
      circle_role: 'assessor',
      decision_type: 'governance',
      context: {
        decisionId,
        decisionType: decision.decisionType,
        riskId: decision.context.riskId,
        riskLevel: decision.context.riskLevel,
        approved: false,
        actor
      },
      outcome: 'REJECTED',
      rationale: reason,
      alternatives_considered: [
        'Approve decision',
        'Reject decision',
        'Defer for more analysis'
      ],
      evidence_chain: [
        { source: 'decision-recommendation', weight: 0.6 },
        { source: 'risk-assessment', weight: 0.4 }
      ]
    }));

    this.emit('decisionRejected', { decisionId, actor, reason });
    console.log(`[DECISION-SUPPORT] Decision rejected: ${decisionId} by ${actor}`);
  }

  /**
   * Record outcome
   */
  public async recordOutcome(
    decisionId: string,
    actualOutcome: string,
    metrics: Partial<DecisionOutcome['metrics']>,
    lessonsLearned: string[],
    feedback: string,
    reportedBy: string
  ): Promise<DecisionOutcome> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    const outcome: DecisionOutcome = {
      id: uuidv4(),
      decisionId,
      timestamp: new Date(),
      status: 'success',
      actualOutcome,
      expectedOutcome: decision.expectedOutcomes.expectedCase,
      outcomeMatch: this.determineOutcomeMatch(actualOutcome, decision.expectedOutcomes.expectedCase),
      metrics: {
        costActual: metrics.costActual || decision.options.find(o => o.id === decision.recommendedOption)?.estimatedCost || 0,
        costExpected: decision.options.find(o => o.id === decision.recommendedOption)?.estimatedCost || 0,
        benefitActual: metrics.benefitActual || decision.options.find(o => o.id === decision.recommendedOption)?.estimatedBenefit || 0,
        benefitExpected: decision.options.find(o => o.id === decision.recommendedOption)?.estimatedBenefit || 0,
        effortActual: metrics.effortActual || decision.options.find(o => o.id === decision.recommendedOption)?.estimatedEffort || 0,
        effortExpected: decision.options.find(o => o.id === decision.recommendedOption)?.estimatedEffort || 0,
        durationActual: metrics.durationActual || decision.options.find(o => o.id === decision.recommendedOption)?.estimatedDuration || 0,
        durationExpected: decision.options.find(o => o.id === decision.recommendedOption)?.estimatedDuration || 0,
        riskReductionActual: metrics.riskReductionActual || 0,
        riskReductionExpected: decision.options.find(o => o.id === decision.recommendedOption)?.riskReduction * 100 || 0
      },
      lessonsLearned,
      feedback,
      confidenceAccuracy: this.calculateConfidenceAccuracy(decision, metrics),
      metadata: {
        reportedBy,
        verifiedBy: undefined
      }
    };

    this.outcomes.set(outcome.id, outcome);

    // Add to audit trail
    await this.addToAuditTrail(decisionId, 'completed', reportedBy, 'Outcome recorded');

    // Generate learning feedback
    await this.generateLearningFeedback(outcome);

    // Store to disk
    if (this.config.storage.outcomesPath) {
      await this.storeOutcome(outcome);
    }

    this.emit('outcomeRecorded', outcome);

    console.log(`[DECISION-SUPPORT] Outcome recorded for decision: ${decisionId}`);
    return outcome;
  }

  /**
   * Determine outcome match
   */
  private determineOutcomeMatch(actual: string, expected: string): DecisionOutcome['outcomeMatch'] {
    if (actual === expected) return 'exceeded';
    if (actual.includes(expected) || expected.includes(actual)) return 'met';
    if (actual.toLowerCase().includes('partial') || expected.toLowerCase().includes('partial')) return 'partial';
    return 'missed';
  }

  /**
   * Calculate confidence accuracy
   */
  private calculateConfidenceAccuracy(
    decision: DecisionRecommendation,
    metrics: Partial<DecisionOutcome['metrics']>
  ): number {
    // Compare expected vs actual
    const costAccuracy = 1 - Math.abs((metrics.costActual || 0) - (metrics.costExpected || 0)) / (metrics.costExpected || 1);
    const benefitAccuracy = 1 - Math.abs((metrics.benefitActual || 0) - (metrics.benefitExpected || 0)) / (metrics.benefitExpected || 1);
    const effortAccuracy = 1 - Math.abs((metrics.effortActual || 0) - (metrics.effortExpected || 0)) / (metrics.effortExpected || 1);
    const durationAccuracy = 1 - Math.abs((metrics.durationActual || 0) - (metrics.durationExpected || 0)) / (metrics.durationExpected || 1);

    return (costAccuracy + benefitAccuracy + effortAccuracy + durationAccuracy) / 4;
  }

  /**
   * Generate learning feedback
   */
  private async generateLearningFeedback(outcome: DecisionOutcome): Promise<void> {
    const decision = this.decisions.get(outcome.decisionId);
    if (!decision) return;

    const feedback: DecisionLearningFeedback = {
      id: uuidv4(),
      timestamp: new Date(),
      decisionId: outcome.decisionId,
      feedbackType: 'outcome_reported',
      data: {
        outcomeMatch: outcome.outcomeMatch,
        confidenceAccuracy: outcome.confidenceAccuracy
      },
      impact: {
        confidenceAdjustment: (outcome.confidenceAccuracy - decision.confidence) * 0.1,
        accuracyImprovement: outcome.confidenceAccuracy * 0.05,
        patternStrength: outcome.outcomeMatch === 'exceeded' ? 0.1 : 0.05
      },
      metadata: {
        source: 'outcome-recording',
        processed: false
      }
    };

    this.learningFeedback.push(feedback);

    // Update confidence history
    if (!this.confidenceHistory.has(decision.decisionType)) {
      this.confidenceHistory.set(decision.decisionType, []);
    }
    this.confidenceHistory.get(decision.decisionType)!.push(decision.confidence);

    this.emit('learningFeedbackGenerated', feedback);
  }

  /**
   * Add to audit trail
   */
  private async addToAuditTrail(
    decisionId: string,
    action: DecisionAuditEntry['action'],
    actor: string,
    reason: string
  ): Promise<void> {
    const entry: DecisionAuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      decisionId,
      action,
      actor,
      reason,
      metadata: this.config.audit.includeMetadata ? {
        ipAddress: '127.0.0.1',
        userAgent: 'decision-support-system',
        sessionId: process.env.AF_SESSION_ID
      } : {}
    };

    this.auditTrail.push(entry);

    // Store to disk
    if (this.config.storage.auditPath) {
      await this.storeAuditEntry(entry);
    }
  }

  /**
   * Store recommendation
   */
  private async storeRecommendation(recommendation: DecisionRecommendation): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.decisionsPath, { recursive: true });
      const filePath = path.join(this.config.storage.decisionsPath, `${recommendation.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(recommendation, null, 2));
    } catch (error) {
      console.error('[DECISION-SUPPORT] Failed to store recommendation:', error);
    }
  }

  /**
   * Store outcome
   */
  private async storeOutcome(outcome: DecisionOutcome): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.outcomesPath, { recursive: true });
      const filePath = path.join(this.config.storage.outcomesPath, `${outcome.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(outcome, null, 2));
    } catch (error) {
      console.error('[DECISION-SUPPORT] Failed to store outcome:', error);
    }
  }

  /**
   * Store audit entry
   */
  private async storeAuditEntry(entry: DecisionAuditEntry): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.auditPath, { recursive: true });
      const filePath = path.join(this.config.storage.auditPath, `${entry.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.error('[DECISION-SUPPORT] Failed to store audit entry:', error);
    }
  }

  /**
   * Load existing data
   */
  private async loadExistingData(): Promise<void> {
    try {
      // Load decisions
      const decisionsPath = this.config.storage.decisionsPath;
      const decisionFiles = await fs.readdir(decisionsPath).catch(() => []);
      for (const file of decisionFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(decisionsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const decision: DecisionRecommendation = JSON.parse(content);
          this.decisions.set(decision.id, decision);
        }
      }

      // Load outcomes
      const outcomesPath = this.config.storage.outcomesPath;
      const outcomeFiles = await fs.readdir(outcomesPath).catch(() => []);
      for (const file of outcomeFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(outcomesPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const outcome: DecisionOutcome = JSON.parse(content);
          this.outcomes.set(outcome.id, outcome);
        }
      }

      console.log(`[DECISION-SUPPORT] Loaded ${this.decisions.size} decisions and ${this.outcomes.size} outcomes`);
    } catch (error) {
      console.error('[DECISION-SUPPORT] Failed to load existing data:', error);
    }
  }

  /**
   * Get recommendation
   */
  public getRecommendation(id: string): DecisionRecommendation | undefined {
    return this.recommendations.get(id);
  }

  /**
   * Get decision
   */
  public getDecision(id: string): DecisionRecommendation | undefined {
    return this.decisions.get(id);
  }

  /**
   * Get all decisions
   */
  public getAllDecisions(): DecisionRecommendation[] {
    return Array.from(this.decisions.values());
  }

  /**
   * Get audit trail
   */
  public getAuditTrail(): DecisionAuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Get outcomes
   */
  public getOutcomes(): DecisionOutcome[] {
    return Array.from(this.outcomes.values());
  }

  /**
   * Get learning feedback
   */
  public getLearningFeedback(): DecisionLearningFeedback[] {
    return [...this.learningFeedback];
  }

  /**
   * Get confidence history
   */
  public getConfidenceHistory(decisionType?: DecisionType): Map<string, number[]> {
    if (decisionType) {
      return new Map([[decisionType, this.confidenceHistory.get(decisionType) || []]);
    }
    return new Map(this.confidenceHistory);
  }

  /**
   * Stop decision support
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    this.emit('stopped', { timestamp: new Date() });
    console.log('[DECISION-SUPPORT] Decision support stopped');
  }

  /**
   * Clear all data
   */
  public async clear(): Promise<void> {
    this.recommendations.clear();
    this.decisions.clear();
    this.auditTrail = [];
    this.outcomes.clear();
    this.learningFeedback = [];
    this.evidenceChains.clear();
    this.confidenceHistory.clear();

    this.emit('cleared', { timestamp: new Date() });
    console.log('[DECISION-SUPPORT] All data cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): DecisionSupportConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DecisionSupportConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', { config: this.config });
    console.log('[DECISION-SUPPORT] Configuration updated');
  }
}

/**
 * Create default evidence-based decision support
 */
export function createDefaultEvidenceBasedDecisionSupport(): EvidenceBasedDecisionSupport {
  return new EvidenceBasedDecisionSupport();
}

/**
 * Create evidence-based decision support from config
 */
export function createEvidenceBasedDecisionSupportFromConfig(
  config: Partial<DecisionSupportConfig>
): EvidenceBasedDecisionSupport {
  return new EvidenceBasedDecisionSupport(config);
}
