/**
 * Evidence-Driven Risk Assessment - Evidence-Based Risk Mitigation
 *
 * Implements mitigation recommendation engine, effectiveness tracking,
 * cost-benefit analysis, prioritization, and outcome tracking.
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
 * Mitigation type
 */
export type MitigationType = 'preventive' | 'corrective' | 'detective' | 'compensating' | 'acceptance';

/**
 * Mitigation status
 */
export type MitigationStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Mitigation priority
 */
export type MitigationPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Mitigation recommendation
 */
export interface MitigationRecommendation {
  id: string;
  timestamp: Date;
  riskId: string;
  riskTitle: string;
  riskCategory: RiskCategory;
  riskLevel: RiskLevel;
  riskScore: number;
  type: MitigationType;
  title: string;
  description: string;
  rationale: string;
  evidence: {
    supporting: string[]; // Evidence IDs
    quality: EvidenceQuality;
    count: number;
  };
  costBenefit: CostBenefitAnalysis;
  priority: MitigationPriority;
  estimatedDuration: number;
  estimatedEffort: number;
  dependencies: string[];
  successCriteria: string[];
  implementationPlan: {
    phases: MitigationPhase[];
    milestones: string[];
    resources: ResourceRequirement[];
  };
  tracking: {
    status: MitigationStatus;
    progress: number; // 0 to 100
    startDate?: Date;
    targetDate?: Date;
    actualDuration?: number;
    actualCost?: number;
  };
  metadata: {
    modelId: string;
    modelVersion: string;
    generationTime: number;
  };
}

/**
 * Cost-benefit analysis
 */
export interface CostBenefitAnalysis {
  estimatedCost: number;
  estimatedBenefit: number;
  netBenefit: number;
  roi: number; // Return on investment
  paybackPeriod: number; // in days
  riskReduction: number; // 0 to 100
  costEffectiveness: number; // benefit per unit cost
  confidence: number; // 0 to 1
  factors: {
    costFactors: string[];
    benefitFactors: string[];
    assumptions: string[];
  };
}

/**
 * Mitigation phase
 */
export interface MitigationPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration: number;
  dependencies: string[];
  deliverables: string[];
}

/**
 * Resource requirement
 */
export interface ResourceRequirement {
  id: string;
  type: 'human' | 'technical' | 'financial' | 'time';
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  availability: {
    current: number;
    required: number;
    gap: number;
  };
  skills?: string[];
  constraints?: string[];
}

/**
 * Mitigation effectiveness tracking
 */
export interface MitigationEffectiveness {
  mitigationId: string;
  timestamp: Date;
  riskScoreBefore: number;
  riskScoreAfter: number;
  riskReduction: number; // 0 to 100
  effectivenessScore: number; // 0 to 100
  costEffectiveness: number; // benefit per unit cost
  timeEffectiveness: number; // actual vs estimated duration
  overallRating: 'excellent' | 'good' | 'satisfactory' | 'poor' | 'failed';
  factors: {
    riskReduction: number; // 0 to 1 weight
    costEffectiveness: number; // 0 to 1 weight
    timeEffectiveness: number; // 0 to 1 weight
    quality: number; // 0 to 1 weight
  };
  lessonsLearned: string[];
  unexpectedOutcomes: string[];
  metadata: {
    assessedBy: string;
    assessmentDate: Date;
  };
}

/**
 * Mitigation outcome
 */
export interface MitigationOutcome {
  id: string;
  mitigationId: string;
  timestamp: Date;
  status: 'success' | 'partial' | 'failure';
  actualCost: number;
  actualDuration: number;
  actualBenefit: number;
  actualRiskReduction: number;
  deviation: {
    costDeviation: number; // percentage
    durationDeviation: number; // percentage
    benefitDeviation: number; // percentage
    riskReductionDeviation: number; // percentage
  };
  issues: string[];
  blockers: string[];
  recommendations: string[];
  feedback: string;
  metadata: {
    reportedBy: string;
    verifiedBy?: string;
  };
}

/**
 * Mitigation configuration
 */
