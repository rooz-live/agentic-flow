/**
 * Act→Plan Feedback Loop Implementation
 *
 * Implements closed feedback loop from Act phase back to Plan phase.
 * Converts learnings stored in knowledge base to new Plan objectives.
 *
 * Philosophical Principles Applied:
 * - Manthra: Directed thought-power ensuring logical separation and contextual awareness
 * - Yasna: Disciplined alignment through consistent interfaces and type safety
 * - Mithra: Binding force preventing code drift through centralized state management
 */

import type { Act, Do, Plan, Action, Outcome } from './orchestration-framework.js';
import type { EvidenceEvent } from '../evidence/types/schema.js';
import type { CausalEmergenceAnalysisResult } from '../governance/types.js';

/**
 * Learning extracted from Act phase
 */
export interface ExtractedLearning {
  id: string;
  timestamp: Date;
  source: 'completed_action' | 'failed_action' | 'blocked_action' | 'incident_resolution';
  actId: string;
  doId: string;
  learning: string;
  context: {
    actionName?: string;
    actionStatus?: Do['status'];
    outcomeStatus?: Outcome['status'];
    variance?: number;
    improvement?: string;
    metrics?: Record<string, number>;
  };
  category: LearningCategory;
  impact: LearningImpact;
  evidence?: EvidenceEvent;
}

/**
 * Learning categorization framework
 */
export enum LearningCategory {
  PERFORMANCE = 'performance',
  RELIABILITY = 'reliability',
  EFFICIENCY = 'efficiency',
  SECURITY = 'security',
  SCALABILITY = 'scalability',
  MAINTAINABILITY = 'maintainability',
  USABILITY = 'usability',
  GOVERNANCE = 'governance',
  PROCESS = 'process',
  TECHNOLOGY = 'technology'
}

/**
 * Learning impact assessment
 */
export interface LearningImpact {
  score: number; // 0 to 1
  frequency: number; // How often this learning occurs
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: number; // 1 to 10
  expectedBenefit: number; // Quantified expected benefit
  confidence: number; // 0 to 1
}

/**
 * Objective generated from learning
 */
export interface GeneratedObjective {
  id: string;
  sourceLearningId: string;
  objective: string;
  category: LearningCategory;
  priority: number;
  timeline: string;
  resources: string[];
  rationale: string;
  expectedImpact: number;
  confidence: number;
  validationStatus: 'pending' | 'validated' | 'rejected';
  validationReason?: string;
  metadata: {
    sourceActId: string;
    sourceDoId: string;
    learningImpact: LearningImpact;
    createdAt: Date;
  };
}

/**
 * Feedback loop metrics
 */
export interface FeedbackLoopMetrics {
  timestamp: Date;
  learningsExtracted: number;
  learningsConverted: number;
  objectivesGenerated: number;
  objectivesIntegrated: number;
  objectivesToActionsMapped: number;
  extractionRate: number; // learningsExtracted / totalActs
  conversionRate: number; // learningsConverted / learningsExtracted
  integrationRate: number; // objectivesIntegrated / objectivesGenerated
  actionMappingRate: number; // objectivesToActionsMapped / objectivesIntegrated
  averageLearningImpact: number;
  averageObjectiveConfidence: number;
  health: FeedbackLoopHealth;
}

/**
 * Feedback loop health status
 */
export type FeedbackLoopHealth = 'healthy' | 'degraded' | 'critical' | 'inactive';

/**
 * Feedback loop configuration
 */
export interface FeedbackLoopConfig {
  enabled: boolean;
  extractionIntervalMs: number;
  conversionThreshold: number; // Minimum impact score for conversion
  maxObjectivesPerCycle: number;
  enableMetrics: boolean;
  enableEvidenceLogging: boolean;
  enableGovernanceIntegration: boolean;
}

/**
 * Objective queue entry
 */
export interface ObjectiveQueueEntry {
  objective: GeneratedObjective;
  queueTime: Date;
  priority: number;
  dependencies: string[];
}

/**
 * Action mapping for objective
 */
export interface ObjectiveActionMapping {
  objectiveId: string;
  actions: Array<{
    id: string;
    name: string;
    priority: number;
    estimatedDuration: number;
  }>;
  mappingConfidence: number;
  createdAt: Date;
}

