/**
 * PDA Cycle Manager - High-Level Cycle Orchestration
 *
 * Provides high-level management of Plan-Do-Act cycles with:
 * - Automated phase execution
 * - Monitoring integrations (Prometheus, Grafana)
 * - Audit logging and persistence
 * - Cycle statistics and analytics
 *
 * Uses GoaliePDAObserver for low-level observability.
 *
 * @module ruvector/pda-cycle-manager
 */
import { EventEmitter } from 'events';
import { PDACycleConfig, GoalieMilestone, GoalieCycleResult, GoalieEvidence, TestGraph, PDAObservabilityConfig } from './types.js';
import { GoaliePDAObserver } from './goalie-pda-observer.js';
import { FileWSJFInput } from './wsjf-batch-scorer.js';
/**
 * Plan configuration for a PDA cycle
 */
export interface CyclePlan {
    /** Human-readable name for the cycle */
    name: string;
    /** Strategic objectives to achieve */
    objectives: string[];
    /** Optional files for WSJF prioritization */
    files?: FileWSJFInput[];
    /** Optional test graph for execution planning */
    testGraph?: TestGraph;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Action definition for the Do phase
 */
export interface CycleAction {
    /** Action name */
    name: string;
    /** Action description */
    description?: string;
    /** Async execution function */
    execute: () => Promise<void>;
    /** Optional timeout in milliseconds */
    timeoutMs?: number;
}
/**
 * Statistics aggregated across multiple cycles
 */
export interface CycleStatistics {
    /** Total number of cycles executed */
    totalCycles: number;
    /** Success rate (0-1 scale) */
    successRate: number;
    /** Average cycle duration in milliseconds */
    avgDurationMs: number;
    /** Average anomalies detected per cycle */
    avgAnomaliesPerCycle: number;
    /** Average tests executed per cycle */
    avgTestsPerCycle: number;
    /** Total evidence collected */
    totalEvidence: number;
}
/**
 * PDACycleManager provides high-level orchestration of Plan-Do-Act cycles.
 *
 * Key features:
 * - Automated cycle execution with phase transitions
 * - Integration with monitoring systems (Prometheus, Grafana)
 * - Persistence and audit logging
 * - Cycle analytics and statistics
 */
export declare class PDACycleManager extends EventEmitter {
    private observer;
    private config;
    private activeCycles;
    private completedCycles;
    private cycleHistory;
    private prometheusUrl;
    private grafanaDashboardId;
    /**
     * Create a new PDACycleManager instance
     * @param observer - GoaliePDAObserver instance (or will create one)
     * @param config - Optional partial configuration
     */
    constructor(observer?: GoaliePDAObserver, config?: Partial<PDACycleConfig>);
    /**
     * Run a complete PDA cycle with automatic phase execution
     *
     * @param plan - Cycle plan with objectives and optional data
     * @returns Complete cycle result
     */
    runCycle(plan: CyclePlan): Promise<GoalieCycleResult>;
    /**
     * Execute the Plan phase
     * @param cycleId - Current cycle identifier
     * @param objectives - Strategic objectives
     * @param plan - Optional full plan for additional context
     * @returns Completed plan milestone
     */
    executePlanPhase(cycleId: string, objectives: string[], plan?: CyclePlan): Promise<GoalieMilestone>;
    /**
     * Execute the Do phase with a set of actions
     * @param cycleId - Current cycle identifier
     * @param actions - Actions to execute
     * @returns Array of completed milestones (one per action)
     */
    executeDoPhase(cycleId: string, actions: CycleAction[]): Promise<GoalieMilestone[]>;
    /**
     * Execute the Act phase with analysis and learning
     * @param cycleId - Current cycle identifier
     * @returns Completed act milestone
     */
    executeActPhase(cycleId: string): Promise<GoalieMilestone>;
    /**
     * Integrate with Prometheus for metrics push
     * @param pushGatewayUrl - Prometheus Push Gateway URL
     */
    integrateWithPrometheus(pushGatewayUrl: string): void;
    /**
     * Integrate with Grafana for dashboard updates
     * @param dashboardId - Grafana dashboard ID
     */
    integrateWithGrafana(dashboardId: string): void;
    /**
     * Push metrics to Prometheus Push Gateway
     * @param result - Cycle result to push
     */
    private pushMetricsToPrometheus;
    /**
     * Get audit log for a specific cycle
     * @param cycleId - Cycle identifier
     * @returns Array of evidence from the cycle
     */
    getAuditLog(cycleId: string): GoalieEvidence[];
    /**
     * Export audit log in specified format
     * @param cycleId - Cycle identifier
     * @param format - Export format ('json' or 'csv')
     * @returns Formatted audit log string
     */
    exportAuditLog(cycleId: string, format: 'json' | 'csv'): string;
    /**
     * Get aggregated statistics across all completed cycles
     * @returns Cycle statistics
     */
    getCycleStatistics(): CycleStatistics;
    /**
     * Save a cycle result to persistent storage
     * @param result - Cycle result to save
     */
    saveCycle(result: GoalieCycleResult): Promise<void>;
    /**
     * Load a cycle result from persistent storage
     * @param cycleId - Cycle identifier to load
     * @returns Loaded cycle result
     */
    loadCycle(cycleId: string): Promise<GoalieCycleResult>;
    /**
     * List all persisted cycle IDs
     * @returns Array of cycle identifiers
     */
    listPersistedCycles(): Promise<string[]>;
    /**
     * Get the underlying observer instance
     */
    getObserver(): GoaliePDAObserver;
    /**
     * Get current configuration
     */
    getConfig(): PDACycleConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<PDACycleConfig>): void;
    /**
     * Get completed cycles history
     */
    getCompletedCycles(): GoalieCycleResult[];
    /**
     * Generate a unique cycle ID
     */
    private generateCycleId;
    /**
     * Handle cycle completion
     */
    private handleCycleEnded;
    /**
     * Ensure persistence directory exists
     */
    private ensurePersistenceDirectory;
}
/**
 * Factory function to create a PDACycleManager
 * @param observer - Optional GoaliePDAObserver instance
 * @param config - Optional configuration
 * @returns Configured PDACycleManager instance
 */
export declare function createPDACycleManager(observer?: GoaliePDAObserver, config?: Partial<PDACycleConfig>): PDACycleManager;
/**
 * Factory function to create a fully configured cycle manager
 * with both observer and manager configs
 */
export declare function createConfiguredCycleManager(observerConfig?: Partial<PDAObservabilityConfig>, managerConfig?: Partial<PDACycleConfig>): PDACycleManager;
//# sourceMappingURL=pda-cycle-manager.d.ts.map