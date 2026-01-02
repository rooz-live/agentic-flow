import * as vscode from "vscode";
import { GoalieOAuthProvider, OAuthDomain } from "./oauthProvider";
import { AlertManager } from "./alertManager";
import { VirtualScrollProvider } from "./virtualScrollProvider";
/**
 * Goalie Integration Configuration
 */
export interface GoalieIntegrationConfig {
    workspaceRoot: string;
    enableOAuth: boolean;
    enableAlerts: boolean;
    enableVirtualScroll: boolean;
    enableFileWatching: boolean;
    enableTelemetry: boolean;
    goalieDirectory: string;
}
/**
 * Integration state tracking
 */
export interface GoalieIntegrationState {
    initialized: boolean;
    oauthConnected: boolean;
    alertsActive: boolean;
    fileWatcherActive: boolean;
    lastSyncTime: Date | null;
    activeProviders: string[];
    errors: string[];
}
/**
 * Event types for integration events
 */
export type GoalieEventType = "oauth:login" | "oauth:logout" | "alert:triggered" | "alert:acknowledged" | "file:changed" | "data:refreshed" | "provider:ready" | "provider:error" | "sync:started" | "sync:completed";
/**
 * Integration event payload
 */
export interface GoalieEvent {
    type: GoalieEventType;
    timestamp: Date;
    data?: unknown;
    source?: string;
}
/**
 * Pattern metrics data structure
 */
export interface PatternMetric {
    timestamp: string;
    pattern: string;
    circle: string;
    depth: number;
    run_kind: string;
    gate: string;
    tags: string[];
    economic: {
        wsjf_score: number;
        cost_of_delay: number;
        job_duration?: number;
        job_size?: number;
        user_business_value?: number;
    };
    action_completed: boolean;
    reason?: string;
}
/**
 * GoalieIntegration - Main integration class for the Goalie VS Code Extension
 *
 * This class coordinates all the major components of the Goalie extension:
 * - OAuth authentication across multiple domains
 * - Alert management with threshold monitoring
 * - Virtual scrolling for large datasets
 * - File watching with debouncing
 * - State synchronization
 */
export declare class GoalieIntegration implements vscode.Disposable {
    private readonly context;
    private state;
    private config;
    private disposables;
    private oauthProvider;
    private alertManager;
    private fileWatcher;
    private virtualScrollProviders;
    private _onDidChangeState;
    readonly onDidChangeState: vscode.Event<GoalieIntegrationState>;
    private _onDidEmitEvent;
    readonly onDidEmitEvent: vscode.Event<GoalieEvent>;
    private refreshCallbacks;
    private outputChannel;
    constructor(context: vscode.ExtensionContext, config?: Partial<GoalieIntegrationConfig>);
    /**
     * Initialize all integration components
     */
    initialize(): Promise<void>;
    /**
     * Initialize OAuth provider
     */
    private initializeOAuth;
    /**
     * Initialize Alert Manager
     */
    private initializeAlerts;
    /**
     * Initialize Virtual Scroll providers
     */
    private initializeVirtualScroll;
    /**
     * Initialize File Watcher
     */
    private initializeFileWatcher;
    /**
     * Set up periodic alert monitoring
     */
    private setupAlertMonitoring;
    /**
     * Collect current metrics from various sources
     */
    private collectMetrics;
    /**
     * Set up periodic data synchronization
     */
    private setupPeriodicSync;
    /**
     * Synchronize data across providers
     */
    syncData(): Promise<void>;
    /**
     * Register integration commands
     */
    private registerCommands;
    /**
     * Show status panel with current integration state
     */
    private showStatusPanel;
    /**
     * Generate HTML for status panel
     */
    private getStatusHtml;
    /**
     * Get aggregated integration metrics
     */
    private getIntegrationMetrics;
    /**
     * Export metrics to a file
     */
    private exportMetrics;
    /**
     * Reset the integration state
     */
    reset(): Promise<void>;
    /**
     * Register a refresh callback
     */
    addRefreshCallback(callback: () => void): vscode.Disposable;
    /**
     * Get OAuth provider
     */
    getOAuthProvider(): GoalieOAuthProvider | null;
    /**
     * Get Alert Manager
     */
    getAlertManager(): AlertManager | null;
    /**
     * Get Virtual Scroll provider by name
     */
    getVirtualScrollProvider(name: string): VirtualScrollProvider<PatternMetric> | undefined;
    /**
     * Get current state
     */
    getState(): GoalieIntegrationState;
    /**
     * Make authenticated API request
     */
    authenticatedRequest<T>(url: string, options?: RequestInit, domain?: OAuthDomain): Promise<T>;
    /**
     * Update and emit state changes
     */
    private updateState;
    /**
     * Emit an integration event
     */
    private emitEvent;
    /**
     * Log a message
     */
    private log;
    /**
     * Log an error
     */
    private logError;
    /**
     * Dispose all resources
     */
    dispose(): void;
}
/**
 * Factory function to create and initialize Goalie Integration
 */
export declare function createGoalieIntegration(context: vscode.ExtensionContext, config?: Partial<GoalieIntegrationConfig>): Promise<GoalieIntegration>;
//# sourceMappingURL=goalieIntegration.d.ts.map