/**
 * Act→Plan Feedback Loop System
 * 
 * Implements closed feedback loop from Act phase back to Plan phase:
 * 1. Extract learnings from Act phase
 * 2. Convert learnings to objectives
 * 3. Integrate objectives into Plan phase
 * 4. Track metrics and health
 */
export class ActPlanFeedbackLoop {
  private extractedLearnings: Map<string, ExtractedLearning> = new Map();
  private generatedObjectives: Map<string, GeneratedObjective> = new Map();
  private objectiveQueue: ObjectiveQueueEntry[] = [];
  private actionMappings: Map<string, ObjectiveActionMapping> = new Map();
  private metrics: FeedbackLoopMetrics[] = [];
  private config: FeedbackLoopConfig;
  private lastExtractionTime: Date | null = null;
  private initialized: boolean = false;

  constructor(config?: Partial<FeedbackLoopConfig>) {
    this.config = {
      enabled: true,
      extractionIntervalMs: 60000, // 1 minute
      conversionThreshold: 0.5,
      maxObjectivesPerCycle: 10,
      enableMetrics: true,
      enableEvidenceLogging: true,
      enableGovernanceIntegration: true,
      ...config
    };
  }

  /**
   * Initialize the feedback loop system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ACT-PLAN-FEEDBACK] Initializing Act→Plan Feedback Loop');
    console.log(`[ACT-PLAN-FEEDBACK] Config: ${JSON.stringify(this.config, null, 2)}`);

    this.initialized = true;
    console.log('[ACT-PLAN-FEEDBACK] Feedback loop initialized successfully');
  }

  /**
   * Extract learnings from Act phase
   * 
   * Extracts learnings from:
   * - Completed actions
   * - Failed actions
   * - Blocked actions
   * - Incident resolution
   */
  async extractLearningsFromAct(
    acts: Act[],
    dos: Map<string, Do>,
    evidenceEvents?: EvidenceEvent[]
  ): Promise<ExtractedLearning[]> {
    if (!this.config.enabled) {
      console.log('[ACT-PLAN-FEEDBACK] Feedback loop disabled, skipping learning extraction');
      return [];
    }

    console.log(`[ACT-PLAN-FEEDBACK] Extracting learnings from ${acts.length} acts`);

    const learnings: ExtractedLearning[] = [];

    for (const act of acts) {
      const doItem = dos.get(act.doId);
      if (!doItem) {
        console.warn(`[ACT-PLAN-FEEDBACK] Do item ${act.doId} not found for act ${act.id}`);
        continue;
      }

      // Extract learnings from act.learnings array
      for (const learningText of act.learnings) {
        const learning = this.createLearningFromText(
          learningText,
          act,
          doItem,
          'completed_action'
        );
        learnings.push(learning);
      }

      // Extract learnings from act.improvements array
      for (const improvementText of act.improvements) {
        const learning = this.createLearningFromText(
          improvementText,
          act,
          doItem,
          'completed_action'
        );
        learning.category = LearningCategory.PROCESS;
        learnings.push(learning);
      }

      // Extract learnings from outcomes
      for (const outcome of act.outcomes) {
        const learning = this.createLearningFromOutcome(
          outcome,
          act,
          doItem
        );
        learnings.push(learning);
      }

      // Extract learnings based on Do status
      if (doItem.status === 'failed' || doItem.status === 'blocked') {
        const statusLearning = this.createLearningFromStatus(
          doItem.status,
          act,
          doItem
        );
        learnings.push(statusLearning);
      }
    }

    // Associate evidence events if provided
    if (evidenceEvents && this.config.enableEvidenceLogging) {
      this.associateEvidence(learnings, evidenceEvents);
    }

    // Store learnings
    for (const learning of learnings) {
      this.extractedLearnings.set(learning.id, learning);
    }

    this.lastExtractionTime = new Date();

    console.log(`[ACT-PLAN-FEEDBACK] Extracted ${learnings.length} learnings`);
    return learnings;
  }

