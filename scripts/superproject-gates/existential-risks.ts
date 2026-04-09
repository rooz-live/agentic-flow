/**
 * Existential Risk Mitigation System
 *
 * Addresses existential risk categories through structural thinking,
 * trans-generational planning, and long-term consequence modeling.
 *
 * Categories covered:
 * - Climate change mitigation strategies
 * - Resource depletion mitigation strategies
 * - Technological disruption mitigation strategies
 * - Civilizational sustainability strategies
 *
 * @module existential-risks
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Categories of existential risk
 */
export enum ExistentialRiskCategory {
  CLIMATE_CHANGE = 'climate_change',
  RESOURCE_DEPLETION = 'resource_depletion',
  TECHNOLOGICAL_DISRUPTION = 'technological_disruption',
  CIVILIZATIONAL_COLLAPSE = 'civilizational_collapse',
  PANDEMIC = 'pandemic',
  NUCLEAR = 'nuclear',
  ASTEROID = 'asteroid',
  AI_MISALIGNMENT = 'ai_misalignment',
  BIODIVERSITY_LOSS = 'biodiversity_loss',
  ECOSYSTEM_COLLAPSE = 'ecosystem_collapse'
}

/**
 * Severity levels for risks
 */
export enum RiskSeverity {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
  EXTINCTION = 'extinction'
}

/**
 * Time horizons for planning
 */
export enum TimeHorizon {
  IMMEDIATE = 'immediate',        // 0-1 years
  SHORT_TERM = 'short_term',      // 1-10 years
  MEDIUM_TERM = 'medium_term',    // 10-50 years
  LONG_TERM = 'long_term',        // 50-100 years
  GENERATIONAL = 'generational',  // 100-500 years
  CIVILIZATIONAL = 'civilizational' // 500+ years
}

/**
 * Strategy types for mitigation
 */
export enum StrategyType {
  PREVENTION = 'prevention',
  MITIGATION = 'mitigation',
  ADAPTATION = 'adaptation',
  RESILIENCE = 'resilience',
  RECOVERY = 'recovery',
  TRANSITION = 'transition'
}

/**
 * An existential risk definition
 */
export interface ExistentialRisk {
  /** Unique identifier */
  id: string;
  /** Risk name */
  name: string;
  /** Risk category */
  category: ExistentialRiskCategory;
  /** Description */
  description: string;
  /** Current severity level */
  severity: RiskSeverity;
  /** Probability of occurrence (0-1) */
  probability: number;
  /** Time horizon for impact */
  timeHorizon: TimeHorizon;
  /** Potential impact scale (0-1, where 1 is extinction) */
  impactScale: number;
  /** Risk factors contributing */
  riskFactors: RiskFactor[];
  /** Mitigation strategies */
  mitigationStrategies: MitigationStrategy[];
  /** Early warning indicators */
  earlyWarningIndicators: EarlyWarningIndicator[];
  /** When risk was assessed */
  assessedAt: Date;
  /** Last updated */
  updatedAt: Date;
}

/**
 * A factor contributing to risk
 */
export interface RiskFactor {
  /** Factor identifier */
  id: string;
  /** Factor name */
  name: string;
  /** Description */
  description: string;
  /** Weight in risk calculation (0-1) */
  weight: number;
  /** Current value (0-1) */
  currentValue: number;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'worsening' | 'accelerating';
  /** Data sources */
  dataSources: string[];
}

/**
 * A mitigation strategy
 */
export interface MitigationStrategy {
  /** Strategy identifier */
  id: string;
  /** Strategy name */
  name: string;
  /** Strategy type */
  type: StrategyType;
  /** Description */
  description: string;
  /** Target risk reduction (0-1) */
  targetReduction: number;
  /** Current implementation level (0-1) */
  implementationLevel: number;
  /** Resource requirements */
  resourceRequirements: ResourceRequirement[];
  /** Dependencies */
  dependencies: string[];
  /** Time to implement */
  implementationTimeYears: number;
  /** Effectiveness score (0-1) */
  effectivenessScore: number;
}

/**
 * Resource requirement for a strategy
 */
export interface ResourceRequirement {
  /** Resource type */
  type: 'financial' | 'human' | 'technological' | 'institutional' | 'knowledge';
  /** Description */
  description: string;
  /** Scale of requirement */
  scale: 'minimal' | 'moderate' | 'substantial' | 'massive' | 'global';
  /** Current availability (0-1) */
  availability: number;
}

/**
 * Early warning indicator
 */
