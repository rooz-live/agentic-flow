/**
 * Configuration Drift Monitor
 *
 * Monitors configuration states across environments and detects drift
 * between expected and actual configurations. Supports auto-remediation
 * and drift history tracking.
 *
 * @module structural-diagnostics/drift-monitor
 */
import { EventEmitter } from 'events';
import { ConfigurationState, DriftDetection, ConfigDifference, RemediationAction } from './types.js';
/**
 * ConfigurationDriftMonitor tracks configuration states and detects
 * drift between expected and actual configurations.
 */
export declare class ConfigurationDriftMonitor extends EventEmitter {
    private expectedStates;
    private actualStates;
    private driftHistory;
    private watchIntervals;
    private remediationLog;
    private readonly maxHistorySize;
    /**
     * Create a new ConfigurationDriftMonitor instance
     */
    constructor();
    /**
     * Capture and store expected configuration state
     *
     * @param environment - Environment name (e.g., 'production', 'staging')
     * @param configPath - Path to the configuration
     * @param values - Configuration values
     * @returns Captured configuration state
     */
    captureExpectedState(environment: string, configPath: string, values: Record<string, any>): ConfigurationState;
    /**
     * Capture actual configuration state from the filesystem or environment
     *
     * @param environment - Environment name
     * @param configPath - Path to the configuration file
     * @returns Promise resolving to the captured configuration state
     */
    captureActualState(environment: string, configPath: string): Promise<ConfigurationState>;
    /**
     * Detect drift for a specific configuration
     *
     * @param environment - Environment name
     * @param configPath - Path to the configuration
     * @returns Drift detection result
     */
    detectDrift(environment: string, configPath: string): DriftDetection;
    /**
     * Detect drift for all configurations in an environment
     *
     * @param environment - Environment name
     * @returns Array of drift detection results
     */
    detectAllDrift(environment: string): DriftDetection[];
    /**
     * Calculate differences between expected and actual configurations
     *
     * @param expected - Expected configuration state
     * @param actual - Actual configuration state
     * @returns Array of configuration differences
     */
    calculateDifferences(expected: ConfigurationState, actual: ConfigurationState): ConfigDifference[];
    /**
     * Check if drift can be automatically remediated
     *
     * @param drift - Drift detection result
     * @returns Whether auto-remediation is possible
     */
    canAutoRemediate(drift: DriftDetection): boolean;
    /**
     * Generate a remediation plan for detected drift
     *
     * @param drift - Drift detection result
     * @returns Array of remediation actions
     */
    generateRemediationPlan(drift: DriftDetection): RemediationAction[];
    /**
     * Apply a remediation action
     *
     * @param action - Remediation action to apply
     * @param approver - Optional approver identifier
     */
    applyRemediation(action: RemediationAction, approver?: string): Promise<void>;
    /**
     * Get drift history for an environment
     *
     * @param environment - Environment name
     * @returns Array of drift detections for the environment
     */
    getDriftHistory(environment: string): DriftDetection[];
    /**
     * Get drift trend for an environment
     *
     * @param environment - Environment name
     * @returns Drift rate and average severity
     */
    getDriftTrend(environment: string): {
        driftRate: number;
        avgSeverity: string;
    };
    /**
     * Start watching for drift in an environment
     *
     * @param environment - Environment name
     * @param interval - Check interval in milliseconds
     */
    watchForDrift(environment: string, interval: number): void;
    /**
     * Stop watching for drift in an environment
     *
     * @param environment - Environment name
     */
    stopWatching(environment: string): void;
    /**
     * Get all expected states
     */
    getExpectedStates(): Map<string, ConfigurationState>;
    /**
     * Get all actual states
     */
    getActualStates(): Map<string, ConfigurationState>;
    /**
     * Get remediation log
     */
    getRemediationLog(): RemediationAction[];
    /**
     * Clear all states and stop all watches
     */
    reset(): void;
    private generateConfigId;
    private hashValues;
    private sortObject;
    private deepClone;
    private fileExists;
    private parseConfig;
    private parseSimpleYaml;
    private parseEnvFile;
    private serializeConfig;
    private serializeSimpleYaml;
    private serializeEnvFile;
    private readFromEnvironment;
    private compareObjects;
    private calculateSeverity;
    private isSecuritySensitive;
    private setValueAtPath;
    private deleteValueAtPath;
    private parsePath;
}
/**
 * Factory function to create a ConfigurationDriftMonitor
 * @returns Configured ConfigurationDriftMonitor instance
 */
export declare function createDriftMonitor(): ConfigurationDriftMonitor;
//# sourceMappingURL=drift-monitor.d.ts.map