  /**
   * Create learning from text
   */
  private createLearningFromText(
    text: string,
    act: Act,
    doItem: Do,
    source: ExtractedLearning['source']
  ): ExtractedLearning {
    const id = this.generateId('learning');
    const category = this.categorizeLearning(text);
    const impact = this.assessLearningImpact(text, category, act);

    return {
      id,
      timestamp: new Date(),
      source,
      actId: act.id,
      doId: act.doId,
      learning: text,
      context: {
        actionStatus: doItem.status,
        metrics: act.metrics
      },
      category,
      impact
    };
  }

  /**
   * Create learning from outcome
   */
  private createLearningFromOutcome(
    outcome: Outcome,
    act: Act,
    doItem: Do
  ): ExtractedLearning {
    const id = this.generateId('learning');
    const source: ExtractedLearning['source'] = 
      outcome.status === 'failed' ? 'failed_action' : 'completed_action';
    
    const learningText = outcome.lessons.length > 0 
      ? outcome.lessons.join('; ')
      : `Outcome ${outcome.name} ${outcome.status} with variance ${outcome.variance.toFixed(2)}`;
    
    const category = this.categorizeLearning(learningText);
    const impact = this.assessLearningImpact(learningText, category, act);

    return {
      id,
      timestamp: new Date(),
      source,
      actId: act.id,
      doId: act.doId,
      learning: learningText,
      context: {
        outcomeStatus: outcome.status,
        variance: outcome.variance,
        improvement: act.improvements.join('; ')
      },
      category,
      impact
    };
  }

  /**
   * Create learning from Do status
   */
  private createLearningFromStatus(
    status: Do['status'],
    act: Act,
    doItem: Do
  ): ExtractedLearning {
    const id = this.generateId('learning');
    const source: ExtractedLearning['source'] =
      ['failed', 'blocked'].includes(status) ? 'failed_action' : 'blocked_action';
    
    const actionNames = doItem.actions.map(a => a.name).join(', ');
    const learningText = status === 'failed'
      ? `Actions failed: ${actionNames}. Root cause analysis required.`
      : `Actions blocked: ${actionNames}. Dependencies or resources missing.`;
    
    const category = this.categorizeLearning(learningText);
    const impact = this.assessLearningImpact(learningText, category, act);

    return {
      id,
      timestamp: new Date(),
      source,
      actId: act.id,
      doId: act.doId,
      learning: learningText,
      context: {
        actionStatus: status,
        actionName: actionNames
      },
      category,
      impact
    };
  }

  /**
   * Categorize learning based on content analysis
   */
  private categorizeLearning(learningText: string): LearningCategory {
    const text = learningText.toLowerCase();

    // Performance keywords
    if (text.includes('performance') || text.includes('speed') || 
        text.includes('latency') || text.includes('throughput')) {
      return LearningCategory.PERFORMANCE;
    }

    // Reliability keywords
    if (text.includes('reliability') || text.includes('uptime') || 
        text.includes('availability') || text.includes('stability')) {
      return LearningCategory.RELIABILITY;
    }

    // Efficiency keywords
    if (text.includes('efficiency') || text.includes('cost') || 
        text.includes('resource') || text.includes('optimization')) {
      return LearningCategory.EFFICIENCY;
    }

    // Security keywords
    if (text.includes('security') || text.includes('vulnerability') || 
        text.includes('auth') || text.includes('permission')) {
      return LearningCategory.SECURITY;
    }

    // Scalability keywords
    if (text.includes('scale') || text.includes('capacity') || 
        text.includes('load') || text.includes('concurrency')) {
      return LearningCategory.SCALABILITY;
    }

    // Maintainability keywords
    if (text.includes('maintainability') || text.includes('code') || 
        text.includes('refactor') || text.includes('technical debt')) {
      return LearningCategory.MAINTAINABILITY;
    }

    // Governance keywords
    if (text.includes('governance') || text.includes('process') || 
        text.includes('workflow') || text.includes('approval')) {
      return LearningCategory.GOVERNANCE;
    }

    // Default to process
    return LearningCategory.PROCESS;
  }

