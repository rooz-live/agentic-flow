/**
 * Federation Configuration for Agentic-Flow
 *
 * This configuration manages:
 * - Periodic execution of governance and retro coach agents
 * - Integration with agentic-jujutsu commands
 * - WSJF and prod-cycle scheduling
 * - Health monitoring and restart capabilities
 */
export interface FederationAgentConfig {
    /** Agent name */
    name: string;
    /** Agent script path */
    scriptPath: string;
    /** Enable/disable agent */
    enabled: boolean;
    /** Execution interval in minutes */
    intervalMinutes: number;
    /** Command line arguments */
    args: string[];
    /** Environment variables */
    env: Record<string, string>;
    /** Health check endpoint/command */
    healthCheck: string;
    /** Restart on failure */
    restartOnFailure: boolean;
    /** Max restart attempts */
    maxRestartAttempts: number;
}
export interface FederationScheduleConfig {
    /** WSJF calculation schedule */
    wsjfSchedule: {
        enabled: boolean;
        intervalMinutes: number;
        command: string;
        args: string[];
    };
    /** Prod-cycle schedule */
    prodCycleSchedule: {
        enabled: boolean;
        intervalMinutes: number;
        command: string;
        args: string[];
    };
    /** Agentic-jujutsu integration */
    agenticJujutsuIntegration: {
        enabled: boolean;
        statusIntervalMinutes: number;
        analyzeIntervalMinutes: number;
        prePostSteps: boolean;
    };
}
export interface FederationOutputConfig {
    /** Metrics output configuration */
    metrics: {
        /** Write to .goalie/pattern_metrics.jsonl */
        patternMetrics: boolean;
        /** Write to .goalie/metrics_log.jsonl */
        metricsLog: boolean;
        /** Write to .goalie/governance_output_*.json */
        governanceOutput: boolean;
    };
    /** Structured output format */
    outputFormat: 'jsonl' | 'json' | 'yaml';
    /** Retention policy in days */
    retentionDays: number;
}
export interface FederationConfig {
    /** Configuration version */
    version: string;
    /** Goalie directory path */
    goalieDir: string;
    /** Agents configuration */
    agents: {
        governance: FederationAgentConfig;
        retroCoach: FederationAgentConfig;
    };
    /** Scheduling configuration */
    schedule: FederationScheduleConfig;
    /** Output configuration */
    output: FederationOutputConfig;
    /** Health monitoring */
    healthMonitoring: {
        enabled: boolean;
        checkIntervalMinutes: number;
        logPath: string;
        alertThresholds: {
            failureRate: number;
            responseTime: number;
        };
    };
    /** Federation startup */
    startup: {
        validateEnvironment: boolean;
        checkDependencies: boolean;
        startAgents: boolean;
        enableHealthMonitoring: boolean;
    };
}
/**
 * Default federation configuration
 */
export declare const DEFAULT_FEDERATION_CONFIG: FederationConfig;
/**
 * Load federation configuration from file
 */
export declare function loadFederationConfig(configPath?: string): FederationConfig;
/**
 * Save federation configuration to file
 */
export declare function saveFederationConfig(config: FederationConfig, configPath?: string): void;
/**
 * Validate federation configuration
 */
export declare function validateFederationConfig(config: FederationConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Substitute environment variables in configuration values
 */
export declare function substituteEnvVars(value: string): string;
//# sourceMappingURL=federation_config.d.ts.map