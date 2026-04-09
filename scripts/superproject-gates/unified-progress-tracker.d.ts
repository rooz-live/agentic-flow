/**
 * @fileoverview Unified Progress & Completion Tracker
 * Integrates real-time execution progress with historical completion metrics
 *
 * Integration Architecture:
 * 1. Real-time: ProcessingProgress tracks ceremony execution (domain/progress)
 * 2. Historical: CompletionTracker stores episode outcomes (core/completion-tracker)
 * 3. Unified: Bridges both systems + traces progress issues
 */
import { PhaseProgress, ProgressMetrics } from '../domain/progress/index.js';
import { Circle, CircleMetrics } from './completion-tracker.js';
export interface UnifiedProgressSnapshot {
    executionProgress: ProgressMetrics;
    currentPhases: PhaseProgress[];
    circleCompletion: CircleMetrics | null;
    historicalAvgPct: number;
    combinedScore: number;
    timestamp: number;
}
export interface ProgressIssue {
    severity: 'warning' | 'error' | 'critical';
    category: 'execution' | 'completion' | 'integration';
    message: string;
    phase?: string;
    circle?: Circle;
    timestamp: number;
    suggestedAction?: string;
}
export interface ProdCycleImprovement {
    id: string;
    priority: 'low' | 'medium' | 'high';
    category: 'performance' | 'reliability' | 'observability';
    title: string;
    description: string;
    estimatedImpact: string;
    implementationNotes: string[];
}
export declare class UnifiedProgressTracker {
    private executionProgress?;
    private completionTracker;
    private issues;
    private improvements;
    private checkpointId?;
    constructor();
    /**
     * Initialize completion tracker schema
     */
    init(): Promise<void>;
    /**
     * Start tracking a new execution run
     */
    startExecution(pipelineId: string, phases: PhaseProgress[]): void;
    /**
     * Update phase progress during execution
     */
    updatePhase(phaseName: string, completed: number, total: number): void;
    /**
     * Complete execution and store episode with completion tracking
     */
    completeExecution(episodeId: string, circle: Circle, ceremony: string, outcome: 'success' | 'failure' | 'partial', confidence: number, executionTime?: number, qualityScore?: number): Promise<void>;
    /**
     * Get unified progress snapshot (real-time + historical)
     */
    getUnifiedSnapshot(circle?: Circle): Promise<UnifiedProgressSnapshot>;
    /**
     * Get all traced issues
     */
    getIssues(): ProgressIssue[];
    /**
     * Get issues by severity
     */
    getIssuesBySeverity(severity: 'warning' | 'error' | 'critical'): ProgressIssue[];
    /**
     * Get recommended prod-cycle improvements
     */
    getImprovements(category?: string): ProdCycleImprovement[];
    /**
     * Get high-priority improvements
     */
    getHighPriorityImprovements(): ProdCycleImprovement[];
    /**
     * Close trackers and cleanup checkpoints
     */
    close(): void;
    /**
     * Trace progress issues during execution
     */
    private traceProgressIssues;
    /**
     * Add issue to tracker
     */
    private addIssue;
    /**
     * Check circle performance and trigger learning loop if needed
     */
    private checkAndTriggerLearningLoop;
    /**
     * Trigger learning loop for a circle
     */
    private triggerLearningLoop;
    /**
     * Calculate reward from outcome and confidence
     */
    private calculateReward;
    /**
     * Save progress checkpoint for crash recovery
     */
    private saveCheckpoint;
    /**
     * Recover from checkpoint after crash
     */
    recoverFromCheckpoint(checkpointId: string): Promise<PhaseProgress[] | null>;
    /**
     * Delete checkpoint after successful completion
     */
    private deleteCheckpoint;
    /**
     * Cleanup stale checkpoints (>24 hours old)
     */
    cleanupStaleCheckpoints(): Promise<number>;
    /**
     * Initialize prod-cycle improvements
     */
    private initializeImprovements;
}
export default UnifiedProgressTracker;
//# sourceMappingURL=unified-progress-tracker.d.ts.map