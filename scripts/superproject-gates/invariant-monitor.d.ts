/**
 * Invariant Monitor
 *
 * Monitors system invariants and triggers self-healing actions when violations
 * are detected. Integrates with SonaAnomalyDetector for anomalous violation
 * pattern detection.
 *
 * @module structural-diagnostics/invariant-monitor
 */
import { EventEmitter } from 'events';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
import { SystemInvariant, InvariantViolation, SelfHealingAction } from './types.js';
/**
 * InvariantMonitor watches system invariants and triggers self-healing
 * actions when violations are detected.
 */
export declare class InvariantMonitor extends EventEmitter {
    private invariants;
    private violations;
    private healingActions;
    private anomalyDetector;
    private watchIntervals;
    private healingTriggers;
    private readonly maxViolationHistory;
    private readonly maxHealingHistory;
    /**
     * Create a new InvariantMonitor instance
     * @param anomalyDetector - Optional SonaAnomalyDetector for pattern detection
     */
    constructor(anomalyDetector?: SonaAnomalyDetector);
    /**
     * Register a new system invariant
     *
     * @param invariant - System invariant to register
     */
    registerInvariant(invariant: SystemInvariant): void;
    /**
     * Get a registered invariant by ID
     *
     * @param id - Invariant ID
     * @returns Invariant or null if not found
     */
    getInvariant(id: string): SystemInvariant | null;
    /**
     * Update an existing invariant
     *
     * @param id - Invariant ID
     * @param updates - Partial invariant updates
     */
    updateInvariant(id: string, updates: Partial<SystemInvariant>): void;
    /**
     * Enable an invariant
     *
     * @param id - Invariant ID
     */
    enableInvariant(id: string): void;
    /**
     * Disable an invariant
     *
     * @param id - Invariant ID
     */
    disableInvariant(id: string): void;
    /**
     * Evaluate an invariant assertion
     *
     * @param invariant - Invariant to evaluate
     * @param context - Optional context for assertion evaluation
     * @returns Violation if invariant failed, null if passed
     */
    evaluateAssertion(invariant: SystemInvariant, context?: Record<string, any>): InvariantViolation | null;
    /**
     * Evaluate all enabled invariants
     *
     * @returns Array of violations from all invariants
     */
    evaluateAllInvariants(): InvariantViolation[];
    /**
     * Register a self-healing action for an invariant
     *
     * @param invariantId - ID of the invariant to attach healing to
     * @param action - Healing action configuration
     * @returns Trigger ID
     */
    registerHealingAction(invariantId: string, action: Omit<SelfHealingAction, 'triggerId' | 'invariantId' | 'executed'>): string;
    /**
     * Execute self-healing for a violation
     *
     * @param violation - Invariant violation that triggered healing
     * @returns Executed healing action
     */
    executeSelfHealing(violation: InvariantViolation): Promise<SelfHealingAction>;
    /**
     * Start monitoring a specific invariant
     *
     * @param invariantId - ID of the invariant to monitor
     */
    startMonitoring(invariantId: string): void;
    /**
     * Stop monitoring a specific invariant
     *
     * @param invariantId - ID of the invariant to stop monitoring
     */
    stopMonitoring(invariantId: string): void;
    /**
     * Start monitoring all enabled invariants
     */
    startAllMonitoring(): void;
    /**
     * Stop monitoring all invariants
     */
    stopAllMonitoring(): void;
    /**
     * Get violations with optional filters
     *
     * @param filters - Optional filters
     * @returns Filtered array of violations
     */
    getViolations(filters?: {
        invariantId?: string;
        severity?: string;
        since?: Date;
    }): InvariantViolation[];
    /**
     * Get violation statistics
     *
     * @returns Violation statistics
     */
    getViolationStats(): {
        total: number;
        byCategory: Record<string, number>;
        bySeverity: Record<string, number>;
        healingSuccessRate: number;
    };
    /**
     * Integrate with anomaly detection system
     * Sets up event listeners to detect anomalous violation patterns
     */
    integrateWithAnomalyDetection(): void;
    /**
     * Detect if the current violation pattern is anomalous
     *
     * @returns Whether the violation pattern is anomalous
     */
    detectAnomalousViolationPattern(): boolean;
    /**
     * Get all registered invariants
     */
    getInvariants(): Map<string, SystemInvariant>;
    /**
     * Get healing action history
     */
    getHealingHistory(): SelfHealingAction[];
    /**
     * Get currently monitored invariant IDs
     */
    getMonitoredInvariants(): string[];
    /**
     * Reset all state
     */
    reset(): void;
    private generateTriggerId;
    private calculateViolationSeverity;
    private feedAnomalyDetector;
    private executeHealingAction;
}
/**
 * Factory function to create an InvariantMonitor
 * @param anomalyDetector - Optional SonaAnomalyDetector instance
 * @returns Configured InvariantMonitor instance
 */
export declare function createInvariantMonitor(anomalyDetector?: SonaAnomalyDetector): InvariantMonitor;
/**
 * Common invariant templates for quick setup
 */
export declare const INVARIANT_TEMPLATES: {
    /**
     * Memory usage invariant - triggers when memory exceeds threshold
     */
    memoryUsage: (thresholdPercent?: number) => Omit<SystemInvariant, "id">;
    /**
     * Response time invariant - triggers when response time exceeds threshold
     */
    responseTime: (thresholdMs?: number) => Omit<SystemInvariant, "id">;
    /**
     * Error rate invariant - triggers when error rate exceeds threshold
     */
    errorRate: (thresholdPercent?: number) => Omit<SystemInvariant, "id">;
    /**
     * Database connection invariant - ensures database connectivity
     */
    databaseConnection: () => Omit<SystemInvariant, "id">;
    /**
     * Data consistency invariant - checks for data integrity issues
     */
    dataConsistency: () => Omit<SystemInvariant, "id">;
    /**
     * Authentication invariant - ensures auth system is functional
     */
    authenticationHealth: () => Omit<SystemInvariant, "id">;
};
//# sourceMappingURL=invariant-monitor.d.ts.map