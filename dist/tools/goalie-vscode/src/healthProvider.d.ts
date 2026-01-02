import * as vscode from 'vscode';
export declare class GoalieHealthProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private workspaceRoot;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | vscode.TreeItem | undefined>;
    constructor(workspaceRoot: string | undefined);
    refresh(): void;
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem;
    getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]>;
    private getProcessHealth;
    private createHealthItem;
}
//# sourceMappingURL=healthProvider.d.ts.map