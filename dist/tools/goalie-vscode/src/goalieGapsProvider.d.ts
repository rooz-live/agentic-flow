import * as vscode from 'vscode';
export type GapSessionStats = {
    expands?: number;
    quickFixes?: number;
};
export interface GoalieGapContext {
    pattern: string;
    circle: string;
    depth: number;
    codAvg?: number;
    workloads: string[];
    isGap: boolean;
}
export declare class GoalieGapItem extends vscode.TreeItem {
    readonly gapContext: GoalieGapContext;
    constructor(label: string, gapContext: GoalieGapContext);
}
export declare class GoalieGapsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private readonly workspaceRoot;
    private readonly logger;
    private readonly sessionStats?;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | vscode.TreeItem>;
    private currentLens;
    constructor(workspaceRoot: string | undefined, logger: vscode.OutputChannel, sessionStats?: Map<string, GapSessionStats>);
    refresh(): void;
    setLens(lens: 'ALL' | 'ML' | 'HPC' | 'STATS_DEVICE'): void;
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem;
    private getGoalieDir;
    getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]>;
}
//# sourceMappingURL=goalieGapsProvider.d.ts.map