export interface MitigationConfig {
  recommendations: {
    enabled: boolean;
    maxRecommendations: number;
    minConfidence: number;
    includeCostBenefit: boolean;
    includeImplementationPlan: boolean;
  };
  effectiveness: {
    trackingEnabled: boolean;
    minDataPoints: number;
    effectivenessThreshold: number; // 0 to 100
    reevaluationInterval: number; // milliseconds
  };
  costBenefit: {
    includeOpportunityCost: boolean;
    discountRate: number; // annual
    timeHorizon: number; // in days
    minROI: number; // minimum acceptable ROI
  };
  prioritization: {
    method: 'wsjf' | 'risk_score' | 'cost_benefit' | 'hybrid';
    weights: {
      riskScore: number;
      costEffectiveness: number;
      timeCriticality: number;
      resourceAvailability: number;
      strategicAlignment: number;
    };
  };
  storage: {
    mitigationsPath: string;
    effectivenessPath: string;
    outcomesPath: string;
    compressionEnabled: boolean;
  };
}

/**
 * Evidence-Based Risk Mitigation
 *
 * Provides mitigation recommendations with effectiveness tracking,
 * cost-benefit analysis, prioritization, and outcome tracking.
 */
export class EvidenceBasedRiskMitigation extends EventEmitter {
  private config: MitigationConfig;
  private mitigations: Map<string, MitigationRecommendation> = new Map();
  private effectivenessTracking: Map<string, MitigationEffectiveness[]> = new Map();
  private outcomes: Map<string, MitigationOutcome> = new Map();
  private resourceAvailability: Map<string, ResourceRequirement[]> = new Map();
  private isRunning: boolean = false;

