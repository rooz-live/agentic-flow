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
import type { Act, Do, Plan, Outcome } from './orchestration-framework.js';
import type { EvidenceEvent } from '../evidence/types/schema.js';
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
export declare enum LearningCategory {
    PERFORMANCE = "performance",
    RELIABILITY = "reliability",
    EFFICIENCY = "efficiency",
    SECURITY = "security",
    SCALABILITY = "scalability",
    MAINTAINABILITY = "maintainability",
    USABILITY = "usability",
    GOVERNANCE = "governance",
    PROCESS = "process",
    TECHNOLOGY = "technology"
}
/**
 * Learning impact assessment
 */
export interface LearningImpact {
    score: number;
    frequency: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    priority: number;
    expectedBenefit: number;
    confidence: number;
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
    extractionRate: number;
    conversionRate: number;
    integrationRate: number;
    actionMappingRate: number;
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
    conversionThreshold: number;
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
export declare class ActPlanFeedbackLoop {
    private extractedLearnings;
    private generatedObjectives;
    private objectiveQueue;
    private actionMappings;
    private metrics;
    private config;
    private lastExtractionTime;
    private initialized;
    constructor(config?: Partial<FeedbackLoopConfig>);
    /**
     * Initialize the feedback loop system
     */
    initialize(): Promise<void>;
    /**
     * Extract learnings from Act phase
     *
     * Extracts learnings from:
     * - Completed actions
     * - Failed actions
     * - Blocked actions
     * - Incident resolution
     */
    extractLearningsFromAct(acts: Act[], dos: Map<string, Do>, evidenceEvents?: EvidenceEvent[]): Promise<ExtractedLearning[]>;
    /**
     * Create learning from text
     */
    private createLearningFromText;
    /**
     * Create learning from outcome
     */
    private createLearningFromOutcome;
    /**
     * Create learning from Do status
     */
    private createLearningFromStatus;
    /**
     * Categorize learning based on content analysis
     */
    private categorizeLearning;
    /**
     * Assess learning impact
     */
    private assessLearningImpact;
    /**
     * Associate evidence events with learnings
     */
    private associateEvidence;
    /**
     * Convert learnings to objectives
     *
     * Creates objectives from learnings based on:
     * - Learning impact score
     * - Learning category
     * - Learning frequency
     */
    convertLearningsToObjectives(learnings?: ExtractedLearning[]): Promise<GeneratedObjective[]>;
    /**
     * Create objective from learning
     */
    private createObjectiveFromLearning;
    /**
     * Generate objective text from learning
     */
    private generateObjectiveText;
    /**
     * Generate timeline for objective
     */
    private generateTimeline;
    /**
     * Generate resources for objective
     */
    private generateResources;
    /**
     * Generate rationale for objective
     */
    private generateRationale;
    /**
     * Validate objectives
     */
    validateObjectives(objectives: GeneratedObjective[]): Promise<void>;
    /**
     * Check for duplicate objective
     */
    private checkForDuplicate;
    /**
     * Check for conflicting objective
     */
    private checkForConflict;
    /**
     * Check objective feasibility
     */
    private checkFeasibility;
    /**
     * Integrate objectives into Plan phase
     *
     * Adds validated objectives to the objective queue for integration
     * into new Plan instances
     */
    integrateObjectivesIntoPlan(framework: any): Promise<Plan[]>;
    /**
     * Create plan from objective
     */
    private createPlanFromObjective;
    /**
     * Map objectives to actions
     */
    mapObjectivesToActions(objectives: GeneratedObjective[]): ObjectiveActionMapping[];
    /**
     * Generate actions for objective
     */
    private generateActionsForObjective;
    /**
     * Process feedback loop cycle
     *
     * Complete cycle: extract learnings -> convert to objectives -> integrate into plans
     */
    processCycle(acts: Act[], dos: Map<string, Do>, framework?: any, evidenceEvents?: EvidenceEvent[]): Promise<{
        learnings: ExtractedLearning[];
        objectives: GeneratedObjective[];
        plans: Plan[];
        metrics: FeedbackLoopMetrics;
    }>;
    /**
     * Calculate feedback loop metrics
     */
    private calculateMetrics;
    /**
     * Assess feedback loop health
     */
    private assessFeedbackLoopHealth;
    /**
     * Get feedback loop metrics history
     */
    getMetrics(): FeedbackLoopMetrics[];
    /**
     * Get latest metrics
     */
    getLatestMetrics(): FeedbackLoopMetrics | null;
    /**
     * Get extracted learnings
     */
    getExtractedLearnings(): ExtractedLearning[];
    /**
     * Get generated objectives
     */
    getGeneratedObjectives(): GeneratedObjective[];
    /**
     * Get objective queue
     */
    getObjectiveQueue(): ObjectiveQueueEntry[];
    /**
     * Get action mappings
     */
    getActionMappings(): ObjectiveActionMapping[];
    /**
     * Clear all data
     */
    clear(): void;
    /**
     * Export state
     */
    exportState(): string;
    /**
     * Import state
     */
    importState(stateJson: string): void;
    /**
     * Generate unique ID
     */
    private generateId;
}
/**
 * Create feedback loop instance with default configuration
 */
export declare function createFeedbackLoop(config?: Partial<FeedbackLoopConfig>): Promise<ActPlanFeedbackLoop>;
//# sourceMappingURL=act-plan-feedback-loop.d.ts.map