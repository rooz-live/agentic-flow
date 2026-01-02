import { ProcessMetrics } from './processFlowMetricsProvider';
/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
    /** Metric name */
    metric: string;
    /** Red threshold (critical) */
    redThreshold: number;
    /** Amber threshold (warning) */
    amberThreshold: number;
    /** Target value */
    targetValue: number;
    /** Comparison direction */
    direction: 'higher-is-better' | 'lower-is-better';
    /** Alert message template */
    messageTemplate: string;
    /** Alert severity */
    severity: 'critical' | 'warning' | 'info';
}
/**
 * Enhanced alert with additional metadata
 */
export interface EnhancedAlert {
    /** Metric name */
    metric: string;
    /** Current value */
    currentValue: number;
    /** Target value */
    targetValue: number;
    /** Alert status */
    status: 'red' | 'amber' | 'green';
    /** Alert message */
    message: string;
    /** Alert severity */
    severity: 'critical' | 'warning' | 'info';
    /** Timestamp when alert was triggered */
    timestamp: Date;
    /** Historical trend */
    trend?: 'improving' | 'degrading' | 'stable';
    /** Previous values for trend analysis */
    previousValues?: number[];
    /** Alert ID for deduplication */
    alertId: string;
    /** Whether alert has been acknowledged */
    acknowledged: boolean;
    /** Notification sent flag */
    notificationSent: boolean;
}
/**
 * Alert configuration for different metric categories
 */
export interface AlertConfiguration {
    /** Process metrics thresholds */
    processMetrics: AlertThreshold[];
    /** Flow metrics thresholds */
    flowMetrics: AlertThreshold[];
    /** Learning metrics thresholds */
    learningMetrics: AlertThreshold[];
    /** Kanban metrics thresholds */
    kanbanMetrics: AlertThreshold[];
    /** Pattern metrics thresholds */
    patternMetrics: AlertThreshold[];
    /** Global alert settings */
    globalSettings: {
        /** Enable desktop notifications */
        enableNotifications: boolean;
        /** Notification cooldown in minutes */
        notificationCooldown: number;
        /** Enable sound alerts */
        enableSoundAlerts: boolean;
        /** Auto-acknowledge info-level alerts */
        autoAcknowledgeInfo: boolean;
        /** Maximum alerts per category */
        maxAlertsPerCategory: number;
        /** Alert history retention in days */
        alertHistoryRetention: number;
    };
}
/**
 * Alert manager for handling metric deviations and notifications
 */
export declare class AlertManager {
    private alertHistory;
    private lastNotificationTimes;
    private configuration;
    constructor();
    /**
     * Get default alert configuration
     */
    private getDefaultConfiguration;
    /**
     * Load configuration from VSCode settings
     */
    private loadConfiguration;
    /**
     * Evaluate metrics and generate alerts
     */
    evaluateMetrics(metrics: ProcessMetrics | Record<string, number>, category: 'process' | 'flow' | 'learning' | 'pattern' | 'kanban'): EnhancedAlert[];
    /**
     * Get thresholds for a specific category
     */
    private getThresholdsForCategory;
    /**
     * Get metric value from metrics object
     */
    private getMetricValue;
    /**
     * Evaluate a single threshold and generate alert if needed
     */
    private evaluateThreshold;
    /**
     * Get previous values for trend analysis
     */
    private getPreviousValues;
    /**
     * Calculate trend based on previous values
     */
    private calculateTrend;
    /**
     * Send notification for critical alerts
     */
    sendNotification(alert: EnhancedAlert): Promise<void>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string): void;
    /**
     * Get active alerts
     */
    getActiveAlerts(): EnhancedAlert[];
    /**
     * Store alert in history
     */
    storeAlert(alert: EnhancedAlert): void;
    /**
     * Get alert configuration
     */
    getConfiguration(): AlertConfiguration;
    /**
     * Update alert configuration
     */
    updateConfiguration(newConfig: Partial<AlertConfiguration>): void;
    /**
     * Save configuration to VSCode settings
     */
    private saveConfiguration;
    /**
     * Clear old alerts based on retention policy
     */
    cleanupOldAlerts(): void;
}
//# sourceMappingURL=alertManager.d.ts.map