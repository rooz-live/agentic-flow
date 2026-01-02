/**
 * Goalie Integration Layer
 *
 * This module provides integration between the automated governance agents,
 * WSJF prioritization, risk-aware batching, and the VS Code extension.
 * It serves as the central hub for coordinating all components.
 */
import { EventEmitter } from 'events';
/**
 * Integration configuration
 */
interface IntegrationConfig {
    /** Goalie directory path */
    goalieDir: string;
    /** WebSocket configuration */
    websocket: {
        enabled: boolean;
        port: number;
        host: string;
    };
    /** Auto-refresh intervals */
    refreshIntervals: {
        kanban: number;
        analytics: number;
        patterns: number;
    };
    /** Batching configuration */
    batching: {
        enabled: boolean;
        autoApproveLowRisk: boolean;
        riskThreshold: number;
        maxConcurrentBatches: number;
    };
    /** WSJF configuration */
    wsjf: {
        enabled: boolean;
        weights: {
            userBusinessValue: number;
            timeCriticality: number;
            riskReduction: number;
            jobDuration: number;
        };
    };
}
/**
 * Goalie Integration Manager
 *
 * Central coordinator for all Goalie components and VS Code extension integration
 */
export declare class GoalieIntegrationManager extends EventEmitter {
    private config;
    private governanceAgent;
    private retroCoach;
    private wsjfCalculator;
    private analytics;
    private batchingSystem;
    private refreshTimers;
    private isRunning;
    constructor(config?: Partial<IntegrationConfig>);
    /**
     * Initialize all components
     */
    private initializeComponents;
    /**
     * Set up event handlers for component integration
     */
    private setupEventHandlers;
    /**
     * Start the integration manager
     */
    start(): Promise<void>;
    /**
     * Stop the integration manager
     */
    stop(): Promise<void>;
    /**
     * Start periodic refresh timers
     */
    private startRefreshTimers;
    /**
     * Perform initial data synchronization
     */
    private performInitialSync;
    /**
     * Refresh Kanban board with latest data
     */
    private refreshKanbanBoard;
    /**
     * Refresh analytics data
     */
    private refreshAnalytics;
    /**
     * Refresh pattern metrics
     */
    private refreshPatternMetrics;
    /**
     * Load and enhance Kanban entries with WSJF and risk data
     */
    private enhanceKanbanEntries;
    /**
     * Calculate WSJF scores for patterns
     */
    private calculatePatternWSJF;
    /**
     * Handle governance action from agent
     */
    private handleGovernanceAction;
    /**
     * Handle retro completion from coach
     */
    private handleRetroCompleted;
    /**
     * Handle batch execution from batching system
     */
    private handleBatchExecuted;
    /**
     * Handle analytics update
     */
    private handleAnalyticsUpdated;
    /**
     * Load Kanban data from file
     */
    private loadKanbanData;
    /**
     * Save Kanban data to file
     */
    private saveKanbanData;
    /**
     * Load pattern data from file
     */
    private loadPatternData;
    /**
     * Save pattern metrics to file
     */
    private savePatternMetrics;
    /**
     * Load batch history
     */
    private loadBatchHistory;
    /**
     * Check for pending batch executions
     */
    private checkPendingBatches;
    /**
     * Start WebSocket server for real-time updates
     */
    private startWebSocketServer;
    /**
     * Stop WebSocket server
     */
    private stopWebSocketServer;
    /**
     * Send WebSocket update to connected clients
     */
    private sendWebSocketUpdate;
    /**
     * Load Kanban board (alias for refreshKanbanBoard)
     */
    private loadKanbanBoard;
    /**
     * Load pattern metrics (alias for refreshPatternMetrics)
     */
    private loadPatternMetrics;
    /**
     * Generate analytics (alias for refreshAnalytics)
     */
    private generateAnalytics;
    /**
     * Get current integration status
     */
    getStatus(): {
        isRunning: boolean;
        components: {
            governanceAgent: boolean;
            retroCoach: boolean;
            wsjfCalculator: boolean;
            analytics: boolean;
            batchingSystem: boolean;
        };
        lastUpdate: string;
    };
}
/**
 * Export the integration manager as default
 */
export default GoalieIntegrationManager;
//# sourceMappingURL=goalie_integration.d.ts.map