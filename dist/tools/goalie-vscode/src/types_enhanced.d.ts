/**
 * Enhanced types for the Goalie VS Code Extension
 *
 * This file contains type definitions for the enhanced VS Code extension
 * with WSJF integration, real-time updates, and advanced analytics capabilities.
 */
import * as vscode from 'vscode';
export type KanbanSection = 'NOW' | 'NEXT' | 'LATER';
export interface KanbanEntry {
    id?: string;
    title?: string;
    summary?: string;
    filePath?: string;
    metrics?: string[];
    [key: string]: any;
}
export interface WSJFResult {
    [key: string]: any;
}
export interface BatchRecommendation {
    [key: string]: any;
}
export interface RiskAssessment {
    [key: string]: any;
}
export interface AnalyticsSummary {
    [key: string]: any;
}
export interface BatchExecutionPlan {
    [key: string]: any;
}
export interface BatchExecutionResult {
    [key: string]: any;
}
/**
 * Enhanced Kanban entry with WSJF and risk information
 */
export interface EnhancedKanbanEntry extends KanbanEntry {
    /** WSJF score for prioritization */
    wsjfScore?: number;
    /** Risk level (1-10) */
    riskLevel?: number;
    /** Batch recommendation */
    batchRecommendation?: BatchRecommendation;
    /** Estimated duration in hours */
    estimatedDuration?: number;
    /** Resource requirements */
    resourceRequirements?: {
        cpu?: number;
        memory?: number;
        storage?: number;
        network?: number;
    };
    /** Approval status */
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'auto-approved';
    /** Dependencies */
    dependencies?: string[];
    /** Last updated timestamp */
    lastUpdated?: string;
    /** Economic impact */
    economicImpact?: {
        costOfDelay: number;
        userBusinessValue: number;
        timeCriticality: number;
        riskReduction: number;
    };
    /** Performance metrics */
    performanceMetrics?: {
        successRate: number;
        averageExecutionTime: number;
        errorRate: number;
    };
}
/**
 * Pattern metrics data with enhanced analytics
 */
export interface PatternMetricsData {
    /** Pattern identifier */
    pattern: string;
    /** Pattern category */
    category: string;
    /** Occurrence count */
    count: number;
    /** Average Cost of Delay */
    codAvg: number;
    /** Average WSJF score */
    wsjfAvg?: number;
    /** Trend direction */
    trend: 'improving' | 'degrading' | 'stable';
    /** Risk level (1-10) */
    riskLevel: number;
    /** Last updated timestamp */
    lastUpdated: string;
    /** Economic impact */
    economicImpact?: number;
    /** Performance metrics */
    performanceMetrics?: {
        resolutionTime: number;
        successRate: number;
        recurrenceRate: number;
    };
    /** Historical data points */
    historicalData?: Array<{
        timestamp: string;
        count: number;
        codAvg: number;
        wsjfAvg?: number;
        riskLevel: number;
    }>;
}
/**
 * Batch execution state management
 */
export interface BatchExecutionState {
    /** Currently executing batch plans */
    activePlans: Map<string, BatchExecutionPlan>;
    /** Execution history */
    history: BatchExecutionResult[];
    /** Approval queue */
    approvalQueue: Array<{
        id: string;
        planId: string;
        item: EnhancedKanbanEntry;
        requestedBy: string;
        requestedAt: string;
        status: 'pending' | 'approved' | 'rejected';
        reviewedBy?: string;
        reviewedAt?: string;
        reviewNotes?: string;
    }>;
    /** Configuration settings */
    config: {
        autoApproveLowRisk: boolean;
        riskThreshold: number;
        maxConcurrentBatches: number;
        batchTimeout: number;
    };
}
/**
 * Chart data for visualization
 */
export interface ChartData {
    /** Chart type */
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'doughnut' | 'radar';
    /** Chart data points */
    data: any[];
    /** Chart title */
    title: string;
    /** Chart description */
    description: string;
    /** Chart configuration */
    config?: {
        colors?: string[];
        xAxis?: string;
        yAxis?: string;
        legend?: boolean;
        animation?: boolean;
    };
}
/**
 * Visualization panel configuration
 */
export interface VisualizationPanel {
    /** Panel identifier */
    id: string;
    /** Panel title */
    title: string;
    /** Chart data */
    charts: ChartData[];
    /** Last updated */
    lastUpdated: string;
    /** Refresh interval in milliseconds */
    refreshInterval?: number;
    /** Auto-refresh enabled */
    autoRefresh?: boolean;
}
/**
 * Real-time update message types
 */
