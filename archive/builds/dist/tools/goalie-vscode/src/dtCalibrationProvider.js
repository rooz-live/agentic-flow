import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
function getWorkspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
function getGoalieDirFromRoot(workspaceRoot) {
    const config = vscode.workspace.getConfiguration('goalie');
    const customPath = config.get('directoryPath');
    if (customPath) {
        return customPath;
    }
    if (!workspaceRoot) {
        return undefined;
    }
    const repoRoot = path.join(workspaceRoot, 'investing', 'agentic-flow');
    const base = fs.existsSync(repoRoot) ? repoRoot : workspaceRoot;
    return path.join(base, '.goalie');
}
export class DtCalibrationProvider {
    workspaceRoot;
    logger;
    panel;
    constructor(workspaceRoot, logger) {
        this.workspaceRoot = workspaceRoot;
        this.logger = logger;
    }
    handleSummaryMessage(message) {
        const summaryPath = this.resolveSummaryPath(message.summaryPath);
        if (!summaryPath) {
            this.logger.appendLine('[DT] Unable to resolve summaryPath from DtDashboardSummaryReadyMessage.');
            vscode.window.showWarningMessage('DT Calibration: could not resolve dt_evaluation_summary.json path.');
            return;
        }
        let raw;
        try {
            raw = fs.readFileSync(summaryPath, 'utf8');
        }
        catch (err) {
            const msg = err?.message || String(err);
            this.logger.appendLine(`[DT] Failed to read summary JSON at ${summaryPath}: ${msg}`);
            vscode.window.showErrorMessage('DT Calibration: failed to read dt_evaluation_summary.json.');
            return;
        }
        let summary;
        try {
            const parsed = JSON.parse(raw);
            summary = parsed;
        }
        catch (err) {
            const msg = err?.message || String(err);
            this.logger.appendLine(`[DT] Failed to parse summary JSON at ${summaryPath}: ${msg}`);
            vscode.window.showErrorMessage('DT Calibration: invalid dt_evaluation_summary.json.');
            return;
        }
        this.ensurePanel();
        if (!this.panel) {
            return;
        }
        this.panel.webview.html = this.renderSummaryHtml(summary, summaryPath);
        this.panel.reveal(vscode.ViewColumn.Beside);
    }
    async openDashboardHtml() {
        const goalieDir = getGoalieDirFromRoot(this.workspaceRoot ?? getWorkspaceRoot());
        if (!goalieDir) {
            vscode.window.showInformationMessage('DT Calibration: .goalie directory not found. Run af dt-dashboard first.');
            return;
        }
        const htmlPath = path.join(goalieDir, 'dt_evaluation_dashboard.html');
        if (!fs.existsSync(htmlPath)) {
            vscode.window.showInformationMessage('DT Calibration: dt_evaluation_dashboard.html not found. Run af dt-dashboard to generate it.');
            return;
        }
        const uri = vscode.Uri.file(htmlPath);
        await vscode.env.openExternal(uri);
    }
    runDtE2eCheck() {
        const workspaceRoot = this.workspaceRoot ?? getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('DT Calibration: no workspace open.');
            return;
        }
        let cwd = workspaceRoot;
        const repoRoot = path.join(workspaceRoot, 'investing', 'agentic-flow');
        if (fs.existsSync(repoRoot)) {
            cwd = repoRoot;
        }
        const afScript = path.join(cwd, 'scripts', 'af');
        const usesRepoScript = fs.existsSync(afScript);
        const terminal = vscode.window.createTerminal({
            name: 'Goalie DT Calibration',
            cwd,
        });
        const command = usesRepoScript
            ? './scripts/af dt-e2e-check --skip-prod-cycle'
            : 'af dt-e2e-check --skip-prod-cycle';
        this.logger.show(true);
        this.logger.appendLine(`[DT] Running DT calibration E2E check: ${command} (cwd=${cwd})`);
        terminal.sendText(command);
        terminal.show(true);
    }
    resolveSummaryPath(summaryPath) {
        if (path.isAbsolute(summaryPath)) {
            return summaryPath;
        }
        const workspaceRoot = this.workspaceRoot ?? getWorkspaceRoot();
        if (!workspaceRoot) {
            return undefined;
        }
        if (summaryPath.startsWith('.goalie/')) {
            const repoRoot = path.join(workspaceRoot, 'investing', 'agentic-flow');
            const base = fs.existsSync(repoRoot) ? repoRoot : workspaceRoot;
            return path.join(base, summaryPath);
        }
        return path.join(workspaceRoot, summaryPath);
    }
    ensurePanel() {
        if (this.panel) {
            return;
        }
        this.panel = vscode.window.createWebviewPanel('dtCalibrationSummary', 'DT Calibration Summary', vscode.ViewColumn.Beside, {
            enableScripts: false,
        });
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, []);
    }
    renderSummaryHtml(summary, summaryPath) {
        const total = typeof summary.total_evaluations === 'number' ? summary.total_evaluations : 0;
        const dateRange = summary.date_range || { start: '', end: '' };
        const top1 = summary.top1_accuracy || {};
        const perCircle = summary.per_circle_stats || {};
        const impact = summary.config_impact || {};
        const perCircleRows = Object.entries(perCircle)
            .map(([circle, stats]) => {
            const s = stats || {};
            return `<tr><td>${circle}</td><td>${s.p25 ?? ''}</td><td>${s.median ?? ''}</td><td>${s.p75 ?? ''}</td></tr>`;
        })
            .join('\n');
        const impactRows = Object.entries(impact)
            .map(([name, entry]) => {
            const e = entry || {};
            const reasons = e.failure_reasons || {};
            const reasonsText = Array.isArray(reasons)
                ? reasons.join(', ')
                : Object.entries(reasons)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
            return `<tr><td>${name}</td><td>${e.pass_rate ?? ''}</td><td>${e.pass_count ?? ''}</td><td>${e.fail_count ?? ''}</td><td>${reasonsText}</td></tr>`;
        })
            .join('\n');
        const top1Stats = [
            ['min', top1.min],
            ['p25', top1.p25],
            ['median', top1.median],
            ['p75', top1.p75],
            ['max', top1.max],
        ]
            .filter(([, v]) => typeof v === 'number')
            .map(([k, v]) => `${k}: ${v.toFixed(3)}`)
            .join(' | ');
        return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>DT Calibration Summary</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      table { border-collapse: collapse; margin-top: 8px; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 4px 6px; font-size: 12px; }
      th { background: #f3f3f3; text-align: left; }
      caption { text-align: left; font-weight: 600; margin-top: 12px; }
      .meta { margin-bottom: 8px; font-size: 12px; color: #555; }
    </style>
  </head>
  <body>
    <h1>DT Calibration Summary</h1>
    <div class="meta">
      <div><strong>Summary file:</strong> ${summaryPath}</div>
      <div><strong>Total evaluations:</strong> ${total}</div>
      <div><strong>Date range:</strong> ${dateRange.start ?? ''} – ${dateRange.end ?? ''}</div>
      <div><strong>Top-1 accuracy:</strong> ${top1Stats}</div>
    </div>

    <table>
      <caption>Per-circle Top-1 Accuracy (p25 / median / p75)</caption>
      <thead>
        <tr><th>Circle</th><th>p25</th><th>median</th><th>p75</th></tr>
      </thead>
      <tbody>
        ${perCircleRows || '<tr><td colspan="4">No per-circle stats available.</td></tr>'}
      </tbody>
    </table>

    <table>
      <caption>Config Impact (Preview of Thresholds)</caption>
      <thead>
        <tr><th>Config</th><th>Pass rate</th><th>Pass</th><th>Fail</th><th>Failure reasons</th></tr>
      </thead>
      <tbody>
        ${impactRows || '<tr><td colspan="5">No config_impact entries recorded.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>`;
    }
}
//# sourceMappingURL=dtCalibrationProvider.js.map