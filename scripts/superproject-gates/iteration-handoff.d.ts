/**
 * P1.3: Iteration Handoff Reporting System
 *
 * Maintains continuity between iteration cycles by capturing state, decisions,
 * and context for seamless handoff to the next iteration.
 */
export interface IterationContext {
    iterationId: string;
    startedAt: string;
    completedAt?: string;
    status: 'in_progress' | 'completed' | 'failed' | 'paused';
    tasksCompleted: TaskSummary[];
    tasksPending: TaskSummary[];
    blockers: Blocker[];
    stateSnapshot: StateSnapshot;
    decisions: DecisionRecord[];
    insights: string[];
    recommendations: string[];
    previousIterationId?: string;
    nextIterationId?: string;
    handoffNotes: string;
}
export interface TaskSummary {
    id: string;
    name: string;
    status: 'completed' | 'pending' | 'blocked' | 'cancelled';
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    outcome?: string;
    notes?: string;
}
export interface Blocker {
    id: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    owner?: string;
    resolution?: string;
    createdAt: string;
}
export interface StateSnapshot {
    dbStats: {
        episodeCount: number;
        skillCount: number;
        patternCount: number;
    };
    healthMetrics: {
        okRate: number;
        stabilityScore: number;
        confidenceAvg: number;
    };
    pendingWork: {
        high: number;
        medium: number;
        low: number;
    };
    activeRisks: {
        critical: number;
        high: number;
        medium: number;
    };
}
export interface DecisionRecord {
    id: string;
    type: string;
    description: string;
    rationale: string;
    outcome: string;
    timestamp: string;
}
export declare class IterationHandoffSystem {
    private reportsDir;
    private currentIteration;
    constructor(baseDir?: string);
    /**
     * Start a new iteration, loading context from previous if available
     */
    startIteration(iterationId?: string): IterationContext;
    /**
     * Record task completion
     */
    recordTask(task: TaskSummary): void;
    /**
     * Record a decision made during this iteration
     */
    recordDecision(decision: Omit<DecisionRecord, 'id' | 'timestamp'>): void;
    /**
     * Add insight or recommendation
     */
    addInsight(insight: string): void;
    addRecommendation(recommendation: string): void;
    addBlocker(blocker: Omit<Blocker, 'createdAt'>): void;
    updateStateSnapshot(snapshot: Partial<StateSnapshot>): void;
    /**
     * Complete iteration and generate handoff report
     */
    completeIteration(handoffNotes: string, status?: 'completed' | 'failed' | 'paused'): string;
    /**
     * Get the latest handoff report
     */
    getLatestHandoff(): IterationContext | null;
    /**
     * Get handoff by ID
     */
    getHandoff(iterationId: string): IterationContext | null;
    getCurrentIteration(): IterationContext | null;
}
export declare const handoffSystem: IterationHandoffSystem;
//# sourceMappingURL=iteration-handoff.d.ts.map