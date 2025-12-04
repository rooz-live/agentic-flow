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
exports.DtCalibrationProvider = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
function getWorkspaceRoot() {
    var _a, _b;
    return (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
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
class DtCalibrationProvider {
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
            const msg = (err === null || err === void 0 ? void 0 : err.message) || String(err);
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
            const msg = (err === null || err === void 0 ? void 0 : err.message) || String(err);
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
    openDashboardHtml() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const goalieDir = getGoalieDirFromRoot((_a = this.workspaceRoot) !== null && _a !== void 0 ? _a : getWorkspaceRoot());
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
            yield vscode.env.openExternal(uri);
        });
    }
    runDtE2eCheck() {
        var _a;
        const workspaceRoot = (_a = this.workspaceRoot) !== null && _a !== void 0 ? _a : getWorkspaceRoot();
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
        var _a;
        if (path.isAbsolute(summaryPath)) {
            return summaryPath;
        }
        const workspaceRoot = (_a = this.workspaceRoot) !== null && _a !== void 0 ? _a : getWorkspaceRoot();
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
        var _a, _b;
        const total = typeof summary.total_evaluations === 'number' ? summary.total_evaluations : 0;
        const dateRange = summary.date_range || { start: '', end: '' };
        const top1 = summary.top1_accuracy || {};
        const perCircle = summary.per_circle_stats || {};
        const impact = summary.config_impact || {};
        const perCircleRows = Object.entries(perCircle)
            .map(([circle, stats]) => {
            var _a, _b, _c;
            const s = stats || {};
            return `<tr><td>${circle}</td><td>${(_a = s.p25) !== null && _a !== void 0 ? _a : ''}</td><td>${(_b = s.median) !== null && _b !== void 0 ? _b : ''}</td><td>${(_c = s.p75) !== null && _c !== void 0 ? _c : ''}</td></tr>`;
        })
            .join('\n');
        const impactRows = Object.entries(impact)
            .map(([name, entry]) => {
            var _a, _b, _c;
            const e = entry || {};
            const reasons = e.failure_reasons || {};
            const reasonsText = Array.isArray(reasons)
                ? reasons.join(', ')
                : Object.entries(reasons)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
            return `<tr><td>${name}</td><td>${(_a = e.pass_rate) !== null && _a !== void 0 ? _a : ''}</td><td>${(_b = e.pass_count) !== null && _b !== void 0 ? _b : ''}</td><td>${(_c = e.fail_count) !== null && _c !== void 0 ? _c : ''}</td><td>${reasonsText}</td></tr>`;
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
      <div><strong>Date range:</strong> ${(_a = dateRange.start) !== null && _a !== void 0 ? _a : ''} – ${(_b = dateRange.end) !== null && _b !== void 0 ? _b : ''}</div>
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
exports.DtCalibrationProvider = DtCalibrationProvider;
//# sourceMappingURL=dtCalibrationProvider.js.map