  /**
   * Assess learning impact
   */
  private assessLearningImpact(
    learningText: string,
    category: LearningCategory,
    act: Act
  ): LearningImpact {
    // Base impact from category
    let baseScore = 0.5;
    let severity: LearningImpact['severity'] = 'medium';
    let priority = 5;

    // Adjust based on variance (high variance = higher impact)
    const avgVariance = act.outcomes.reduce((sum, o) => sum + Math.abs(o.variance), 0) / 
                       (act.outcomes.length || 1);
    if (avgVariance > 0.5) {
      baseScore += 0.3;
      severity = 'high';
      priority += 2;
    } else if (avgVariance > 0.2) {
      baseScore += 0.1;
      severity = 'medium';
      priority += 1;
    }

    // Adjust based on learning text length (longer = more detailed = higher impact)
    if (learningText.length > 100) {
      baseScore += 0.1;
      priority += 1;
    }

    // Adjust based on category importance
    if (category === LearningCategory.SECURITY || 
        category === LearningCategory.RELIABILITY) {
      baseScore += 0.2;
      priority += 2;
    }

    // Cap score at 1.0
    const score = Math.min(1.0, baseScore);
    const confidence = 0.6 + (score * 0.3); // 0.6 to 0.9
    const expectedBenefit = score * 100; // 0 to 100

    return {
      score,
      frequency: 1, // Will be updated by tracking
      severity,
      priority: Math.min(10, Math.max(1, priority)),
      expectedBenefit,
      confidence
    };
  }

  /**
   * Associate evidence events with learnings
   */
  private associateEvidence(
    learnings: ExtractedLearning[],
    evidenceEvents: EvidenceEvent[]
  ): void {
    for (const learning of learnings) {
      const matchingEvidence = evidenceEvents.find(e => 
        e.metadata?.actId === learning.actId ||
        e.data?.actId === learning.actId
      );
      if (matchingEvidence) {
        learning.evidence = matchingEvidence;
      }
    }
  }

  /**
   * Convert learnings to objectives
   * 
   * Creates objectives from learnings based on:
   * - Learning impact score
   * - Learning category
   * - Learning frequency
   */
  async convertLearningsToObjectives(
    learnings?: ExtractedLearning[]
  ): Promise<GeneratedObjective[]> {
    if (!this.config.enabled) {
      console.log('[ACT-PLAN-FEEDBACK] Feedback loop disabled, skipping conversion');
      return [];
    }

    const sourceLearnings = learnings || Array.from(this.extractedLearnings.values());
    console.log(`[ACT-PLAN-FEEDBACK] Converting ${sourceLearnings.length} learnings to objectives`);

    const objectives: GeneratedObjective[] = [];

    // Filter learnings by conversion threshold
    const eligibleLearnings = sourceLearnings.filter(
      l => l.impact.score >= this.config.conversionThreshold
    );

    console.log(`[ACT-PLAN-FEEDBACK] ${eligibleLearnings.length} learnings meet conversion threshold`);

    // Sort by priority and impact
    eligibleLearnings.sort((a, b) => 
      b.impact.priority - a.impact.priority || 
      b.impact.score - a.impact.score
    );

    // Limit to max objectives per cycle
    const selectedLearnings = eligibleLearnings.slice(0, this.config.maxObjectivesPerCycle);

    for (const learning of selectedLearnings) {
      const objective = this.createObjectiveFromLearning(learning);
      objectives.push(objective);
      this.generatedObjectives.set(objective.id, objective);
    }

    console.log(`[ACT-PLAN-FEEDBACK] Generated ${objectives.length} objectives`);
    return objectives;
  }

  /**
   * Create objective from learning
   */
  private createObjectiveFromLearning(learning: ExtractedLearning): GeneratedObjective {
    const id = this.generateId('objective');
    const objective = this.generateObjectiveText(learning);
    const timeline = this.generateTimeline(learning);
    const resources = this.generateResources(learning);
    const rationale = this.generateRationale(learning);

    return {
      id,
      sourceLearningId: learning.id,
      objective,
      category: learning.category,
      priority: learning.impact.priority,
      timeline,
      resources,
      rationale,
      expectedImpact: learning.impact.expectedBenefit,
      confidence: learning.impact.confidence,
      validationStatus: 'pending',
      metadata: {
        sourceActId: learning.actId,
        sourceDoId: learning.doId,
        learningImpact: learning.impact,
        createdAt: new Date()
      }
    };
  }

