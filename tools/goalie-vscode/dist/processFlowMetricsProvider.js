"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessFlowMetricsProvider = exports.ProcessFlowMetricsItem = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const yaml = require("yaml");
class ProcessFlowMetricsItem extends vscode.TreeItem {
    constructor(label, collapsibleState, metric, alert) {
        super(label, collapsibleState);
        this.metric = metric;
        this.alert = alert;
    }
}
exports.ProcessFlowMetricsItem = ProcessFlowMetricsItem;
class ProcessFlowMetricsProvider {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getGoalieDir() {
        const config = vscode.workspace.getConfiguration('goalie');
        const customPath = config.get('directoryPath');
        if (customPath) {
            return customPath;
        }
        if (this.workspaceRoot) {
            return path.join(this.workspaceRoot, '.goalie');
        }
        return undefined;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            const goalieDir = this.getGoalieDir();
            if (!goalieDir) {
                return [];
            }
            if (!element) {
                // Root level - show main categories
                const metrics = yield this.calculateProcessMetrics(goalieDir);
                const alerts = this.generateAlerts(metrics);
                const items = [];
                // Process Metrics Category
                const processItem = new ProcessFlowMetricsItem('Process Metrics', vscode.TreeItemCollapsibleState.Expanded, metrics, undefined);
                processItem.iconPath = new vscode.ThemeIcon('gear');
                items.push(processItem);
                // Flow Metrics Category  
                const flowItem = new ProcessFlowMetricsItem('Flow Metrics', vscode.TreeItemCollapsibleState.Expanded, metrics, undefined);
                flowItem.iconPath = new vscode.ThemeIcon('arrow-circle-right');
                items.push(flowItem);
                // Learning Metrics Category
                const learningItem = new ProcessFlowMetricsItem('Learning Metrics', vscode.TreeItemCollapsibleState.Expanded, metrics, undefined);
                learningItem.iconPath = new vscode.ThemeIcon('book');
                items.push(learningItem);
                // Alerts Category
                if (alerts.length > 0) {
                    const alertsItem = new ProcessFlowMetricsItem(`Alerts (${alerts.length})`, vscode.TreeItemCollapsibleState.Expanded, metrics, undefined);
                    alertsItem.iconPath = new vscode.ThemeIcon('warning');
                    items.push(alertsItem);
                }
                return items;
            }
            if (element.metric) {
                // Show detailed metrics for each category
                const metrics = element.metric;
                const category = element.label;
                switch (category) {
                    case 'Process Metrics':
                        return [
                            this.createMetricItem('Insight → Commit Time', metrics.insightToCommitTime, 'hours', '< 1 hour'),
                            this.createMetricItem('Action Completion Rate', metrics.actionCompletionRate, '%', '> 80%'),
                            this.createMetricItem('Context Switches/Day', metrics.contextSwitchesPerDay, 'count', '< 5'),
                            this.createMetricItem('WIP Violations', metrics.wipViolations, '%', '< 5%')
                        ];
                    case 'Flow Metrics':
                        return [
                            this.createMetricItem('Lead Time', metrics.leadTime, 'days', 'lower is better'),
                            this.createMetricItem('Cycle Time', metrics.cycleTime, 'days', 'lower is better'),
                            this.createMetricItem('Throughput', metrics.throughput, 'items/week', 'higher is better')
                        ];
                    case 'Learning Metrics':
                        return [
                            this.createMetricItem('Experiments/Sprint', metrics.experimentsPerSprint, 'count', '> 3'),
                            this.createMetricItem('Retro → Feature Rate', metrics.retroToFeatureRate, '%', '> 60%'),
                            this.createMetricItem('Learning Implementation Time', metrics.learningImplementationTime, 'days', '< 1 week')
                        ];
                    case `Alerts (${element.alert ? 1 : 0})`:
                        const alerts = this.generateAlerts(element.metric);
                        return alerts.map(alert => {
                            const alertItem = new ProcessFlowMetricsItem(`${alert.metric}: ${alert.currentValue}${this.getUnitForMetric(alert.metric)}`, vscode.TreeItemCollapsibleState.None, element.metric, alert);
                            // Set icon and color based on alert status
                            if (alert.status === 'red') {
                                alertItem.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
                                alertItem.description = alert.message;
                            }
                            else if (alert.status === 'amber') {
                                alertItem.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
                                alertItem.description = alert.message;
                            }
                            else {
                                alertItem.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
                            }
                            alertItem.tooltip = `${alert.metric}\nCurrent: ${alert.currentValue}${this.getUnitForMetric(alert.metric)}\nTarget: ${alert.targetValue}${this.getUnitForMetric(alert.metric)}\n${alert.message}`;
                            return alertItem;
                        });
                }
            }
            return [];
        });
    }
    createMetricItem(label, value, unit, target) {
        const item = new ProcessFlowMetricsItem(`${label}: ${value}${unit}`, vscode.TreeItemCollapsibleState.None);
        item.description = `Target: ${target}`;
        item.tooltip = `${label}\nCurrent: ${value}${unit}\nTarget: ${target}`;
        return item;
    }
    getUnitForMetric(metric) {
        const units = {
            'Insight → Commit Time': 'hours',
            'Action Completion Rate': '%',
            'Context Switches/Day': 'count',
            'WIP Violations': '%',
            'Lead Time': 'days',
            'Cycle Time': 'days',
            'Throughput': 'items/week',
            'Experiments/Sprint': 'count',
            'Retro → Feature Rate': '%',
            'Learning Implementation Time': 'days'
        };
        return units[metric] || '';
    }
    calculateProcessMetrics(goalieDir) {
        return __awaiter(this, void 0, void 0, function* () {
            // Default values
            const metrics = {
                insightToCommitTime: 0.5,
                actionCompletionRate: 85,
                contextSwitchesPerDay: 3,
                leadTime: 2.5,
                cycleTime: 1.8,
                throughput: 5,
                wipViolations: 2,
                experimentsPerSprint: 4,
                retroToFeatureRate: 65,
                learningImplementationTime: 4
            };
            try {
                // Read pattern metrics for calculation
                const patternPath = path.join(goalieDir, 'pattern_metrics.jsonl');
                if (fs.existsSync(patternPath)) {
                    const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
                    // Calculate metrics from pattern data
                    let totalActions = 0;
                    let completedActions = 0;
                    let totalInsightTime = 0;
                    let insightCount = 0;
                    let contextSwitches = 0;
                    let lastDate = new Date(0);
                    let firstDate = new Date();
                    for (const line of lines) {
                        try {
                            const obj = JSON.parse(line);
                            const timestamp = obj.timestamp ? new Date(obj.timestamp) : new Date();
                            if (timestamp > lastDate)
                                lastDate = timestamp;
                            if (timestamp < firstDate)
                                firstDate = timestamp;
                            if (obj.pattern === 'autocommit-shadow') {
                                totalInsightTime += obj.insight_to_commit_time || 0;
                                insightCount++;
                            }
                            if (obj.action_completed) {
                                completedActions++;
                            }
                            totalActions++;
                            if (obj.context_switch) {
                                contextSwitches++;
                            }
                        }
                        catch (_a) {
                            // ignore malformed lines
                        }
                    }
                    // Update metrics with calculated values
                    if (insightCount > 0) {
                        metrics.insightToCommitTime = totalInsightTime / insightCount;
                    }
                    if (totalActions > 0) {
                        metrics.actionCompletionRate = (completedActions / totalActions) * 100;
                    }
                    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysDiff > 0) {
                        metrics.contextSwitchesPerDay = contextSwitches / daysDiff;
                        metrics.throughput = completedActions / (daysDiff / 7); // per week
                    }
                }
                // Read Kanban board for WIP calculations
                const kanbanPath = path.join(goalieDir, 'KANBAN_BOARD.yaml');
                if (fs.existsSync(kanbanPath)) {
                    const kanbanData = yaml.parse(fs.readFileSync(kanbanPath, 'utf8')) || {};
                    const nowItems = (kanbanData.NOW || []).length;
                    const nextItems = (kanbanData.NEXT || []).length;
                    const totalWip = nowItems + nextItems;
                    // Simple WIP violation calculation (assuming WIP limit of 5)
                    metrics.wipViolations = Math.max(0, totalWip - 5) / Math.max(1, totalWip) * 100;
                }
                // Read insights log for learning metrics
                const insightsPath = path.join(goalieDir, 'insights_log.jsonl');
                if (fs.existsSync(insightsPath)) {
                    const lines = fs.readFileSync(insightsPath, 'utf8').split(/\r?\n/).filter(Boolean);
                    let experimentsCount = 0;
                    let retroItems = 0;
                    let featureItems = 0;
                    let totalLearningTime = 0;
                    let learningCount = 0;
                    for (const line of lines) {
                        try {
                            const obj = JSON.parse(line);
                            if (obj.type === 'experiment') {
                                experimentsCount++;
                            }
                            if (obj.type === 'retro_item') {
                                retroItems++;
                            }
                            if (obj.type === 'feature_implemented') {
                                featureItems++;
                            }
                            if (obj.learning_implementation_time) {
                                totalLearningTime += obj.learning_implementation_time;
                                learningCount++;
                            }
                        }
                        catch (_b) {
                            // ignore malformed lines
                        }
                    }
                    if (retroItems > 0) {
                        metrics.retroToFeatureRate = (featureItems / retroItems) * 100;
                    }
                    metrics.experimentsPerSprint = experimentsCount;
                    if (learningCount > 0) {
                        metrics.learningImplementationTime = totalLearningTime / learningCount;
                    }
                }
            }
            catch (error) {
                console.error('Error calculating process metrics:', error);
            }
            return metrics;
        });
    }
    generateAlerts(metrics) {
        const alerts = [];
        // Process alerts
        if (metrics.insightToCommitTime > 1) {
            alerts.push({
                metric: 'Insight → Commit Time',
                currentValue: metrics.insightToCommitTime,
                targetValue: 1,
                status: 'red',
                message: 'Insights taking too long to commit'
            });
        }
        if (metrics.actionCompletionRate < 80) {
            alerts.push({
                metric: 'Action Completion Rate',
                currentValue: metrics.actionCompletionRate,
                targetValue: 80,
                status: metrics.actionCompletionRate < 60 ? 'red' : 'amber',
                message: 'Low action completion rate'
            });
        }
        if (metrics.contextSwitchesPerDay > 5) {
            alerts.push({
                metric: 'Context Switches/Day',
                currentValue: metrics.contextSwitchesPerDay,
                targetValue: 5,
                status: metrics.contextSwitchesPerDay > 8 ? 'red' : 'amber',
                message: 'Too many context switches'
            });
        }
        if (metrics.wipViolations > 5) {
            alerts.push({
                metric: 'WIP Violations',
                currentValue: metrics.wipViolations,
                targetValue: 5,
                status: metrics.wipViolations > 10 ? 'red' : 'amber',
                message: 'WIP limits exceeded'
            });
        }
        // Learning alerts
        if (metrics.experimentsPerSprint < 3) {
            alerts.push({
                metric: 'Experiments/Sprint',
                currentValue: metrics.experimentsPerSprint,
                targetValue: 3,
                status: 'amber',
                message: 'Low experiment count'
            });
        }
        if (metrics.retroToFeatureRate < 60) {
            alerts.push({
                metric: 'Retro → Feature Rate',
                currentValue: metrics.retroToFeatureRate,
                targetValue: 60,
                status: metrics.retroToFeatureRate < 40 ? 'red' : 'amber',
                message: 'Low retro to feature conversion'
            });
        }
        if (metrics.learningImplementationTime > 7) {
            alerts.push({
                metric: 'Learning Implementation Time',
                currentValue: metrics.learningImplementationTime,
                targetValue: 7,
                status: metrics.learningImplementationTime > 14 ? 'red' : 'amber',
                message: 'Learning implementation taking too long'
            });
        }
        return alerts;
    }
}
exports.ProcessFlowMetricsProvider = ProcessFlowMetricsProvider;
//# sourceMappingURL=processFlowMetricsProvider.js.map