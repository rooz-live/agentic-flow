/**
 * Core Orchestration Framework Foundation
 *
 * Implements Purpose/Domains/Accountability and Plan/Do/Act frameworks
 * for comprehensive agentic flow orchestration system
 */
import { DecisionAuditEntry } from './agentdb-client.js';
export type Circle = 'orchestrator' | 'assessor' | 'analyst' | 'innovator' | 'seeker' | 'intuitive';
interface InterpretabilityMetrics {
    averageConfidence: number;
    featureStability: number;
    explanationConsistency: number;
    driftDetected: boolean;
    recommendations: string[];
}
interface SHAPFeatureImportance {
    featureName: string;
    value: number;
    attribution: number;
    importance: number;
}
interface InterpretabilityResult {
    confidence: number;
    summary: string;
    lime?: {
        confidence: number;
        rSquared: number;
        features: Array<{
            featureName: string;
            value: number;
            attribution: number;
        }>;
    };
    shap?: {
        baseValue: number;
        totalSamples: number;
        featureImportance: SHAPFeatureImportance[];
        values: Array<{
            featureName: string;
            value: number;
            shapValue: number;
            importance: number;
        }>;
    };
}
interface AgentInteractionLog {
    agentId?: string;
    interactionType: string;
    timestamp: Date;
    id?: string;
    sourceAgentId?: string;
    sourceAgentRole?: string;
    targetAgentId?: string;
    targetAgentRole?: string;
    action?: string;
    context?: Record<string, any>;
    outcome?: string;
    metadata?: Record<string, any>;
}
interface CausalEmergenceAnalysisResult {
    patterns: any[];
    recommendations: string[];
    summary: {
        totalInteractionsAnalyzed: number;
        patternsDetected: number;
        emergingPatterns: number;
        causalRelationships: number;
    };
}
interface GovernanceHealthAssessment {
    healthy: boolean;
    issues: string[];
    overallHealth: 'healthy' | 'warning' | 'critical';
    healthScore: number;
    dimensions: {
        structural: number;
        functional: number;
        adaptive: number;
        collaborative: number;
    };
}
interface ExtractedLearning {
    id: string;
    source: string;
    insight: string;
    confidence: number;
    impact?: number;
}
interface FeedbackLoopConfig {
    enabled: boolean;
    learningRate: number;
}
interface FeedbackLoopMetrics {
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
    health: 'inactive' | 'healthy' | 'degraded' | 'critical';
}
interface GeneratedObjective {
    id: string;
    name: string;
    priority: number;
    confidence?: number;
}
export interface Purpose {
    id: string;
    name: string;
    description: string;
    objectives: string[];
    keyResults: string[];
}
export interface Domain {
    id: string;
    name: string;
    purpose: string;
    boundaries: string[];
    accountabilities: string[];
}
export interface Accountability {
    id: string;
    role: string;
    responsibilities: string[];
    metrics: string[];
    reportingTo: string[];
}
export interface Plan {
    id: string;
    name: string;
    description: string;
    objectives: string[];
    timeline: string;
    resources: string[];
    limeExplanation?: {
        predictionId: string;
        confidence: number;
        strategyRationale: string;
        topFeatures: Array<{
            featureName: string;
            value: number;
            attribution: number;
        }>;
        alternatives: Array<{
            strategyName: string;
            score: number;
            rationale: string;
        }>;
    };
}
export interface Do {
    id: string;
    planId: string;
    actions: Action[];
    status: "pending" | "in_progress" | "completed" | "blocked" | "failed";
    metrics: Record<string, number>;
}
export interface Act {
    id: string;
    doId: string;
    outcomes: Outcome[];
    learnings: string[];
    improvements: string[];
    metrics: Record<string, number>;
    shapAttribution?: {
        modelId: string;
        baseValue: number;
        confidence: number;
        featureImportance: Array<{
            featureName: string;
            value: number;
            attribution: number;
            importance: number;
        }>;
        agentAttribution: Array<{
            agentId: string;
            agentName: string;
            contribution: number;
            confidence: number;
            actionsContributed: string[];
        }>;
        outcomeAttribution: Array<{
            actionId: string;
            actionName: string;
            agentId?: string;
            agentName?: string;
            contribution: number;
            variance: number;
            attributionConfidence: number;
        }>;
    };
}
export interface Action {
    id: string;
    name: string;
    description: string;
    priority: number;
    estimatedDuration: number;
    dependencies: string[];
    assignee?: string;
    circle?: string;
}
export interface Outcome {
    id: string;
    name: string;
    status: "success" | "partial" | "failed";
    actualValue: number;
    expectedValue: number;
    variance: number;
    lessons: string[];
}
export interface MultipassCycle {
    id: string;
    iteration: number;
    startTime: Date;
    endTime?: Date;
    status: "running" | "completed" | "failed";
    metrics: Record<string, number>;
    convergence: number;
    stability: number;
    afProdEnforced?: boolean;
}
export declare class OrchestrationFramework {
    private purposes;
    private domains;
    private accountabilities;
    private plans;
    private dos;
    private acts;
    private multipassCycles;
    private activeMultipassRuns;
    private interpretabilitySystem;
    private predictionContexts;
    private errorMitigationSystem;
    private causalEmergenceAnalyzer;
    private feedbackLoop;
    private feedbackLoopEnabled;
    private initialized;
    private initializationPromise;
    private decisionAuditDB;
    private decisionAuditEnabled;
    private governanceAuditLogger;
    constructor(feedbackLoopConfig?: Partial<FeedbackLoopConfig>);
    /**
     * Factory method for proper async initialization
     * Use this instead of direct constructor when you need to await initialization
     */
    static create(): Promise<OrchestrationFramework>;
    /**
     * Ensures the framework is fully initialized before use
     * Call this before using any async-dependent features
     */
    ensureInitialized(): Promise<void>;
    /**
     * Check if framework is initialized
     */
    isInitialized(): boolean;
    /**
     * Alias for ensureInitialized() for test compatibility
     */
    waitForInitialization(): Promise<void>;
    /**
     * Get all purposes (public accessor for testing)
     */
    getPurposes(): Map<string, Purpose>;
    /**
     * Get all domains (public accessor for testing)
     */
    getDomains(): Map<string, Domain>;
    /**
     * Get all accountabilities (public accessor for testing)
     */
    getAccountabilities(): Map<string, Accountability>;
    /**
     * Store an existing plan with validation (async version for plans with existing IDs)
     */
    storePlan(plan: Plan): Promise<Plan>;
    /**
     * Execute a plan and return Do phase result
     */
    executePlan(planIdOrPlan: string | {
        id: string;
        requiredResources?: string[];
    }): Promise<Do>;
    /**
     * Review outcome and create Act phase
     */
    reviewOutcome(doId: string): Promise<Act>;
    /**
     * Execute a complete cycle (for testing)
     */
    executeCycle(): Promise<any>;
    /**
     * Process an operation (for fatigue testing)
     */
    processOperation(op: any): Promise<void>;
    /**
     * Execute with validation (for temptation testing)
     */
    executeWithValidation(config: {
        shouldFail?: boolean;
    }): Promise<void>;
    /**
     * Measure performance for claim validation
     */
    measurePerformance(): Promise<number>;
    /**
     * Get incidents for claim validation
     */
    getIncidents(): Promise<any[]>;
    /**
     * Get performance baseline data
     */
    getPerformanceBaseline(): Promise<{
        claimedImprovement: number;
        baseline?: number;
        current?: number;
        measured: boolean;
    }>;
    /**
     * Check if incident tracking exists
     */
    hasIncidentTracking(): Promise<boolean>;
    /**
     * Execute in E2B sandbox (if configured)
     */
    executeInSandbox(config: {
        code: string;
        timeout: number;
    }): Promise<{
        success: boolean;
    }>;
    /**
     * Track action with Goalie
     */
    trackAction(action: {
        id: string;
        type: string;
        priority: string;
    }): Promise<{
        tracked: boolean;
    }>;
    private initializeFramework;
    private createDefaultPurposes;
    private createDefaultDomains;
    private createDefaultAccountabilities;
    createPurpose(purpose: Omit<Purpose, "id">): Purpose;
    createDomain(domain: Omit<Domain, "id">): Domain;
    createAccountability(accountability: Omit<Accountability, "id">): Accountability;
    getPurpose(id: string): Purpose | undefined;
    getDomain(id: string): Domain | undefined;
    getAccountability(id: string): Accountability | undefined;
    getAllPurposes(): Purpose[];
    getAllDomains(): Domain[];
    getAllAccountabilities(): Accountability[];
    createPlan(plan: Omit<Plan, "id">): Plan;
    /**
     * Create plan with automatic LIME analysis for strategy selection
     */
    createPlanWithLIME(plan: Omit<Plan, "id">, features: Record<string, number>, strategyScore: (features: Record<string, number>) => number, alternatives?: Array<{
        name: string;
        features: Record<string, number>;
    }>): Promise<Plan>;
    createDo(doItem: Omit<Do, "id">): Do;
    createAct(act: Omit<Act, "id">): Act;
    getPlan(id: string): Plan | undefined;
    getDo(id: string): Do | undefined;
    getAct(id: string): Act | undefined;
    getAllPlans(): Plan[];
    getAllDos(): Do[];
    getAllActs(): Act[];
    addActionToDo(doId: string, action: Omit<Action, "id">): Action;
    addOutcomeToAct(actId: string, outcome: Omit<Outcome, "id">): Outcome;
    updateDoStatus(doId: string, status: Do["status"]): void;
    updateActMetrics(actId: string, metrics: Record<string, number>): void;
    getFrameworkMetrics(): {
        purposes: number;
        domains: number;
        accountabilities: number;
        plans: number;
        dos: number;
        acts: number;
    };
    getFrameworkHealth(): {
        status: "healthy" | "warning" | "critical";
        issues: string[];
        recommendations: string[];
    };
    private generateId;
    exportFramework(): string;
    importFramework(frameworkData: string): void;
    startMultipassRun(planId: string, runId?: string): string;
    startMultipassCycle(runId: string): MultipassCycle;
    updateMultipassCycleMetrics(runId: string, cycleId: string, metrics: Record<string, number>, convergence: number, stability: number): void;
    completeMultipassCycle(runId: string, cycleId: string): void;
    failMultipassCycle(runId: string, cycleId: string): void;
    endMultipassRun(runId: string): void;
    getMultipassCycles(runId: string): MultipassCycle[];
    getMultipassRunStatus(planId: string): {
        runId: string;
        currentIteration: number;
    } | null;
    shouldTriggerEarlyCatching(runId: string, currentIteration: number, earlyCatchingIteration?: number): boolean;
    analyzeMultipassConvergence(runId: string): {
        averageConvergence: number;
        averageStability: number;
        trendDirection: "improving" | "stable" | "degrading";
        shouldContinue: boolean;
        recommendations: string[];
    };
    /**
     * Generate interpretability analysis for a model decision in the Do phase
     */
    analyzeDecisionWithInterpretability(doId: string, actionId: string, features: Record<string, number>, modelPredict: (features: Record<string, number>) => number, options?: {
        useLIME?: boolean;
        useSHAP?: boolean;
    }): Promise<InterpretabilityResult>;
    /**
     * Get interpretability metrics for the Act phase analysis
     */
    getInterpretabilityMetrics(modelId: string, timeframe?: {
        start: Date;
        end: Date;
    }): InterpretabilityMetrics;
    /**
     * Get interpretability evidence for a specific prediction
     */
    getInterpretabilityEvidence(predictionId: string): any;
    /**
     * Initialize background data for SHAP calculations
     */
    initializeInterpretabilityBackground(data: Record<string, number>[]): void;
    /**
     * Log interpretability evidence for the Act phase
     */
    private logInterpretabilityForAct;
    /**
     * Clear interpretability history
     */
    clearInterpretabilityHistory(): void;
    /**
     * Analyze plan with LIME to explain strategy selection (Plan phase)
     * Shows why specific strategies are selected based on feature contributions
     */
    analyzePlanWithLIME(planId: string, features: Record<string, number>, strategyScore: (features: Record<string, number>) => number, alternatives?: Array<{
        name: string;
        features: Record<string, number>;
    }>): Promise<{
        predictionId: string;
        confidence: number;
        strategyRationale: string;
        topFeatures: Array<{
            featureName: string;
            value: number;
            attribution: number;
        }>;
        alternatives: Array<{
            strategyName: string;
            score: number;
            rationale: string;
        }>;
    }>;
    /**
     * Analyze outcomes with SHAP to attribute results to actions and agents (Act phase)
     * Provides global feature importance and agent-level attribution
     */
    analyzeOutcomeWithSHAP(actId: string, features: Record<string, number>, outcomePredict: (features: Record<string, number>) => number, agentActions?: Array<{
        agentId: string;
        agentName: string;
        actionIds: string[];
        actionNames: string[];
        contributionEstimate: number;
    }>): Promise<{
        modelId: string;
        baseValue: number;
        confidence: number;
        featureImportance: Array<{
            featureName: string;
            value: number;
            attribution: number;
            importance: number;
        }>;
        agentAttribution: Array<{
            agentId: string;
            agentName: string;
            contribution: number;
            confidence: number;
            actionsContributed: string[];
        }>;
        outcomeAttribution: Array<{
            actionId: string;
            actionName: string;
            agentId?: string;
            agentName?: string;
            contribution: number;
            variance: number;
            attributionConfidence: number;
        }>;
    }>;
    /**
     * Calculate agent contribution based on SHAP values
     */
    private calculateAgentContribution;
    /**
     * Calculate action variance for outcome attribution
     */
    private calculateActionVariance;
    /**
     * Calculate SHAP confidence for outcome attribution
     */
    private calculateSHAPConfidence;
    /**
     * Store interpretability evidence in unified evidence schema
     */
    storeInterpretabilityEvidence(phase: 'plan' | 'do' | 'act', method: 'lime' | 'shap' | 'combined', evidence: any): void;
    /**
     * Handle failed outcomes using philosophical error mitigation
     */
    private handleFailedOutcome;
    /**
     * Create error context from a failed outcome
     */
    private createErrorContextFromOutcome;
    /**
     * Infer error type from outcome data
     */
    private inferErrorType;
    /**
     * Create relativity factors based on context
     */
    private createRelativityFactors;
    /**
     * Causal Emergence Analysis Integration Methods
     */
    /**
      * Record an agent interaction for causal emergence analysis
      */
    recordAgentInteraction(log: AgentInteractionLog): void;
    /**
      * Record multiple agent interactions
      */
    recordAgentInteractions(logs: AgentInteractionLog[]): void;
    /**
      * Perform causal emergence analysis on governance
      */
    analyzeGovernanceCausalEmergence(windowStart?: Date, windowEnd?: Date): Promise<CausalEmergenceAnalysisResult>;
    /**
      * Get governance health assessment
      */
    getGovernanceHealth(): Promise<GovernanceHealthAssessment>;
    /**
      * Get agent network metrics from causal emergence analysis
      */
    getAgentNetworkMetrics(agentId: string): any;
    /**
      * Get causal emergence analysis history
      */
    getCausalEmergenceHistory(): CausalEmergenceAnalysisResult[];
    /**
      * Get latest causal emergence analysis
      */
    getLatestCausalEmergenceAnalysis(): CausalEmergenceAnalysisResult | null;
    /**
      * Clear causal emergence interaction logs
      */
    clearCausalEmergenceLogs(): void;
    /**
       * Update causal emergence analyzer configuration
       */
    updateCausalEmergenceConfig(config: {
        analysisWindowMs?: number;
        minInteractionThreshold?: number;
        minCausalStrength?: number;
        minConfidence?: number;
        emergenceThreshold?: number;
        patternMinFrequency?: number;
    }): void;
    /**
     * Log a governance decision to the audit trail
     * @param entry The decision audit entry to log
     */
    logGovernanceDecision(entry: Omit<DecisionAuditEntry, 'timestamp'>): Promise<void>;
    /**
     * Log a strategy selection decision with full context
     */
    logStrategyDecision(strategyId: string, selectedStrategy: string, alternatives: Array<{
        option: string;
        score: number;
        reason_rejected?: string;
    }>, context: {
        plan_id?: string;
        do_id?: string;
        circle?: string;
    }, rationale: string, confidence: number): Promise<void>;
    /**
     * Log an escalation decision
     */
    logEscalationDecision(escalationId: string, escalatedTo: string, reason: string, context: {
        plan_id?: string;
        do_id?: string;
        circle?: string;
    }, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void>;
    /**
     * Get decision audit statistics
     */
    getDecisionAuditStats(): Promise<{
        total: number;
        withRationale: number;
        coveragePercent: number;
        byType: Record<string, number>;
    }>;
    /**
     * Query recent governance decisions
     */
    queryGovernanceDecisions(filters?: {
        decision_type?: string;
        actor?: string;
        since?: string;
        limit?: number;
    }): Promise<DecisionAuditEntry[]>;
    /**
     * Enable or disable decision audit logging
     */
    setDecisionAuditEnabled(enabled: boolean): void;
    /**
     * Act→Plan Feedback Loop Methods
     *
     * Implements closed feedback loop from Act phase back to Plan phase
     */
    /**
     * Process Act→Plan feedback loop cycle
     *
     * Extracts learnings from Act phase, converts to objectives,
     * integrates into Plan phase, and tracks metrics
     */
    processFeedbackLoop(evidenceEvents?: any[]): Promise<{
        learnings: ExtractedLearning[];
        objectives: GeneratedObjective[];
        plans: Plan[];
        metrics: FeedbackLoopMetrics;
    }>;
    /**
     * Enable Act→Plan feedback loop
     */
    enableFeedbackLoop(): void;
    /**
     * Disable Act→Plan feedback loop
     */
    disableFeedbackLoop(): void;
    /**
     * Check if feedback loop is enabled
     */
    isFeedbackLoopEnabled(): boolean;
    /**
     * Get feedback loop metrics
     */
    getFeedbackLoopMetrics(): FeedbackLoopMetrics[];
    /**
     * Get latest feedback loop metrics
     */
    getLatestFeedbackLoopMetrics(): FeedbackLoopMetrics | null;
    /**
     * Get extracted learnings from feedback loop
     */
    getExtractedLearnings(): ExtractedLearning[];
    /**
     * Get generated objectives from feedback loop
     */
    getGeneratedObjectives(): GeneratedObjective[];
    /**
     * Get objective queue from feedback loop
     */
    getObjectiveQueue(): any[];
    /**
     * Get action mappings from feedback loop
     */
    getActionMappings(): any[];
    /**
     * Clear feedback loop data
     */
    clearFeedbackLoop(): void;
    /**
     * Export feedback loop state
     */
    exportFeedbackLoopState(): string;
    /**
     * Import feedback loop state
     */
    importFeedbackLoopState(stateJson: string): void;
    /**
     * Get feedback loop health dashboard
     *
     * Returns comprehensive health dashboard with metrics and recommendations
     */
    getFeedbackLoopHealthDashboard(): {
        health: FeedbackLoopMetrics['health'];
        metrics: FeedbackLoopMetrics | null;
        learnings: ExtractedLearning[];
        objectives: GeneratedObjective[];
        recommendations: string[];
    };
    /**
     * Generate feedback loop recommendations
     */
    private generateFeedbackLoopRecommendations;
}
export {};
//# sourceMappingURL=orchestration-framework.d.ts.map