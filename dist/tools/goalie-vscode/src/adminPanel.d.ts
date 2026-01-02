import * as vscode from "vscode";
/**
 * Enhanced Goalie Admin Panel with WSJF, OAuth, and Circle Configuration
 */
export declare class GoalieAdminPanel {
    private readonly workspaceRoot?;
    static currentPanel: GoalieAdminPanel | undefined;
    private readonly _panel;
    private readonly _extensionUri;
    private _disposables;
    private static readonly OAUTH_DOMAINS;
    private static readonly CIRCLE_TIERS;
    static createOrShow(extensionUri: vscode.Uri, workspaceRoot?: string): void;
    private constructor();
    dispose(): void;
    private _handleMessage;
    private _saveConfig;
    private _handleOAuthSignIn;
    private _runFederationCommand;
    private _runProdCycle;
    private _calculateWsjf;
    private _saveCircleConfig;
    private _update;
    private _getConfig;
    private _getGoalieStatus;
    private _getHtmlForWebview;
}
/**
 * Factory function for creating admin panel
 */
export declare function createAdminPanel(context: vscode.ExtensionContext, workspaceRoot?: string): void;
//# sourceMappingURL=adminPanel.d.ts.map