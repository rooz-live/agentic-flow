import * as vscode from 'vscode';
import type { DtDashboardSummaryReadyMessage } from './types/dtCalibration';
export declare class DtCalibrationProvider {
    private readonly workspaceRoot;
    private readonly logger;
    private panel;
    constructor(workspaceRoot: string | undefined, logger: vscode.OutputChannel);
    handleSummaryMessage(message: DtDashboardSummaryReadyMessage): void;
    openDashboardHtml(): Promise<void>;
    runDtE2eCheck(): void;
    private resolveSummaryPath;
    private ensurePanel;
    private renderSummaryHtml;
}
//# sourceMappingURL=dtCalibrationProvider.d.ts.map