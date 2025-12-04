import * as vscode from 'vscode';
export interface ProcessMetrics {
    insightToCommitTime: number;
    actionCompletionRate: number;
    contextSwitchesPerDay: number;
    leadTime: number;
    cycleTime: number;
    throughput: number;
    wipViolations: number;
    experimentsPerSprint: number;
    retroToFeatureRate: number;
    learningImplementationTime: number;
}
export interface MetricAlert {
    metric: string;
    currentValue: number;
    targetValue: number;
    status: 'red' | 'amber' | 'green';
    message: string;
}
export declare class ProcessFlowMetricsItem extends vscode.TreeItem {
    readonly metric?: ProcessMetrics | undefined;
    readonly alert?: MetricAlert | undefined;
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, metric?: ProcessMetrics | undefined, alert?: MetricAlert | undefined);
}
export declare class ProcessFlowMetricsProvider implements vscode.TreeDataProvider<ProcessFlowMetricsItem> {
    private readonly workspaceRoot?;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | ProcessFlowMetricsItem | undefined>;
    constructor(workspaceRoot?: string | undefined);
    refresh(): void;
    getTreeItem(element: ProcessFlowMetricsItem): vscode.TreeItem;
    private getGoalieDir;
    getChildren(element?: ProcessFlowMetricsItem): Promise<ProcessFlowMetricsItem[]>;
    private createMetricItem;
    private getUnitForMetric;
    private calculateProcessMetrics;
    private generateAlerts;
}
//# sourceMappingURL=processFlowMetricsProvider.d.ts.map