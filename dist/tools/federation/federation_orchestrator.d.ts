import type { FederationConfig } from './federation_config.js';
export declare class FederationOrchestrator {
    private config;
    private agents;
    private scheduledTasks;
    private healthMonitorInterval?;
    private schedulerInterval?;
    private isShuttingDown;
    constructor(config: FederationConfig);
    /**
     * Start the federation orchestrator
     */
    start(): Promise<void>;
    /**
     * Stop the federation orchestrator
     */
    stop(): Promise<void>;
    /**
     * Initialize agents from configuration
     */
    private initializeAgents;
    /**
     * Setup scheduled tasks
     */
    private setupScheduledTasks;
    /**
     * Start an agent
     */
    private startAgent;
    /**
     * Stop an agent
     */
    private stopAgent;
    /**
     * Handle agent failure
     */
    private handleAgentFailure;
    /**
     * Start health monitoring
     */
    private startHealthMonitoring;
    /**
     * Perform health checks for all agents
     */
    private performHealthChecks;
    /**
     * Start scheduler for periodic tasks
     */
    private startScheduler;
    /**
     * Check and execute scheduled tasks
     */
    private checkScheduledTasks;
    /**
     * Execute a scheduled task
     */
    private executeScheduledTask;
    /**
     * Run a command and return result
     */
    private runCommand;
    /**
     * Log metrics result to .goalie/metrics_log.jsonl
     */
    private logMetricsResult;
    /**
     * Log health status
     */
    private logHealthStatus;
    /**
     * Log federation events
     */
    private logFederationEvent;
    /**
     * Validate configuration
     */
    private validateConfiguration;
    /**
     * Substitute environment variables in strings
     */
    private substituteEnvVars;
    /**
     * Setup signal handlers for graceful shutdown
     */
    private setupSignalHandlers;
}
/**
 * Main entry point
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=federation_orchestrator.d.ts.map