  /**
   * Generate objective text from learning
   */
  private generateObjectiveText(learning: ExtractedLearning): string {
    const categoryActions: Record<LearningCategory, string> = {
      [LearningCategory.PERFORMANCE]: 'Optimize',
      [LearningCategory.RELIABILITY]: 'Improve',
      [LearningCategory.EFFICIENCY]: 'Enhance',
      [LearningCategory.SECURITY]: 'Strengthen',
      [LearningCategory.SCALABILITY]: 'Enable',
      [LearningCategory.MAINTAINABILITY]: 'Refactor',
      [LearningCategory.USABILITY]: 'Improve',
      [LearningCategory.GOVERNANCE]: 'Streamline',
      [LearningCategory.PROCESS]: 'Optimize',
      [LearningCategory.TECHNOLOGY]: 'Upgrade'
    };

    const action = categoryActions[learning.category] || 'Address';
    const context = learning.context.actionName || learning.context.outcomeStatus || 'system';
    
    return `${action} ${context} based on learning: ${learning.learning.substring(0, 100)}`;
  }

  /**
   * Generate timeline for objective
   */
  private generateTimeline(learning: ExtractedLearning): string {
    if (learning.impact.severity === 'critical') {
      return 'Immediate (within 24 hours)';
    } else if (learning.impact.severity === 'high') {
      return 'Short-term (within 1 week)';
    } else if (learning.impact.severity === 'medium') {
      return 'Medium-term (within 1 month)';
    } else {
      return 'Long-term (within 3 months)';
    }
  }

  /**
   * Generate resources for objective
   */
  private generateResources(learning: ExtractedLearning): string[] {
    const resources: string[] = ['Development team'];

    if (learning.category === LearningCategory.SECURITY) {
      resources.push('Security team', 'Security audit tools');
    } else if (learning.category === LearningCategory.PERFORMANCE) {
      resources.push('Performance monitoring', 'Load testing environment');
    } else if (learning.category === LearningCategory.SCALABILITY) {
      resources.push('Infrastructure scaling', 'Load balancer');
    } else if (learning.category === LearningCategory.MAINTAINABILITY) {
      resources.push('Code review resources', 'Refactoring time');
    }

    return resources;
  }

  /**
   * Generate rationale for objective
   */
  private generateRationale(learning: ExtractedLearning): string {
    const parts: string[] = [];

    parts.push(`Learning impact score: ${learning.impact.score.toFixed(2)}`);
    parts.push(`Severity: ${learning.impact.severity}`);
    parts.push(`Priority: ${learning.impact.priority}/10`);
    parts.push(`Expected benefit: ${learning.impact.expectedBenefit.toFixed(1)}`);
    parts.push(`Confidence: ${(learning.impact.confidence * 100).toFixed(1)}%`);

    if (learning.evidence) {
      parts.push(`Supported by evidence from ${learning.evidence.emitter}`);
    }

    return parts.join('. ');
  }

  /**
   * Validate objectives
   */
  async validateObjectives(objectives: GeneratedObjective[]): Promise<void> {
    console.log(`[ACT-PLAN-FEEDBACK] Validating ${objectives.length} objectives`);

    for (const objective of objectives) {
      // Check for duplicates
      const isDuplicate = this.checkForDuplicate(objective);
      if (isDuplicate) {
        objective.validationStatus = 'rejected';
        objective.validationReason = 'Duplicate objective already exists';
        continue;
      }

      // Check for conflicts
      const hasConflict = this.checkForConflict(objective);
      if (hasConflict) {
        objective.validationStatus = 'rejected';
        objective.validationReason = 'Conflicts with existing objectives';
        continue;
      }

      // Check feasibility
      const isFeasible = this.checkFeasibility(objective);
      if (!isFeasible) {
        objective.validationStatus = 'rejected';
        objective.validationReason = 'Not feasible with current resources';
        continue;
      }

      objective.validationStatus = 'validated';
    }

    const validatedCount = objectives.filter(o => o.validationStatus === 'validated').length;
    console.log(`[ACT-PLAN-FEEDBACK] Validated ${validatedCount}/${objectives.length} objectives`);
  }

  /**
   * Check for duplicate objective
   */
  private checkForDuplicate(objective: GeneratedObjective): boolean {
    return Array.from(this.generatedObjectives.values()).some(
      o => o.objective === objective.objective && o.id !== objective.id
    );
  }