export interface EarlyWarningIndicator {
  /** Indicator identifier */
  id: string;
  /** Indicator name */
  name: string;
  /** Description */
  description: string;
  /** Current value */
  currentValue: number;
  /** Threshold for warning */
  warningThreshold: number;
  /** Threshold for critical alert */
  criticalThreshold: number;
  /** Data source */
  dataSource: string;
  /** Update frequency */
  updateFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Trans-generational plan
 */
export interface TransGenerationalPlan {
  /** Plan identifier */
  id: string;
  /** Plan name */
  name: string;
  /** Target risk categories */
  targetCategories: ExistentialRiskCategory[];
  /** Time horizon */
  timeHorizon: TimeHorizon;
  /** Generation milestones */
  milestones: GenerationMilestone[];
  /** Knowledge transfer protocols */
  knowledgeTransfer: KnowledgeTransferProtocol[];
  /** Success criteria */
  successCriteria: SuccessCriterion[];
  /** When plan was created */
  createdAt: Date;
  /** Last reviewed */
  lastReviewed: Date;
}

/**
 * Milestone for generational planning
 */
export interface GenerationMilestone {
  /** Milestone identifier */
  id: string;
  /** Generation number (0 = current) */
  generation: number;
  /** Target year (approximate) */
  targetYear: number;
  /** Description */
  description: string;
  /** Goals */
  goals: string[];
  /** Status */
  status: 'planned' | 'in_progress' | 'completed' | 'adjusted' | 'abandoned';
  /** Progress (0-1) */
  progress: number;
}

/**
 * Knowledge transfer protocol
 */
export interface KnowledgeTransferProtocol {
  /** Protocol identifier */
  id: string;
  /** Knowledge domain */
  domain: string;
  /** Transfer method */
  method: 'documentation' | 'training' | 'apprenticeship' | 'institutional' | 'cultural';
  /** Critical knowledge items */
  criticalItems: string[];
  /** Redundancy level */
  redundancyLevel: number;
  /** Verification method */
  verificationMethod: string;
}

/**
 * Success criterion for plans
 */
export interface SuccessCriterion {
  /** Criterion identifier */
  id: string;
  /** Description */
  description: string;
  /** Metric */
  metric: string;
  /** Target value */
  targetValue: number;
  /** Current value */
  currentValue: number;
  /** Measurement method */
  measurementMethod: string;
}

/**
 * Long-term consequence model
 */
export interface ConsequenceModel {
  /** Model identifier */
  id: string;
  /** Model name */
  name: string;
  /** Risk category */
  category: ExistentialRiskCategory;
  /** Time horizon */
  timeHorizon: TimeHorizon;
  /** Scenarios modeled */
  scenarios: ConsequenceScenario[];
  /** Cascading effects */
  cascadingEffects: CascadingEffect[];
  /** Feedback loops */
  feedbackLoops: FeedbackLoop[];
  /** Model confidence (0-1) */
  confidence: number;
  /** Last updated */
  updatedAt: Date;
}

/**
 * A consequence scenario
 */
export interface ConsequenceScenario {
  /** Scenario identifier */
  id: string;
  /** Scenario name */
  name: string;
  /** Description */
  description: string;
  /** Probability (0-1) */
  probability: number;
  /** Severity */
  severity: RiskSeverity;
  /** Key events */
  keyEvents: string[];
  /** Mitigation points */
  mitigationPoints: string[];
}

/**
 * A cascading effect
 */
export interface CascadingEffect {
  /** Effect identifier */
  id: string;
  /** Source event */
  source: string;
  /** Target systems */
  targetSystems: string[];
  /** Propagation time (days) */
  propagationTimeDays: number;
  /** Amplification factor */
  amplificationFactor: number;
  /** Breakpoints */
  breakpoints: string[];
}

/**
 * A feedback loop in consequences
 */
export interface FeedbackLoop {
  /** Loop identifier */
  id: string;
  /** Loop name */
  name: string;
  /** Type */
  type: 'positive' | 'negative';
  /** Components involved */
  components: string[];
  /** Strength (0-1) */
  strength: number;
  /** Time scale */
  timeScale: 'days' | 'months' | 'years' | 'decades' | 'centuries';
  /** Breaking conditions */
  breakingConditions: string[];
}

/**
 * Distant goal motivation mechanism
 */
export interface DistantGoalMotivation {
  /** Mechanism identifier */
  id: string;
  /** Goal description */
  goal: string;
  /** Time to goal (years) */
  timeToGoalYears: number;
  /** Motivational strategies */
  strategies: MotivationalStrategy[];
  /** Progress markers */
  progressMarkers: ProgressMarker[];
  /** Maintenance requirements */
  maintenanceRequirements: string[];
}

/**
 * Motivational strategy
 */
export interface MotivationalStrategy {
  /** Strategy name */
  name: string;
  /** Description */
  description: string;
  /** Target audience */
  targetAudience: string;
  /** Effectiveness estimate (0-1) */
  effectiveness: number;
  /** Implementation method */
  implementationMethod: string;
}

/**
 * Progress marker for distant goals
 */
export interface ProgressMarker {
  /** Marker identifier */
  id: string;
  /** Description */
  description: string;
  /** Year target */
  yearTarget: number;
  /** Status */
  status: 'pending' | 'achieved' | 'missed' | 'revised';
  /** Evidence of achievement */
  evidence?: string;
}

/**
 * Existential risk metrics
 */
export interface ExistentialRiskMetrics {
  /** Overall risk index (0-1) */
  overallRiskIndex: number;
  /** Category-specific risk scores */
  categoryScores: Map<ExistentialRiskCategory, number>;
  /** Mitigation coverage (0-1) */
  mitigationCoverage: number;
  /** Early warning status */
  earlyWarningStatus: 'green' | 'yellow' | 'orange' | 'red';
  /** Trans-generational plan progress (0-1) */
  transGenerationalProgress: number;
  /** When metrics were calculated */
  calculatedAt: Date;
}

/**
 * Existential risk configuration
 */
export interface ExistentialRiskConfig {
  /** Enable automatic risk assessment */
  autoAssessment: boolean;
  /** Assessment interval (days) */
  assessmentIntervalDays: number;
  /** Enable early warning system */
  enableEarlyWarning: boolean;
  /** Warning check interval (hours) */
  warningCheckIntervalHours: number;
  /** Default time horizon for planning */
  defaultTimeHorizon: TimeHorizon;
  /** Risk severity thresholds */
  severityThresholds: {
    moderate: number;
    high: number;
    critical: number;
    extinction: number;
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_EXISTENTIAL_RISK_CONFIG: ExistentialRiskConfig = {
  autoAssessment: true,
  assessmentIntervalDays: 90,
  enableEarlyWarning: true,
  warningCheckIntervalHours: 24,
  defaultTimeHorizon: TimeHorizon.GENERATIONAL,
  severityThresholds: {
    moderate: 0.3,
    high: 0.5,
    critical: 0.7,
    extinction: 0.9
  }
};

// ============================================================================
// Main Class
// ============================================================================

/**
 * ExistentialRiskManager manages assessment, mitigation, and planning
 * for existential risks across multiple time horizons.
 */
export class ExistentialRiskManager extends EventEmitter {
  private config: ExistentialRiskConfig;
  private risks: Map<string, ExistentialRisk>;
  private plans: Map<string, TransGenerationalPlan>;
  private consequenceModels: Map<string, ConsequenceModel>;
  private motivationMechanisms: Map<string, DistantGoalMotivation>;
  private metrics: ExistentialRiskMetrics | null;
  private assessmentInterval: NodeJS.Timeout | null;
  private warningInterval: NodeJS.Timeout | null;

  /**
   * Create a new ExistentialRiskManager
   * @param config - Risk management configuration
   */
  constructor(config?: Partial<ExistentialRiskConfig>) {
    super();
    this.config = { ...DEFAULT_EXISTENTIAL_RISK_CONFIG, ...config };
    this.risks = new Map();
    this.plans = new Map();
    this.consequenceModels = new Map();
    this.motivationMechanisms = new Map();
    this.metrics = null;
    this.assessmentInterval = null;
    this.warningInterval = null;

    // Initialize with default risk profiles
    this.initializeDefaultRisks();
  }

  // ============================================================================
  // Risk Management
  // ============================================================================

  /**
   * Register an existential risk
   * @param risk - Risk to register
   * @returns Risk ID
   */
  registerRisk(risk: Omit<ExistentialRisk, 'id' | 'assessedAt' | 'updatedAt'>): string {
    const riskId = this.generateRiskId();

    const existentialRisk: ExistentialRisk = {
      id: riskId,
      ...risk,
      assessedAt: new Date(),
      updatedAt: new Date()
    };

    this.risks.set(riskId, existentialRisk);
    this.emit('riskRegistered', existentialRisk);

    // Update metrics
    this.updateMetrics();

    return riskId;
  }

  /**
   * Update risk assessment
   * @param riskId - Risk ID
   * @param updates - Updates to apply
   */
  updateRiskAssessment(riskId: string, updates: Partial<Pick<ExistentialRisk, 'severity' | 'probability' | 'impactScale'>>): void {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    if (updates.severity !== undefined) risk.severity = updates.severity;
    if (updates.probability !== undefined) risk.probability = updates.probability;
    if (updates.impactScale !== undefined) risk.impactScale = updates.impactScale;
    risk.updatedAt = new Date();

    this.emit('riskUpdated', risk);
    this.updateMetrics();
  }

  /**
   * Add mitigation strategy to risk
   * @param riskId - Risk ID
   * @param strategy - Mitigation strategy
   */
  addMitigationStrategy(riskId: string, strategy: Omit<MitigationStrategy, 'id'>): string {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const strategyId = this.generateStrategyId();
    const mitigationStrategy: MitigationStrategy = {
      id: strategyId,
      ...strategy
    };

    risk.mitigationStrategies.push(mitigationStrategy);
    risk.updatedAt = new Date();

    this.emit('strategyAdded', { riskId, strategy: mitigationStrategy });
    return strategyId;
  }

  /**
   * Add early warning indicator
   * @param riskId - Risk ID
   * @param indicator - Early warning indicator
   */
  addEarlyWarningIndicator(riskId: string, indicator: Omit<EarlyWarningIndicator, 'id' | 'lastUpdated'>): string {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const indicatorId = this.generateIndicatorId();
    const earlyWarning: EarlyWarningIndicator = {
      id: indicatorId,
      ...indicator,
      lastUpdated: new Date()
    };

    risk.earlyWarningIndicators.push(earlyWarning);
    risk.updatedAt = new Date();

    this.emit('indicatorAdded', { riskId, indicator: earlyWarning });
    return indicatorId;
  }

  /**
   * Check early warning indicators for a risk
   * @param riskId - Risk ID
   * @returns Warning status
   */
  checkEarlyWarnings(riskId: string): { status: 'green' | 'yellow' | 'orange' | 'red'; alerts: string[] } {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const alerts: string[] = [];
    let maxSeverity = 0;

    for (const indicator of risk.earlyWarningIndicators) {
      if (indicator.currentValue >= indicator.criticalThreshold) {
        alerts.push(`CRITICAL: ${indicator.name} at ${indicator.currentValue} (threshold: ${indicator.criticalThreshold})`);
        maxSeverity = Math.max(maxSeverity, 3);
      } else if (indicator.currentValue >= indicator.warningThreshold) {
        alerts.push(`WARNING: ${indicator.name} at ${indicator.currentValue} (threshold: ${indicator.warningThreshold})`);
        maxSeverity = Math.max(maxSeverity, 2);
      } else if (indicator.currentValue >= indicator.warningThreshold * 0.8) {
        alerts.push(`WATCH: ${indicator.name} approaching warning threshold`);
        maxSeverity = Math.max(maxSeverity, 1);
      }
    }

    const statusMap: { [key: number]: 'green' | 'yellow' | 'orange' | 'red' } = {
      0: 'green',
      1: 'yellow',
      2: 'orange',
      3: 'red'
    };

    const status = statusMap[maxSeverity];
    this.emit('earlyWarningsChecked', { riskId, status, alerts });

    return { status, alerts };
  }

  /**
   * Get risk by ID
   * @param id - Risk ID
   * @returns Risk or null
   */
  getRisk(id: string): ExistentialRisk | null {
    return this.risks.get(id) || null;
  }

  /**
   * Get risks by category
   * @param category - Risk category
   * @returns Array of risks
   */
  getRisksByCategory(category: ExistentialRiskCategory): ExistentialRisk[] {
    return Array.from(this.risks.values())
      .filter(r => r.category === category);
  }

  /**
   * Get critical risks
   * @returns Array of critical risks
   */
  getCriticalRisks(): ExistentialRisk[] {
    return Array.from(this.risks.values())
      .filter(r => r.severity === RiskSeverity.CRITICAL || r.severity === RiskSeverity.EXTINCTION);
  }

  // ============================================================================
  // Trans-Generational Planning
  // ============================================================================

  /**
   * Create a trans-generational plan
   * @param plan - Plan details
   * @returns Plan ID
   */
  createTransGenerationalPlan(plan: Omit<TransGenerationalPlan, 'id' | 'createdAt' | 'lastReviewed'>): string {
    const planId = this.generatePlanId();

    const transGenPlan: TransGenerationalPlan = {
      id: planId,
      ...plan,
      createdAt: new Date(),
      lastReviewed: new Date()
    };

    this.plans.set(planId, transGenPlan);
    this.emit('planCreated', transGenPlan);
    return planId;
  }

  /**
   * Add milestone to plan
   * @param planId - Plan ID
   * @param milestone - Milestone details
   */
  addMilestone(planId: string, milestone: Omit<GenerationMilestone, 'id'>): string {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const milestoneId = this.generateMilestoneId();
    const genMilestone: GenerationMilestone = {
      id: milestoneId,
      ...milestone
    };

    plan.milestones.push(genMilestone);
    plan.lastReviewed = new Date();

    this.emit('milestoneAdded', { planId, milestone: genMilestone });
    return milestoneId;
  }

  /**
   * Update milestone progress
   * @param planId - Plan ID
   * @param milestoneId - Milestone ID
   * @param progress - Progress (0-1)
   */
  updateMilestoneProgress(planId: string, milestoneId: string, progress: number): void {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const milestone = plan.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneId}`);
    }

    milestone.progress = Math.max(0, Math.min(1, progress));
    if (progress >= 1) {
      milestone.status = 'completed';
    } else if (progress > 0) {
      milestone.status = 'in_progress';
    }

    plan.lastReviewed = new Date();
    this.emit('milestoneUpdated', { planId, milestoneId, progress });
  }

  /**
   * Add knowledge transfer protocol
   * @param planId - Plan ID
   * @param protocol - Knowledge transfer protocol
   */
  addKnowledgeTransferProtocol(planId: string, protocol: Omit<KnowledgeTransferProtocol, 'id'>): string {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const protocolId = this.generateProtocolId();
    const ktProtocol: KnowledgeTransferProtocol = {
      id: protocolId,
      ...protocol
    };

    plan.knowledgeTransfer.push(ktProtocol);
    plan.lastReviewed = new Date();

    this.emit('knowledgeTransferAdded', { planId, protocol: ktProtocol });
    return protocolId;
  }

  /**
   * Get plan by ID
   * @param id - Plan ID
   * @returns Plan or null
   */
  getPlan(id: string): TransGenerationalPlan | null {
    return this.plans.get(id) || null;
  }

  /**
   * Get all plans
   * @returns Map of all plans
   */
  getAllPlans(): Map<string, TransGenerationalPlan> {
    return new Map(this.plans);
  }

  // ============================================================================
  // Consequence Modeling
  // ============================================================================

  /**
   * Create a consequence model
   * @param model - Model details
   * @returns Model ID
   */
  createConsequenceModel(model: Omit<ConsequenceModel, 'id' | 'updatedAt'>): string {
    const modelId = this.generateModelId();

    const consequenceModel: ConsequenceModel = {
      id: modelId,
      ...model,
      updatedAt: new Date()
    };

    this.consequenceModels.set(modelId, consequenceModel);
    this.emit('modelCreated', consequenceModel);
    return modelId;
  }

  /**
   * Add scenario to model
   * @param modelId - Model ID
   * @param scenario - Scenario details
   */
  addScenario(modelId: string, scenario: Omit<ConsequenceScenario, 'id'>): string {
    const model = this.consequenceModels.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const scenarioId = this.generateScenarioId();
    const consequenceScenario: ConsequenceScenario = {
      id: scenarioId,
      ...scenario
    };

    model.scenarios.push(consequenceScenario);
    model.updatedAt = new Date();

    this.emit('scenarioAdded', { modelId, scenario: consequenceScenario });
    return scenarioId;
  }

  /**
   * Add cascading effect to model
   * @param modelId - Model ID
   * @param effect - Cascading effect
   */
  addCascadingEffect(modelId: string, effect: Omit<CascadingEffect, 'id'>): string {
    const model = this.consequenceModels.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const effectId = this.generateEffectId();
    const cascadingEffect: CascadingEffect = {
      id: effectId,
      ...effect
    };

    model.cascadingEffects.push(cascadingEffect);
    model.updatedAt = new Date();

    this.emit('cascadingEffectAdded', { modelId, effect: cascadingEffect });
    return effectId;
  }

  /**
   * Add feedback loop to model
   * @param modelId - Model ID
   * @param loop - Feedback loop
   */
  addFeedbackLoop(modelId: string, loop: Omit<FeedbackLoop, 'id'>): string {
    const model = this.consequenceModels.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const loopId = this.generateLoopId();
    const feedbackLoop: FeedbackLoop = {
      id: loopId,
      ...loop
    };

    model.feedbackLoops.push(feedbackLoop);
    model.updatedAt = new Date();

    this.emit('feedbackLoopAdded', { modelId, loop: feedbackLoop });
    return loopId;
  }

  /**
   * Simulate consequences
   * @param modelId - Model ID
   * @param timeYears - Time to simulate (years)
   * @returns Simulation results
   */
  simulateConsequences(modelId: string, timeYears: number): {
    finalState: { [key: string]: number };
    keyEvents: string[];
    recommendations: string[];
  } {
    const model = this.consequenceModels.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const finalState: { [key: string]: number } = {};
    const keyEvents: string[] = [];
    const recommendations: string[] = [];

    // Calculate scenario probabilities
    for (const scenario of model.scenarios) {
      const adjustedProb = scenario.probability * (1 + timeYears / 100);
      if (adjustedProb > 0.3) {
        keyEvents.push(`Scenario "${scenario.name}" becomes likely`);
        for (const event of scenario.keyEvents) {
          keyEvents.push(event);
        }
      }
      finalState[scenario.name] = Math.min(adjustedProb, 1);
    }

    // Apply cascading effects
    for (const effect of model.cascadingEffects) {
      const daysSimulated = timeYears * 365;
      if (daysSimulated >= effect.propagationTimeDays) {
        for (const system of effect.targetSystems) {
          finalState[`${system}_impact`] = (finalState[`${system}_impact`] || 0) + effect.amplificationFactor;
        }
      }
    }

    // Apply feedback loops
    for (const loop of model.feedbackLoops) {
      const loopIterations = this.calculateLoopIterations(loop.timeScale, timeYears);
      if (loop.type === 'positive') {
        finalState[loop.name] = Math.pow(loop.strength, loopIterations);
        if (finalState[loop.name] > 2) {
          keyEvents.push(`Positive feedback loop "${loop.name}" reaches dangerous levels`);
          recommendations.push(`Break feedback loop "${loop.name}" by: ${loop.breakingConditions.join(', ')}`);
        }
      } else {
        finalState[loop.name] = 1 / Math.pow(1 + loop.strength, loopIterations);
      }
    }

    // Generate recommendations
    for (const scenario of model.scenarios) {
      if ((finalState[scenario.name] || 0) > 0.5) {
        recommendations.push(...scenario.mitigationPoints);
      }
    }

    this.emit('consequencesSimulated', { modelId, timeYears, finalState, keyEvents });

    return { finalState, keyEvents, recommendations };
  }

  /**
   * Get consequence model by ID
   * @param id - Model ID
   * @returns Model or null
   */
  getConsequenceModel(id: string): ConsequenceModel | null {
    return this.consequenceModels.get(id) || null;
  }

  // ============================================================================
  // Distant Goal Motivation
  // ============================================================================

  /**
   * Create distant goal motivation mechanism
   * @param motivation - Motivation details
   * @returns Mechanism ID
   */
  createDistantGoalMotivation(motivation: Omit<DistantGoalMotivation, 'id'>): string {
    const mechanismId = this.generateMechanismId();

    const distantGoal: DistantGoalMotivation = {
      id: mechanismId,
      ...motivation
    };

    this.motivationMechanisms.set(mechanismId, distantGoal);
    this.emit('motivationCreated', distantGoal);
    return mechanismId;
  }

  /**
   * Add progress marker
   * @param mechanismId - Mechanism ID
   * @param marker - Progress marker
   */
  addProgressMarker(mechanismId: string, marker: Omit<ProgressMarker, 'id'>): string {
    const mechanism = this.motivationMechanisms.get(mechanismId);
    if (!mechanism) {
      throw new Error(`Motivation mechanism not found: ${mechanismId}`);
    }

    const markerId = this.generateMarkerId();
    const progressMarker: ProgressMarker = {
      id: markerId,
      ...marker
    };

    mechanism.progressMarkers.push(progressMarker);
    this.emit('progressMarkerAdded', { mechanismId, marker: progressMarker });
    return markerId;
  }

  /**
   * Mark progress achieved
   * @param mechanismId - Mechanism ID
   * @param markerId - Marker ID
   * @param evidence - Evidence of achievement
   */
  markProgressAchieved(mechanismId: string, markerId: string, evidence: string): void {
    const mechanism = this.motivationMechanisms.get(mechanismId);
    if (!mechanism) {
      throw new Error(`Motivation mechanism not found: ${mechanismId}`);
    }

    const marker = mechanism.progressMarkers.find(m => m.id === markerId);
    if (!marker) {
      throw new Error(`Progress marker not found: ${markerId}`);
    }

    marker.status = 'achieved';
    marker.evidence = evidence;
    this.emit('progressAchieved', { mechanismId, markerId, evidence });
  }

  /**
   * Get motivation mechanism by ID
   * @param id - Mechanism ID
   * @returns Mechanism or null
   */
  getMotivationMechanism(id: string): DistantGoalMotivation | null {
    return this.motivationMechanisms.get(id) || null;
  }

  // ============================================================================
  // Monitoring and Metrics
  // ============================================================================

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.config.autoAssessment && !this.assessmentInterval) {
      this.assessmentInterval = setInterval(() => {
        this.runRiskAssessment();
      }, this.config.assessmentIntervalDays * 24 * 60 * 60 * 1000);
    }

    if (this.config.enableEarlyWarning && !this.warningInterval) {
      this.warningInterval = setInterval(() => {
        this.checkAllEarlyWarnings();
      }, this.config.warningCheckIntervalHours * 60 * 60 * 1000);
    }

    this.emit('monitoringStarted');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.assessmentInterval) {
      clearInterval(this.assessmentInterval);
      this.assessmentInterval = null;
    }

    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = null;
    }

    this.emit('monitoringStopped');
  }

  /**
   * Run risk assessment
   */
  runRiskAssessment(): void {
    for (const risk of this.risks.values()) {
      // Recalculate severity based on factors
      let factorScore = 0;
      for (const factor of risk.riskFactors) {
        factorScore += factor.weight * factor.currentValue;
      }
      factorScore = risk.riskFactors.length > 0 ? factorScore / risk.riskFactors.length : risk.probability;

      // Update severity based on factor score
      if (factorScore >= this.config.severityThresholds.extinction) {
        risk.severity = RiskSeverity.EXTINCTION;
      } else if (factorScore >= this.config.severityThresholds.critical) {
        risk.severity = RiskSeverity.CRITICAL;
      } else if (factorScore >= this.config.severityThresholds.high) {
        risk.severity = RiskSeverity.HIGH;
      } else if (factorScore >= this.config.severityThresholds.moderate) {
        risk.severity = RiskSeverity.MODERATE;
      } else {
        risk.severity = RiskSeverity.LOW;
      }

      risk.assessedAt = new Date();
    }

    this.updateMetrics();
    this.emit('riskAssessmentCompleted');
  }

  /**
   * Check all early warnings
   */
  checkAllEarlyWarnings(): void {
    const allAlerts: { riskId: string; status: string; alerts: string[] }[] = [];

    for (const [riskId, _risk] of this.risks) {
      const result = this.checkEarlyWarnings(riskId);
      if (result.alerts.length > 0) {
        allAlerts.push({ riskId, status: result.status, alerts: result.alerts });
      }
    }

    if (allAlerts.length > 0) {
      this.emit('earlyWarningTriggered', allAlerts);
    }
  }

  /**
   * Update metrics
   */
  updateMetrics(): void {
    const categoryScores = new Map<ExistentialRiskCategory, number>();

    // Calculate category scores
    for (const category of Object.values(ExistentialRiskCategory)) {
      const categoryRisks = this.getRisksByCategory(category);
      if (categoryRisks.length > 0) {
        const avgScore = categoryRisks.reduce((sum, r) => sum + r.probability * r.impactScale, 0) / categoryRisks.length;
        categoryScores.set(category, avgScore);
      }
    }

    // Calculate overall risk index
    let totalRisk = 0;
    let count = 0;
    for (const score of categoryScores.values()) {
      totalRisk += score;
      count++;
    }
    const overallRiskIndex = count > 0 ? totalRisk / count : 0;

    // Calculate mitigation coverage
    let mitigatedRisks = 0;
    for (const risk of this.risks.values()) {
      if (risk.mitigationStrategies.length > 0) {
        const avgImplementation = risk.mitigationStrategies.reduce((sum, s) => sum + s.implementationLevel, 0) / risk.mitigationStrategies.length;
        if (avgImplementation > 0.5) mitigatedRisks++;
      }
    }
    const mitigationCoverage = this.risks.size > 0 ? mitigatedRisks / this.risks.size : 0;

    // Determine early warning status
    let maxWarningLevel = 0;
    for (const risk of this.risks.values()) {
      for (const indicator of risk.earlyWarningIndicators) {
        if (indicator.currentValue >= indicator.criticalThreshold) {
          maxWarningLevel = 3;
        } else if (indicator.currentValue >= indicator.warningThreshold && maxWarningLevel < 3) {
          maxWarningLevel = 2;
        } else if (indicator.currentValue >= indicator.warningThreshold * 0.8 && maxWarningLevel < 2) {
          maxWarningLevel = 1;
        }
      }
    }
    const earlyWarningStatus: 'green' | 'yellow' | 'orange' | 'red' = ['green', 'yellow', 'orange', 'red'][maxWarningLevel] as 'green' | 'yellow' | 'orange' | 'red';

    // Calculate trans-generational progress
    let totalProgress = 0;
    let milestoneCount = 0;
    for (const plan of this.plans.values()) {
      for (const milestone of plan.milestones) {
        totalProgress += milestone.progress;
        milestoneCount++;
      }
    }
    const transGenerationalProgress = milestoneCount > 0 ? totalProgress / milestoneCount : 0;

    this.metrics = {
      overallRiskIndex,
      categoryScores,
      mitigationCoverage,
      earlyWarningStatus,
      transGenerationalProgress,
      calculatedAt: new Date()
    };

    this.emit('metricsUpdated', this.metrics);
  }

  /**
   * Get metrics
   * @returns Current metrics or null
   */
  getMetrics(): ExistentialRiskMetrics | null {
    return this.metrics;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRisks: number;
    criticalRisks: number;
    totalPlans: number;
    totalModels: number;
    totalMotivationMechanisms: number;
    overallRiskIndex: number | null;
    mitigationCoverage: number | null;
  } {
    return {
      totalRisks: this.risks.size,
      criticalRisks: this.getCriticalRisks().length,
      totalPlans: this.plans.size,
      totalModels: this.consequenceModels.size,
      totalMotivationMechanisms: this.motivationMechanisms.size,
      overallRiskIndex: this.metrics?.overallRiskIndex || null,
      mitigationCoverage: this.metrics?.mitigationCoverage || null
    };
  }

  /**
   * Get configuration
   */
  getConfig(): ExistentialRiskConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExistentialRiskConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart monitoring if intervals changed
    const wasMonitoring = this.assessmentInterval !== null || this.warningInterval !== null;
    if (wasMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stopMonitoring();
    this.risks.clear();
    this.plans.clear();
    this.consequenceModels.clear();
    this.motivationMechanisms.clear();
    this.metrics = null;
    this.initializeDefaultRisks();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeDefaultRisks(): void {
    // Climate Change
    this.registerRisk({
      name: 'Global Climate Change',
      category: ExistentialRiskCategory.CLIMATE_CHANGE,
      description: 'Accelerating climate change threatening global ecosystems and human civilization',
      severity: RiskSeverity.HIGH,
      probability: 0.85,
      timeHorizon: TimeHorizon.MEDIUM_TERM,
      impactScale: 0.6,
      riskFactors: [
        {
          id: 'rf-co2',
          name: 'CO2 Concentration',
          description: 'Atmospheric CO2 levels',
          weight: 0.4,
          currentValue: 0.7,
          trend: 'accelerating',
          dataSources: ['NOAA', 'IPCC']
        },
        {
          id: 'rf-temp',
          name: 'Global Temperature Rise',
          description: 'Average global temperature increase',
          weight: 0.35,
          currentValue: 0.6,
          trend: 'worsening',
          dataSources: ['NASA', 'IPCC']
        },
        {
          id: 'rf-ice',
          name: 'Ice Sheet Stability',
          description: 'Polar ice sheet integrity',
          weight: 0.25,
          currentValue: 0.5,
          trend: 'worsening',
          dataSources: ['NSIDC']
        }
      ],
      mitigationStrategies: [],
      earlyWarningIndicators: [
        {
          id: 'ew-temp',
          name: 'Annual Temperature Anomaly',
          description: 'Global average temperature deviation from baseline',
          currentValue: 1.2,
          warningThreshold: 1.5,
          criticalThreshold: 2.0,
          dataSource: 'NASA GISS',
          updateFrequency: 'monthly',
          lastUpdated: new Date()
        }
      ]
    });

    // Resource Depletion
    this.registerRisk({
      name: 'Critical Resource Depletion',
      category: ExistentialRiskCategory.RESOURCE_DEPLETION,
      description: 'Depletion of critical resources including fresh water, arable land, and essential minerals',
      severity: RiskSeverity.MODERATE,
      probability: 0.6,
      timeHorizon: TimeHorizon.LONG_TERM,
      impactScale: 0.5,
      riskFactors: [
        {
          id: 'rf-water',
          name: 'Fresh Water Availability',
          description: 'Global fresh water reserves',
          weight: 0.35,
          currentValue: 0.5,
          trend: 'worsening',
          dataSources: ['UN Water', 'WRI']
        },
        {
          id: 'rf-soil',
          name: 'Soil Degradation',
          description: 'Arable land and soil health',
          weight: 0.35,
          currentValue: 0.45,
          trend: 'worsening',
          dataSources: ['FAO', 'UNCCD']
        },
        {
          id: 'rf-minerals',
          name: 'Critical Mineral Reserves',
          description: 'Availability of essential minerals',
          weight: 0.3,
          currentValue: 0.4,
          trend: 'stable',
          dataSources: ['USGS', 'IEA']
        }
      ],
      mitigationStrategies: [],
      earlyWarningIndicators: []
    });

    // Technological Disruption
    this.registerRisk({
      name: 'Unaligned AI Development',
      category: ExistentialRiskCategory.AI_MISALIGNMENT,
      description: 'Development of advanced AI systems without adequate alignment with human values',
      severity: RiskSeverity.HIGH,
      probability: 0.4,
      timeHorizon: TimeHorizon.SHORT_TERM,
      impactScale: 0.9,
      riskFactors: [
        {
          id: 'rf-capability',
          name: 'AI Capability Growth',
          description: 'Rate of AI capability advancement',
          weight: 0.4,
          currentValue: 0.8,
          trend: 'accelerating',
          dataSources: ['AI Index', 'Epoch AI']
        },
        {
          id: 'rf-alignment',
          name: 'Alignment Research Progress',
          description: 'Progress in AI alignment research',
          weight: 0.35,
          currentValue: 0.3,
          trend: 'improving',
          dataSources: ['AI Safety Research', 'Alignment Forum']
        },
        {
          id: 'rf-governance',
          name: 'AI Governance Maturity',
          description: 'Global AI governance frameworks',
          weight: 0.25,
          currentValue: 0.2,
          trend: 'improving',
          dataSources: ['OECD', 'UNESCO']
        }
      ],
      mitigationStrategies: [],
      earlyWarningIndicators: []
    });

    // Civilizational Collapse
    this.registerRisk({
      name: 'Complex Systems Failure',
      category: ExistentialRiskCategory.CIVILIZATIONAL_COLLAPSE,
      description: 'Cascading failure of interconnected global systems leading to civilizational decline',
      severity: RiskSeverity.MODERATE,
      probability: 0.3,
      timeHorizon: TimeHorizon.LONG_TERM,
      impactScale: 0.7,
      riskFactors: [
        {
          id: 'rf-complexity',
          name: 'System Complexity',
          description: 'Global system interdependence and complexity',
          weight: 0.3,
          currentValue: 0.7,
          trend: 'worsening',
          dataSources: ['World Bank', 'IMF']
        },
        {
          id: 'rf-resilience',
          name: 'System Resilience',
          description: 'Global resilience to shocks',
          weight: 0.4,
          currentValue: 0.4,
          trend: 'stable',
          dataSources: ['WEF', 'OECD']
        },
        {
          id: 'rf-cooperation',
          name: 'International Cooperation',
          description: 'Level of global cooperation',
          weight: 0.3,
          currentValue: 0.35,
          trend: 'worsening',
          dataSources: ['UN', 'WTO']
        }
      ],
      mitigationStrategies: [],
      earlyWarningIndicators: []
    });
  }

  private calculateLoopIterations(timeScale: FeedbackLoop['timeScale'], years: number): number {
    const iterationsPerYear: { [key: string]: number } = {
      'days': 365,
      'months': 12,
      'years': 1,
      'decades': 0.1,
      'centuries': 0.01
    };
    return years * (iterationsPerYear[timeScale] || 1);
  }

  private generateRiskId(): string {
    return `risk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateStrategyId(): string {
    return `strategy-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateIndicatorId(): string {
    return `indicator-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generatePlanId(): string {
    return `plan-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateMilestoneId(): string {
    return `milestone-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateProtocolId(): string {
    return `protocol-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateModelId(): string {
    return `model-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateScenarioId(): string {
    return `scenario-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateEffectId(): string {
    return `effect-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateLoopId(): string {
    return `loop-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateMechanismId(): string {
    return `mechanism-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateMarkerId(): string {
    return `marker-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Factory function to create an ExistentialRiskManager
 * @param config - Optional configuration
 * @returns Configured ExistentialRiskManager instance
 */
export function createExistentialRiskManager(
  config?: Partial<ExistentialRiskConfig>
): ExistentialRiskManager {
  return new ExistentialRiskManager(config);
}