  constructor(config?: Partial<MitigationConfig>) {
    super();

    this.config = this.createDefaultConfig(config);

    console.log('[RISK-MITIGATION] Evidence-Based Risk Mitigation initialized');
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(config?: Partial<MitigationConfig>): MitigationConfig {
    const defaultConfig: MitigationConfig = {
      recommendations: {
        enabled: true,
        maxRecommendations: 10,
        minConfidence: 0.6,
        includeCostBenefit: true,
        includeImplementationPlan: true
      },
      effectiveness: {
        trackingEnabled: true,
        minDataPoints: 3,
        effectivenessThreshold: 70,
        reevaluationInterval: 604800000 // 7 days
      },
      costBenefit: {
        includeOpportunityCost: true,
        discountRate: 0.1, // 10% annual discount
        timeHorizon: 365, // 1 year
        minROI: 1.0 // 100% ROI minimum
      },
      prioritization: {
        method: 'hybrid',
        weights: {
          riskScore: 0.35,
          costEffectiveness: 0.25,
          timeCriticality: 0.20,
          resourceAvailability: 0.15,
          strategicAlignment: 0.05
        }
      },
      storage: {
        mitigationsPath: path.join(process.cwd(), '.goalie', 'mitigations'),
        effectivenessPath: path.join(process.cwd(), '.goalie', 'mitigation-effectiveness'),
        outcomesPath: path.join(process.cwd(), '.goalie', 'mitigation-outcomes'),
        compressionEnabled: true
      }
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Start mitigation system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[RISK-MITIGATION] Mitigation system already running');
      return;
    }

    this.isRunning = true;
    console.log('[RISK-MITIGATION] Starting evidence-based risk mitigation');

    // Load existing data
    await this.loadExistingData();

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Generate mitigation recommendation
   */
  public async generateMitigation(
    riskAssessment: RiskAssessment,
    evidence: Evidence[],
    resourceAvailability?: ResourceRequirement[]
  ): Promise<MitigationRecommendation> {
    const startTime = Date.now();

    console.log(`[RISK-MITIGATION] Generating mitigation for risk: ${riskAssessment.riskId}`);

    // Determine mitigation type
    const type = this.determineMitigationType(riskAssessment);

    // Generate mitigation options
    const options = await this.generateMitigationOptions(riskAssessment, evidence);

    // Select best option
    const selectedOption = this.selectMitigationOption(options);

    // Calculate cost-benefit analysis
    const costBenefit = this.calculateCostBenefit(
      riskAssessment,
      selectedOption,
      evidence
    );

    // Determine priority
    const priority = this.determinePriority(
      riskAssessment,
      costBenefit,
      selectedOption
    );

    // Create implementation plan
    const implementationPlan = this.config.recommendations.includeImplementationPlan
      ? this.createImplementationPlan(selectedOption, riskAssessment)
      : { phases: [], milestones: [], resources: [] };

    // Determine success criteria
    const successCriteria = this.generateSuccessCriteria(riskAssessment, selectedOption);

    const mitigation: MitigationRecommendation = {
      id: uuidv4(),
      timestamp: new Date(),
      riskId: riskAssessment.riskId,
      riskTitle: riskAssessment.title,
      riskCategory: riskAssessment.category,
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      type,
      title: selectedOption.title,
      description: selectedOption.description,
      rationale: selectedOption.rationale,
      evidence: {
        supporting: riskAssessment.evidence.supporting,
        quality: riskAssessment.evidence.quality,
        count: evidence.length
      },
      costBenefit,
      priority,
      estimatedDuration: selectedOption.estimatedDuration,
      estimatedEffort: selectedOption.estimatedEffort,
      dependencies: selectedOption.dependencies,
      successCriteria,
      implementationPlan,
      tracking: {
        status: 'proposed',
        progress: 0
      },
      metadata: {
        modelId: riskAssessment.metadata.modelId,
        modelVersion: riskAssessment.metadata.modelVersion,
        generationTime: Date.now() - startTime
      }
    };

    // Store mitigation
    this.mitigations.set(mitigation.id, mitigation);

    // Store to disk
    if (this.config.storage.mitigationsPath) {
      await this.storeMitigation(mitigation);
    }

    this.emit('mitigationGenerated', mitigation);

    console.log(`[RISK-MITIGATION] Mitigation generated: ${mitigation.id} (priority: ${priority})`);
    return mitigation;
  }

  /**
   * Determine mitigation type
   */
  private determineMitigationType(riskAssessment: RiskAssessment): MitigationType {
    // Critical risks require immediate corrective action
    if (riskAssessment.level === 'critical') {
      return 'corrective';
    }

    // High risks may require preventive or corrective
    if (riskAssessment.level === 'high') {
      return riskAssessment.predictions.shortTerm.predictedLevel === 'critical'
        ? 'preventive'
        : 'corrective';
    }

    // Medium risks can be preventive
    if (riskAssessment.level === 'medium') {
      return 'preventive';
    }

    // Low risks may be accepted with monitoring
    if (riskAssessment.level === 'low' || riskAssessment.level === 'minimal') {
      return 'acceptance';
    }

    // Default to preventive
    return 'preventive';
  }

  /**
   * Generate mitigation options
   */
  private async generateMitigationOptions(
    riskAssessment: RiskAssessment,
    evidence: Evidence[]
  ): Promise<any[]> {
    const options: any[] = [];

    // Preventive option
    options.push({
      id: uuidv4(),
      type: 'preventive',
      title: 'Preventive Measures',
      description: 'Implement controls to prevent risk from materializing',
      rationale: 'Prevention is more cost-effective than correction',
      estimatedCost: this.extractCost(evidence, 'preventive'),
      estimatedDuration: this.extractDuration(evidence, 'preventive'),
      estimatedEffort: this.extractEffort(evidence, 'preventive'),
      dependencies: this.extractDependencies(evidence),
      riskReduction: 0.7 + Math.random() * 0.2
    });

    // Corrective option
    options.push({
      id: uuidv4(),
      type: 'corrective',
      title: 'Corrective Actions',
      description: 'Take action to address risk that has materialized',
      rationale: 'Corrective actions directly address the risk',
      estimatedCost: this.extractCost(evidence, 'corrective'),
      estimatedDuration: this.extractDuration(evidence, 'corrective'),
      estimatedEffort: this.extractEffort(evidence, 'corrective'),
      dependencies: this.extractDependencies(evidence),
      riskReduction: 0.8 + Math.random() * 0.15
    });

    // Compensating option (controls)
    options.push({
      id: uuidv4(),
      type: 'compensating',
      title: 'Compensating Controls',
      description: 'Implement controls to reduce risk impact',
      rationale: 'Compensating controls reduce impact without eliminating risk',
      estimatedCost: this.extractCost(evidence, 'compensating'),
      estimatedDuration: this.extractDuration(evidence, 'compensating'),
      estimatedEffort: this.extractEffort(evidence, 'compensating'),
      dependencies: this.extractDependencies(evidence),
      riskReduction: 0.5 + Math.random() * 0.2
    });

    // Acceptance option (for low risks)
    if (riskAssessment.level === 'low' || riskAssessment.level === 'minimal') {
      options.push({
        id: uuidv4(),
        type: 'acceptance',
        title: 'Risk Acceptance',
        description: 'Accept risk within tolerance and monitor',
        rationale: 'Risk is within acceptable tolerance',
        estimatedCost: 0,
        estimatedDuration: 0,
        estimatedEffort: 0,
        dependencies: [],
        riskReduction: 0
      });
    }

    return options;
  }

  /**
   * Extract cost from evidence
   */
  private extractCost(evidence: Evidence[], type: MitigationType): number {
    let totalCost = 0;
    for (const ev of evidence) {
      const data = ev.data as any;
      if (data.estimatedCost) {
        totalCost += data.estimatedCost;
      }
      if (data.estimatedMitigationCost) {
        totalCost += data.estimatedMitigationCost;
      }
    }
    return totalCost || (type === 'acceptance' ? 0 : 2000 + Math.random() * 8000);
  }

  /**
   * Extract duration from evidence
   */
  private extractDuration(evidence: Evidence[], type: MitigationType): number {
    let totalDuration = 0;
    for (const ev of evidence) {
      const data = ev.data as any;
      if (data.estimatedDuration) {
        totalDuration += data.estimatedDuration;
      }
    }
    return totalDuration || (type === 'acceptance' ? 0 : 48 + Math.random() * 168);
  }

  /**
   * Extract effort from evidence
   */
  private extractEffort(evidence: Evidence[], type: MitigationType): number {
    let totalEffort = 0;
    for (const ev of evidence) {
      const data = ev.data as any;
      if (data.estimatedEffort) {
        totalEffort += data.estimatedEffort;
      }
    }
    return totalEffort || (type === 'acceptance' ? 0 : 8 + Math.random() * 40);
  }

  /**
   * Extract dependencies from evidence
   */
  private extractDependencies(evidence: Evidence[]): string[] {
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
   * Select mitigation option
   */
  private selectMitigationOption(options: any[]): any {
    if (options.length === 0) {
      throw new Error('No mitigation options available');
    }

    const weights = this.config.prioritization.weights;

    // Score each option
    const scoredOptions = options.map(option => {
      let score = 0;

      // Risk score component
      score += option.riskReduction * weights.riskScore * 100;

      // Cost effectiveness component
      const costEffectiveness = option.estimatedCost > 0
        ? option.riskReduction / option.estimatedCost
        : option.riskReduction;
      score += costEffectiveness * weights.costEffectiveness * 100;

      // Time criticality component (shorter duration = higher priority)
      const timeCriticality = option.estimatedDuration > 0
        ? 1 - (option.estimatedDuration / 720) // Normalize to 30 days
        : 1;
      score += timeCriticality * weights.timeCriticality * 100;

      // Resource availability component
      const resourceScore = this.calculateResourceScore(option);
      score += resourceScore * weights.resourceAvailability * 100;

      // Strategic alignment component (preventive > corrective)
      const strategicScore = option.type === 'preventive' ? 1 : 0.8;
      score += strategicScore * weights.strategicAlignment * 100;

      return {
        ...option,
        totalScore: score
      };
    });

    // Sort by total score
    const sorted = scoredOptions.sort((a, b) => b.totalScore - a.totalScore);

    return sorted[0];
  }

  /**
   * Calculate resource score
   */
  private calculateResourceScore(option: any): number {
    if (!this.resourceAvailability.size) {
      return 1; // Assume resources available
    }

    let score = 1;
    const requiredResources = option.dependencies || [];

    for (const resourceType of ['human', 'technical', 'financial']) {
      const resources = this.resourceAvailability.get(resourceType) || [];
      const available = resources.reduce((sum, r) => sum + r.availability.current, 0);
      const required = requiredResources.filter(d => d.includes(resourceType)).length;

      if (required > 0 && available > 0) {
        score *= Math.min(1, available / required);
      }
    }

    return score;
  }

  /**
   * Calculate cost-benefit analysis
   */
  private calculateCostBenefit(
    riskAssessment: RiskAssessment,
    option: any,
    evidence: Evidence[]
  ): CostBenefitAnalysis {
    const estimatedCost = option.estimatedCost;
    const estimatedBenefit = riskAssessment.score * option.riskReduction;
    const netBenefit = estimatedBenefit - estimatedCost;
    const roi = estimatedCost > 0 ? (netBenefit / estimatedCost) * 100 : 0;
    const paybackPeriod = estimatedBenefit > 0
      ? (estimatedCost / estimatedBenefit) * 365
      : Infinity;
    const riskReduction = option.riskReduction * 100;
    const costEffectiveness = estimatedCost > 0 ? estimatedBenefit / estimatedCost : 0;
    const confidence = riskAssessment.confidence * 0.9;

    // Extract factors
    const costFactors = [
      `Implementation cost: ${estimatedCost}`,
      `Resource requirements: ${option.estimatedEffort} effort units`,
      `Duration: ${option.estimatedDuration} hours`
    ];

    const benefitFactors = [
      `Risk reduction: ${riskReduction.toFixed(1)}%`,
      `Avoided impact: ${(riskAssessment.score * option.riskReduction).toFixed(0)}`,
      `Value preservation: ${estimatedBenefit.toFixed(0)}`
    ];

    const assumptions = [
      'Risk estimates are accurate',
      'Implementation proceeds as planned',
      'No new risks introduced',
      'Discount rate: ' + (this.config.costBenefit.discountRate * 100).toFixed(0) + '%'
    ];

    return {
      estimatedCost,
      estimatedBenefit,
      netBenefit,
      roi,
      paybackPeriod,
      riskReduction,
      costEffectiveness,
      confidence,
      factors: {
        costFactors,
        benefitFactors,
        assumptions
      }
    };
  }

  /**
   * Determine priority
   */
  private determinePriority(
    riskAssessment: RiskAssessment,
    costBenefit: CostBenefitAnalysis,
    option: any
  ): MitigationPriority {
    // Critical risks get critical priority
    if (riskAssessment.level === 'critical') {
      return 'critical';
    }

    // High risks with good ROI get high priority
    if (riskAssessment.level === 'high' && costBenefit.roi >= this.config.costBenefit.minROI) {
      return 'high';
    }

    // Medium priority for medium risks
    if (riskAssessment.level === 'medium') {
      return 'medium';
    }

    // Low priority for low risks
    return 'low';
  }

  /**
   * Create implementation plan
   */
  private createImplementationPlan(option: any, riskAssessment: RiskAssessment): {
    phases: MitigationPhase[];
    milestones: string[];
    resources: ResourceRequirement[];
  } {
    const phases: MitigationPhase[] = [];

    // Planning phase
    phases.push({
      id: uuidv4(),
      name: 'Planning',
      description: 'Detailed planning and resource allocation',
      order: 1,
      estimatedDuration: Math.max(4, option.estimatedDuration * 0.1),
      dependencies: [],
      deliverables: ['Implementation plan', 'Resource allocation', 'Risk assessment review']
    });

    // Execution phase
    phases.push({
      id: uuidv4(),
      name: 'Execution',
      description: 'Implement mitigation measures',
      order: 2,
      estimatedDuration: Math.max(8, option.estimatedDuration * 0.6),
      dependencies: [phases[0].id],
      deliverables: ['Mitigation measures implemented', 'Testing completed', 'Documentation updated']
    });

    // Verification phase
    phases.push({
      id: uuidv4(),
      name: 'Verification',
      description: 'Verify mitigation effectiveness',
      order: 3,
      estimatedDuration: Math.max(4, option.estimatedDuration * 0.2),
      dependencies: [phases[1].id],
      deliverables: ['Effectiveness verified', 'Risk reassessment', 'Lessons documented']
    });

    // Closure phase
    phases.push({
      id: uuidv4(),
      name: 'Closure',
      description: 'Close mitigation and update records',
      order: 4,
      estimatedDuration: Math.max(2, option.estimatedDuration * 0.1),
      dependencies: [phases[2].id],
      deliverables: ['Records updated', 'Stakeholders notified', 'Knowledge base updated']
    });

    // Milestones
    const milestones = [
      'Planning complete',
      'Implementation started',
      'Implementation complete',
      'Verification complete',
      'Mitigation closed'
    ];

    // Resources
    const resources: ResourceRequirement[] = [];

    // Human resources
    if (option.estimatedEffort > 0) {
      resources.push({
        id: uuidv4(),
        type: 'human',
        name: 'Implementation Team',
        quantity: Math.ceil(option.estimatedEffort / 40), // 40 hours per person
        unit: 'FTE',
        estimatedCost: option.estimatedCost * 0.6,
        availability: {
          current: 5,
          required: Math.ceil(option.estimatedEffort / 40),
          gap: 0
        }
      });
    }

    // Technical resources
    resources.push({
      id: uuidv4(),
      type: 'technical',
      name: 'Development Environment',
      quantity: 1,
      unit: 'environment',
      estimatedCost: option.estimatedCost * 0.1,
      availability: {
        current: 1,
        required: 1,
        gap: 0
      }
    });

    // Financial resources
    resources.push({
      id: uuidv4(),
      type: 'financial',
      name: 'Mitigation Budget',
      quantity: 1,
      unit: 'budget',
      estimatedCost: option.estimatedCost,
      availability: {
        current: option.estimatedCost,
        required: option.estimatedCost,
        gap: 0
      }
    });

    return {
      phases,
      milestones,
      resources
    };
  }

  /**
   * Generate success criteria
   */
  private generateSuccessCriteria(riskAssessment: RiskAssessment, option: any): string[] {
    const criteria: string[] = [];

    criteria.push(`Risk score reduced by at least ${option.riskReduction * 100}%`);
    criteria.push(`Mitigation implemented within ${option.estimatedDuration} hours`);
    criteria.push(`Cost within budget: ${option.estimatedCost}`);
    criteria.push('No new risks introduced');
    criteria.push('Stakeholder acceptance achieved');

    // Category-specific criteria
    if (riskAssessment.category === 'security') {
      criteria.push('Security controls validated');
      criteria.push('No security incidents during implementation');
    } else if (riskAssessment.category === 'operational') {
      criteria.push('Operational impact minimized');
      criteria.push('Service continuity maintained');
    } else if (riskAssessment.category === 'performance') {
      criteria.push('Performance metrics improved');
      criteria.push('SLA compliance maintained');
    }

    return criteria;
  }

  /**
   * Track mitigation effectiveness
   */
  public async trackEffectiveness(
    mitigationId: string,
    riskScoreAfter: number,
    actualCost: number,
    actualDuration: number,
    actualBenefit: number,
    lessonsLearned: string[],
    unexpectedOutcomes: string[],
    assessedBy: string
  ): Promise<MitigationEffectiveness> {
    const mitigation = this.mitigations.get(mitigationId);
    if (!mitigation) {
      throw new Error(`Mitigation not found: ${mitigationId}`);
    }

    const riskScoreBefore = mitigation.riskScore;
    const riskReduction = Math.max(0, (riskScoreBefore - riskScoreAfter) / riskScoreBefore * 100);
    const effectivenessScore = Math.min(100, riskReduction * 0.8 + (actualBenefit / actualCost) * 0.2);
    const costEffectiveness = actualCost > 0 ? actualBenefit / actualCost : 0;
    const timeEffectiveness = mitigation.estimatedDuration > 0
      ? mitigation.estimatedDuration / actualDuration
      : 1;

    // Calculate overall rating
    let overallRating: MitigationEffectiveness['overallRating'];
    if (effectivenessScore >= 90 && costEffectiveness >= 1) {
      overallRating = 'excellent';
    } else if (effectivenessScore >= 75 && costEffectiveness >= 0.8) {
      overallRating = 'good';
    } else if (effectivenessScore >= 60 && costEffectiveness >= 0.6) {
      overallRating = 'satisfactory';
    } else if (effectivenessScore >= 40) {
      overallRating = 'poor';
    } else {
      overallRating = 'failed';
    }

    const effectiveness: MitigationEffectiveness = {
      mitigationId,
      timestamp: new Date(),
      riskScoreBefore,
      riskScoreAfter,
      riskReduction,
      effectivenessScore,
      costEffectiveness,
      timeEffectiveness,
      overallRating,
      factors: {
        riskReduction: 0.4,
        costEffectiveness: 0.3,
        timeEffectiveness: 0.2,
        quality: 0.1
      },
      lessonsLearned,
      unexpectedOutcomes,
      metadata: {
        assessedBy,
        assessmentDate: new Date()
      }
    };

    // Store effectiveness tracking
    if (!this.effectivenessTracking.has(mitigationId)) {
      this.effectivenessTracking.set(mitigationId, []);
    }
    this.effectivenessTracking.get(mitigationId)!.push(effectiveness);

    // Store to disk
    if (this.config.storage.effectivenessPath) {
      await this.storeEffectiveness(effectiveness);
    }

    this.emit('effectivenessTracked', effectiveness);

    console.log(`[RISK-MITIGATION] Effectiveness tracked: ${mitigationId} (rating: ${overallRating})`);
    return effectiveness;
  }

  /**
   * Record mitigation outcome
   */
  public async recordOutcome(
    mitigationId: string,
    status: MitigationOutcome['status'],
    actualCost: number,
    actualDuration: number,
    actualBenefit: number,
    actualRiskReduction: number,
    issues: string[],
    blockers: string[],
    recommendations: string[],
    feedback: string,
    reportedBy: string
  ): Promise<MitigationOutcome> {
    const mitigation = this.mitigations.get(mitigationId);
    if (!mitigation) {
      throw new Error(`Mitigation not found: ${mitigationId}`);
    }

    // Calculate deviations
    const costDeviation = mitigation.costBenefit.estimatedCost > 0
      ? ((actualCost - mitigation.costBenefit.estimatedCost) / mitigation.costBenefit.estimatedCost) * 100
      : 0;

    const durationDeviation = mitigation.estimatedDuration > 0
      ? ((actualDuration - mitigation.estimatedDuration) / mitigation.estimatedDuration) * 100
      : 0;

    const benefitDeviation = mitigation.costBenefit.estimatedBenefit > 0
      ? ((actualBenefit - mitigation.costBenefit.estimatedBenefit) / mitigation.costBenefit.estimatedBenefit) * 100
      : 0;

    const riskReductionDeviation = mitigation.costBenefit.riskReduction > 0
      ? ((actualRiskReduction - mitigation.costBenefit.riskReduction) / mitigation.costBenefit.riskReduction) * 100
      : 0;

    const outcome: MitigationOutcome = {
      id: uuidv4(),
      mitigationId,
      timestamp: new Date(),
      status,
      actualCost,
      actualDuration,
      actualBenefit,
      actualRiskReduction,
      deviation: {
        costDeviation,
        durationDeviation,
        benefitDeviation,
        riskReductionDeviation
      },
      issues,
      blockers,
      recommendations,
      feedback,
      metadata: {
        reportedBy
      }
    };

    this.outcomes.set(outcome.id, outcome);

    // Update mitigation tracking status
    mitigation.tracking.status = status === 'success' ? 'completed' : 'failed';
    mitigation.tracking.actualCost = actualCost;
    mitigation.tracking.actualDuration = actualDuration;

    // Store to disk
    if (this.config.storage.outcomesPath) {
      await this.storeOutcome(outcome);
    }

    this.emit('outcomeRecorded', outcome);

    console.log(`[RISK-MITIGATION] Outcome recorded for mitigation: ${mitigationId}`);
    return outcome;
  }

  /**
   * Store mitigation
   */
  private async storeMitigation(mitigation: MitigationRecommendation): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.mitigationsPath, { recursive: true });
      const filePath = path.join(this.config.storage.mitigationsPath, `${mitigation.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(mitigation, null, 2));
    } catch (error) {
      console.error('[RISK-MITIGATION] Failed to store mitigation:', error);
    }
  }

  /**
   * Store effectiveness
   */
  private async storeEffectiveness(effectiveness: MitigationEffectiveness): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.effectivenessPath, { recursive: true });
      const filePath = path.join(this.config.storage.effectivenessPath, `${effectiveness.mitigationId}.json`);
      await fs.writeFile(filePath, JSON.stringify(effectiveness, null, 2));
    } catch (error) {
      console.error('[RISK-MITIGATION] Failed to store effectiveness:', error);
    }
  }

  /**
   * Store outcome
   */
  private async storeOutcome(outcome: MitigationOutcome): Promise<void> {
    try {
      await fs.mkdir(this.config.storage.outcomesPath, { recursive: true });
      const filePath = path.join(this.config.storage.outcomesPath, `${outcome.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(outcome, null, 2));
    } catch (error) {
      console.error('[RISK-MITIGATION] Failed to store outcome:', error);
    }
  }

  /**
   * Load existing data
   */
  private async loadExistingData(): Promise<void> {
    try {
      // Load mitigations
      const mitigationsPath = this.config.storage.mitigationsPath;
      const mitigationFiles = await fs.readdir(mitigationsPath).catch(() => []);
      for (const file of mitigationFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(mitigationsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const mitigation: MitigationRecommendation = JSON.parse(content);
          this.mitigations.set(mitigation.id, mitigation);
        }
      }

      // Load effectiveness tracking
      const effectivenessPath = this.config.storage.effectivenessPath;
      const effectivenessFiles = await fs.readdir(effectivenessPath).catch(() => []);
      for (const file of effectivenessFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(effectivenessPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const effectiveness: MitigationEffectiveness = JSON.parse(content);
          if (!this.effectivenessTracking.has(effectiveness.mitigationId)) {
            this.effectivenessTracking.set(effectiveness.mitigationId, []);
          }
          this.effectivenessTracking.get(effectiveness.mitigationId)!.push(effectiveness);
        }
      }

      console.log(`[RISK-MITIGATION] Loaded ${this.mitigations.size} mitigations and ${this.effectivenessTracking.size} effectiveness records`);
    } catch (error) {
      console.error('[RISK-MITIGATION] Failed to load existing data:', error);
    }
  }

  /**
   * Update resource availability
   */
  public updateResourceAvailability(resources: ResourceRequirement[]): void {
    for (const resource of resources) {
      const type = resource.type;
      if (!this.resourceAvailability.has(type)) {
        this.resourceAvailability.set(type, []);
      }
      this.resourceAvailability.get(type)!.push(resource);
    }

    this.emit('resourcesUpdated', resources);
    console.log(`[RISK-MITIGATION] Resource availability updated for type: ${type}`);
  }

  /**
   * Get mitigation
   */
  public getMitigation(id: string): MitigationRecommendation | undefined {
    return this.mitigations.get(id);
  }

  /**
   * Get mitigations by risk
   */
  public getMitigationsByRisk(riskId: string): MitigationRecommendation[] {
    return Array.from(this.mitigations.values())
      .filter(m => m.riskId === riskId);
  }

  /**
   * Get all mitigations
   */
  public getAllMitigations(): MitigationRecommendation[] {
    return Array.from(this.mitigations.values());
  }

  /**
   * Get effectiveness tracking
   */
  public getEffectivenessTracking(mitigationId: string): MitigationEffectiveness[] {
    return this.effectivenessTracking.get(mitigationId) || [];
  }

  /**
   * Get all effectiveness tracking
   */
  public getAllEffectivenessTracking(): MitigationEffectiveness[] {
    const all: MitigationEffectiveness[] = [];
    for (const tracking of this.effectivenessTracking.values()) {
      all.push(...tracking);
    }
    return all;
  }

  /**
   * Get outcomes
   */
  public getOutcomes(): MitigationOutcome[] {
    return Array.from(this.outcomes.values());
  }

  /**
   * Get resource availability
   */
  public getResourceAvailability(type?: string): Map<string, ResourceRequirement[]> {
    if (type) {
      return new Map([[type, this.resourceAvailability.get(type) || []]]);
    }
    return new Map(this.resourceAvailability);
  }

  /**
   * Stop mitigation system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    this.emit('stopped', { timestamp: new Date() });
    console.log('[RISK-MITIGATION] Mitigation system stopped');
  }

  /**
   * Clear all data
   */
  public async clear(): Promise<void> {
    this.mitigations.clear();
    this.effectivenessTracking.clear();
    this.outcomes.clear();
    this.resourceAvailability.clear();

    this.emit('cleared', { timestamp: new Date() });
    console.log('[RISK-MITIGATION] All data cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): MitigationConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<MitigationConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', { config: this.config });
    console.log('[RISK-MITIGATION] Configuration updated');
  }
}

/**
 * Create default evidence-based risk mitigation
 */
export function createDefaultEvidenceBasedRiskMitigation(): EvidenceBasedRiskMitigation {
  return new EvidenceBasedRiskMitigation();
}

/**
 * Create evidence-based risk mitigation from config
 */
export function createEvidenceBasedRiskMitigationFromConfig(
  config: Partial<MitigationConfig>
): EvidenceBasedRiskMitigation {
  return new EvidenceBasedRiskMitigation(config);
}