  /**
   * Check for conflicting objective
   */
  private checkForConflict(objective: GeneratedObjective): boolean {
    // Simple heuristic: check for opposite objectives
    const opposites: Record<string, string[]> = {
      'optimize': ['minimize', 'reduce'],
      'improve': ['degrade', 'reduce'],
      'enhance': ['reduce', 'minimize'],
      'strengthen': ['weaken', 'remove']
    };

    const objectiveLower = objective.objective.toLowerCase();
    for (const [key, values] of Object.entries(opposites)) {
      if (objectiveLower.includes(key)) {
        return Array.from(this.generatedObjectives.values()).some(
          o => o.id !== objective.id && values.some(v => o.objective.toLowerCase().includes(v))
        );
      }
    }

    return false;
  }

  /**
   * Check objective feasibility
   */
  private checkFeasibility(objective: GeneratedObjective): boolean {
    // Simple heuristic: check if required resources are reasonable
    return objective.resources.length <= 5 && objective.timeline.length < 100;
  }

  /**
   * Integrate objectives into Plan phase
   * 
   * Adds validated objectives to the objective queue for integration
   * into new Plan instances
   */
  async integrateObjectivesIntoPlan(
    framework: any // OrchestrationFramework
  ): Promise<Plan[]> {
    if (!this.config.enabled) {
      console.log('[ACT-PLAN-FEEDBACK] Feedback loop disabled, skipping integration');
      return [];
    }

    console.log('[ACT-PLAN-FEEDBACK] Integrating objectives into Plan phase');

    // Get validated objectives
    const validatedObjectives = Array.from(this.generatedObjectives.values())
      .filter(o => o.validationStatus === 'validated');

    if (validatedObjectives.length === 0) {
      console.log('[ACT-PLAN-FEEDBACK] No validated objectives to integrate');
      return [];
    }

    // Sort by priority
    validatedObjectives.sort((a, b) => b.priority - a.priority);

    // Create plans from objectives
    const plans: Plan[] = [];

    for (const objective of validatedObjectives) {
      // Check if already queued
      const alreadyQueued = this.objectiveQueue.some(
        q => q.objective.id === objective.id
      );
      if (alreadyQueued) {
        continue;
      }

      // Create plan
      const plan = await this.createPlanFromObjective(objective, framework);
      plans.push(plan);

      // Add to queue
      this.objectiveQueue.push({
        objective,
        queueTime: new Date(),
        priority: objective.priority,
        dependencies: []
      });
    }

    console.log(`[ACT-PLAN-FEEDBACK] Integrated ${plans.length} objectives into ${plans.length} plans`);
    return plans;
  }

  /**
   * Create plan from objective
   */
  private async createPlanFromObjective(
    objective: GeneratedObjective,
    framework: any
  ): Promise<Plan> {
    const planId = this.generateId('plan');
    const objectives = [objective.objective];

    const plan: Plan = {
      id: planId,
      name: `Feedback Loop Plan: ${objective.category}`,
      description: objective.rationale,
      objectives,
      timeline: objective.timeline,
      resources: objective.resources
    };

    // Store plan in framework
    if (framework && typeof framework.storePlan === 'function') {
      await framework.storePlan(plan);
    }

    return plan;
  }

  /**
   * Map objectives to actions
   */
  mapObjectivesToActions(objectives: GeneratedObjective[]): ObjectiveActionMapping[] {
    console.log(`[ACT-PLAN-FEEDBACK] Mapping ${objectives.length} objectives to actions`);

    const mappings: ObjectiveActionMapping[] = [];

    for (const objective of objectives) {
      const actions = this.generateActionsForObjective(objective);
      const mapping: ObjectiveActionMapping = {
        objectiveId: objective.id,
        actions,
        mappingConfidence: objective.confidence,
        createdAt: new Date()
      };

      mappings.push(mapping);
      this.actionMappings.set(objective.id, mapping);
    }

    console.log(`[ACT-PLAN-FEEDBACK] Created ${mappings.length} action mappings`);
    return mappings;
  }

