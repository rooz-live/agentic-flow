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
exports.activate = activate;
exports.deactivate = deactivate;
const child_process_1 = require("child_process");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const yaml = require("yaml");
const streamClient_1 = require("./streamClient");
const streamUtils_1 = require("./streamUtils");
const telemetry_1 = require("./telemetry");
const dtCalibrationProvider_1 = require("./dtCalibrationProvider");
function getGoalieDir(workspaceRoot) {
    const config = vscode.workspace.getConfiguration('goalie');
    const customPath = config.get('directoryPath');
    if (customPath) {
        return customPath;
    }
    if (workspaceRoot) {
        return path.join(workspaceRoot, '.goalie');
    }
    return undefined;
}
function getKanbanBoardPath(goalieDir) {
    if (!goalieDir) {
        return undefined;
    }
    return path.join(goalieDir, 'KANBAN_BOARD.yaml');
}
function loadKanbanDoc(goalieDir) {
    const boardPath = getKanbanBoardPath(goalieDir);
    if (!boardPath || !fs.existsSync(boardPath)) {
        return undefined;
    }
    try {
        const raw = fs.readFileSync(boardPath, 'utf8');
        return yaml.parse(raw) || {};
    }
    catch (err) {
        console.warn('[Kanban] Failed to parse board file:', err);
        return undefined;
    }
}
function saveKanbanDoc(goalieDir, doc) {
    const boardPath = getKanbanBoardPath(goalieDir);
    if (!boardPath) {
        throw new Error('Goalie directory not configured');
    }
    const serialized = yaml.stringify(doc, { indent: 2 });
    fs.writeFileSync(boardPath, serialized, 'utf8');
}
function ensureSection(doc, section) {
    if (!doc[section]) {
        doc[section] = [];
    }
    if (!Array.isArray(doc[section])) {
        doc[section] = [];
    }
    return doc[section];
}
function indexOfEntry(entries, payload) {
    if (!entries.length) {
        return -1;
    }
    if (payload.id) {
        const idxById = entries.findIndex(entry => (entry === null || entry === void 0 ? void 0 : entry.id) === payload.id);
        if (idxById >= 0) {
            return idxById;
        }
    }
    const label = payload.title || payload.summary;
    if (label) {
        const idxByLabel = entries.findIndex(entry => (entry === null || entry === void 0 ? void 0 : entry.title) === label || (entry === null || entry === void 0 ? void 0 : entry.summary) === label);
        if (idxByLabel >= 0) {
            return idxByLabel;
        }
    }
    return entries.findIndex(entry => JSON.stringify(entry) === JSON.stringify(payload));
}
function moveKanbanEntry(goalieDir, payload, fromSection, toSection) {
    const doc = loadKanbanDoc(goalieDir);
    if (!doc) {
        throw new Error('Kanban board file not found.');
    }
    const fromEntries = ensureSection(doc, fromSection);
    const targetEntries = ensureSection(doc, toSection);
    const idx = indexOfEntry(fromEntries, payload);
    if (idx < 0) {
        throw new Error('Selected Kanban item could not be located in YAML board.');
    }
    const [moved] = fromEntries.splice(idx, 1);
    moved.updatedAt = new Date().toISOString();
    targetEntries.push(moved);
    saveKanbanDoc(goalieDir, doc);
}
function buildKanbanTooltip(entry) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = true;
    markdown.appendMarkdown('```json\n');
    markdown.appendMarkdown(JSON.stringify(entry, null, 2));
    markdown.appendMarkdown('\n```');
    return markdown;
}
class KanbanItem extends vscode.TreeItem {
    constructor(label, collapsibleState, section, payload) {
        super(label, collapsibleState);
        this.section = section;
        this.payload = payload;
        if (section) {
            this.contextValue = 'goalieKanbanSection';
        }
    }
}
class GoalieKanbanProvider {
    constructor(workspaceRoot, logger) {
        this.workspaceRoot = workspaceRoot;
        this.logger = logger;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.WIP_LIMIT = 5; // Default WIP limit per section
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    calculateWipViolation(items) {
        const count = items.length;
        const violation = count > this.WIP_LIMIT;
        const percentage = violation ? ((count - this.WIP_LIMIT) / this.WIP_LIMIT) * 100 : 0;
        return { count, violation, percentage };
    }
    getWsjfFromPatternMetrics(patternId) {
        var _a;
        const goalieDir = getGoalieDir(this.workspaceRoot);
        if (!goalieDir)
            return undefined;
        const patternPath = path.join(goalieDir, 'pattern_metrics.jsonl');
        if (!fs.existsSync(patternPath))
            return undefined;
        try {
            const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    if (obj.id === patternId || obj.title === patternId) {
                        return (_a = obj.economic) === null || _a === void 0 ? void 0 : _a.wsjf_score;
                    }
                }
                catch (_b) {
                    // ignore malformed lines
                }
            }
        }
        catch (_c) {
            // ignore file read errors
        }
        return undefined;
    }
    getCompletionRate(itemId) {
        // Simple completion rate calculation based on pattern metrics
        const goalieDir = getGoalieDir(this.workspaceRoot);
        if (!goalieDir)
            return 0;
        const patternPath = path.join(goalieDir, 'pattern_metrics.jsonl');
        if (!fs.existsSync(patternPath))
            return 0;
        try {
            const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
            let totalActions = 0;
            let completedActions = 0;
            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    if (obj.id === itemId || obj.title === itemId) {
                        totalActions++;
                        if (obj.action_completed) {
                            completedActions++;
                        }
                    }
                }
                catch (_a) {
                    // ignore malformed lines
                }
            }
            return totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
        }
        catch (_b) {
            // ignore file read errors
        }
        return 0;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const goalieDir = getGoalieDir(this.workspaceRoot);
            this.logger.appendLine(`[Kanban] getChildren. Element: ${(_a = element === null || element === void 0 ? void 0 : element.label) !== null && _a !== void 0 ? _a : 'Root'}. Goalie Dir: ${goalieDir}`);
            if (!goalieDir) {
                this.logger.appendLine('[Kanban] No .goalie directory found.');
                return [];
            }
            const boardPath = getKanbanBoardPath(goalieDir);
            this.logger.appendLine(`[Kanban] Checking boardPath: ${boardPath}`);
            const doc = loadKanbanDoc(goalieDir);
            if (!boardPath || !doc) {
                this.logger.appendLine('[Kanban] Board file not found or unparsable.');
                return [];
            }
            if (!element) {
                // Telemetry Injection
                let health = { score: 0, safe: true, incidents: 0 };
                try {
                    const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
                    if (fs.existsSync(metricsPath)) {
                        const lines = fs.readFileSync(metricsPath, 'utf8').trim().split('\n');
                        if (lines.length > 0) {
                            const last = JSON.parse(lines[lines.length - 1]);
                            health.score = last.average_score || 0;
                        }
                    }
                    // Check logs/governor_incidents.jsonl (assuming peer to .goalie)
                    const incidentsPath = path.join(goalieDir, '..', 'logs', 'governor_incidents.jsonl');
                    if (fs.existsSync(incidentsPath)) {
                        const lines = fs.readFileSync(incidentsPath, 'utf8').trim().split('\n');
                        const recent = lines.slice(-20);
                        health.incidents = recent.filter(l => l.includes('system_overload')).length;
                        if (health.incidents > 5)
                            health.safe = false;
                    }
                }
                catch (e) {
                    this.logger.appendLine(`[Kanban] Health check failed: ${e}`);
                }
                return ['NOW', 'NEXT', 'LATER'].map(sec => {
                    const items = (doc[sec] || []);
                    const count = items.length;
                    const wipStatus = this.calculateWipViolation(items);
                    let label = `${sec} (${count})`;
                    if (sec === 'NOW') {
                        const icon = health.safe ? '🟢' : '🔴';
                        const status = health.safe ? 'Safe' : 'Degraded';
                        label = `${sec} (${count}) ${icon} Score: ${health.score.toFixed(0)} | ${status}`;
                    }
                    // Add WIP violation indicator
                    if (wipStatus.violation) {
                        label += ` ⚠️ WIP: ${wipStatus.count}/${this.WIP_LIMIT} (+${wipStatus.percentage.toFixed(0)}%)`;
                    }
                    const item = new KanbanItem(label, vscode.TreeItemCollapsibleState.Collapsed, sec);
                    if (sec === 'NOW') {
                        item.iconPath = new vscode.ThemeIcon('play-circle');
                        item.contextValue = 'kanbanSectionNow';
                        if (!health.safe) {
                            item.description = `⚠️ High Load (${health.incidents} incidents)`;
                        }
                        if (wipStatus.violation) {
                            item.description = (item.description || '') + ` | WIP Limit Exceeded`;
                        }
                    }
                    else if (sec === 'NEXT') {
                        item.iconPath = new vscode.ThemeIcon('arrow-circle-right');
                        item.contextValue = 'kanbanSectionNext';
                        if (wipStatus.violation) {
                            item.description = 'WIP Limit Exceeded';
                        }
                    }
                    else {
                        item.iconPath = new vscode.ThemeIcon('clock');
                        item.contextValue = 'kanbanSectionLater';
                        if (wipStatus.violation) {
                            item.description = 'WIP Limit Exceeded';
                        }
                    }
                    // Add tooltip with WIP information
                    let tooltip = `${sec} section with ${count} items`;
                    if (wipStatus.violation) {
                        tooltip += `\n⚠️ WIP Limit: ${wipStatus.count}/${this.WIP_LIMIT} (${wipStatus.percentage.toFixed(0)}% over limit)`;
                    }
                    else {
                        tooltip += `\n✅ WIP Limit: ${wipStatus.count}/${this.WIP_LIMIT} (within limit)`;
                    }
                    item.tooltip = tooltip;
                    return item;
                });
            }
            if (element.section) {
                const items = (doc[element.section] || []);
                return items.map(it => {
                    const wsjfScore = this.getWsjfFromPatternMetrics(it.id || '');
                    const completionRate = this.getCompletionRate(it.id || '');
                    // Build priority indicator
                    let priorityIndicator = '';
                    if (wsjfScore !== undefined) {
                        if (wsjfScore >= 15) {
                            priorityIndicator = '🔴'; // High priority
                        }
                        else if (wsjfScore >= 8) {
                            priorityIndicator = '🟡'; // Medium priority
                        }
                        else {
                            priorityIndicator = '🟢'; // Low priority
                        }
                    }
                    // Build completion indicator
                    let completionIndicator = '';
                    if (completionRate >= 80) {
                        completionIndicator = '✅';
                    }
                    else if (completionRate >= 50) {
                        completionIndicator = '⚠️';
                    }
                    else {
                        completionIndicator = '❌';
                    }
                    const label = it.title || it.summary || (it.id ? `Item ${it.id}` : JSON.stringify(it));
                    const item = new KanbanItem(`${priorityIndicator} ${label} ${completionIndicator}`, vscode.TreeItemCollapsibleState.None, element.section, it);
                    // Enhanced tooltip with WSJF and completion info
                    const baseTooltip = buildKanbanTooltip(it);
                    let tooltipText = baseTooltip.value || '';
                    if (wsjfScore !== undefined) {
                        tooltipText += `\n\n📊 WSJF Score: ${wsjfScore.toFixed(2)}`;
                    }
                    tooltipText += `\n📈 Completion Rate: ${completionRate.toFixed(1)}%`;
                    const tooltip = new vscode.MarkdownString(tooltipText, true);
                    tooltip.isTrusted = true;
                    // Enhanced description with metrics
                    let description = it.id ? `#${it.id}` : '';
                    if (wsjfScore !== undefined) {
                        description += (description ? ' | ' : '') + `WSJF: ${wsjfScore.toFixed(1)}`;
                    }
                    description += (description ? ' | ' : '') + `Completion: ${completionRate.toFixed(0)}%`;
                    item.tooltip = tooltip;
                    item.description = description;
                    item.iconPath = new vscode.ThemeIcon('circle-filled');
                    item.contextValue = 'goalieKanbanItem';
                    item.command = {
                        command: 'goalieDashboard.openKanbanItem',
                        title: 'Open Kanban Item',
                        arguments: [item],
                    };
                    return item;
                });
            }
            return [];
        });
    }
}
class PatternMetricsProvider {
    constructor(workspaceRoot, context) {
        this.workspaceRoot = workspaceRoot;
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentFilter = 'all';
        this.filterValue = '';
        this.cache = new Map();
        this.lastModified = 0;
        this.pageSize = 50;
        this.currentPage = 1;
        this.newPatterns = new Set();
        this.loadPersistedFilters();
        this.startAutoRefresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setFilter(filter, value = '') {
        this.currentFilter = filter;
        this.filterValue = value;
        this.currentPage = 1; // Reset to first page when filter changes
        this.persistFilters();
        this.refresh();
    }
    loadPersistedFilters() {
        if (this.context) {
            this.currentFilter = this.context.workspaceState.get('patternMetrics.filter', 'all');
            this.filterValue = this.context.workspaceState.get('patternMetrics.filterValue', '');
            this.pageSize = this.context.globalState.get('patternMetrics.pageSize', 50);
        }
    }
    persistFilters() {
        if (this.context) {
            this.context.workspaceState.update('patternMetrics.filter', this.currentFilter);
            this.context.workspaceState.update('patternMetrics.filterValue', this.filterValue);
            this.context.globalState.update('patternMetrics.pageSize', this.pageSize);
        }
    }
    startAutoRefresh() {
        const config = vscode.workspace.getConfiguration('goalie');
        const autoRefreshEnabled = config.get('patternMetrics.autoRefresh', false);
        const refreshInterval = config.get('patternMetrics.refreshInterval', 30); // seconds
        if (autoRefreshEnabled && refreshInterval > 0) {
            this.autoRefreshInterval = setInterval(() => {
                this.refresh();
            }, refreshInterval * 1000);
        }
    }
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = undefined;
        }
    }
    dispose() {
        this.stopAutoRefresh();
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
    loadPatternMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const goalieDir = this.getGoalieDir();
            if (!goalieDir) {
                return [];
            }
            const metricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
            if (!fs.existsSync(metricsPath)) {
                return [];
            }
            try {
                const stats = fs.statSync(metricsPath);
                const currentModified = stats.mtime.getTime();
                // Use cache if file hasn't changed
                if (currentModified === this.lastModified && this.cache.has('patterns')) {
                    return this.cache.get('patterns');
                }
                // Efficient parsing for large files
                const lines = fs.readFileSync(metricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
                const patterns = [];
                const seenPatterns = new Set();
                for (const line of lines) {
                    try {
                        const obj = JSON.parse(line);
                        const patternKey = `${obj.pattern}_${obj.timestamp}_${obj.circle || ''}`;
                        // Track new patterns
                        if (!seenPatterns.has(patternKey)) {
                            seenPatterns.add(patternKey);
                            patterns.push(obj);
                            // Check if this is a new pattern (within last 5 minutes)
                            const patternTime = new Date(obj.timestamp);
                            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                            if (patternTime > fiveMinutesAgo) {
                                this.newPatterns.add(obj.pattern);
                            }
                        }
                    }
                    catch (_a) {
                        // ignore malformed lines
                    }
                }
                // Update cache
                this.cache.set('patterns', patterns);
                this.lastModified = currentModified;
                return patterns;
            }
            catch (error) {
                console.error('Error loading pattern metrics:', error);
                return [];
            }
        });
    }
    filterPatterns(patterns) {
        if (this.currentFilter === 'all') {
            return patterns;
        }
        return patterns.filter(pattern => {
            switch (this.currentFilter) {
                case 'circle':
                    return pattern.circle === this.filterValue;
                case 'run-kind':
                    return pattern.run_kind === this.filterValue;
                case 'gate':
                    return pattern.gate === this.filterValue;
                case 'date-range':
                    if (this.filterValue.includes('last')) {
                        const days = parseInt(this.filterValue.replace('last-', '').replace('days', '')) || 7;
                        const patternDate = new Date(pattern.timestamp);
                        const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
                        return patternDate >= cutoffDate;
                    }
                    return false;
                default:
                    return true;
            }
        });
    }
    getPaginatedResults(patterns) {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return patterns.slice(startIndex, endIndex);
    }
    getUniqueValues(patterns, field) {
        const values = new Set();
        patterns.forEach(pattern => {
            if (pattern[field]) {
                values.add(pattern[field]);
            }
        });
        return Array.from(values).sort();
    }
    exportData(format) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const patterns = yield this.loadPatternMetrics();
            const filteredPatterns = this.filterPatterns(patterns);
            if (filteredPatterns.length === 0) {
                vscode.window.showInformationMessage('No data to export.');
                return;
            }
            const workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found.');
                return;
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `pattern-metrics-${timestamp}.${format}`;
            const filePath = path.join(workspaceRoot, fileName);
            try {
                let content;
                if (format === 'csv') {
                    const headers = ['timestamp', 'pattern', 'circle', 'depth', 'run_kind', 'gate', 'tags', 'economic'];
                    const csvLines = [headers.join(',')];
                    filteredPatterns.forEach(pattern => {
                        const row = [
                            pattern.timestamp || '',
                            `"${pattern.pattern || ''}"`,
                            `"${pattern.circle || ''}"`,
                            pattern.depth || '',
                            `"${pattern.run_kind || ''}"`,
                            `"${pattern.gate || ''}"`,
                            `"${Array.isArray(pattern.tags) ? pattern.tags.join(';') : ''}"`,
                            `"${JSON.stringify(pattern.economic || {})}"`
                        ];
                        csvLines.push(row.join(','));
                    });
                    content = csvLines.join('\n');
                }
                else {
                    content = JSON.stringify(filteredPatterns, null, 2);
                }
                fs.writeFileSync(filePath, content, 'utf8');
                vscode.window.showInformationMessage(`Pattern metrics exported to ${filePath}`);
                // Open the exported file
                const doc = yield vscode.workspace.openTextDocument(filePath);
                yield vscode.window.showTextDocument(doc);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to export data: ${error}`);
            }
        });
    }
    printReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const patterns = yield this.loadPatternMetrics();
            const filteredPatterns = this.filterPatterns(patterns);
            if (filteredPatterns.length === 0) {
                vscode.window.showInformationMessage('No data to print.');
                return;
            }
            // Create a webview panel for the printable report
            const panel = vscode.window.createWebviewPanel('patternMetricsReport', 'Pattern Metrics Report', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            // Generate HTML report
            const html = this.generatePrintReportHtml(filteredPatterns);
            panel.webview.html = html;
            // Handle print command from webview
            panel.webview.onDidReceiveMessage(message => {
                if (message.command === 'print') {
                    vscode.commands.executeCommand('workbench.action.browser.openDeveloperTools');
                }
            });
        });
    }
    generatePrintReportHtml(patterns) {
        const timestamp = new Date().toLocaleString();
        const counts = new Map();
        const patternTagsMap = new Map();
        patterns.forEach(p => {
            const pattern = p.pattern || 'unknown';
            counts.set(pattern, (counts.get(pattern) || 0) + 1);
            if (Array.isArray(p.tags)) {
                const existing = patternTagsMap.get(pattern) || [];
                const merged = Array.from(new Set([...existing, ...p.tags]));
                patternTagsMap.set(pattern, merged);
            }
        });
        const sortedPatterns = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1]);
        const tableRows = sortedPatterns.map(([pattern, count]) => {
            const tags = patternTagsMap.get(pattern) || [];
            const workloadTagsList = workloadTags(pattern, tags);
            const badges = [];
            if (workloadTagsList.includes('ML')) {
                const patternLower = pattern.toLowerCase();
                if (patternLower.includes('tensorflow') || patternLower.includes('tf-')) {
                    badges.push('TF');
                }
                else if (patternLower.includes('pytorch') || patternLower.includes('torch')) {
                    badges.push('PyTorch');
                }
                else {
                    badges.push('ML');
                }
            }
            if (workloadTagsList.includes('HPC'))
                badges.push('HPC');
            if (workloadTagsList.includes('Stats'))
                badges.push('Stats');
            if (workloadTagsList.includes('Device/Web'))
                badges.push('Device/Web');
            const isNew = this.newPatterns.has(pattern);
            const badgeStr = badges.length > 0 ? ` ${badges.join(', ')}` : '';
            return `
        <tr>
          <td>${isNew ? '🆕 ' : ''}${pattern}</td>
          <td>${count}</td>
          <td>${badgeStr}</td>
          <td>${tags.join(', ')}</td>
        </tr>
      `;
        }).join('');
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Pattern Metrics Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #2c3e50;
          }
          .header p {
            margin: 5px 0;
            color: #7f8c8d;
          }
          .summary {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .badge {
            background: #007acc;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            margin-right: 4px;
          }
          .print-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
          }
          @media print {
            .print-btn { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pattern Metrics Report</h1>
          <p>Generated on ${timestamp}</p>
          <button class="print-btn" onclick="window.print()">Print Report</button>
        </div>
        
        <div class="summary">
          <strong>Summary:</strong><br>
          Total Patterns: ${sortedPatterns.length}<br>
          Total Events: ${Array.from(counts.values()).reduce((a, b) => a + b, 0)}<br>
          New Patterns (5min): ${Array.from(this.newPatterns).length}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Count</th>
              <th>Workload Type</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <script>
          // Auto-print when loaded
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 1000);
          });
        </script>
      </body>
      </html>
    `;
    }
    generateChartHtml(patterns) {
        // Enhanced chart visualization with interactive features
        const patternCounts = new Map();
        const patternTags = new Map();
        patterns.forEach(p => {
            const pattern = p.pattern || 'unknown';
            patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
            if (Array.isArray(p.tags)) {
                patternTags.set(pattern, p.tags);
            }
        });
        const sortedPatterns = Array.from(patternCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15); // Top 15 patterns for better visualization
        const maxCount = Math.max(...sortedPatterns.map(([, count]) => count));
        const chartBars = sortedPatterns.map(([pattern, count]) => {
            const percentage = (count / maxCount) * 100;
            const color = this.getPatternColor(pattern);
            const tags = patternTags.get(pattern) || [];
            const workloadTagsList = workloadTags(pattern, tags);
            const isNew = this.newPatterns.has(pattern);
            // Create workload badges
            const badges = [];
            if (workloadTagsList.includes('ML')) {
                const patternLower = pattern.toLowerCase();
                if (patternLower.includes('tensorflow') || patternLower.includes('tf-')) {
                    badges.push('<span class="badge tf">TF</span>');
                }
                else if (patternLower.includes('pytorch') || patternLower.includes('torch')) {
                    badges.push('<span class="badge pytorch">PyTorch</span>');
                }
                else {
                    badges.push('<span class="badge ml">ML</span>');
                }
            }
            if (workloadTagsList.includes('HPC'))
                badges.push('<span class="badge hpc">HPC</span>');
            if (workloadTagsList.includes('Stats'))
                badges.push('<span class="badge stats">Stats</span>');
            if (workloadTagsList.includes('Device/Web'))
                badges.push('<span class="badge device">Device/Web</span>');
            return `
        <div class="chart-bar" data-pattern="${pattern}" data-count="${count}" style="cursor: pointer;">
          <div class="pattern-info">
            <div class="pattern-name">${isNew ? '🆕 ' : ''}${pattern}</div>
            <div class="pattern-badges">${badges.join('')}</div>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%; background: ${color};"></div>
          </div>
          <div class="count-label">${count}</div>
        </div>
      `;
        }).join('');
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Pattern Distribution Chart</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            padding: 12px;
            background: var(--vscode-editor-background, #ffffff);
            color: var(--vscode-editor-foreground, #333333);
          }
          .chart-container {
            background: var(--vscode-editor-background, #ffffff);
            border-radius: 8px;
            padding: 16px;
            border: 1px solid var(--vscode-panel-border, #e1e1e1);
          }
          .chart-header {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-editor-foreground, #333333);
          }
          .chart-bar {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            padding: 8px;
            border-radius: 6px;
            background: var(--vscode-list-hoverBackground, #f0f0f0);
            transition: all 0.2s ease;
          }
          .chart-bar:hover {
            background: var(--vscode-list-activeSelectionBackground, #e6e6e6);
            transform: translateX(4px);
          }
          .pattern-info {
            width: 200px;
            margin-right: 12px;
          }
          .pattern-name {
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .pattern-badges {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }
          .badge {
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .badge.ml { background: #1f77b4; color: white; }
          .badge.hpc { background: #d62728; color: white; }
          .badge.stats { background: #2ca02c; color: white; }
          .badge.device { background: #9467bd; color: white; }
          .badge.tf { background: #ff6f00; color: white; }
          .badge.pytorch { background: #ff9500; color: white; }
          .bar-container {
            flex: 1;
            height: 20px;
            background: var(--vscode-input-background, #f3f3f3);
            border-radius: 3px;
            position: relative;
            margin-right: 12px;
          }
          .bar-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s ease;
          }
          .count-label {
            width: 40px;
            text-align: right;
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-editor-foreground, #333333);
          }
          .controls {
            margin-top: 16px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            background: var(--vscode-button-background, #007acc);
            color: white;
            border: 1px solid var(--vscode-button-border, #007acc);
          }
          .btn:hover {
            background: var(--vscode-button-hoverBackground, #005a9e);
          }
          .summary {
            margin-top: 16px;
            padding: 12px;
            background: var(--vscode-textBlockQuote-background, #f6f6f6);
            border-left: 4px solid var(--vscode-textBlockQuote-border, #d4d4d4);
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="chart-container">
          <h2 class="chart-header">Pattern Distribution Analysis</h2>
          
          <div class="summary">
            <strong>Total Patterns:</strong> ${sortedPatterns.length} |
            <strong>Total Events:</strong> ${Array.from(patternCounts.values()).reduce((a, b) => a + b, 0)} |
            <strong>New Patterns (5min):</strong> ${Array.from(this.newPatterns).length}
          </div>

          <div class="controls">
            <button class="btn" onclick="filterByWorkload('ML')">Filter ML</button>
            <button class="btn" onclick="filterByWorkload('HPC')">Filter HPC</button>
            <button class="btn" onclick="filterByWorkload('Stats')">Filter Stats</button>
            <button class="btn" onclick="filterByWorkload('Device/Web')">Filter Device/Web</button>
            <button class="btn" onclick="clearFilters()">Clear Filters</button>
            <button class="btn" onclick="exportChart()">Export Chart</button>
          </div>

          ${chartBars}

          <div class="summary">
            <strong>Interactive Features:</strong><br>
            • Click on any pattern bar to filter by that pattern<br>
            • Use filter buttons to show specific workload types<br>
            • Hover over bars to see detailed information<br>
            • New patterns (🆕) detected in the last 5 minutes
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          function filterByWorkload(workload) {
            vscode.postMessage({
              command: 'filterByWorkload',
              workload: workload
            });
          }
          
          function clearFilters() {
            vscode.postMessage({
              command: 'clearFilters'
            });
          }
          
          function exportChart() {
            vscode.postMessage({
              command: 'exportChart'
            });
          }
          
          // Add click handlers to chart bars
          document.querySelectorAll('.chart-bar').forEach(bar => {
            bar.addEventListener('click', function() {
              const pattern = this.getAttribute('data-pattern');
              const count = this.getAttribute('data-count');
              vscode.postMessage({
                command: 'filterByPattern',
                pattern: pattern,
                count: count
              });
            });
          });
          
          // Add hover effects
          document.querySelectorAll('.chart-bar').forEach(bar => {
            bar.addEventListener('mouseenter', function() {
              this.style.transform = 'translateX(4px)';
            });
            
            bar.addEventListener('mouseleave', function() {
              this.style.transform = 'translateX(0)';
            });
          });
        </script>
      </body>
      </html>
    `;
    }
    getPatternColor(pattern) {
        if (pattern.includes('ml') || pattern.includes('training') || pattern.includes('tensorflow') || pattern.includes('pytorch')) {
            return '#1f77b4'; // Blue for ML
        }
        if (pattern.includes('hpc') || pattern.includes('batch') || pattern.includes('cluster')) {
            return '#d62728'; // Red for HPC
        }
        if (pattern.includes('stat') || pattern.includes('robustness') || pattern.includes('sweep')) {
            return '#2ca02c'; // Green for Stats
        }
        if (pattern.includes('device') || pattern.includes('mobile') || pattern.includes('web')) {
            return '#9467bd'; // Purple for Device/Web
        }
        return '#7f7f7f'; // Gray for others
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            const goalieDir = this.getGoalieDir();
            if (element || !goalieDir) {
                return [];
            }
            const patterns = yield this.loadPatternMetrics();
            if (patterns.length === 0) {
                return [];
            }
            // Apply current filter
            const filteredPatterns = this.filterPatterns(patterns);
            const paginatedPatterns = this.getPaginatedResults(filteredPatterns);
            // Create root level items
            if (!element) {
                const items = [];
                // Add filter status item
                const filterItem = new vscode.TreeItem(`Filter: ${this.currentFilter === 'all' ? 'All Patterns' : `${this.currentFilter} = ${this.filterValue}`}`, vscode.TreeItemCollapsibleState.None);
                filterItem.iconPath = new vscode.ThemeIcon('filter');
                filterItem.description = `${filteredPatterns.length} of ${patterns.length} patterns`;
                filterItem.contextValue = 'patternFilter';
                items.push(filterItem);
                // Add export controls
                const exportItem = new vscode.TreeItem('📤 Export Data', vscode.TreeItemCollapsibleState.Collapsed);
                exportItem.contextValue = 'exportControls';
                items.push(exportItem);
                // Add pagination controls if needed
                if (filteredPatterns.length > this.pageSize) {
                    const paginationItem = new vscode.TreeItem(`📄 Page ${this.currentPage} of ${Math.ceil(filteredPatterns.length / this.pageSize)}`, vscode.TreeItemCollapsibleState.Collapsed);
                    paginationItem.contextValue = 'pagination';
                    paginationItem.description = `${filteredPatterns.length} total results`;
                    items.push(paginationItem);
                }
                // Add chart item
                const chartItem = new vscode.TreeItem('📊 Pattern Distribution Chart', vscode.TreeItemCollapsibleState.None);
                chartItem.tooltip = 'Visual representation of pattern distribution';
                chartItem.command = {
                    command: 'goalieDashboard.showPatternChart',
                    title: 'Show Pattern Chart',
                    arguments: [filteredPatterns]
                };
                items.push(chartItem);
                // Add pattern items from current page
                const counts = new Map();
                const patternTagsMap = new Map();
                paginatedPatterns.forEach(p => {
                    const pattern = p.pattern || 'unknown';
                    counts.set(pattern, (counts.get(pattern) || 0) + 1);
                    if (Array.isArray(p.tags)) {
                        const existing = patternTagsMap.get(pattern) || [];
                        const merged = Array.from(new Set([...existing, ...p.tags]));
                        patternTagsMap.set(pattern, merged);
                    }
                });
                return items.concat(Array.from(counts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([pattern, count]) => {
                    // Enhanced pattern display with workload badges
                    const rawTags = patternTagsMap.get(pattern) || [];
                    const tags = workloadTags(pattern, rawTags);
                    const badges = [];
                    if (tags.includes('ML')) {
                        const patternLower = pattern.toLowerCase();
                        if (patternLower.includes('tensorflow') || patternLower.includes('tf-')) {
                            badges.push('TF');
                        }
                        else if (patternLower.includes('pytorch') || patternLower.includes('torch')) {
                            badges.push('PyTorch');
                        }
                        else {
                            badges.push('ML');
                        }
                    }
                    if (tags.includes('HPC'))
                        badges.push('HPC');
                    if (tags.includes('Stats'))
                        badges.push('Stats');
                    if (tags.includes('Device/Web'))
                        badges.push('Device/Web');
                    const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';
                    const isNew = this.newPatterns.has(pattern);
                    const label = `${isNew ? '🆕 ' : ''}${pattern}${badgeStr} (${count})`;
                    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
                    // Enhanced tooltip with pattern context
                    let tooltip = `Pattern: ${pattern}\nEvents: ${count}`;
                    if (tags.includes('ML')) {
                        tooltip += `\n\nML Pattern: Machine Learning workload`;
                    }
                    if (tags.includes('HPC')) {
                        tooltip += `\n\nHPC Pattern: High Performance Computing workload`;
                    }
                    if (tags.includes('Stats')) {
                        tooltip += `\n\nStats Pattern: Statistical analysis workload`;
                    }
                    if (tags.includes('Device/Web')) {
                        tooltip += `\n\nDevice/Web Pattern: Cross-platform device coverage`;
                    }
                    if (isNew) {
                        tooltip += `\n\n🆕 New pattern detected in last 5 minutes`;
                    }
                    item.tooltip = tooltip;
                    item.contextValue = 'patternItem';
                    // Add icons based on workload type
                    if (tags.includes('ML')) {
                        const patternLower = pattern.toLowerCase();
                        if (patternLower.includes('tensorflow') || patternLower.includes('tf-')) {
                            item.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
                        }
                        else if (patternLower.includes('pytorch') || patternLower.includes('torch')) {
                            item.iconPath = new vscode.ThemeIcon('flame', new vscode.ThemeColor('charts.orange'));
                        }
                        else {
                            item.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
                        }
                    }
                    else if (tags.includes('HPC')) {
                        item.iconPath = new vscode.ThemeIcon('server-process', new vscode.ThemeColor('charts.red'));
                    }
                    else if (tags.includes('Stats')) {
                        item.iconPath = new vscode.ThemeIcon('graph', new vscode.ThemeColor('charts.green'));
                    }
                    else if (tags.includes('Device/Web')) {
                        item.iconPath = new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.purple'));
                    }
                    return item;
                }));
            }
            // Handle expandable items
            if (element.contextValue === 'exportControls') {
                return [
                    this.createCommandItem('Export as CSV', 'goalieDashboard.exportPatternMetricsCSV'),
                    this.createCommandItem('Export as JSON', 'goalieDashboard.exportPatternMetricsJSON'),
                    this.createCommandItem('Print Report', 'goalieDashboard.printPatternMetricsReport')
                ];
            }
            if (element.contextValue === 'pagination') {
                const patterns = yield this.loadPatternMetrics();
                const filteredPatterns = this.filterPatterns(patterns);
                const items = [
                    this.createCommandItem('⬅️ Previous Page', 'goalieDashboard.patternMetricsPreviousPage'),
                    this.createCommandItem('➡️ Next Page', 'goalieDashboard.patternMetricsNextPage'),
                    this.createCommandItem(`Page Size: ${this.pageSize}`, 'goalieDashboard.patternMetricsSetPageSize')
                ];
                const totalPages = Math.ceil(filteredPatterns.length / this.pageSize);
                if (this.currentPage > 1) {
                    items[0].description = 'Go to previous page';
                }
                else {
                    items[0].description = 'Already on first page';
                }
                if (this.currentPage < totalPages) {
                    items[1].description = 'Go to next page';
                }
                else {
                    items[1].description = 'Already on last page';
                }
                return items;
            }
            return [];
        });
    }
    createCommandItem(label, command) {
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.command = { command, title: label };
        return item;
    }
    nextPage() {
        this.currentPage++;
        this.refresh();
    }
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.refresh();
        }
    }
    setPageSize(size) {
        this.pageSize = Math.max(10, Math.min(200, size)); // Between 10 and 200
        this.currentPage = 1; // Reset to first page
        this.persistFilters();
        this.refresh();
    }
}
function workloadTags(pattern, explicitTags = []) {
    const tags = [...explicitTags];
    // Mobile prototype workflow patterns
    if (pattern.startsWith('mobile-prototype-')) {
        tags.push('Device/Web');
    }
    // Desktop prototype workflow patterns
    if (pattern.startsWith('desktop-prototype-')) {
        tags.push('Device/Web');
    }
    // Web prototype workflow patterns
    if (pattern.startsWith('web-prototype-')) {
        tags.push('Device/Web');
    }
    // Cross-platform prototype patterns
    if (pattern.startsWith('prototype-')) {
        tags.push('Device/Web');
    }
    // Helper to normalize tags
    const normalize = (t) => {
        const low = t.toLowerCase();
        if (low === 'ml' || low === 'machine-learning' || low === 'tensorflow' || low === 'pytorch')
            return 'ML';
        if (low === 'hpc' || low === 'cluster' || low === 'slurm')
            return 'HPC';
        if (low === 'stats' || low === 'statistics')
            return 'Stats';
        if (low === 'device' || low === 'web' || low === 'mobile')
            return 'Device/Web';
        return t;
    };
    // Map explicit tags to known categories
    for (const t of explicitTags) {
        const norm = normalize(t);
        if (['ML', 'HPC', 'Stats', 'Device/Web'].includes(norm)) {
            tags.push(norm);
        }
    }
    if (pattern === 'ml-training-guardrail')
        tags.push('ML');
    if (pattern === 'stat-robustness-sweep')
        tags.push('ML', 'Stats');
    if (pattern === 'hpc-batch-window')
        tags.push('HPC');
    if (pattern === 'safe-degrade')
        tags.push('HPC');
    if (pattern === 'device-coverage')
        tags.push('Device/Web');
    if (pattern === 'failure-strategy')
        tags.push('Stats', 'Device/Web');
    return Array.from(new Set(tags));
}
function workloadMicrocopy(tags, env) {
    if (tags.includes('ML')) {
        const tfLike = !!(env === null || env === void 0 ? void 0 : env.tfLike);
        const torchLike = !!(env === null || env === void 0 ? void 0 : env.torchLike);
        if (tfLike && !torchLike) {
            return 'ML lens (TensorFlow-dominant): focus on TF input/graph/distribution issues, TPU/GPU saturation, and skew between training and serving graphs.';
        }
        if (torchLike && !tfLike) {
            return 'ML lens (PyTorch-dominant): focus on DataLoader throughput, GPU utilization, gradient stability, and mixed-precision/AMP edge cases.';
        }
        if (tfLike && torchLike) {
            return 'ML lens: mixed TensorFlow/PyTorch environment: keep an eye on input pipelines, GPU utilization, and consistency between TF and PyTorch training/eval paths.';
        }
        return 'ML lens: TensorFlow and PyTorch enterprise guardrails: TensorFlow input/graph/distribution issues; PyTorch DataLoader/GPU utilization/gradient stability; plus loss spikes, drift, OOM, and mis-logged runs.';
    }
    if (tags.includes('HPC')) {
        const clusterLike = !!(env === null || env === void 0 ? void 0 : env.clusterLike);
        const workstationLike = !!(env === null || env === void 0 ? void 0 : env.workstationLike);
        if (clusterLike && !workstationLike) {
            return 'HPC lens (cluster): SLURM/LSF-style schedulers, queue times, batch windows, and multi-node safe-degrade when jobs get pre-empted or rescheduled.';
        }
        if (workstationLike && !clusterLike) {
            return 'HPC lens (workstation): single-node saturation, NUMA and memory pressure, and keeping interactive workloads responsive while long-running jobs execute.';
        }
        if (clusterLike && workstationLike) {
            return 'HPC lens: mixed cluster + workstation workflows; keep telemetry separate for batch queues vs interactive nodes and align safe-degrade across both.';
        }
        return 'HPC lens: cluster vs workstation workflows: scheduler queues and batch windows on clusters (e.g., SLURM/LSF) vs workstation saturation, NUMA effects, and safe-degrade under sustained CPU/GPU/memory load.';
    }
    if (tags.includes('Stats')) {
        return 'Stats lens: robustness sweeps, sample size and power, multiple-testing control, and keeping p-hacking and overfitting risk low.';
    }
    if (tags.includes('Device/Web')) {
        return 'Device/Web lens: cross-device/browser coverage, mobile vs desktop regressions, and graceful failure strategies across web, desktop and native surfaces.';
    }
    return undefined;
}
class GovernanceEconomicsProvider {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentLens = 'ALL';
    }
    setGovernanceJson(json) {
        this.latestGovernanceJson = json;
        this.latestCodeFixProposals = Array.isArray(json === null || json === void 0 ? void 0 : json.codeFixProposals) ? json.codeFixProposals : undefined;
        this.refresh();
    }
    getCodeFixProposals() {
        var _a;
        return (_a = this.latestCodeFixProposals) !== null && _a !== void 0 ? _a : [];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setLens(lens) {
        this.currentLens = lens;
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const goalieDir = getGoalieDir(this.workspaceRoot);
            if (element || !goalieDir) {
                return [];
            }
            const patternPath = path.join(goalieDir, 'pattern_metrics.jsonl');
            const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
            if (!fs.existsSync(patternPath)) {
                return [];
            }
            const patternLines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
            const agg = new Map();
            const envHintsByKey = new Map();
            const envHintsConfig = { framework: {}, scheduler: {} };
            const envHintsPath = path.join(goalieDir, 'ENV_HINTS.yaml');
            if (fs.existsSync(envHintsPath)) {
                try {
                    const rawEnv = fs.readFileSync(envHintsPath, 'utf8');
                    const docEnv = yaml.parse(rawEnv) || {};
                    if (docEnv.framework && typeof docEnv.framework === 'object') {
                        envHintsConfig.framework = docEnv.framework;
                    }
                    if (docEnv.scheduler && typeof docEnv.scheduler === 'object') {
                        envHintsConfig.scheduler = docEnv.scheduler;
                    }
                }
                catch (_b) {
                    // ignore ENV_HINTS parse failures
                }
            }
            const actionsPath = path.join(goalieDir, 'OBSERVABILITY_ACTIONS.yaml');
            const actionKeys = new Set();
            if (fs.existsSync(actionsPath)) {
                try {
                    const raw = fs.readFileSync(actionsPath, 'utf8');
                    const doc = yaml.parse(raw) || {};
                    const items = doc.items || [];
                    for (const it of items) {
                        const circle = it.circle || '<none>';
                        const depth = typeof it.depth === 'number' ? it.depth : 0;
                        actionKeys.add(`${circle}|${depth}`);
                    }
                }
                catch (_c) {
                    // ignore
                }
            }
            for (const line of patternLines) {
                try {
                    const obj = JSON.parse(line);
                    const pattern = obj.pattern || 'unknown';
                    const circle = obj.circle || '<none>';
                    const depth = typeof obj.depth === 'number' ? obj.depth : 0;
                    const econ = obj.economic || {};
                    const rawCod = econ.cod;
                    const rawWsjf = econ.wsjf_score;
                    const cod = typeof rawCod === 'number'
                        ? rawCod
                        : typeof rawCod === 'string'
                            ? parseFloat(rawCod)
                            : undefined;
                    const wsjf = typeof rawWsjf === 'number' ? rawWsjf : undefined;
                    const key = `${pattern}|${circle}|${depth}`;
                    const current = agg.get(key) || { pattern, circle, depth, count: 0, codVals: [], wsjfVals: [], gpuVals: [], latencyVals: [], tags: [] };
                    current.count += 1;
                    if (typeof cod === 'number' && !Number.isNaN(cod))
                        current.codVals.push(cod);
                    if (typeof wsjf === 'number' && !Number.isNaN(wsjf))
                        current.wsjfVals.push(wsjf);
                    if (typeof obj.gpu_util_pct === 'number')
                        current.gpuVals.push(obj.gpu_util_pct);
                    if (typeof obj.p99_latency_ms === 'number')
                        current.latencyVals.push(obj.p99_latency_ms);
                    const lineTags = Array.isArray(obj.tags) ? obj.tags.map((t) => String(t)) : [];
                    current.tags = Array.from(new Set([...current.tags, ...lineTags]));
                    const existingEnv = envHintsByKey.get(key) || {};
                    const framework = typeof obj.framework === 'string' ? obj.framework.toLowerCase() : '';
                    const scheduler = typeof obj.scheduler === 'string' ? obj.scheduler.toLowerCase() : '';
                    const mergeConfigEntry = (entry) => {
                        if (!entry || typeof entry !== 'object')
                            return;
                        if (entry.clusterLike)
                            existingEnv.clusterLike = true;
                        if (entry.workstationLike)
                            existingEnv.workstationLike = true;
                        if (entry.tfLike)
                            existingEnv.tfLike = true;
                        if (entry.torchLike)
                            existingEnv.torchLike = true;
                    };
                    if (framework && envHintsConfig.framework && envHintsConfig.framework[framework]) {
                        mergeConfigEntry(envHintsConfig.framework[framework]);
                    }
                    if (scheduler && envHintsConfig.scheduler && envHintsConfig.scheduler[scheduler]) {
                        mergeConfigEntry(envHintsConfig.scheduler[scheduler]);
                    }
                    const host = typeof obj.host === 'string' ? obj.host.toLowerCase() : '';
                    const reason = typeof obj.reason === 'string' ? obj.reason.toLowerCase() : '';
                    const tagsArr = Array.isArray(obj.tags) ? obj.tags.map((t) => String(t).toLowerCase()) : [];
                    const combined = [pattern.toLowerCase(), host, reason, ...tagsArr].join(' ');
                    const clusterLike = /slurm|lsf|pbs|torque|scheduler|cluster/.test(combined);
                    const workstationLike = /workstation|desktop|laptop|macbook|mbp/.test(combined);
                    const tfLike = /tensorflow|\btf\b/.test(combined);
                    const torchLike = /pytorch|torch/.test(combined);
                    if (clusterLike)
                        existingEnv.clusterLike = true;
                    if (workstationLike)
                        existingEnv.workstationLike = true;
                    if (tfLike)
                        existingEnv.tfLike = true;
                    if (torchLike)
                        existingEnv.torchLike = true;
                    envHintsByKey.set(key, existingEnv);
                    agg.set(key, current);
                }
                catch (_d) {
                    // ignore malformed lines
                }
            }
            let lastSystemLoad;
            let lastCpuIdle;
            if (fs.existsSync(metricsPath)) {
                const metricsLines = fs.readFileSync(metricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
                for (const line of metricsLines) {
                    try {
                        const obj = JSON.parse(line);
                        if (typeof obj.system_load === 'string') {
                            lastSystemLoad = obj.system_load;
                        }
                        if (typeof obj.cpu_idle_pct === 'number') {
                            lastCpuIdle = obj.cpu_idle_pct;
                        }
                    }
                    catch (_e) {
                        // ignore malformed lines
                    }
                }
            }
            let baselineStatus = 'NONE';
            if (goalieDir) {
                const repoRoot = path.resolve(goalieDir, '..');
                const baselinePath = path.join(repoRoot, 'metrics', 'baseline.json');
                const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
                let baselineScore;
                let currentScore;
                if (fs.existsSync(baselinePath)) {
                    try {
                        const obj = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
                        if (typeof obj.average_score === 'number')
                            baselineScore = obj.average_score;
                    }
                    catch (_f) {
                        // ignore
                    }
                }
                if (fs.existsSync(metricsPath)) {
                    const lines = fs.readFileSync(metricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
                    for (const line of lines) {
                        try {
                            const obj = JSON.parse(line);
                            if (typeof obj.average_score === 'number') {
                                currentScore = obj.average_score;
                            }
                            else if (obj.calibration_summary && typeof obj.calibration_summary === 'object') {
                                const cs = obj.calibration_summary;
                                if (typeof cs.average_score === 'number')
                                    currentScore = cs.average_score;
                            }
                        }
                        catch (_g) {
                            // ignore malformed
                        }
                    }
                }
                if (baselineScore !== undefined && currentScore !== undefined) {
                    const deltaPct = ((currentScore - baselineScore) / baselineScore) * 100;
                    if (deltaPct < -10)
                        baselineStatus = 'REGRESSION';
                    else if (deltaPct > 5)
                        baselineStatus = 'IMPROVED';
                    else
                        baselineStatus = 'NEUTRAL';
                }
            }
            const rows = [];
            for (const a of agg.values()) {
                const codAvg = a.codVals.length
                    ? a.codVals.reduce((x, y) => x + y, 0) / a.codVals.length
                    : undefined;
                const wsjfAvg = a.wsjfVals.length
                    ? a.wsjfVals.reduce((x, y) => x + y, 0) / a.wsjfVals.length
                    : undefined;
                const codStr = codAvg !== undefined ? `cod≈${codAvg.toFixed(2)}` : 'cod: n/a';
                const wsjfStr = wsjfAvg !== undefined ? `wsjf≈${wsjfAvg.toFixed(2)}` : 'wsjf: n/a';
                const gpuAvg = a.gpuVals.length
                    ? a.gpuVals.reduce((x, y) => x + y, 0) / a.gpuVals.length
                    : undefined;
                const latAvg = a.latencyVals.length
                    ? a.latencyVals.reduce((x, y) => x + y, 0) / a.latencyVals.length
                    : undefined;
                const hpcStr = gpuAvg !== undefined && latAvg !== undefined
                    ? `\nHPC: GPU ${gpuAvg.toFixed(1)}%, Latency ${latAvg.toFixed(1)}ms`
                    : '';
                const tagsArr = ((_a = envHintsByKey.get(`${a.pattern}|${a.circle}|${a.depth}`)) === null || _a === void 0 ? void 0 : _a.tags) || [];
                // We need to retrieve the tags we stored earlier or re-parse.
                // Actually, we didn't store raw tags in a convenient place for the row loop.
                // Let's recover them from the envHintsByKey if we stored them, or just rely on the pattern if we missed them.
                // But wait, we only stored hints in envHintsByKey.
                // Correction: We need to access the tags from the aggregation or parse them again.
                // Since 'agg' keys don't store tags, and we want to avoid re-reading, let's trust the pattern
                // OR better, let's fix the Agg type to include a set of seen tags.
                // For now, to be safe with the existing structure, let's rely on the updated workloadTags
                // being able to handle what we pass. But we don't have the tags here.
                // I will update the Agg structure in a previous block to include 'tags'.
                const workload = workloadTags(a.pattern, a.tags);
                const tags = [];
                tags.push(...workload);
                const circleDepthKey = `${a.circle}|${a.depth}`;
                const isGap = !!actionKeys.size && !actionKeys.has(circleDepthKey) && codAvg !== undefined;
                if (isGap)
                    tags.push('GAP');
                const tagStr = tags.length ? ` [${tags.join(', ')}]` : '';
                const label = `${a.pattern} · circle=${a.circle}, depth=${a.depth} · events=${a.count}${tagStr}`;
                const env = envHintsByKey.get(`${a.pattern}|${a.circle}|${a.depth}`) || {};
                const microcopy = workloadMicrocopy(workload, env);
                const tooltipBase = `${codStr} · ${wsjfStr}${hpcStr}`;
                const tooltip = microcopy && microcopy.length > 0 ? `${tooltipBase}\n${microcopy}` : tooltipBase;
                rows.push({ label, tooltip, codAvg, isGap, workloads: workload });
            }
            const lens = this.currentLens;
            function matchesLens(workloads) {
                if (lens === 'ALL')
                    return true;
                if (lens === 'ML')
                    return workloads.includes('ML');
                if (lens === 'HPC')
                    return workloads.includes('HPC');
                if (lens === 'STATS_DEVICE') {
                    return workloads.includes('Stats') || workloads.includes('Device/Web');
                }
                return true;
            }
            const filteredRows = rows.filter(row => matchesLens(row.workloads));
            filteredRows.sort((a, b) => {
                var _a, _b;
                if (a.isGap !== b.isGap)
                    return a.isGap ? -1 : 1;
                const ac = (_a = a.codAvg) !== null && _a !== void 0 ? _a : 0;
                const bc = (_b = b.codAvg) !== null && _b !== void 0 ? _b : 0;
                if (ac !== bc)
                    return bc - ac;
                return a.label.localeCompare(b.label);
            });
            const items = [];
            for (const row of filteredRows) {
                // Enhanced label with severity and framework indicators
                let displayLabel = row.label;
                const badges = [];
                // Add severity indicators based on COD
                if (row.codAvg !== undefined) {
                    if (row.codAvg > 10000) {
                        badges.push('🔴');
                    }
                    else if (row.codAvg > 5000) {
                        badges.push('🟠');
                    }
                    else if (row.codAvg > 1000) {
                        badges.push('🟡');
                    }
                }
                // Add framework badges for ML
                if (row.workloads.includes('ML')) {
                    const patternLower = row.label.toLowerCase();
                    if (patternLower.includes('tensorflow') || patternLower.includes('tf-')) {
                        badges.push('TF');
                    }
                    else if (patternLower.includes('pytorch') || patternLower.includes('torch')) {
                        badges.push('PyTorch');
                    }
                }
                if (badges.length > 0) {
                    displayLabel = `[${badges.join(' ')}] ${displayLabel}`;
                }
                const item = new vscode.TreeItem(displayLabel, vscode.TreeItemCollapsibleState.None);
                const loadPart = lastSystemLoad ? `load=${lastSystemLoad}` : '';
                const cpuPart = lastCpuIdle !== undefined ? `cpu_idle=${lastCpuIdle}%` : '';
                const summary = [row.tooltip, loadPart, cpuPart].filter(Boolean).join(' · ');
                // Enhanced tooltip with context-specific guidance
                let tooltipText = summary;
                // Add framework-specific guidance
                if (row.workloads.includes('ML')) {
                    const patternLower = row.label.toLowerCase();
                    if (patternLower.includes('tensorflow') || patternLower.includes('tf-')) {
                        tooltipText += `\n\n🔧 TensorFlow: Focus on input pipelines, graph optimization, TPU/GPU utilization.`;
                    }
                    else if (patternLower.includes('pytorch') || patternLower.includes('torch')) {
                        tooltipText += `\n\n🔧 PyTorch: Focus on DataLoader throughput, GPU utilization, gradient stability.`;
                    }
                }
                if (row.workloads.includes('HPC')) {
                    tooltipText += `\n\n⚡ HPC: Monitor queue times, cluster health, network bottlenecks.`;
                }
                if (row.workloads.includes('Stats')) {
                    tooltipText += `\n\n📊 Stats: Verify robustness, sample size, multiple-testing corrections.`;
                }
                if (row.workloads.includes('Device/Web')) {
                    tooltipText += `\n\n📱 Device/Web: Check cross-device coverage, web vitals, graceful degradation.`;
                }
                if (baselineStatus === 'REGRESSION' && row.isGap) {
                    tooltipText = `${tooltipText}\n\n⚠️ BASELINE REGRESSION: Current average score is more than 10% below baseline. High-COD gaps should be treated as regression-critical.`;
                    item.label = `[REGRESSION] ${displayLabel}`;
                    item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'));
                }
                // Enhanced icons with color coding
                if (!item.iconPath) {
                    if (row.isGap) {
                        item.iconPath = new vscode.ThemeIcon('alert', new vscode.ThemeColor('errorForeground'));
                    }
                    else if (row.workloads.includes('ML')) {
                        const patternLower = row.label.toLowerCase();
                        if (patternLower.includes('tensorflow') || patternLower.includes('tf-')) {
                            item.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
                        }
                        else if (patternLower.includes('pytorch') || patternLower.includes('torch')) {
                            item.iconPath = new vscode.ThemeIcon('flame', new vscode.ThemeColor('charts.orange'));
                        }
                        else {
                            item.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
                        }
                    }
                    else if (row.workloads.includes('HPC')) {
                        item.iconPath = new vscode.ThemeIcon('server-process', new vscode.ThemeColor('charts.red'));
                    }
                    else if (row.workloads.includes('Stats')) {
                        item.iconPath = new vscode.ThemeIcon('graph', new vscode.ThemeColor('charts.green'));
                    }
                    else if (row.workloads.includes('Device/Web')) {
                        item.iconPath = new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.purple'));
                    }
                }
                // Add context value for context menu
                item.contextValue = 'goalieEconomicGap';
                if (row.workloads.includes('ML'))
                    item.contextValue += '.ml';
                if (row.workloads.includes('HPC'))
                    item.contextValue += '.hpc';
                if (row.workloads.includes('Stats'))
                    item.contextValue += '.stats';
                if (row.workloads.includes('Device/Web'))
                    item.contextValue += '.device';
                if (row.isGap)
                    item.contextValue += '.gap';
                item.tooltip = tooltipText;
                item.description = summary;
                items.push(item);
            }
            const proposals = this.latestCodeFixProposals;
            if (proposals && proposals.length) {
                for (const proposal of proposals) {
                    const baseLabel = proposal.pattern ? String(proposal.pattern) : 'Unknown pattern';
                    const needsApproval = proposal.approvalRequired === true;
                    const approver = proposal.approverRole ? String(proposal.approverRole) : 'governance owner';
                    const mode = typeof proposal.mode === 'string' ? proposal.mode : 'dry-run';
                    const autoEligible = proposal.approvalRequired === false && mode === 'apply';
                    let badge = '';
                    if (autoEligible) {
                        badge = '[AUTO-ELIGIBLE]';
                    }
                    else if (needsApproval) {
                        badge = '[APPROVAL REQUIRED]';
                    }
                    else if (mode === 'dry-run') {
                        badge = '[DRY-RUN]';
                    }
                    const labelPrefix = needsApproval ? '⚠️ Fix:' : '✅ Fix:';
                    const baseItemLabel = `${labelPrefix} ${baseLabel}`;
                    const itemLabel = badge ? `${badge} ${baseItemLabel}` : baseItemLabel;
                    const fixItem = new vscode.TreeItem(itemLabel, vscode.TreeItemCollapsibleState.None);
                    const snippetSource = (typeof proposal.codeSnippet === 'string' && proposal.codeSnippet) ||
                        (typeof proposal.configSnippet === 'string' && proposal.configSnippet) ||
                        (typeof proposal.testSnippet === 'string' && proposal.testSnippet) ||
                        '';
                    const snippetLines = snippetSource.split(/\r?\n/).filter((l) => l.trim().length > 0);
                    const preview = snippetLines.slice(0, 5).join('\n');
                    const approvalLabel = needsApproval ? `Requires approval (${approver})` : 'Auto-approvable fix';
                    const modeLabel = mode === 'apply' ? 'Policy: apply' : 'Policy: dry-run';
                    const summaryParts = [proposal.description || '', approvalLabel, modeLabel].filter(Boolean);
                    fixItem.description = summaryParts.join(' · ');
                    let tooltip = summaryParts.join('\n');
                    if (preview) {
                        tooltip = tooltip ? `${tooltip}\n\n${preview}` : preview;
                    }
                    fixItem.tooltip = tooltip;
                    const hasFilePath = typeof proposal.filePath === 'string' && proposal.filePath.trim().length > 0;
                    fixItem.contextValue = hasFilePath ? 'goalieCodeFixProposalWithPath' : 'goalieCodeFixProposal';
                    fixItem.command = {
                        command: 'goalieDashboard.viewCodeFixProposal',
                        title: 'View Code Fix Proposal',
                        arguments: [proposal],
                    };
                    items.push(fixItem);
                }
            }
            return items;
        });
    }
}
class DepthLadderTimelineProvider {
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
            const goalieDir = getGoalieDir(this.workspaceRoot);
            if (element || !goalieDir) {
                return [];
            }
            const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
            if (!fs.existsSync(metricsPath)) {
                return [];
            }
            const lines = fs.readFileSync(metricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
            const events = [];
            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    if (obj.type === 'pattern_depth_ladder' && typeof obj.depth === 'number') {
                        events.push({
                            timestamp: obj.timestamp || '',
                            depth: obj.depth,
                            run: obj.run,
                            iteration: obj.iteration,
                            circle: obj.circle,
                        });
                    }
                }
                catch (_a) {
                    // ignore malformed lines
                }
            }
            events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            return events.map(ev => {
                var _a, _b, _c;
                const label = `${ev.timestamp || 'unknown'} · depth ${ev.depth}`;
                const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
                item.description = `run=${(_a = ev.run) !== null && _a !== void 0 ? _a : ''} iter=${(_b = ev.iteration) !== null && _b !== void 0 ? _b : ''} circle=${(_c = ev.circle) !== null && _c !== void 0 ? _c : ''}`;
                return item;
            });
        });
    }
}
function detectDefaultLensFromMetrics(workspaceRoot) {
    const goalieDir = getGoalieDir(workspaceRoot);
    if (!goalieDir) {
        return 'ALL';
    }
    const metricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    if (!fs.existsSync(metricsPath)) {
        return 'ALL';
    }
    const lines = fs.readFileSync(metricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
    const counts = { ML: 0, HPC: 0, STATS_DEVICE: 0 };
    for (const line of lines) {
        try {
            const obj = JSON.parse(line);
            const pattern = obj.pattern;
            if (!pattern)
                continue;
            const rawTags = Array.isArray(obj.tags) ? obj.tags.map((t) => String(t)) : [];
            const tags = workloadTags(pattern, rawTags);
            if (tags.includes('ML'))
                counts.ML++;
            if (tags.includes('HPC'))
                counts.HPC++;
            if (tags.includes('Stats') || tags.includes('Device/Web'))
                counts.STATS_DEVICE++;
        }
        catch (_a) {
            // ignore malformed lines
        }
    }
    const entries = [
        ['ML', counts.ML],
        ['HPC', counts.HPC],
        ['STATS_DEVICE', counts.STATS_DEVICE],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    const [topLens, topCount] = entries[0];
    if (!topCount) {
        return 'ALL';
    }
    return topLens;
}
const goalieGapsProvider_1 = require("./goalieGapsProvider");
const processFlowMetricsProvider_1 = require("./processFlowMetricsProvider");
function openKanbanItem(item) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!item.payload)
            return;
        const filePath = item.payload.filePath;
        if (filePath && fs.existsSync(filePath)) {
            const doc = yield vscode.workspace.openTextDocument(filePath);
            yield vscode.window.showTextDocument(doc);
        }
        else {
            vscode.window.showInformationMessage(`No file associated with this item or file not found: ${filePath}`);
        }
    });
}
function moveKanbanItem(item) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!item.payload || !item.section)
            return;
        const options = ['NOW', 'NEXT', 'LATER', 'DONE']; // DONE is valid target
        const target = yield vscode.window.showQuickPick(options.filter(o => o !== item.section), {
            placeHolder: `Move "${item.label}" to...`
        });
        if (target) {
            const goalieDir = getGoalieDir((_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath);
            if (goalieDir) {
                try {
                    moveKanbanEntry(goalieDir, item.payload, item.section, target);
                    vscode.commands.executeCommand('goalieDashboard.refreshKanban');
                }
                catch (e) {
                    vscode.window.showErrorMessage(`Failed to move item: ${e.message}`);
                }
            }
        }
    });
}
function activate(context) {
    var _a, _b, _c, _d;
    const outputChannel = vscode.window.createOutputChannel('Goalie Debug');
    outputChannel.appendLine('Goalie Extension Activated');
    const root = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
    outputChannel.appendLine(`Workspace Root: ${root}`);
    const extensionVersion = (_c = context.extension.packageJSON) === null || _c === void 0 ? void 0 : _c.version;
    const extensionName = (_d = context.extension.packageJSON) === null || _d === void 0 ? void 0 : _d.name;
    const vscodeVersion = vscode.version;
    const telemetry = new telemetry_1.GoalieTelemetry(outputChannel, root);
    context.subscriptions.push({ dispose: () => telemetry.dispose() });
    outputChannel.appendLine('Initializing Providers...');
    const kanbanProvider = new GoalieKanbanProvider(root, outputChannel);
    const patternMetricsProvider = new PatternMetricsProvider(root, context);
    const governanceEconomicsProvider = new GovernanceEconomicsProvider(root);
    const depthTimelineProvider = new DepthLadderTimelineProvider(root);
    const sessionStats = new Map();
    const gapsProvider = new goalieGapsProvider_1.GoalieGapsProvider(root, outputChannel, sessionStats);
    const dtCalibrationProvider = new dtCalibrationProvider_1.DtCalibrationProvider(root, outputChannel);
    const processFlowMetricsProvider = new processFlowMetricsProvider_1.ProcessFlowMetricsProvider(root);
    outputChannel.appendLine('Providers Initialized.');
    const config = vscode.workspace.getConfiguration('goalie');
    const autoDetect = config.get('autoDetectLens', true);
    const explicitDefault = config.get('defaultLens');
    const persistedLens = context.workspaceState.get('goalie.currentLens');
    const enableRealtimeDashboard = config.get('enableRealtimeDashboard', false) ||
        process.env.AF_ENABLE_REALTIME_DASHBOARD === '1';
    let liveGapsPanel;
    const applyLens = (lens) => {
        governanceEconomicsProvider.setLens(lens);
        gapsProvider.setLens(lens);
    };
    // Initial lens: explicit defaultLens config > last persisted lens > auto-detected from metrics
    if (explicitDefault) {
        applyLens(explicitDefault);
    }
    else if (persistedLens) {
        applyLens(persistedLens);
    }
    else if (autoDetect) {
        const detected = detectDefaultLensFromMetrics(root);
        applyLens(detected);
    }
    function persistLensSelection(lens) {
        context.workspaceState.update('goalie.currentLens', lens);
    }
    function colorForWorkloads(tags) {
        if (tags.includes('ML'))
            return '#1f77b4'; // blue
        if (tags.includes('HPC'))
            return '#d62728'; // red
        if (tags.includes('Stats'))
            return '#2ca02c'; // green
        if (tags.includes('Device/Web'))
            return '#9467bd'; // purple
        return '#cccccc';
    }
    function renderLiveGapsHtml(governanceJson, retroJson) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const govGaps = Array.isArray(governanceJson === null || governanceJson === void 0 ? void 0 : governanceJson.topEconomicGaps)
            ? governanceJson.topEconomicGaps
            : [];
        const retroGaps = Array.isArray(retroJson === null || retroJson === void 0 ? void 0 : retroJson.topEconomicGaps)
            ? retroJson.topEconomicGaps
            : [];
        const observabilityBuckets = Array.isArray(governanceJson === null || governanceJson === void 0 ? void 0 : governanceJson.observabilityActions)
            ? governanceJson.observabilityActions
            : [];
        const pickNumber = (row, fields) => {
            for (const f of fields) {
                const v = row && row[f];
                if (typeof v === 'number' && !Number.isNaN(v)) {
                    return v;
                }
            }
            return undefined;
        };
        const findObservabilityStatus = (circle, depth) => {
            const bucket = observabilityBuckets.find((b) => {
                var _a;
                const bc = String((_a = b.circle) !== null && _a !== void 0 ? _a : '<none>');
                const bd = typeof b.depth === 'number' ? b.depth : 0;
                return bc === circle && bd === depth;
            });
            if (!bucket) {
                return 'No observability actions';
            }
            const actionsCount = typeof bucket.actions === 'number' ? bucket.actions : 0;
            const tags = Array.isArray(bucket.tags)
                ? bucket.tags.map((t) => String(t)).join(', ')
                : '';
            if (!actionsCount && !tags) {
                return 'Observability declared (no actions)';
            }
            const base = `Actions=${actionsCount}`;
            return tags ? `${base} · [${tags}]` : base;
        };
        const govRows = govGaps.map((row) => {
            var _a, _b;
            const pattern = String((_a = row.pattern) !== null && _a !== void 0 ? _a : '<unknown>');
            const circle = String((_b = row.circle) !== null && _b !== void 0 ? _b : '<none>');
            const depth = typeof row.depth === 'number' ? row.depth : 0;
            const workloads = workloadTags(pattern);
            const color = colorForWorkloads(workloads);
            const totalImpact = pickNumber(row, ['totalImpactAvg', 'totalImpact', 'impactScore']);
            const cod = pickNumber(row, ['codAvg', 'cod']);
            const wsjf = pickNumber(row, ['wsjfAvg', 'wsjf']);
            const computeCost = pickNumber(row, ['computeAvg', 'computeCostAvg', 'computeCost']);
            const observability = findObservabilityStatus(circle, depth);
            return { pattern, circle, depth, cod, totalImpact, wsjf, computeCost, observability, workloads, color };
        });
        govRows.sort((a, b) => {
            var _a, _b, _c, _d;
            const ai = (_b = (_a = a.totalImpact) !== null && _a !== void 0 ? _a : a.cod) !== null && _b !== void 0 ? _b : 0;
            const bi = (_d = (_c = b.totalImpact) !== null && _c !== void 0 ? _c : b.cod) !== null && _d !== void 0 ? _d : 0;
            return bi - ai;
        });
        const govRowsHtml = govRows.slice(0, 10).map(row => {
            const impactStr = row.totalImpact !== undefined ? row.totalImpact.toFixed(2) : 'n/a';
            const codStr = row.cod !== undefined ? row.cod.toFixed(2) : 'n/a';
            const wsjfStr = row.wsjf !== undefined ? row.wsjf.toFixed(2) : 'n/a';
            const computeStr = row.computeCost !== undefined ? row.computeCost.toFixed(2) : 'n/a';
            const observabilityStr = row.observability;
            const workloadsStr = row.workloads.join(', ');
            return `<tr style="color:${row.color}">
  <td>${row.pattern}</td>
  <td>${row.circle}</td>
  <td>${row.depth}</td>
  <td>${impactStr}</td>
  <td>${codStr}</td>
  <td>${wsjfStr}</td>
  <td>${computeStr}</td>
  <td>${observabilityStr}</td>
  <td>${workloadsStr}</td>
</tr>`;
        }).join('\n');
        const retroRows = retroGaps.map((row) => {
            var _a, _b;
            const pattern = String((_a = row.pattern) !== null && _a !== void 0 ? _a : '<unknown>');
            const circle = String((_b = row.circle) !== null && _b !== void 0 ? _b : '<none>');
            const depth = typeof row.depth === 'number' ? row.depth : 0;
            const workloads = Array.isArray(row.workloadTags)
                ? row.workloadTags
                : workloadTags(pattern);
            const color = colorForWorkloads(workloads);
            const cod = pickNumber(row, ['codAvg', 'cod']);
            const wsjf = pickNumber(row, ['wsjfAvg', 'wsjf']);
            const codThreshold = pickNumber(row, ['codThreshold']);
            return { pattern, circle, depth, cod, wsjf, codThreshold, workloads, color };
        });
        retroRows.sort((a, b) => {
            var _a, _b;
            const ac = (_a = a.cod) !== null && _a !== void 0 ? _a : 0;
            const bc = (_b = b.cod) !== null && _b !== void 0 ? _b : 0;
            return bc - ac;
        });
        const retroRowsHtml = retroRows.slice(0, 10).map(row => {
            const codStr = row.cod !== undefined ? row.cod.toFixed(2) : 'n/a';
            const wsjfStr = row.wsjf !== undefined ? row.wsjf.toFixed(2) : 'n/a';
            const thresholdStr = row.codThreshold !== undefined ? row.codThreshold.toFixed(2) : 'n/a';
            const workloadsStr = row.workloads.join(', ');
            return `<tr style="color:${row.color}">
  <td>${row.pattern}</td>
  <td>${row.circle}</td>
  <td>${row.depth}</td>
  <td>${codStr}</td>
  <td>${wsjfStr}</td>
  <td>${thresholdStr}</td>
  <td>${workloadsStr}</td>
</tr>`;
        }).join('\n');
        const governanceSummary = governanceJson === null || governanceJson === void 0 ? void 0 : governanceJson.governanceSummary;
        const relentless = governanceJson === null || governanceJson === void 0 ? void 0 : governanceJson.relentlessExecution;
        const retroBaseline = retroJson === null || retroJson === void 0 ? void 0 : retroJson.baselineComparison;
        const govBaseline = governanceJson === null || governanceJson === void 0 ? void 0 : governanceJson.baselineComparison;
        const governanceSummaryHtml = governanceSummary
            ? `<p><strong>Governance:</strong> total=${(_a = governanceSummary.total) !== null && _a !== void 0 ? _a : 'n/a'}, ok=${(_b = governanceSummary.ok) !== null && _b !== void 0 ? _b : 'n/a'}, failed=${(_c = governanceSummary.failed) !== null && _c !== void 0 ? _c : 'n/a'}</p>`
            : '';
        const relentlessHtml = relentless
            ? `<p><strong>Relentless Execution:</strong> pctActionsDone=${(_d = relentless.pctActionsDone) !== null && _d !== void 0 ? _d : 'n/a'}%, avgCycleTimeSec=${(_e = relentless.avgCycleTimeSec) !== null && _e !== void 0 ? _e : 'n/a'}</p>`
            : '';
        const retroBaselineDetailHtml = retroBaseline
            ? (() => {
                var _a, _b, _c, _d, _e, _f;
                const base = typeof retroBaseline.baselineScore === 'number'
                    ? retroBaseline.baselineScore.toFixed(2)
                    : (_a = retroBaseline.baselineScore) !== null && _a !== void 0 ? _a : 'n/a';
                const curr = typeof retroBaseline.currentScore === 'number'
                    ? retroBaseline.currentScore.toFixed(2)
                    : (_b = retroBaseline.currentScore) !== null && _b !== void 0 ? _b : 'n/a';
                const deltaVal = typeof retroBaseline.delta === 'number'
                    ? retroBaseline.delta.toFixed(2)
                    : (_c = retroBaseline.delta) !== null && _c !== void 0 ? _c : 'n/a';
                const deltaPctVal = typeof retroBaseline.deltaPct === 'number'
                    ? `${retroBaseline.deltaPct.toFixed(1)}%`
                    : (_d = retroBaseline.deltaPct) !== null && _d !== void 0 ? _d : 'n/a';
                const hasRegression = !!retroBaseline.regression;
                const hasImprovement = !!retroBaseline.improvement;
                const cls = hasRegression
                    ? 'delta-regression'
                    : hasImprovement
                        ? 'delta-improvement'
                        : '';
                const deltaHtml = cls
                    ? `<span class="${cls}">${deltaVal} (${deltaPctVal})</span>`
                    : `${deltaVal} (${deltaPctVal})`;
                const tsPart = retroBaseline.baselineTimestamp || retroBaseline.currentTimestamp
                    ? `, baselineTs=${(_e = retroBaseline.baselineTimestamp) !== null && _e !== void 0 ? _e : 'n/a'}, currentTs=${(_f = retroBaseline.currentTimestamp) !== null && _f !== void 0 ? _f : 'n/a'}`
                    : '';
                return `<h2>Retro Baseline Comparison</h2>
  <p><strong>Score:</strong> baseline=${base}, current=${curr}, delta=${deltaHtml}, regression=${hasRegression ? 'yes' : 'no'}, improvement=${hasImprovement ? 'yes' : 'no'}${tsPart}</p>`;
            })()
            : '';
        const retroRegressionRows = ((_f = retroBaseline === null || retroBaseline === void 0 ? void 0 : retroBaseline.topRegressions) !== null && _f !== void 0 ? _f : []).map((row) => {
            const pct = typeof row.deltaPct === 'number'
                ? `${row.deltaPct.toFixed(1)}%`
                : 'n/a';
            const base = typeof row.baselineScore === 'number'
                ? row.baselineScore.toFixed(2)
                : 'n/a';
            const curr = typeof row.currentScore === 'number'
                ? row.currentScore.toFixed(2)
                : 'n/a';
            const workloads = Array.isArray(row.workloadTags) ? row.workloadTags.join(', ') : '';
            return `<tr>
  <td>${row.pattern}</td>
  <td>${row.circle}</td>
  <td>${row.depth}</td>
  <td>${base}</td>
  <td>${curr}</td>
  <td>${pct}</td>
  <td>${workloads}</td>
</tr>`;
        }).join('\n');
        const retroImprovementRows = ((_g = retroBaseline === null || retroBaseline === void 0 ? void 0 : retroBaseline.topImprovements) !== null && _g !== void 0 ? _g : []).map((row) => {
            const pct = typeof row.deltaPct === 'number'
                ? `${row.deltaPct.toFixed(1)}%`
                : 'n/a';
            const base = typeof row.baselineScore === 'number'
                ? row.baselineScore.toFixed(2)
                : 'n/a';
            const curr = typeof row.currentScore === 'number'
                ? row.currentScore.toFixed(2)
                : 'n/a';
            const workloads = Array.isArray(row.workloadTags) ? row.workloadTags.join(', ') : '';
            return `<tr>
  <td>${row.pattern}</td>
  <td>${row.circle}</td>
  <td>${row.depth}</td>
  <td>${base}</td>
  <td>${curr}</td>
  <td>${pct}</td>
  <td>${workloads}</td>
</tr>`;
        }).join('\n');
        const retroRegressionsTableHtml = retroBaseline && retroBaseline.topRegressions && retroBaseline.topRegressions.length
            ? `<h2>Retro Baseline Regressions (Top 3)</h2>
  <table>
    <thead>
      <tr>
        <th>Pattern</th>
        <th>Circle</th>
        <th>Depth</th>
        <th>Baseline CoD</th>
        <th>Current CoD</th>
        <th>Delta %</th>
        <th>Workloads</th>
      </tr>
    </thead>
    <tbody>
      ${retroRegressionRows}
    </tbody>
  </table>`
            : '';
        const retroImprovementsTableHtml = retroBaseline && retroBaseline.topImprovements && retroBaseline.topImprovements.length
            ? `<h2>Retro Baseline Improvements (Top 3)</h2>
  <table>
    <thead>
      <tr>
        <th>Pattern</th>
        <th>Circle</th>
        <th>Depth</th>
        <th>Baseline CoD</th>
        <th>Current CoD</th>
        <th>Delta %</th>
        <th>Workloads</th>
      </tr>
    </thead>
    <tbody>
      ${retroImprovementRows}
    </tbody>
  </table>`
            : '';
        const governanceBaselineSummaryHtml = govBaseline
            ? (() => {
                const delta = typeof govBaseline.overallDelta === 'number'
                    ? govBaseline.overallDelta
                    : undefined;
                const deltaPct = typeof govBaseline.overallDeltaPct === 'number'
                    ? govBaseline.overallDeltaPct
                    : undefined;
                const cls = delta !== undefined
                    ? delta > 0
                        ? 'delta-regression'
                        : delta < 0
                            ? 'delta-improvement'
                            : ''
                    : '';
                const deltaStr = delta !== undefined ? delta.toFixed(2) : 'n/a';
                const deltaPctStr = deltaPct !== undefined ? `${deltaPct.toFixed(1)}%` : 'n/a';
                const wrapped = cls ? `<span class="${cls}">${deltaStr} (${deltaPctStr})</span>` : `${deltaStr} (${deltaPctStr})`;
                return `<h2>Governance Baseline Comparison</h2>
  <p><strong>Governance CoD Delta:</strong> ${wrapped}</p>`;
            })()
            : '';
        const governanceRegressionRows = ((_h = govBaseline === null || govBaseline === void 0 ? void 0 : govBaseline.topRegressions) !== null && _h !== void 0 ? _h : []).map((row) => {
            const base = typeof row.baselineScore === 'number'
                ? row.baselineScore.toFixed(2)
                : 'n/a';
            const curr = typeof row.currentScore === 'number'
                ? row.currentScore.toFixed(2)
                : 'n/a';
            const delta = typeof row.delta === 'number'
                ? row.delta.toFixed(2)
                : 'n/a';
            const pct = typeof row.deltaPct === 'number'
                ? `${row.deltaPct.toFixed(1)}%`
                : 'n/a';
            const cls = typeof row.delta === 'number'
                ? row.delta > 0
                    ? 'delta-regression'
                    : row.delta < 0
                        ? 'delta-improvement'
                        : ''
                : '';
            const deltaCell = cls ? `<span class="${cls}">${delta}</span>` : delta;
            const pctCell = cls ? `<span class="${cls}">${pct}</span>` : pct;
            return `<tr>
  <td>${row.pattern}</td>
  <td>${row.circle}</td>
  <td>${row.depth}</td>
  <td>${base}</td>
  <td>${curr}</td>
  <td>${deltaCell}</td>
  <td>${pctCell}</td>
</tr>`;
        }).join('\n');
        const governanceImprovementRows = ((_j = govBaseline === null || govBaseline === void 0 ? void 0 : govBaseline.topImprovements) !== null && _j !== void 0 ? _j : []).map((row) => {
            const base = typeof row.baselineScore === 'number'
                ? row.baselineScore.toFixed(2)
                : 'n/a';
            const curr = typeof row.currentScore === 'number'
                ? row.currentScore.toFixed(2)
                : 'n/a';
            const delta = typeof row.delta === 'number'
                ? row.delta.toFixed(2)
                : 'n/a';
            const pct = typeof row.deltaPct === 'number'
                ? `${row.deltaPct.toFixed(1)}%`
                : 'n/a';
            const cls = typeof row.delta === 'number'
                ? row.delta > 0
                    ? 'delta-regression'
                    : row.delta < 0
                        ? 'delta-improvement'
                        : ''
                : '';
            const deltaCell = cls ? `<span class="${cls}">${delta}</span>` : delta;
            const pctCell = cls ? `<span class="${cls}">${pct}</span>` : pct;
            return `<tr>
  <td>${row.pattern}</td>
  <td>${row.circle}</td>
  <td>${row.depth}</td>
  <td>${base}</td>
  <td>${curr}</td>
  <td>${deltaCell}</td>
  <td>${pctCell}</td>
</tr>`;
        }).join('\n');
        const governanceRegressionsTableHtml = govBaseline && govBaseline.topRegressions && govBaseline.topRegressions.length
            ? `<h2>Governance Baseline Regressions (Top 3)</h2>
  <table>
    <thead>
      <tr>
        <th>Pattern</th>
        <th>Circle</th>
        <th>Depth</th>
        <th>Baseline CoD</th>
        <th>Current CoD</th>
        <th>Delta</th>
        <th>Delta %</th>
      </tr>
    </thead>
    <tbody>
      ${governanceRegressionRows}
    </tbody>
  </table>`
            : '';
        const governanceImprovementsTableHtml = govBaseline && govBaseline.topImprovements && govBaseline.topImprovements.length
            ? `<h2>Governance Baseline Improvements (Top 3)</h2>
  <table>
    <thead>
      <tr>
        <th>Pattern</th>
        <th>Circle</th>
        <th>Depth</th>
        <th>Baseline CoD</th>
        <th>Current CoD</th>
        <th>Delta</th>
        <th>Delta %</th>
      </tr>
    </thead>
    <tbody>
      ${governanceImprovementRows}
    </tbody>
  </table>`
            : '';
        const insightsSummary = retroJson === null || retroJson === void 0 ? void 0 : retroJson.insightsSummary;
        let forensicSummaryHtml = '';
        let unverifiedHighPriorityTableHtml = '';
        if (insightsSummary) {
            const verifiedCount = typeof insightsSummary.verifiedCount === 'number' ? insightsSummary.verifiedCount : 0;
            const totalActions = typeof insightsSummary.totalActions === 'number' ? insightsSummary.totalActions : 0;
            const percentage = totalActions > 0 ? ((verifiedCount / totalActions) * 100).toFixed(1) : '0.0';
            const avgCodDelta = typeof insightsSummary.avgCodDeltaPct === 'number'
                ? insightsSummary.avgCodDeltaPct
                : undefined;
            const medianFreqDelta = typeof insightsSummary.medianFreqDeltaPct === 'number'
                ? insightsSummary.medianFreqDeltaPct
                : undefined;
            const highImpact = typeof insightsSummary.highImpactActions === 'number'
                ? insightsSummary.highImpactActions
                : undefined;
            const hasEnhanced = avgCodDelta !== undefined || medianFreqDelta !== undefined || highImpact !== undefined;
            if (totalActions === 0) {
                forensicSummaryHtml =
                    '<p class="empty-state">No completed actions found for forensic verification yet.</p>';
            }
            else {
                const lines = [
                    `<p><strong>Forensic Verification:</strong> ${verifiedCount}/${totalActions} actions verified (${percentage}%)</p>`,
                ];
                if (hasEnhanced) {
                    if (avgCodDelta !== undefined) {
                        lines.push(`<p>Average COD reduction: ${avgCodDelta.toFixed(1)}%</p>`);
                    }
                    if (medianFreqDelta !== undefined) {
                        lines.push(`<p>Median frequency reduction: ${medianFreqDelta.toFixed(1)}%</p>`);
                    }
                    if (highImpact !== undefined) {
                        lines.push(`<p>High-impact actions: ${highImpact}</p>`);
                    }
                }
                else {
                    lines.push('<p class="empty-state">Enhanced forensic verification requires pattern mapping in CONSOLIDATED_ACTIONS.yaml and aligned pattern metrics around action completion times.</p>');
                }
                forensicSummaryHtml = lines.join('\n');
            }
            const unverified = Array.isArray(insightsSummary.unverifiedHighPriorityActions)
                ? insightsSummary.unverifiedHighPriorityActions
                : [];
            if (unverified.length > 0) {
                const rows = unverified.slice(0, 5).map((row) => {
                    const cod = typeof row.codAvg === 'number' && !Number.isNaN(row.codAvg)
                        ? row.codAvg.toFixed(2)
                        : 'n/a';
                    return `<tr>
  <td>${row.actionId}</td>
  <td>${row.pattern}</td>
  <td>${cod}</td>
</tr>`;
                });
                unverifiedHighPriorityTableHtml = `<h2>Unverified High-Priority Actions (Top 5)</h2>
<table>
  <thead>
    <tr>
      <th>Action ID</th>
      <th>Pattern</th>
      <th>Average COD</th>
    </tr>
  </thead>
  <tbody>
    ${rows.join('\n')}
  </tbody>
</table>`;
            }
        }
        const goalieDirJson = (governanceJson === null || governanceJson === void 0 ? void 0 : governanceJson.goalieDir) || (retroJson === null || retroJson === void 0 ? void 0 : retroJson.goalieDir) || '';
        const retroHasBaseline = !!retroBaseline;
        const govHasBaseline = !!govBaseline;
        const workspaceRoot = root || '';
        const configGoalieDir = getGoalieDir(root) || '';
        const realtimeEnabled = enableRealtimeDashboard;
        const dataGoalieDir = configGoalieDir || goalieDirJson;
        const metricsLogPath = dataGoalieDir ? path.join(dataGoalieDir, 'metrics_log.jsonl') : '';
        const patternMetricsPath = dataGoalieDir ? path.join(dataGoalieDir, 'pattern_metrics.jsonl') : '';
        const metricsLogExists = metricsLogPath ? fs.existsSync(metricsLogPath) : false;
        const patternMetricsExists = patternMetricsPath ? fs.existsSync(patternMetricsPath) : false;
        const yesGreen = '<span style="color:#2ca02c;font-weight:600;">yes</span>';
        const noGray = '<span style="color:#999;">no</span>';
        const retroBaselineHtml = retroHasBaseline ? yesGreen : noGray;
        const govBaselineHtml = govHasBaseline ? yesGreen : noGray;
        const realtimeHtml = realtimeEnabled ? yesGreen : noGray;
        const metricsLogHtml = metricsLogExists ? yesGreen : noGray;
        const patternMetricsHtml = patternMetricsExists ? yesGreen : noGray;
        const versionStr = extensionVersion || 'n/a';
        const extensionLabel = extensionName ? `${extensionName} v${versionStr}` : `v${versionStr}`;
        const normJson = goalieDirJson ? path.resolve(goalieDirJson) : '';
        const normConfig = configGoalieDir ? path.resolve(configGoalieDir) : '';
        const hasBothGoalieDirs = !!normJson && !!normConfig;
        const pathsDiffer = hasBothGoalieDirs && normJson.toLowerCase() !== normConfig.toLowerCase();
        const pathWarningLine = pathsDiffer
            ? '<div style="color:#d62728;font-weight:600;font-size:11px;">⚠️ Path mismatch detected: extension may be reading different data than agents</div>'
            : '';
        const debugInfoText = [
            `workspaceRoot=${workspaceRoot || 'n/a'}`,
            `goalieDir(JSON)=${goalieDirJson || 'n/a'}`,
            `goalieDir(config)=${configGoalieDir || 'n/a'}`,
            pathsDiffer
                ? 'pathWarning=Path mismatch detected: extension may be reading different data than agents'
                : 'pathWarning=none',
            `extension=${extensionLabel}`,
            `vscodeVersion=${vscodeVersion}`,
            `realtimeDashboard=${realtimeEnabled ? 'yes' : 'no'}`,
            `retroBaseline=${retroHasBaseline ? 'yes' : 'no'}`,
            `governanceBaseline=${govHasBaseline ? 'yes' : 'no'}`,
            `metrics_log.jsonl=${metricsLogExists ? 'yes' : 'no'}`,
            `pattern_metrics.jsonl=${patternMetricsExists ? 'yes' : 'no'}`,
            `goalieDirNormalized(JSON)=${normJson || 'n/a'}`,
            `goalieDirNormalized(config)=${normConfig || 'n/a'}`
        ].join('\n');
        const debugSummaryText = pathsDiffer
            ? 'Debug status: ⚠️ Path mismatch detected'
            : !realtimeEnabled
                ? 'Debug status: ⚠️ Realtime dashboard disabled'
                : (!metricsLogExists || !patternMetricsExists)
                    ? 'Debug status: ⚠️ Missing data files'
                    : 'Debug status: ✓ All OK';
        const debugSummaryColor = pathsDiffer
            ? '#d62728'
            : (!realtimeEnabled || !metricsLogExists || !patternMetricsExists)
                ? '#ff7f0e'
                : '#2ca02c';
        const debugStatusHtml = `
  <div style="margin-top:12px;padding:6px 8px;border-top:1px solid #eee;background:#fafafa;font-size:11px;color:#666;">
    <details style="margin:0;">
      <summary style="cursor:pointer;font-weight:500;font-size:11px;color:${debugSummaryColor};">${debugSummaryText}</summary>
      <div style="margin-top:4px;line-height:1.4;">
        <div title="The VS Code workspace folder path. This is the base directory for all extension operations.">workspaceRoot=${workspaceRoot || 'n/a'}</div>
        <div title="The .goalie directory path reported by federation agents in their JSON output. This is where agents write metrics.">goalieDir(JSON)=${goalieDirJson || 'n/a'}</div>
        <div title="The .goalie directory path the extension uses based on VS Code settings (goalie.directoryPath) or workspace root. This is where panels read data from.">goalieDir(config)=${configGoalieDir || 'n/a'}</div>
        ${pathWarningLine}
        <div title="The Goalie VS Code extension package name and version. Include this in bug reports.">extension=${extensionLabel}</div>
        <div title="The VS Code application version hosting this extension.">VS Code=${vscodeVersion}</div>
        <div title="Whether the realtime dashboard is enabled via goalie.enableRealtimeDashboard setting or AF_ENABLE_REALTIME_DASHBOARD=1 environment variable.">realtimeDashboard=${realtimeHtml} (setting/env)</div>
        <div>retroBaseline=${retroBaselineHtml}</div>
        <div>governanceBaseline=${govBaselineHtml}</div>
        <div title="Required for Depth Ladder Timeline panel. Contains pattern depth ladder events and system metrics.">metrics_log.jsonl=${metricsLogHtml}</div>
        <div title="Required for Pattern Metrics panel. Contains per-pattern economic and telemetry events.">pattern_metrics.jsonl=${patternMetricsHtml}</div>
        <div style="margin-top:6px;"><button type="button" style="font-size:11px;padding:2px 6px;border:1px solid #ccc;border-radius:3px;background:#fff;color:#333;cursor:pointer;" onclick="copyGoalieDebugInfo()" title="Copy all debug information to clipboard for sharing in support requests.">Copy debug info</button></div>
      </div>
    </details>
  </div>`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Goalie Gaps (Live)</title>
  <script>
    const GOALIE_DEBUG_INFO = ${JSON.stringify(debugInfoText)};
    function copyGoalieDebugInfo() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(GOALIE_DEBUG_INFO).catch(() => {});
      }
    }
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; padding: 12px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
    th { background-color: #f3f3f3; }
    .legend { margin-bottom: 8px; font-size: 11px; }
    .legend span { display: inline-block; margin-right: 8px; padding: 2px 4px; border-radius: 3px; }
    .pill-ml { background-color: #1f77b4; color: white; }
    .pill-hpc { background-color: #d62728; color: white; }
    .pill-stats { background-color: #2ca02c; color: white; }
    .pill-device { background-color: #9467bd; color: white; }
    .empty-state { color: #777; font-style: italic; }
  .delta-improvement { color: #2ca02c; font-weight: 600; }
  .delta-regression { color: #d62728; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Goalie Gaps (Live)</h1>
  <div class="legend">
    <span class="pill-ml">ML</span>
    <span class="pill-hpc">HPC</span>
    <span class="pill-stats">Stats</span>
    <span class="pill-device">Device/Web</span>
  </div>
  ${governanceSummaryHtml}
  ${relentlessHtml}
  ${retroBaselineDetailHtml}
  ${retroRegressionsTableHtml}
  ${retroImprovementsTableHtml}
  ${governanceBaselineSummaryHtml}
  ${governanceRegressionsTableHtml}
  ${governanceImprovementsTableHtml}
  <h2>Governance Economic Gaps (Top N by Total Impact)</h2>
  ${govRows.length === 0 ? '<p class="empty-state">No economic gaps currently detected in governance JSON.</p>' : ''}
  ${govRows.length > 0 ? `<table>
    <thead>
      <tr>
        <th>Pattern</th>
        <th>Circle</th>
        <th>Depth</th>
        <th>Total Impact</th>
        <th>COD</th>
        <th>WSJF</th>
        <th>Compute Cost</th>
        <th>Observability</th>
        <th>Workloads</th>
      </tr>
    </thead>
    <tbody>
      ${govRowsHtml}
    </tbody>
  </table>` : ''}

  <h2>Retro Coach Workload Gaps (Top N by COD)</h2>
  ${retroRows.length === 0 ? '<p class="empty-state">No workload-specific retro gaps currently detected.</p>' : ''}
  ${retroRows.length > 0 ? `<table>
    <thead>
      <tr>
        <th>Pattern</th>
        <th>Circle</th>
        <th>Depth</th>
        <th>COD</th>
        <th>WSJF</th>
        <th>COD Threshold</th>
        <th>Workloads</th>
      </tr>
    </thead>
    <tbody>
      ${retroRowsHtml}
    </tbody>
  </table>` : ''}

  <h2>Forensic Verification Summary</h2>
  ${forensicSummaryHtml || '<p class="empty-state">No forensic verification data currently available.</p>'}
  ${unverifiedHighPriorityTableHtml}
  ${debugStatusHtml}

</body>
</html>`;
    }
    function extractJsonFromOutput(stdout) {
        const lines = stdout.split(/\r?\n/);
        const start = lines.findIndex(l => l.trim().startsWith('{'));
        if (start === -1) {
            return undefined;
        }
        let end = lines.length - 1;
        for (let i = lines.length - 1; i >= start; i--) {
            if (lines[i].trim().endsWith('}')) {
                end = i;
                break;
            }
        }
        const jsonText = lines.slice(start, end + 1).join('\n');
        try {
            return JSON.parse(jsonText);
        }
        catch (_a) {
            return undefined;
        }
    }
    function runAfJson(subcommand) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!root) {
                vscode.window.showErrorMessage('No workspace open.');
                return undefined;
            }
            const afScript = path.join(root, 'investing', 'agentic-flow', 'scripts', 'af');
            if (!fs.existsSync(afScript)) {
                outputChannel.appendLine(`[LiveGaps] af script not found at: ${afScript}`);
                return undefined;
            }
            outputChannel.appendLine(`[LiveGaps] Running af ${subcommand} --json`);
            return new Promise(resolve => {
                (0, child_process_1.exec)(`"${afScript}" ${subcommand} --json`, { cwd: root }, (error, stdout, stderr) => {
                    if (error) {
                        outputChannel.appendLine(`[LiveGaps] Error running ${subcommand}: ${error.message}`);
                        if (stderr) {
                            outputChannel.appendLine(`[LiveGaps][stderr] ${stderr}`);
                        }
                        resolve(undefined);
                        return;
                    }
                    if (stderr) {
                        outputChannel.appendLine(`[LiveGaps][stderr] ${stderr}`);
                    }
                    const json = extractJsonFromOutput(stdout);
                    if (!json) {
                        outputChannel.appendLine('[LiveGaps] Failed to parse JSON output.');
                    }
                    resolve(json);
                });
            });
        });
    }
    function refreshLiveGapsPanelIfOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!enableRealtimeDashboard || !liveGapsPanel) {
                return;
            }
            const [governanceJson, retroJson] = yield Promise.all([
                runAfJson('governance-agent'),
                runAfJson('retro-coach'),
            ]);
            if (!governanceJson && !retroJson) {
                liveGapsPanel.webview.html = '<html><body><p>Failed to load governance and retro JSON output. Check Goalie CLI logs.</p></body></html>';
                return;
            }
            liveGapsPanel.webview.html = renderLiveGapsHtml(governanceJson !== null && governanceJson !== void 0 ? governanceJson : {}, retroJson !== null && retroJson !== void 0 ? retroJson : {});
        });
    }
    outputChannel.appendLine('Registering Tree Data Providers...');
    let streamClient;
    const startStreamClient = () => {
        if (!enableRealtimeDashboard) {
            return;
        }
        const goalieDir = getGoalieDir(root);
        const socketOverride = vscode.workspace.getConfiguration('goalie').get('streamSocketPath');
        const socketPath = (0, streamUtils_1.resolveStreamSocketPath)(goalieDir, socketOverride);
        if (!socketPath) {
            outputChannel.appendLine('[Stream] No socket path available; skipping stream client.');
            return;
        }
        if (!streamClient) {
            streamClient = new streamClient_1.StreamClient({
                socketPath,
                telemetry,
                output: outputChannel,
                onEvent: payload => {
                    var _a;
                    if ((payload === null || payload === void 0 ? void 0 : payload.type) === 'governance-json' && payload.data) {
                        governanceEconomicsProvider.setGovernanceJson(payload.data);
                        gapsProvider.refresh();
                    }
                    if ((payload === null || payload === void 0 ? void 0 : payload.type) === 'retro-json' && payload.data) {
                        // Future: refresh retro views if needed
                    }
                    if ((payload === null || payload === void 0 ? void 0 : payload.type) === 'dt-dashboard-summary' && payload.data) {
                        try {
                            const msg = payload.data;
                            dtCalibrationProvider.handleSummaryMessage(msg);
                        }
                        catch (err) {
                            outputChannel.appendLine(`[DT] Error handling dt-dashboard-summary event: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err)}`);
                        }
                    }
                },
            });
            context.subscriptions.push(streamClient);
        }
        streamClient.start(socketPath);
    };
    startStreamClient();
    // -- 1. Real-Time Monitoring (File Watcher) --
    const watcher = vscode.workspace.createFileSystemWatcher('**/.goalie/*.{yaml,jsonl}');
    // Debounce the refresh to avoid spamming updates
    let refreshTimeout;
    const debouncedRefresh = () => {
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(() => {
            outputChannel.appendLine('[FileWatcher] Change detected in .goalie/, refreshing views...');
            kanbanProvider.refresh();
            gapsProvider.refresh();
            patternMetricsProvider.refresh();
            governanceEconomicsProvider.refresh();
            depthTimelineProvider.refresh();
            refreshLiveGapsPanelIfOpen().catch(err => {
                outputChannel.appendLine(`[LiveGaps] Error refreshing live panel: ${err}`);
            });
        }, 300); // 300ms debounce
    };
    context.subscriptions.push(watcher, watcher.onDidChange(debouncedRefresh), watcher.onDidCreate(debouncedRefresh), watcher.onDidDelete(debouncedRefresh));
    outputChannel.appendLine('File Watcher setup for .goalie directory.');
    // -- 2. UX Study Instrumentation (Interaction Tracking) --
    // Refactored to use createTreeView for Kanban and Gaps to attach listeners
    const kanbanTreeView = vscode.window.createTreeView('goalieKanbanView', {
        treeDataProvider: kanbanProvider
    });
    context.subscriptions.push(kanbanTreeView, kanbanTreeView.onDidExpandElement(e => {
        outputChannel.appendLine(`[UX-TRACKING] Expanded Kanban Item: ${e.element.label}`);
    }));
    const gapsTreeView = vscode.window.createTreeView('goalieGapsView', {
        treeDataProvider: gapsProvider
    });
    context.subscriptions.push(gapsTreeView, gapsTreeView.onDidExpandElement(e => {
        var _a, _b;
        outputChannel.appendLine(`[UX-TRACKING] Expanded Gap Item: ${e.element.label}`);
        const item = e.element;
        const key = `${item.gapContext.pattern}|${item.gapContext.circle}|${item.gapContext.depth}`;
        const stats = sessionStats.get(key) || {};
        stats.expands = ((_a = stats.expands) !== null && _a !== void 0 ? _a : 0) + 1;
        sessionStats.set(key, stats);
        telemetry.log('goalie.gapExpanded', {
            pattern: item.gapContext.pattern,
            circle: item.gapContext.circle,
            depth: item.gapContext.depth.toString(),
            lens: (_b = context.workspaceState.get('goalie.currentLens')) !== null && _b !== void 0 ? _b : 'ALL',
            source: 'tree'
        });
    }));
    // Register other providers
    context.subscriptions.push(vscode.window.registerTreeDataProvider('patternMetricsView', patternMetricsProvider), vscode.window.registerTreeDataProvider('governanceEconomicsView', governanceEconomicsProvider), vscode.window.registerTreeDataProvider('depthLadderTimelineView', depthTimelineProvider), vscode.window.registerTreeDataProvider('processFlowMetricsView', processFlowMetricsProvider));
    outputChannel.appendLine('Tree Data Providers Registered.');
    context.subscriptions.push(vscode.commands.registerCommand('goalieDashboard.refreshKanban', () => kanbanProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.refreshPatternMetrics', () => patternMetricsProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.exportPatternMetricsCSV', () => patternMetricsProvider.exportData('csv')), vscode.commands.registerCommand('goalieDashboard.exportPatternMetricsJSON', () => patternMetricsProvider.exportData('json')), vscode.commands.registerCommand('goalieDashboard.printPatternMetricsReport', () => patternMetricsProvider.printReport()), vscode.commands.registerCommand('goalieDashboard.refreshGovernanceEconomics', () => governanceEconomicsProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.refreshDepthLadderTimeline', () => depthTimelineProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.refreshGoalieGaps', () => gapsProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.openKanbanItem', openKanbanItem), vscode.commands.registerCommand('goalieDashboard.moveKanbanItem', moveKanbanItem), vscode.commands.registerCommand('goalieDashboard.filterAll', () => {
        governanceEconomicsProvider.setLens('ALL');
        gapsProvider.setLens('ALL');
        persistLensSelection('ALL');
    }), vscode.commands.registerCommand('goalieDashboard.filterML', () => {
        governanceEconomicsProvider.setLens('ML');
        gapsProvider.setLens('ML');
        persistLensSelection('ML');
    }), vscode.commands.registerCommand('goalieDashboard.filterHPC', () => {
        governanceEconomicsProvider.setLens('HPC');
        gapsProvider.setLens('HPC');
        persistLensSelection('HPC');
    }), vscode.commands.registerCommand('goalieDashboard.filterStatsDevice', () => {
        governanceEconomicsProvider.setLens('STATS_DEVICE');
        gapsProvider.setLens('STATS_DEVICE');
        persistLensSelection('STATS_DEVICE');
    }), vscode.commands.registerCommand('goalie.openLiveGapsPanel', () => __awaiter(this, void 0, void 0, function* () {
        if (!enableRealtimeDashboard) {
            vscode.window.showInformationMessage("Goalie Gaps (Live) is disabled. Enable 'goalie.enableRealtimeDashboard' or AF_ENABLE_REALTIME_DASHBOARD=1 to use the experimental live dashboard.");
            return;
        }
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        if (!liveGapsPanel) {
            liveGapsPanel = vscode.window.createWebviewPanel('goalieGapsLive', 'Goalie Gaps (Live)', vscode.ViewColumn.Beside, {
                enableScripts: false,
            });
            liveGapsPanel.onDidDispose(() => {
                liveGapsPanel = undefined;
            }, null, context.subscriptions);
        }
        else {
            liveGapsPanel.reveal(vscode.ViewColumn.Beside);
        }
        yield refreshLiveGapsPanelIfOpen();
    })), vscode.commands.registerCommand('goalie.showDtDashboard', () => __awaiter(this, void 0, void 0, function* () {
        yield dtCalibrationProvider.openDashboardHtml();
    })), vscode.commands.registerCommand('goalie.runDtE2eCheck', () => {
        dtCalibrationProvider.runDtE2eCheck();
    }), vscode.commands.registerCommand('goalie.runGovernanceAudit', () => __awaiter(this, void 0, void 0, function* () {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running Governance Audit (JSON)...',
            cancellable: false,
        }, () => __awaiter(this, void 0, void 0, function* () {
            try {
                const governanceJson = yield runAfJson('governance-agent');
                if (!governanceJson) {
                    vscode.window.showErrorMessage('Governance Audit failed: no JSON output from governance-agent.');
                    return;
                }
                governanceEconomicsProvider.setGovernanceJson(governanceJson);
                kanbanProvider.refresh();
                patternMetricsProvider.refresh();
                governanceEconomicsProvider.refresh();
                depthTimelineProvider.refresh();
                gapsProvider.refresh();
                vscode.window.showInformationMessage('Governance Audit completed with JSON results.');
            }
            catch (err) {
                const message = (err === null || err === void 0 ? void 0 : err.message) || String(err);
                outputChannel.appendLine(`[GovernanceAudit] Error running governance-agent: ${message}`);
                vscode.window.showErrorMessage(`Governance Audit Failed: ${message}`);
            }
        }));
    })), vscode.commands.registerCommand('goalie.runRetroCoach', () => __awaiter(this, void 0, void 0, function* () {
        yield vscode.commands.executeCommand('goalie.runRetro');
    })), vscode.commands.registerCommand('goalie.runRetro', () => __awaiter(this, void 0, void 0, function* () {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running Retro Coach (JSON)...',
            cancellable: false,
        }, () => __awaiter(this, void 0, void 0, function* () {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting Retro Coach (JSON) ---');
            try {
                const retroJson = yield runAfJson('retro-coach');
                if (!retroJson) {
                    vscode.window.showErrorMessage('Retro Coach failed: no JSON output from retro-coach.');
                    outputChannel.appendLine('[RetroCoach] No JSON output received from retro-coach.');
                    return;
                }
                if (Array.isArray(retroJson.workloadPrompts) && retroJson.workloadPrompts.length > 0) {
                    const prompts = retroJson.workloadPrompts;
                    const topPrompts = prompts.slice(0, 3);
                    const moreCount = prompts.length - topPrompts.length;
                    const moreText = moreCount > 0 ? `\n\n...and ${moreCount} more prompts in Output panel.` : '';
                    const message = `${topPrompts.join('\n\n')}${moreText}`;
                    vscode.window.showInformationMessage(`Retro Coach Insights:\n\n${message}`, { modal: true });
                }
                else if (retroJson.insightsSummary) {
                    vscode.window.showInformationMessage(retroJson.insightsSummary);
                }
                else {
                    vscode.window.showInformationMessage('Retro Coach completed.');
                }
                if (retroJson.baselineComparison) {
                    try {
                        const bc = retroJson.baselineComparison;
                        outputChannel.appendLine(`[RetroCoach] Baseline comparison: baseline=${bc.baselineScore}, current=${bc.currentScore}, delta=${bc.delta}, deltaPct=${bc.deltaPct}`);
                    }
                    catch (_a) {
                        // best-effort logging only
                    }
                }
                yield refreshLiveGapsPanelIfOpen();
            }
            catch (err) {
                const message = (err === null || err === void 0 ? void 0 : err.message) || String(err);
                outputChannel.appendLine(`[RetroCoach] Error running retro-coach: ${message}`);
                vscode.window.showErrorMessage(`Retro Coach Failed: ${message}`);
            }
            finally {
                outputChannel.appendLine('--- Retro Coach Completed ---');
            }
        }));
    })), vscode.commands.registerCommand('goalie.runWsjf', () => __awaiter(this, void 0, void 0, function* () {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        const afScript = path.join(root, 'investing', 'agentic-flow', 'scripts', 'af');
        if (!fs.existsSync(afScript)) {
            vscode.window.showErrorMessage(`af script not found at: ${afScript}`);
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running WSJF Analysis...',
            cancellable: false,
        }, () => __awaiter(this, void 0, void 0, function* () {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting WSJF Analysis ---');
            return new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`"${afScript}" wsjf`, { cwd: root }, (error, stdout, stderr) => {
                    if (error) {
                        const message = error.message || String(error);
                        outputChannel.appendLine(`[WSJF] Error running af wsjf: ${message}`);
                        if (stderr) {
                            outputChannel.appendLine(`[WSJF][stderr] ${stderr}`);
                        }
                        vscode.window.showErrorMessage(`WSJF Analysis Failed: ${message}`);
                        outputChannel.appendLine('--- WSJF Analysis Failed ---');
                        resolve();
                        return;
                    }
                    if (stdout) {
                        outputChannel.appendLine(`[WSJF][stdout] ${stdout}`);
                    }
                    if (stderr) {
                        outputChannel.appendLine(`[WSJF][stderr] ${stderr}`);
                    }
                    vscode.window.showInformationMessage('WSJF Analysis completed successfully.');
                    outputChannel.appendLine('--- WSJF Analysis Completed ---');
                    resolve();
                });
            });
        }));
    })), vscode.commands.registerCommand('goalie.runProdCycle', () => __awaiter(this, void 0, void 0, function* () {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        const afScript = path.join(root, 'investing', 'agentic-flow', 'scripts', 'af');
        if (!fs.existsSync(afScript)) {
            vscode.window.showErrorMessage(`af script not found at: ${afScript}`);
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running Production Cycle...',
            cancellable: false,
        }, () => __awaiter(this, void 0, void 0, function* () {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting Production Cycle ---');
            return new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`"${afScript}" prod-cycle`, { cwd: root }, (error, stdout, stderr) => {
                    if (error) {
                        const message = error.message || String(error);
                        outputChannel.appendLine(`[ProdCycle] Error running af prod-cycle: ${message}`);
                        if (stderr) {
                            outputChannel.appendLine(`[ProdCycle][stderr] ${stderr}`);
                        }
                        vscode.window.showErrorMessage(`Production Cycle Failed: ${message}`);
                        outputChannel.appendLine('--- Production Cycle Failed ---');
                        resolve();
                        return;
                    }
                    if (stdout) {
                        outputChannel.appendLine(`[ProdCycle][stdout] ${stdout}`);
                    }
                    if (stderr) {
                        outputChannel.appendLine(`[ProdCycle][stderr] ${stderr}`);
                    }
                    vscode.window.showInformationMessage('Production Cycle completed successfully.');
                    outputChannel.appendLine('--- Production Cycle Completed ---');
                    resolve();
                });
            });
        }));
    })), vscode.commands.registerCommand('goalie.startFederation', () => __awaiter(this, void 0, void 0, function* () {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Starting Federation...',
            cancellable: false,
        }, () => __awaiter(this, void 0, void 0, function* () {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting Federation ---');
            return new Promise((resolve, reject) => {
                (0, child_process_1.exec)('npx agentic-flow federation start', { cwd: root }, (error, stdout, stderr) => {
                    if (error) {
                        const message = error.message || String(error);
                        outputChannel.appendLine(`[Federation] Error starting federation: ${message}`);
                        if (stderr) {
                            outputChannel.appendLine(`[Federation][stderr] ${stderr}`);
                        }
                        vscode.window.showErrorMessage(`Federation Start Failed: ${message}`);
                        outputChannel.appendLine('--- Federation Start Failed ---');
                        resolve();
                        return;
                    }
                    if (stdout) {
                        outputChannel.appendLine(`[Federation][stdout] ${stdout}`);
                    }
                    if (stderr) {
                        outputChannel.appendLine(`[Federation][stderr] ${stderr}`);
                    }
                    vscode.window.showInformationMessage('Federation started successfully.');
                    outputChannel.appendLine('--- Federation Start Completed ---');
                    resolve();
                });
            });
        }));
    })));
    function applyCodeFixProposalInternal(proposal, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const logPrefix = (_a = options === null || options === void 0 ? void 0 : options.logPrefix) !== null && _a !== void 0 ? _a : '[CodeFix]';
            if (!proposal) {
                vscode.window.showErrorMessage('No code fix proposal provided. Run this command from a Goalie code fix proposal item.');
                return 'error';
            }
            if (!root) {
                vscode.window.showErrorMessage('No workspace open. Cannot apply code fix proposal.');
                return 'error';
            }
            const filePath = typeof proposal.filePath === 'string' ? proposal.filePath.trim() : '';
            if (!filePath) {
                vscode.window.showInformationMessage('This code fix proposal does not specify a filePath; please apply it manually.');
                outputChannel.appendLine(`${logPrefix} Apply skipped: proposal has no filePath.`);
                return 'skipped';
            }
            const snippet = (typeof proposal.codeSnippet === 'string' && proposal.codeSnippet) ||
                (typeof proposal.configSnippet === 'string' && proposal.configSnippet) ||
                (typeof proposal.testSnippet === 'string' && proposal.testSnippet) ||
                '';
            if (!snippet.trim()) {
                vscode.window.showInformationMessage('This code fix proposal has no snippet to apply. Opening view instead.');
                outputChannel.appendLine(`${logPrefix} Apply skipped: proposal has no snippet.`);
                yield vscode.commands.executeCommand('goalieDashboard.viewCodeFixProposal', proposal);
                return 'skipped';
            }
            const patternLabel = proposal.pattern ? String(proposal.pattern) : 'unknown-pattern';
            const needsApproval = proposal.approvalRequired === true;
            const approver = proposal.approverRole ? String(proposal.approverRole) : 'governance owner';
            const approvalLabel = needsApproval ? `Requires approval (${approver})` : 'Auto-approvable fix';
            if (!(options === null || options === void 0 ? void 0 : options.skipConfirmation)) {
                const previewLines = snippet.split(/\r?\n/).slice(0, 10);
                const preview = previewLines.join('\n');
                const description = proposal.description ? String(proposal.description) : '';
                const messageLines = [];
                messageLines.push(`Pattern: ${patternLabel}`);
                if (description) {
                    messageLines.push('', description);
                }
                messageLines.push('', `Approval: ${approvalLabel}`);
                if (preview.trim()) {
                    messageLines.push('', 'Snippet preview:', '', preview);
                }
                const choice = yield vscode.window.showWarningMessage('Apply Goalie code fix proposal?', {
                    modal: true,
                    detail: messageLines.join('\n'),
                }, 'Apply', 'Cancel');
                if (choice !== 'Apply') {
                    outputChannel.appendLine(`${logPrefix} Apply canceled for pattern=${patternLabel}, filePath=${filePath}`);
                    return 'skipped';
                }
            }
            try {
                const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
                if (!fs.existsSync(absolutePath)) {
                    vscode.window.showErrorMessage(`Target file for code fix not found: ${absolutePath}`);
                    outputChannel.appendLine(`${logPrefix} Apply failed: file not found at ${absolutePath}`);
                    return 'error';
                }
                const doc = yield vscode.workspace.openTextDocument(absolutePath);
                const editor = yield vscode.window.showTextDocument(doc, { preview: false });
                const lastLine = doc.lineCount > 0 ? doc.lineCount - 1 : 0;
                const endPosition = doc.lineAt(lastLine).range.end;
                const header = `\n\n// --- Goalie Code Fix: ${patternLabel} ---\n`;
                const body = snippet.endsWith('\n') ? snippet : `${snippet}\n`;
                const success = yield editor.edit(editBuilder => {
                    editBuilder.insert(endPosition, header + body);
                });
                if (!success) {
                    vscode.window.showErrorMessage('Failed to apply Goalie code fix proposal. See Output for details.');
                    outputChannel.appendLine(`${logPrefix} Apply failed: TextEditor.edit() returned false for ${absolutePath}`);
                    return 'error';
                }
                vscode.window.showInformationMessage(`Goalie code fix applied to ${absolutePath}`);
                outputChannel.appendLine(`${logPrefix} Applied proposal for pattern=${patternLabel} to ${absolutePath}`);
                return 'applied';
            }
            catch (err) {
                const msg = (err === null || err === void 0 ? void 0 : err.message) || String(err);
                vscode.window.showErrorMessage('Failed to apply Goalie code fix proposal. See Output for details.');
                outputChannel.appendLine(`${logPrefix} Apply failed with error: ${msg}`);
                return 'error';
            }
        });
    }
    context.subscriptions.push(vscode.commands.registerCommand('goalieDashboard.viewCodeFixProposal', (proposal) => __awaiter(this, void 0, void 0, function* () {
        if (!proposal) {
            vscode.window.showErrorMessage('No code fix proposal provided.');
            return;
        }
        const snippet = (typeof proposal.codeSnippet === 'string' && proposal.codeSnippet) ||
            (typeof proposal.configSnippet === 'string' && proposal.configSnippet) ||
            (typeof proposal.testSnippet === 'string' && proposal.testSnippet) ||
            '';
        const doc = yield vscode.workspace.openTextDocument({
            language: 'markdown',
            content: snippet || (proposal.description || 'No snippet available for this proposal.'),
        });
        yield vscode.window.showTextDocument(doc, { preview: true });
    })), vscode.commands.registerCommand('goalieDashboard.viewAllCodeFixProposals', () => __awaiter(this, void 0, void 0, function* () {
        const proposals = governanceEconomicsProvider.getCodeFixProposals();
        if (!proposals.length) {
            vscode.window.showInformationMessage('No code fix proposals available from latest Governance Audit.');
            return;
        }
        const markdownLines = [];
        markdownLines.push('# Goalie Code Fix Proposals', '');
        for (const proposal of proposals) {
            const baseLabel = proposal.pattern ? String(proposal.pattern) : 'Unknown pattern';
            const needsApproval = proposal.approvalRequired === true;
            const approver = proposal.approverRole ? String(proposal.approverRole) : 'governance owner';
            const approvalLabel = needsApproval ? `⚠️ Requires approval (${approver})` : 'Auto-approvable fix';
            markdownLines.push(`## ${baseLabel}`);
            if (proposal.description) {
                markdownLines.push('', proposal.description);
            }
            markdownLines.push('', `- ${approvalLabel}`);
            const snippet = (typeof proposal.codeSnippet === 'string' && proposal.codeSnippet) ||
                (typeof proposal.configSnippet === 'string' && proposal.configSnippet) ||
                (typeof proposal.testSnippet === 'string' && proposal.testSnippet) ||
                '';
            if (snippet) {
                markdownLines.push('', '```', snippet, '```');
            }
            markdownLines.push('');
        }
        const doc = yield vscode.workspace.openTextDocument({
            language: 'markdown',
            content: markdownLines.join('\n'),
        });
        yield vscode.window.showTextDocument(doc, { preview: true });
    })), vscode.commands.registerCommand('goalieDashboard.applyCodeFixProposal', (proposal) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const result = yield applyCodeFixProposalInternal(proposal);
        if (result === 'applied') {
            telemetry.log('goalie.quickFix.applied', {
                pattern: (_a = proposal === null || proposal === void 0 ? void 0 : proposal.pattern) !== null && _a !== void 0 ? _a : 'unknown',
                fixType: (proposal === null || proposal === void 0 ? void 0 : proposal.codeSnippet) ? 'code' : (proposal === null || proposal === void 0 ? void 0 : proposal.configSnippet) ? 'config' : 'test',
                filePath: (_b = proposal === null || proposal === void 0 ? void 0 : proposal.filePath) !== null && _b !== void 0 ? _b : '',
                mode: (_c = proposal === null || proposal === void 0 ? void 0 : proposal.mode) !== null && _c !== void 0 ? _c : 'dry-run',
                source: 'proposalList'
            });
        }
    })), vscode.commands.registerCommand('goalieDashboard.applySafeCodeFixesBatch', () => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const config = vscode.workspace.getConfiguration('goalie');
        const enabled = config.get('autoApplyFixes.enabled', false);
        if (!enabled) {
            vscode.window.showInformationMessage('Goalie auto-apply of governance code fixes is disabled. Enable it in settings (goalie.autoApplyFixes.enabled).');
            return;
        }
        outputChannel.show(true);
        outputChannel.appendLine('\n[CodeFix][AUTO] Starting batch apply of safe governance code fixes...');
        const governanceJson = yield runAfJson('governance-agent');
        if (!governanceJson) {
            vscode.window.showErrorMessage('Governance Audit failed: no JSON output from governance-agent. See Output for details.');
            outputChannel.appendLine('[CodeFix][AUTO] Batch apply aborted: governance-agent produced no JSON.');
            return;
        }
        governanceEconomicsProvider.setGovernanceJson(governanceJson);
        const proposals = Array.isArray(governanceJson.codeFixProposals)
            ? governanceJson.codeFixProposals
            : [];
        if (!proposals.length) {
            vscode.window.showInformationMessage('No code fix proposals available from latest Governance Audit.');
            outputChannel.appendLine('[CodeFix][AUTO] Batch apply aborted: no proposals in governance JSON.');
            return;
        }
        const autoEligible = proposals.filter(p => {
            if (!p)
                return false;
            if (p.approvalRequired === true)
                return false;
            if (p.mode !== 'apply')
                return false;
            const filePath = typeof p.filePath === 'string' ? p.filePath.trim() : '';
            if (!filePath)
                return false;
            const snippet = (typeof p.codeSnippet === 'string' && p.codeSnippet) ||
                (typeof p.configSnippet === 'string' && p.configSnippet) ||
                (typeof p.testSnippet === 'string' && p.testSnippet) ||
                '';
            return snippet.trim().length > 0;
        });
        const manualRequired = proposals.filter(p => !autoEligible.includes(p));
        if (!autoEligible.length) {
            vscode.window.showInformationMessage('No auto-eligible governance code fixes found. All proposals require approval or are dry-run only.');
            outputChannel.appendLine('[CodeFix][AUTO] Batch apply aborted: no proposals passed auto-apply policy filters.');
            return;
        }
        const confirmBatch = config.get('autoApplyFixes.confirmBatch', true);
        if (confirmBatch) {
            const sample = autoEligible.slice(0, 5);
            const sampleLines = sample.map(p => {
                const patternLabel = p.pattern ? String(p.pattern) : 'unknown-pattern';
                const filePath = typeof p.filePath === 'string' ? p.filePath.trim() : '';
                return `- ${patternLabel} → ${filePath}`;
            });
            const moreCount = autoEligible.length - sample.length;
            const moreText = moreCount > 0 ? `\n...and ${moreCount} more proposals.` : '';
            const detail = `This will automatically apply ${autoEligible.length} governance-approved code fixes to your workspace.\n\n` +
                `Each fix will be appended as a Goalie code fix block at the end of the indicated files and logged with [AUTO].\n\n` +
                (sampleLines.length ? `Examples:\n${sampleLines.join('\n')}${moreText}` : '');
            const choice = yield vscode.window.showWarningMessage(`Apply ${autoEligible.length} auto-eligible Goalie code fixes now?`, {
                modal: true,
                detail,
            }, 'Apply', 'Cancel');
            if (choice !== 'Apply') {
                outputChannel.appendLine(`[CodeFix][AUTO] Batch apply canceled by user for ${autoEligible.length} proposals.`);
                return;
            }
        }
        let applied = 0;
        let errors = 0;
        for (const proposal of autoEligible) {
            const result = yield applyCodeFixProposalInternal(proposal, {
                skipConfirmation: true,
                logPrefix: '[CodeFix][AUTO]',
            });
            if (result === 'applied') {
                applied += 1;
                telemetry.log('goalie.quickFix.applied', {
                    pattern: (_a = proposal === null || proposal === void 0 ? void 0 : proposal.pattern) !== null && _a !== void 0 ? _a : 'unknown',
                    fixType: (proposal === null || proposal === void 0 ? void 0 : proposal.codeSnippet) ? 'code' : (proposal === null || proposal === void 0 ? void 0 : proposal.configSnippet) ? 'config' : 'test',
                    filePath: (_b = proposal === null || proposal === void 0 ? void 0 : proposal.filePath) !== null && _b !== void 0 ? _b : '',
                    mode: (_c = proposal === null || proposal === void 0 ? void 0 : proposal.mode) !== null && _c !== void 0 ? _c : 'apply',
                    source: 'autoBatch'
                });
            }
            else if (result === 'error') {
                errors += 1;
            }
        }
        const parts = [];
        parts.push(`Automatically applied ${applied} Goalie code fix${applied === 1 ? '' : 'es'} based on governance policy.`);
        if (manualRequired.length) {
            parts.push(`${manualRequired.length} proposal${manualRequired.length === 1 ? '' : 's'} require manual approval. Use the Governance / Economics view context menu to review and apply them.`);
        }
        if (errors) {
            parts.push(`${errors} proposal${errors === 1 ? '' : 's'} encountered errors during apply. See Goalie Output for details.`);
        }
        const summaryMessage = parts.join(' ');
        vscode.window.showInformationMessage(summaryMessage);
        outputChannel.appendLine(`[CodeFix][AUTO] ${summaryMessage}`);
    })));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map