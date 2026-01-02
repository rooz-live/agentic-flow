import * as vscode from 'vscode';
/**
 * Alert manager for handling metric deviations and notifications
 */
export class AlertManager {
    alertHistory = new Map();
    lastNotificationTimes = new Map();
    configuration;
    constructor() {
        this.configuration = this.getDefaultConfiguration();
        this.loadConfiguration();
    }
    /**
     * Get default alert configuration
     */
    getDefaultConfiguration() {
        return {
            processMetrics: [
                {
                    metric: 'Insight → Commit Time',
                    redThreshold: 2.0,
                    amberThreshold: 1.0,
                    targetValue: 0.5,
                    direction: 'lower-is-better',
                    messageTemplate: 'Insight to commit time is {{value}} hours (target: < {{target}}h)',
                    severity: 'critical'
                },
                {
                    metric: 'Action Completion Rate',
                    redThreshold: 60,
                    amberThreshold: 80,
                    targetValue: 90,
                    direction: 'higher-is-better',
                    messageTemplate: 'Action completion rate is {{value}}% (target: > {{target}}%)',
                    severity: 'warning'
                },
                {
                    metric: 'Context Switches/Day',
                    redThreshold: 8,
                    amberThreshold: 5,
                    targetValue: 3,
                    direction: 'lower-is-better',
                    messageTemplate: 'Context switches per day is {{value}} (target: < {{target}})',
                    severity: 'warning'
                },
                {
                    metric: 'WIP Violations',
                    redThreshold: 10,
                    amberThreshold: 5,
                    targetValue: 2,
                    direction: 'lower-is-better',
                    messageTemplate: 'WIP violations at {{value}}% (target: < {{target}}%)',
                    severity: 'critical'
                }
            ],
            flowMetrics: [
                {
                    metric: 'Lead Time',
                    redThreshold: 5,
                    amberThreshold: 3,
                    targetValue: 2,
                    direction: 'lower-is-better',
                    messageTemplate: 'Lead time is {{value}} days (target: < {{target}}d)',
                    severity: 'warning'
                },
                {
                    metric: 'Cycle Time',
                    redThreshold: 3,
                    amberThreshold: 2,
                    targetValue: 1.5,
                    direction: 'lower-is-better',
                    messageTemplate: 'Cycle time is {{value}} days (target: < {{target}}d)',
                    severity: 'warning'
                },
                {
                    metric: 'Throughput',
                    redThreshold: 2,
                    amberThreshold: 3,
                    targetValue: 5,
                    direction: 'higher-is-better',
                    messageTemplate: 'Throughput is {{value}} items/week (target: > {{target}})',
                    severity: 'critical'
                }
            ],
            learningMetrics: [
                {
                    metric: 'Experiments/Sprint',
                    redThreshold: 1,
                    amberThreshold: 3,
                    targetValue: 4,
                    direction: 'higher-is-better',
                    messageTemplate: 'Experiments per sprint is {{value}} (target: > {{target}})',
                    severity: 'warning'
                },
                {
                    metric: 'Retro → Feature Rate',
                    redThreshold: 40,
                    amberThreshold: 60,
                    targetValue: 75,
                    direction: 'higher-is-better',
                    messageTemplate: 'Retro to feature rate is {{value}}% (target: > {{target}}%)',
                    severity: 'warning'
                },
                {
                    metric: 'Learning Implementation Time',
                    redThreshold: 14,
                    amberThreshold: 7,
                    targetValue: 4,
                    direction: 'lower-is-better',
                    messageTemplate: 'Learning implementation time is {{value}} days (target: < {{target}}d)',
                    severity: 'critical'
                }
            ],
            kanbanMetrics: [
                {
                    metric: 'WIP Limit',
                    redThreshold: 8,
                    amberThreshold: 5,
                    targetValue: 3,
                    direction: 'lower-is-better',
                    messageTemplate: 'WIP count is {{value}} (limit: {{target}})',
                    severity: 'warning'
                },
                {
                    metric: 'Blocker Items',
                    redThreshold: 3,
                    amberThreshold: 1,
                    targetValue: 0,
                    direction: 'lower-is-better',
                    messageTemplate: 'Blocker items count is {{value}} (target: {{target}})',
                    severity: 'critical'
                },
                {
                    metric: 'Aging Items',
                    redThreshold: 14,
                    amberThreshold: 7,
                    targetValue: 3,
                    direction: 'lower-is-better',
                    messageTemplate: 'Items older than {{value}} days (target: < {{target}}d)',
                    severity: 'warning'
                }
            ],
            patternMetrics: [
                {
                    metric: 'Pattern Frequency',
                    redThreshold: 50,
                    amberThreshold: 20,
                    targetValue: 10,
                    direction: 'lower-is-better',
                    messageTemplate: 'High frequency pattern detected: {{value}} occurrences (target: < {{target}})',
                    severity: 'warning'
                },
                {
                    metric: 'Risk Score',
                    redThreshold: 8,
                    amberThreshold: 5,
                    targetValue: 3,
                    direction: 'lower-is-better',
                    messageTemplate: 'Pattern risk score is {{value}} (target: < {{target}})',
                    severity: 'critical'
                },
                {
                    metric: 'Cost of Delay',
                    redThreshold: 1000,
                    amberThreshold: 500,
                    targetValue: 200,
                    direction: 'lower-is-better',
                    messageTemplate: 'Cost of delay is ${{value}} (target: < ${{target}})',
                    severity: 'warning'
                }
            ],
            globalSettings: {
                enableNotifications: true,
                notificationCooldown: 5,
                enableSoundAlerts: false,
                autoAcknowledgeInfo: true,
                maxAlertsPerCategory: 10,
                alertHistoryRetention: 30
            }
        };
    }
    /**
     * Load configuration from VSCode settings
     */
    loadConfiguration() {
        const config = vscode.workspace.getConfiguration('goalie.alerts');
        // Override default configuration with user settings
        if (config.has('processMetrics')) {
            this.configuration.processMetrics = config.get('processMetrics', this.configuration.processMetrics);
        }
        if (config.has('flowMetrics')) {
            this.configuration.flowMetrics = config.get('flowMetrics', this.configuration.flowMetrics);
        }
        if (config.has('learningMetrics')) {
            this.configuration.learningMetrics = config.get('learningMetrics', this.configuration.learningMetrics);
        }
        if (config.has('kanbanMetrics')) {
            this.configuration.kanbanMetrics = config.get('kanbanMetrics', this.configuration.kanbanMetrics);
        }
        if (config.has('patternMetrics')) {
            this.configuration.patternMetrics = config.get('patternMetrics', this.configuration.patternMetrics);
        }
        if (config.has('globalSettings')) {
            this.configuration.globalSettings = {
                ...this.configuration.globalSettings,
                ...config.get('globalSettings', {})
            };
        }
    }
    /**
     * Evaluate metrics and generate alerts
     */
    evaluateMetrics(metrics, category) {
        const thresholds = this.getThresholdsForCategory(category);
        const alerts = [];
        thresholds.forEach(threshold => {
            const value = this.getMetricValue(metrics, threshold.metric);
            if (value !== undefined) {
                const alert = this.evaluateThreshold(threshold, value);
                if (alert) {
                    alerts.push(alert);
                }
            }
        });
        return alerts;
    }
    /**
     * Get thresholds for a specific category
     */
    getThresholdsForCategory(category) {
        switch (category) {
            case 'process':
                return this.configuration.processMetrics;
            case 'flow':
                return this.configuration.flowMetrics;
            case 'learning':
                return this.configuration.learningMetrics;
            case 'pattern':
                return this.configuration.patternMetrics;
            case 'kanban':
                return this.configuration.kanbanMetrics;
            default:
                return [];
        }
    }
    /**
     * Get metric value from metrics object
     */
    getMetricValue(metrics, metricName) {
        switch (metricName) {
            case 'Insight → Commit Time':
                return metrics.insightToCommitTime;
            case 'Action Completion Rate':
                return metrics.actionCompletionRate;
            case 'Context Switches/Day':
                return metrics.contextSwitchesPerDay;
            case 'WIP Violations':
                return metrics.wipViolations;
            case 'Lead Time':
                return metrics.leadTime;
            case 'Cycle Time':
                return metrics.cycleTime;
            case 'Throughput':
                return metrics.throughput;
            case 'Experiments/Sprint':
                return metrics.experimentsPerSprint;
            case 'Retro → Feature Rate':
                return metrics.retroToFeatureRate;
            case 'Learning Implementation Time':
                return metrics.learningImplementationTime;
            // Pattern Metrics
            case 'Pattern Frequency':
                return metrics.total_patterns;
            case 'Risk Score':
                return metrics.wsjf_score;
            case 'Cost of Delay':
                return metrics.cost_of_delay;
            // Kanban Metrics (mapped to generic props if available, or defaults)
            case 'WIP Limit':
                return metrics.wip;
            default:
                return metrics[metricName];
        }
    }
    /**
     * Evaluate a single threshold and generate alert if needed
     */
    evaluateThreshold(threshold, value) {
        let status;
        if (threshold.direction === 'higher-is-better') {
            if (value >= threshold.targetValue) {
                status = 'green';
            }
            else if (value >= threshold.amberThreshold) {
                status = 'amber';
            }
            else {
                status = 'red';
            }
        }
        else {
            if (value <= threshold.targetValue) {
                status = 'green';
            }
            else if (value <= threshold.amberThreshold) {
                status = 'amber';
            }
            else {
                status = 'red';
            }
        }
        // Don't generate alerts for green status unless explicitly configured
        if (status === 'green' && threshold.severity !== 'info') {
            return null;
        }
        const alertId = `${threshold.metric}_${Date.now()}`;
        const message = threshold.messageTemplate
            .replace('{{value}}', value.toString())
            .replace('{{target}}', threshold.targetValue.toString());
        // Get previous values for trend analysis
        const previousValues = this.getPreviousValues(threshold.metric);
        const trend = this.calculateTrend(previousValues, value, threshold.direction);
        return {
            metric: threshold.metric,
            currentValue: value,
            targetValue: threshold.targetValue,
            status,
            message,
            severity: threshold.severity,
            timestamp: new Date(),
            trend,
            previousValues,
            alertId,
            acknowledged: status === 'green' && this.configuration.globalSettings.autoAcknowledgeInfo,
            notificationSent: false
        };
    }
    /**
     * Get previous values for trend analysis
     */
    getPreviousValues(metric) {
        const history = this.alertHistory.get(metric) || [];
        return history.slice(-5).map(alert => alert.currentValue);
    }
    /**
     * Calculate trend based on previous values
     */
    calculateTrend(previousValues, currentValue, direction) {
        if (previousValues.length < 2) {
            return 'stable';
        }
        const recent = previousValues.slice(-3);
        const avgRecent = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const change = ((currentValue - avgRecent) / avgRecent) * 100;
        if (Math.abs(change) < 5) {
            return 'stable';
        }
        if (direction === 'higher-is-better') {
            return change > 0 ? 'improving' : 'degrading';
        }
        else {
            return change < 0 ? 'improving' : 'degrading';
        }
    }
    /**
     * Send notification for critical alerts
     */
    async sendNotification(alert) {
        if (!this.configuration.globalSettings.enableNotifications || alert.notificationSent) {
            return;
        }
        // Check cooldown
        const lastNotification = this.lastNotificationTimes.get(alert.metric);
        if (lastNotification) {
            const cooldownMs = this.configuration.globalSettings.notificationCooldown * 60 * 1000;
            if (Date.now() - lastNotification.getTime() < cooldownMs) {
                return;
            }
        }
        // Only send notifications for red/amber critical alerts
        if (alert.status === 'red' || (alert.status === 'amber' && alert.severity === 'critical')) {
            const message = `[${alert.status.toUpperCase()}] ${alert.metric}: ${alert.message}`;
            if (alert.status === 'red') {
                vscode.window.showErrorMessage(message, 'View Details', 'Acknowledge').then(selection => {
                    if (selection === 'View Details') {
                        // Navigate to relevant view
                        vscode.commands.executeCommand('goalieDashboard.showProcessMetrics');
                    }
                    else if (selection === 'Acknowledge') {
                        this.acknowledgeAlert(alert.alertId);
                    }
                });
            }
            else {
                vscode.window.showWarningMessage(message, 'View Details').then(selection => {
                    if (selection === 'View Details') {
                        vscode.commands.executeCommand('goalieDashboard.showProcessMetrics');
                    }
                });
            }
            // Play sound if enabled
            if (this.configuration.globalSettings.enableSoundAlerts) {
                vscode.commands.executeCommand('vscode.beep');
            }
            alert.notificationSent = true;
            this.lastNotificationTimes.set(alert.metric, new Date());
        }
    }
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId) {
        // Find and acknowledge the alert
        this.alertHistory.forEach((alerts, metric) => {
            const alert = alerts.find(a => a.alertId === alertId);
            if (alert) {
                alert.acknowledged = true;
            }
        });
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        const activeAlerts = [];
        this.alertHistory.forEach((alerts, metric) => {
            const recentAlerts = alerts.filter(alert => {
                const hoursSinceAlert = (Date.now() - alert.timestamp.getTime()) / (1000 * 60 * 60);
                return hoursSinceAlert < 24 && !alert.acknowledged;
            });
            activeAlerts.push(...recentAlerts);
        });
        // Sort by severity and timestamp
        return activeAlerts.sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                return severityOrder[a.severity] - severityOrder[b.severity];
            }
            return b.timestamp.getTime() - a.timestamp.getTime();
        });
    }
    /**
     * Store alert in history
     */
    storeAlert(alert) {
        const metric = alert.metric;
        const history = this.alertHistory.get(metric) || [];
        // Add new alert
        history.push(alert);
        // Limit history size
        const maxHistory = this.configuration.globalSettings.maxAlertsPerCategory;
        if (history.length > maxHistory) {
            history.splice(0, history.length - maxHistory);
        }
        this.alertHistory.set(metric, history);
    }
    /**
     * Get alert configuration
     */
    getConfiguration() {
        return this.configuration;
    }
    /**
     * Update alert configuration
     */
    updateConfiguration(newConfig) {
        this.configuration = { ...this.configuration, ...newConfig };
        this.saveConfiguration();
    }
    /**
     * Save configuration to VSCode settings
     */
    saveConfiguration() {
        const config = vscode.workspace.getConfiguration('goalie');
        config.update('alerts', this.configuration, vscode.ConfigurationTarget.Global);
    }
    /**
     * Clear old alerts based on retention policy
     */
    cleanupOldAlerts() {
        const retentionDays = this.configuration.globalSettings.alertHistoryRetention;
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        this.alertHistory.forEach((alerts, metric) => {
            const filteredAlerts = alerts.filter(alert => alert.timestamp >= cutoffDate);
            this.alertHistory.set(metric, filteredAlerts);
        });
    }
}
//# sourceMappingURL=alertManager.js.map