  /**
   * Generate actions for objective
   */
  private generateActionsForObjective(
    objective: GeneratedObjective
  ): Array<{
    id: string;
    name: string;
    priority: number;
    estimatedDuration: number;
  }> {
    const actions: Array<{
      id: string;
      name: string;
      priority: number;
      estimatedDuration: number;
    }> = [];

    // Analyze objective to generate relevant actions
    const objectiveLower = objective.objective.toLowerCase();

    if (objectiveLower.includes('optimize') || objectiveLower.includes('improve')) {
      actions.push({
        id: this.generateId('action'),
        name: 'Analyze current state',
        priority: 1,
        estimatedDuration: 60
      });
      actions.push({
        id: this.generateId('action'),
        name: 'Identify optimization opportunities',
        priority: 2,
        estimatedDuration: 120
      });
      actions.push({
        id: this.generateId('action'),
        name: 'Implement improvements',
        priority: 3,
        estimatedDuration: 240
      });
      actions.push({
        id: this.generateId('action'),
        name: 'Validate improvements',
        priority: 4,
        estimatedDuration: 60
      });
    } else if (objectiveLower.includes('strengthen') || objectiveLower.includes('security')) {
      actions.push({
        id: this.generateId('action'),
        name: 'Conduct security audit',
        priority: 1,
        estimatedDuration: 120
      });
      actions.push({
        id: this.generateId('action'),
        name: 'Address vulnerabilities',
        priority: 2,
        estimatedDuration: 240
      });
      actions.push({
        id: this.generateId('action'),
        name: 'Update security policies',
        priority: 3,
        estimatedDuration: 60
      });
    } else {
      // Generic actions
      actions.push({
        id: this.generateId('action'),
        name: 'Research and analyze',
        priority: 1,
        estimatedDuration: 120
      });
      actions.push({
        id: this.generateId('action'),
        name: 'Implement solution',
        priority: 2,
        estimatedDuration: 240
      });
      actions.push({
        id: this.generateId('action'),
        name: 'Test and validate',
        priority: 3,
        estimatedDuration: 60
      });
    }

    return actions;
  }

  /**
   * Process feedback loop cycle
   * 
   * Complete cycle: extract learnings -> convert to objectives -> integrate into plans
   */
  async processCycle(
    acts: Act[],
    dos: Map<string, Do>,
    framework?: any,
    evidenceEvents?: EvidenceEvent[]
  ): Promise<{
    learnings: ExtractedLearning[];
    objectives: GeneratedObjective[];
    plans: Plan[];
    metrics: FeedbackLoopMetrics;
  }> {
    console.log('[ACT-PLAN-FEEDBACK] Processing feedback loop cycle');

    // Step 1: Extract learnings
    const learnings = await this.extractLearningsFromAct(acts, dos, evidenceEvents);

    // Step 2: Convert learnings to objectives
    const objectives = await this.convertLearningsToObjectives(learnings);

    // Step 3: Validate objectives
    await this.validateObjectives(objectives);

    // Step 4: Integrate into plans
    const plans = framework 
      ? await this.integrateObjectivesIntoPlan(framework)
      : [];

    // Step 5: Map objectives to actions
    const validatedObjectives = objectives.filter(o => o.validationStatus === 'validated');
    this.mapObjectivesToActions(validatedObjectives);

    // Step 6: Calculate metrics
    const metrics = this.calculateMetrics(acts, learnings, objectives, plans);

    return {
      learnings,
      objectives,
      plans,
      metrics
    };
  }

