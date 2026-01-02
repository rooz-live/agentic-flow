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
exports.GoalieHealthProvider = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
class GoalieHealthProvider {
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
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.workspaceRoot) {
                return [];
            }
            const items = [];
            // 1. Check .goalie directory
            const goalieDir = path.join(this.workspaceRoot, '.goalie');
            const hasGoalieDir = fs.existsSync(goalieDir);
            items.push(this.createHealthItem('Goalie Directory', hasGoalieDir, hasGoalieDir ? 'Found' : 'Missing', false, 'goalieHealthDirectory'));
            // 2. Check pattern_metrics.jsonl
            const metricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
            const hasMetrics = fs.existsSync(metricsPath);
            items.push(this.createHealthItem('Pattern Metrics', hasMetrics, hasMetrics ? 'Active' : 'Not Found', false, 'goalieHealthMetrics'));
            // 3. Check CLI (af)
            const afPath = path.join(this.workspaceRoot, 'scripts', 'af');
            const hasAf = fs.existsSync(afPath);
            items.push(this.createHealthItem('CLI (af)', hasAf, hasAf ? 'Ready' : 'Missing (scripts/af)', false, 'goalieHealthCli'));
            // 4. Check Federation Status (mock check for now, maybe check for pid file?)
            // In a real scenario, we might ping a port or check a lockfile
            const fedLock = path.join(goalieDir, 'federation.lock'); // Hypothetical
            const federationActive = fs.existsSync(fedLock); // Just a placeholder check
            // Alternatively, check config
            const config = vscode.workspace.getConfiguration('goalie');
            const fedEnabled = config.get('federation.enabled', false);
            items.push(this.createHealthItem('Federation', fedEnabled, fedEnabled ? 'Enabled' : 'Disabled', true, 'goalieHealthFederation'));
            // 5. LLM Provider (Check config)
            const llmProvider = config.get('llm.provider', 'Not Configured');
            items.push(this.createHealthItem('LLM Provider', llmProvider !== 'Not Configured', llmProvider, false, 'goalieHealthLlm'));
            // 6. Process Health (Dynamic Analysis)
            const processHealthPath = path.join(this.workspaceRoot, 'scripts', 'analyze_process_health.py');
            if (fs.existsSync(processHealthPath)) {
                try {
                    const processData = yield this.getProcessHealth(processHealthPath);
                    if (processData) {
                        const memMb = processData.total_memory_mb;
                        const highLoadCount = processData.high_load_processes.length;
                        const status = `Mem: ${memMb}MB | Issues: ${highLoadCount}`;
                        const healthy = highLoadCount === 0;
                        items.push(this.createHealthItem('Process Health', healthy, status, false, 'goalieHealthProcess'));
                        // Add children for high load processes if any
                        for (const p of processData.high_load_processes) {
                            const issues = p.issues.join(', ');
                            const label = `⚠️ ${p.command.split(' ')[0] || 'Process'} (${p.pid})`;
                            const desc = `${issues} | CPU: ${p.cpu_percent}% | Mem: ${Math.round(p.memory_kb / 1024)}MB`;
                            const pItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
                            pItem.description = desc;
                            pItem.tooltip = `${p.command}\n\nTime: ${p.time}`;
                            pItem.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconFailed'));
                            items.push(pItem);
                        }
                    }
                }
                catch (error) {
                    items.push(this.createHealthItem('Process Health', false, 'Analysis Failed', false));
                }
            }
            return items;
        });
    }
    getProcessHealth(scriptPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`python3 "${scriptPath}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Process analysis error: ${stderr}`);
                        resolve(null);
                        return;
                    }
                    try {
                        resolve(JSON.parse(stdout));
                    }
                    catch (e) {
                        resolve(null);
                    }
                });
            });
        });
    }
    createHealthItem(label, healthy, description, info = false, contextValue) {
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.description = description;
        if (healthy) {
            item.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        }
        else if (info) {
            item.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.blue'));
        }
        else {
            item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
        }
        if (contextValue) {
            item.contextValue = contextValue;
        }
        return item;
    }
}
exports.GoalieHealthProvider = GoalieHealthProvider;
//# sourceMappingURL=healthProvider.js.map