export interface RealtimeUpdateMessage {
    /** Message type */
    type: 'kanban-update' | 'pattern-metrics-update' | 'batch-update' | 'analytics-update' | 'wsjf-update';
    /** Message payload */
    payload: any;
    /** Timestamp */
    timestamp: string;
    /** Source identifier */
    source: string;
}
/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
    /** Socket path */
    socketPath: string;
    /** Connection timeout */
    timeout: number;
    /** Reconnect interval */
    reconnectInterval: number;
    /** Maximum reconnect attempts */
    maxReconnectAttempts: number;
    /** Enable debug logging */
    debug?: boolean;
}
/**
 * Extension configuration
 */
export interface ExtensionConfig {
    /** Kanban configuration */
    kanban: {
        wipLimits: Record<KanbanSection, number>;
        autoRefresh: boolean;
        refreshInterval: number;
    };
    /** Analytics configuration */
    analytics: {
        autoRefresh: boolean;
        refreshInterval: number;
        chartTypes: string[];
        defaultTimeRange: number;
    };
    /** Batching configuration */
    batching: {
        autoApproveLowRisk: boolean;
        riskThreshold: number;
        maxConcurrentBatches: number;
        batchTimeout: number;
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
    /** Real-time configuration */
    realtime: {
        enabled: boolean;
        socketPath: string;
        timeout: number;
        reconnectInterval: number;
        maxReconnectAttempts: number;
    };
}
/**
 * Analytics dashboard data
 */
export interface AnalyticsDashboardData {
    /** Overall analytics summary */
    summary: AnalyticsSummary;
    /** Chart configurations */
    charts: {
        costDistribution: ChartData;
        riskDistribution: ChartData;
        impactTrends: ChartData;
        performanceMetrics: ChartData;
        wsjfPrioritization: ChartData;
        batchEfficiency: ChartData;
    };
    /** Key performance indicators */
    kpis: {
        overallHealthScore: number;
        totalCostOfDelay: number;
        potentialSavings: number;
        successRate: number;
        averageExecutionTime: number;
        riskMitigationRate: number;
    };
    /** Recommendations */
    recommendations: Array<{
        type: 'priority' | 'risk' | 'efficiency' | 'cost';
        title: string;
        description: string;
        impact: 'high' | 'medium' | 'low';
        actionable: boolean;
    }>;
}
/**
 * Batch execution dashboard data
 */
export interface BatchExecutionDashboardData {
    /** Active execution plans */
    activePlans: Array<{
        id: string;
        name: string;
        status: 'pending' | 'executing' | 'completed' | 'failed';
        progress: number;
        estimatedDuration: number;
        actualDuration?: number;
        items: EnhancedKanbanEntry[];
        risks: RiskAssessment;
    }>;
    /** Execution history */
    history: Array<{
        id: string;
        name: string;
        completedAt: string;
        duration: number;
        itemsCount: number;
        successCount: number;
        failureCount: number;
        errors: string[];
    }>;
    /** Approval queue */
    approvalQueue: Array<{
        id: string;
        planId: string;
        item: EnhancedKanbanEntry;
        requestedBy: string;
        requestedAt: string;
        status: 'pending' | 'approved' | 'rejected';
        riskLevel: number;
        estimatedImpact: number;
    }>;
    /** System metrics */
    metrics: {
        totalExecutions: number;
        successRate: number;
        averageExecutionTime: number;
        riskMitigationRate: number;
        costSavings: number;
    };
}
/**
 * Enhanced tree item for VS Code
 */
export interface EnhancedTreeItem {
    /** Item label */
    label: string;
    /** Item description */
    description?: string;
    /** Item tooltip */
    tooltip?: string;
    /** Context value */
    contextValue?: string;
    /** Icon path */
    iconPath?: vscode.ThemeIcon | vscode.Uri;
    /** Collapsible state */
    collapsibleState?: vscode.TreeItemCollapsibleState;
    /** Command to execute on click */
    command?: vscode.Command;
    /** Additional data */
    data?: any;
}
/**
 * Webview message types
 */
export interface WebviewMessage {
    /** Message type */
    type: string;
    /** Message payload */
    payload?: any;
    /** Message ID for correlation */
    id?: string;
    /** Timestamp */
    timestamp?: string;
}
/**
 * Extension event types
 */
export interface ExtensionEvent {
    /** Event type */
    type: 'data-changed' | 'config-updated' | 'error-occurred' | 'operation-completed';
    /** Event data */
    data?: any;
    /** Error information (if applicable) */
    error?: Error;
    /** Timestamp */
    timestamp: string;
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    /** Operation name */
    operation: string;
    /** Start time */
    startTime: number;
    /** End time */
    endTime: number;
    /** Duration in milliseconds */
    duration: number;
    /** Success status */
    success: boolean;
    /** Error message (if applicable) */
    error?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
}
//# sourceMappingURL=types_enhanced.d.ts.map