  /**
   * Calculate feedback loop metrics
   */
  private calculateMetrics(
    acts: Act[],
    learnings: ExtractedLearning[],
    objectives: GeneratedObjective[],
    plans: Plan[]
  ): FeedbackLoopMetrics {
    const totalActs = acts.length;
    const learningsExtracted = learnings.length;
    const learningsConverted = objectives.length;
    const objectivesGenerated = objectives.length;
    const objectivesIntegrated = plans.length;
    const objectivesToActionsMapped = this.actionMappings.size;

    const extractionRate = totalActs > 0 ? learningsExtracted / totalActs : 0;
    const conversionRate = learningsExtracted > 0 ? learningsConverted / learningsExtracted : 0;
    const integrationRate = objectivesGenerated > 0 ? objectivesIntegrated / objectivesGenerated : 0;
    const actionMappingRate = objectivesIntegrated > 0 ? objectivesToActionsMapped / objectivesIntegrated : 0;

    const averageLearningImpact = learnings.length > 0
      ? learnings.reduce((sum, l) => sum + l.impact.score, 0) / learnings.length
      : 0;

    const averageObjectiveConfidence = objectives.length > 0
      ? objectives.reduce((sum, o) => sum + o.confidence, 0) / objectives.length
      : 0;

    const health = this.assessFeedbackLoopHealth(
      extractionRate,
      conversionRate,
      integrationRate
    );

    const metrics: FeedbackLoopMetrics = {
      timestamp: new Date(),
      learningsExtracted,
      learningsConverted,
      objectivesGenerated,
      objectivesIntegrated,
      objectivesToActionsMapped,
      extractionRate,
      conversionRate,
      integrationRate,
      actionMappingRate,
      averageLearningImpact,
      averageObjectiveConfidence,
      health
    };

    if (this.config.enableMetrics) {
      this.metrics.push(metrics);
      console.log('[ACT-PLAN-FEEDBACK] Metrics:', JSON.stringify(metrics, null, 2));
    }

    return metrics;
  }

  /**
   * Assess feedback loop health
   */
  private assessFeedbackLoopHealth(
    extractionRate: number,
    conversionRate: number,
    integrationRate: number
  ): FeedbackLoopHealth {
    // All rates should be reasonably high (> 0.5)
    if (extractionRate > 0.7 && conversionRate > 0.7 && integrationRate > 0.7) {
      return 'healthy';
    }

    // At least one rate is low
    if (extractionRate > 0.3 && conversionRate > 0.3 && integrationRate > 0.3) {
      return 'degraded';
    }

    // Critical rates
    if (extractionRate > 0.1 && conversionRate > 0.1 && integrationRate > 0.1) {
      return 'critical';
    }

    // Inactive
    return 'inactive';
  }

  /**
   * Get feedback loop metrics history
   */
  getMetrics(): FeedbackLoopMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): FeedbackLoopMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get extracted learnings
   */
  getExtractedLearnings(): ExtractedLearning[] {
    return Array.from(this.extractedLearnings.values());
  }

  /**
   * Get generated objectives
   */
  getGeneratedObjectives(): GeneratedObjective[] {
    return Array.from(this.generatedObjectives.values());
  }

  /**
   * Get objective queue
   */
  getObjectiveQueue(): ObjectiveQueueEntry[] {
    return [...this.objectiveQueue];
  }

  /**
   * Get action mappings
   */
  getActionMappings(): ObjectiveActionMapping[] {
    return Array.from(this.actionMappings.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.extractedLearnings.clear();
    this.generatedObjectives.clear();
    this.objectiveQueue = [];
    this.actionMappings.clear();
    this.metrics = [];
    this.lastExtractionTime = null;
    console.log('[ACT-PLAN-FEEDBACK] All data cleared');
  }

  /**
   * Export state
   */
  exportState(): string {
    return JSON.stringify({
      extractedLearnings: Array.from(this.extractedLearnings.entries()),
      generatedObjectives: Array.from(this.generatedObjectives.entries()),
      objectiveQueue: this.objectiveQueue,
      actionMappings: Array.from(this.actionMappings.entries()),
      metrics: this.metrics,
      config: this.config,
      lastExtractionTime: this.lastExtractionTime
    }, null, 2);
  }

  /**
   * Import state
   */
  importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);

      this.extractedLearnings = new Map(state.extractedLearnings);
      this.generatedObjectives = new Map(state.generatedObjectives);
      this.objectiveQueue = state.objectiveQueue;
      this.actionMappings = new Map(state.actionMappings);
      this.metrics = state.metrics;
      this.config = { ...this.config, ...state.config };
      this.lastExtractionTime = state.lastExtractionTime ? new Date(state.lastExtractionTime) : null;

      console.log('[ACT-PLAN-FEEDBACK] State imported successfully');
    } catch (error) {
      console.error('[ACT-PLAN-FEEDBACK] Failed to import state:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}

/**
 * Create feedback loop instance with default configuration
 */
export async function createFeedbackLoop(
  config?: Partial<FeedbackLoopConfig>
): Promise<ActPlanFeedbackLoop> {
  const loop = new ActPlanFeedbackLoop(config);
  await loop.initialize();
  return loop;
}
