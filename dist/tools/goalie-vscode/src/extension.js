import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { StreamClient } from './streamClient';
import { resolveStreamSocketPath } from './streamUtils';
import { GoalieTelemetry } from './telemetry';
import { DtCalibrationProvider } from './dtCalibrationProvider';
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
        const idxById = entries.findIndex(entry => entry?.id === payload.id);
        if (idxById >= 0) {
            return idxById;
        }
    }
    const label = payload.title || payload.summary;
    if (label) {
        const idxByLabel = entries.findIndex(entry => entry?.title === label || entry?.summary === label);
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
    section;
    payload;
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
    workspaceRoot;
    logger;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    WIP_LIMIT = 5; // Default WIP limit per section
    constructor(workspaceRoot, logger) {
        this.workspaceRoot = workspaceRoot;
        this.logger = logger;
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
                        return obj.economic?.wsjf_score;
                    }
                }
                catch {
                    // ignore malformed lines
                }
            }
        }
        catch {
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
                catch {
                    // ignore malformed lines
                }
            }
            return totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
        }
        catch {
            // ignore file read errors
        }
        return 0;
    }
    async getChildren(element) {
        const goalieDir = getGoalieDir(this.workspaceRoot);
        this.logger.appendLine(`[Kanban] getChildren. Element: ${element?.label ?? 'Root'}. Goalie Dir: ${goalieDir}`);
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
    }
}
class PatternMetricsProvider {
    workspaceRoot;
    context;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    // Enhanced filtering system
    currentFilters = [];
    filterPresets = [];
    activePreset = null;
    // Performance and caching
    cache = new Map();
    lastModified = 0;
    pageSize = 50;
    currentPage = 1;
    aggregationsCache = new Map();
    // Real-time updates
    autoRefreshInterval;
    fileWatcher;
    refreshDebounce;
    newPatterns = new Set();
    // Chart visualization
    chartPanels = new Map();
    constructor(workspaceRoot, context) {
        this.workspaceRoot = workspaceRoot;
        this.context = context;
        this.initializeFilterPresets();
        this.loadPersistedFilters();
        this.startAutoRefresh();
        this.setupFileWatcher();
    }
    initializeFilterPresets() {
        this.filterPresets = [
            {
                id: 'ml-focus',
                name: 'ML Workloads',
                description: 'Focus on machine learning patterns',
                filters: [
                    { type: 'workload', value: 'ML', label: 'ML Workloads' },
                    { type: 'framework', value: 'tensorflow', label: 'TensorFlow' }
                ]
            },
            {
                id: 'hpc-focus',
                name: 'HPC Workloads',
                description: 'Focus on high performance computing',
                filters: [
                    { type: 'workload', value: 'HPC', label: 'HPC Workloads' },
                    { type: 'run-kind', value: 'batch', label: 'Batch Jobs' }
                ]
            },
            {
                id: 'recent-activity',
                name: 'Recent Activity (7 days)',
                description: 'Patterns from the last 7 days',
                filters: [
                    { type: 'date-range', value: 'last-7days', label: 'Last 7 Days' }
                ]
            },
            {
                id: 'critical-gates',
                name: 'Critical Gates',
                description: 'Deploy and health-check gates',
                filters: [
                    { type: 'gate', value: 'deploy', label: 'Deploy Gates' },
                    { type: 'gate', value: 'health-check', label: 'Health Checks' }
                ]
            }
        ];
    }
    setupKeyboardShortcuts() {
        const config = vscode.workspace.getConfiguration('goalie');
        const enableShortcuts = config.get('patternMetrics.enableKeyboardShortcuts', true);
        if (!enableShortcuts)
            return;
        // Register keyboard shortcuts for quick filtering
        const shortcuts = [
            { key: 'ctrl+shift+1', command: 'goalieDashboard.clearFilters', description: 'Clear all filters' },
            { key: 'ctrl+shift+2', command: 'goalieDashboard.applyFilterPreset', description: 'Apply ML preset' },
            { key: 'ctrl+shift+3', command: 'goalieDashboard.applyFilterPreset', description: 'Apply HPC preset' },
            { key: 'ctrl+shift+4', command: 'goalieDashboard.showPatternChart', description: 'Show bar chart' },
            { key: 'ctrl+shift+5', command: 'goalieDashboard.showPatternChart', description: 'Show pie chart' },
            { key: 'ctrl+shift+6', command: 'goalieDashboard.patternMetricsPreviousPage', description: 'Previous page' },
            { key: 'ctrl+shift+7', command: 'goalieDashboard.patternMetricsNextPage', description: 'Next page' },
            { key: 'ctrl+shift+8', command: 'goalieDashboard.exportPatternMetricsCSV', description: 'Export CSV' },
            { key: 'ctrl+shift+9', command: 'goalieDashboard.exportPatternMetricsJSON', description: 'Export JSON' }
        ];
        shortcuts.forEach(shortcut => {
            vscode.commands.registerCommand(shortcut.command, () => {
                vscode.commands.executeCommand(shortcut.command);
            });
        });
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    // Enhanced filtering methods
    setFilter(filter) {
        // Remove existing filter of same type
        this.currentFilters = this.currentFilters.filter(f => f.type !== filter.type);
        // Add new filter if not 'all'
        if (filter.type !== 'all' && filter.value !== '') {
            this.currentFilters.push(filter);
        }
        this.currentPage = 1; // Reset to first page when filter changes
        this.activePreset = null; // Clear active preset when manual filter is applied
        this.persistFilters();
        this.refresh();
    }
    setMultipleFilters(filters) {
        this.currentFilters = filters.filter(f => f.type !== 'all' && f.value !== '');
        this.currentPage = 1;
        this.activePreset = null;
        this.persistFilters();
        this.refresh();
    }
    clearFilters() {
        this.currentFilters = [];
        this.activePreset = null;
        this.currentPage = 1;
        this.persistFilters();
        this.refresh();
    }
    applyFilterPreset(presetId) {
        const preset = this.filterPresets.find(p => p.id === presetId);
        if (preset) {
            this.currentFilters = [...preset.filters];
            this.activePreset = presetId;
            this.currentPage = 1;
            this.persistFilters();
            this.refresh();
        }
    }
    // Quick filter methods for common scenarios
    quickFilterByCircle(circle) {
        this.setFilter({ type: 'circle', value: circle, label: `Circle: ${circle}` });
    }
    quickFilterByRunKind(runKind) {
        this.setFilter({ type: 'run-kind', value: runKind, label: `Run Kind: ${runKind}` });
    }
    quickFilterByWorkload(workload) {
        this.setFilter({ type: 'workload', value: workload, label: `Workload: ${workload}` });
    }
    quickFilterByFramework(framework) {
        this.setFilter({ type: 'framework', value: framework, label: `Framework: ${framework}` });
    }
    quickFilterByDateRange(range) {
        this.setFilter({ type: 'date-range', value: range, label: `Date Range: ${range}` });
    }
    quickFilterByGate(gate) {
        this.setFilter({ type: 'gate', value: gate, label: `Gate: ${gate}` });
    }
    getActiveFilters() {
        return [...this.currentFilters];
    }
    getFilterPresets() {
        return [...this.filterPresets];
    }
    getActivePreset() {
        return this.activePreset;
    }
    loadPersistedFilters() {
        if (this.context) {
            this.currentFilters = this.context.workspaceState.get('patternMetrics.filters', []);
            this.activePreset = this.context.workspaceState.get('patternMetrics.activePreset', null);
            this.pageSize = this.context.globalState.get('patternMetrics.pageSize', 50);
            this.currentPage = this.context.workspaceState.get('patternMetrics.currentPage', 1);
        }
    }
    persistFilters() {
        if (this.context) {
            this.context.workspaceState.update('patternMetrics.filters', this.currentFilters);
            this.context.workspaceState.update('patternMetrics.activePreset', this.activePreset);
            this.context.workspaceState.update('patternMetrics.currentPage', this.currentPage);
            this.context.globalState.update('patternMetrics.pageSize', this.pageSize);
        }
    }
    startAutoRefresh() {
        const config = vscode.workspace.getConfiguration('goalie');
        const autoRefreshEnabled = config.get('patternMetrics.autoRefresh', false);
        const refreshInterval = config.get('patternMetrics.refreshInterval', 30); // seconds
        if (autoRefreshEnabled && refreshInterval > 0) {
            this.autoRefreshInterval = setInterval(() => {
                this.debouncedRefresh();
            }, refreshInterval * 1000);
        }
    }
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = undefined;
        }
        if (this.refreshDebounce) {
            clearTimeout(this.refreshDebounce);
            this.refreshDebounce = undefined;
        }
    }
    setupFileWatcher() {
        const goalieDir = this.getGoalieDir();
        if (!goalieDir)
            return;
        const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(patternMetricsPath, '*'));
        this.fileWatcher.onDidChange(() => {
            this.debouncedRefresh();
        });
        this.fileWatcher.onDidCreate(() => {
            this.debouncedRefresh();
        });
        this.fileWatcher.onDidDelete(() => {
            this.debouncedRefresh();
        });
    }
    debouncedRefresh() {
        if (this.refreshDebounce) {
            clearTimeout(this.refreshDebounce);
        }
        this.refreshDebounce = setTimeout(() => {
            this.refresh();
        }, 500); // 500ms debounce
    }
    detectNewPatterns(patterns) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        patterns.forEach(pattern => {
            const patternTime = new Date(pattern.timestamp);
            if (patternTime > fiveMinutesAgo) {
                if (!this.newPatterns.has(pattern.pattern)) {
                    this.newPatterns.add(pattern.pattern);
                    this.showNewPatternNotification(pattern);
                }
            }
        });
    }
    showNewPatternNotification(pattern) {
        const message = `New pattern detected: ${pattern.pattern}`;
        vscode.window.showInformationMessage(message, 'View Details').then(selection => {
            if (selection === 'View Details') {
                this.setFilter({ type: 'pattern', value: pattern.pattern, label: `Pattern: ${pattern.pattern}` });
            }
        });
    }
    dispose() {
        this.stopAutoRefresh();
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        if (this.refreshDebounce) {
            clearTimeout(this.refreshDebounce);
        }
        // Dispose all chart panels
        this.chartPanels.forEach(panel => {
            panel.panel.dispose();
        });
        this.chartPanels.clear();
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
    async loadPatternMetrics() {
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
                catch {
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
    async exportData(format) {
        const patterns = await this.loadPatternMetrics();
        const filteredPatterns = this.filterPatterns(patterns);
        if (filteredPatterns.length === 0) {
            vscode.window.showInformationMessage('No data to export.');
            return;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to export data: ${error}`);
        }
    }
    async printReport() {
        const patterns = await this.loadPatternMetrics();
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
    }
    // Enhanced chart visualization methods
    async showPatternChart(patterns, chartType = 'bar') {
        const dataToUse = patterns || await this.loadPatternMetrics();
        const filteredPatterns = this.filterPatterns(dataToUse);
        // Create a unique panel ID for this chart
        const panelId = `patternChart_${Date.now()}`;
        // Create a webview panel for the chart
        const panel = vscode.window.createWebviewPanel(panelId, `Pattern Distribution - ${chartType.charAt(0).toUpperCase() + chartType.slice(1)}`, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Store panel reference
        this.chartPanels.set(panelId, {
            panel,
            patterns: filteredPatterns,
            filters: this.currentFilters
        });
        // Generate chart HTML
        panel.webview.html = this.generateEnhancedChartHtml(filteredPatterns, chartType);
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(message => {
            this.handleChartMessage(message, panelId);
        });
        // Clean up when panel is disposed
        panel.onDidDispose(() => {
            this.chartPanels.delete(panelId);
        });
    }
    handleChartMessage(message, panelId) {
        const chartPanel = this.chartPanels.get(panelId);
        if (!chartPanel)
            return;
        switch (message.command) {
            case 'filterByPattern':
                this.setFilter({ type: 'pattern', value: message.pattern, label: `Pattern: ${message.pattern}` });
                break;
            case 'filterByWorkload':
                this.quickFilterByWorkload(message.workload);
                break;
            case 'filterByFramework':
                this.quickFilterByFramework(message.framework);
                break;
            case 'changeChartType':
                this.showPatternChart(chartPanel.patterns, message.chartType);
                chartPanel.panel.dispose();
                break;
            case 'exportChart':
                this.exportChartData(chartPanel.patterns, message.format);
                break;
            case 'refreshChart':
                this.refreshChart(panelId);
                break;
        }
    }
    async refreshChart(panelId) {
        const chartPanel = this.chartPanels.get(panelId);
        if (!chartPanel)
            return;
        const updatedPatterns = await this.loadPatternMetrics();
        const filteredPatterns = this.filterPatterns(updatedPatterns);
        chartPanel.patterns = filteredPatterns;
        chartPanel.filters = this.currentFilters;
        // Extract chart type from panel title
        const chartType = chartPanel.panel.title.includes('Bar') ? 'bar' :
            chartPanel.panel.title.includes('Pie') ? 'pie' :
                chartPanel.panel.title.includes('Timeline') ? 'timeline' : 'heatmap';
        chartPanel.panel.webview.html = this.generateEnhancedChartHtml(filteredPatterns, chartType);
    }
    async exportChartData(patterns, format) {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `pattern-chart-${timestamp}.${format}`;
        const filePath = path.join(workspaceRoot, fileName);
        try {
            if (format === 'csv' || format === 'json') {
                let content;
                if (format === 'csv') {
                    const headers = ['pattern', 'count', 'workload', 'framework', 'circle', 'run_kind', 'gate'];
                    const csvLines = [headers.join(',')];
                    const patternCounts = new Map();
                    patterns.forEach(p => {
                        const key = p.pattern;
                        if (!patternCounts.has(key)) {
                            patternCounts.set(key, { ...p, count: 0 });
                        }
                        patternCounts.get(key).count++;
                    });
                    Array.from(patternCounts.values()).forEach(item => {
                        const tags = workloadTags(item.pattern, item.tags || []);
                        const row = [
                            `"${item.pattern || ''}"`,
                            item.count,
                            `"${tags.join(';')}"`,
                            `"${this.detectFramework(item.pattern)}"`,
                            `"${item.circle || ''}"`,
                            `"${item.run_kind || ''}"`,
                            `"${item.gate || ''}"`
                        ];
                        csvLines.push(row.join(','));
                    });
                    content = csvLines.join('\n');
                }
                else {
                    content = JSON.stringify(patterns, null, 2);
                }
                fs.writeFileSync(filePath, content, 'utf8');
                vscode.window.showInformationMessage(`Chart data exported to ${filePath}`);
            }
            else if (format === 'png') {
                vscode.window.showInformationMessage('PNG export requires additional charting library support');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to export chart data: ${error}`);
        }
    }
    detectFramework(pattern) {
        const patternLower = pattern.toLowerCase();
        if (patternLower.includes('tensorflow') || patternLower.includes('tf-'))
            return 'TensorFlow';
        if (patternLower.includes('pytorch') || patternLower.includes('torch'))
            return 'PyTorch';
        if (patternLower.includes('keras'))
            return 'Keras';
        if (patternLower.includes('scikit') || patternLower.includes('sklearn'))
            return 'Scikit-learn';
        return 'Custom';
    }
    generateEnhancedChartHtml(patterns, chartType) {
        const patternCounts = new Map();
        const patternTags = new Map();
        const patternFrameworks = new Map();
        patterns.forEach(p => {
            const pattern = p.pattern || 'unknown';
            patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
            if (Array.isArray(p.tags)) {
                patternTags.set(pattern, p.tags);
            }
            patternFrameworks.set(pattern, this.detectFramework(pattern));
        });
        const sortedPatterns = Array.from(patternCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20); // Top 20 patterns for better visualization
        const maxCount = Math.max(...sortedPatterns.map(([, count]) => count));
        let chartContent = '';
        switch (chartType) {
            case 'bar':
                chartContent = this.generateBarChart(sortedPatterns, patternTags, patternFrameworks, maxCount);
                break;
            case 'pie':
                chartContent = this.generatePieChart(sortedPatterns, patternTags, patternFrameworks);
                break;
            case 'timeline':
                chartContent = this.generateTimelineChart(patterns);
                break;
            case 'heatmap':
                chartContent = this.generateHeatmap(patterns);
                break;
        }
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Pattern Distribution Analysis</title>
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
          .chart-controls {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }
          .chart-type-selector {
            padding: 6px 12px;
            border: 1px solid var(--vscode-input-border, #d4d4d4);
            border-radius: 4px;
            background: var(--vscode-input-background, #f3f3f3);
            color: var(--vscode-input-foreground, #333333);
            font-size: 12px;
          }
          .export-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            background: var(--vscode-button-background, #007acc);
            color: white;
            border: 1px solid var(--vscode-button-border, #007acc);
          }
          .export-btn:hover {
            background: var(--vscode-button-hoverBackground, #005a9e);
          }
          .summary {
            margin-top: 16px;
            padding: 12px;
            background: var(--vscode-textBlockQuote-background, #f6f6f6);
            border-left: 4px solid var(--vscode-textBlockQuote-border, #d4d4d4);
            border-radius: 4px;
          }
          .badge {
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
            text-transform: uppercase;
            margin-right: 4px;
            display: inline-block;
          }
          .badge.ml { background: #1f77b4; color: white; }
          .badge.hpc { background: #d62728; color: white; }
          .badge.stats { background: #2ca02c; color: white; }
          .badge.device { background: #9467bd; color: white; }
          .badge.tf { background: #ff6f00; color: white; }
          .badge.pytorch { background: #ff9500; color: white; }
        </style>
      </head>
      <body>
        <div class="chart-container">
          <h2 class="chart-header">Pattern Distribution Analysis - ${chartType.charAt(0).toUpperCase() + chartType.slice(1)}</h2>
          
          <div class="chart-controls">
            <select class="chart-type-selector" onchange="changeChartType(this.value)">
              <option value="bar" ${chartType === 'bar' ? 'selected' : ''}>Bar Chart</option>
              <option value="pie" ${chartType === 'pie' ? 'selected' : ''}>Pie Chart</option>
              <option value="timeline" ${chartType === 'timeline' ? 'selected' : ''}>Timeline</option>
              <option value="heatmap" ${chartType === 'heatmap' ? 'selected' : ''}>Heatmap</option>
            </select>
            <button class="export-btn" onclick="exportChart('csv')">Export CSV</button>
            <button class="export-btn" onclick="exportChart('json')">Export JSON</button>
            <button class="export-btn" onclick="refreshChart()">Refresh</button>
          </div>

          ${chartContent}

          <div class="summary">
            <strong>Interactive Features:</strong><br>
            • Click on any pattern element to filter by that pattern<br>
            • Switch between different chart types for different perspectives<br>
            • Export data in CSV or JSON format<br>
            • New patterns (🆕) detected in the last 5 minutes<br>
            • Real-time updates when pattern_metrics.jsonl changes
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          function changeChartType(type) {
            vscode.postMessage({
              command: 'changeChartType',
              chartType: type
            });
          }
          
          function exportChart(format) {
            vscode.postMessage({
              command: 'exportChart',
              format: format
            });
          }
          
          function refreshChart() {
            vscode.postMessage({
              command: 'refreshChart'
            });
          }
          
          function filterByPattern(pattern) {
            vscode.postMessage({
              command: 'filterByPattern',
              pattern: pattern
            });
          }
          
          function filterByWorkload(workload) {
            vscode.postMessage({
              command: 'filterByWorkload',
              workload: workload
            });
          }
          
          function filterByFramework(framework) {
            vscode.postMessage({
              command: 'filterByFramework',
              framework: framework
            });
          }
        </script>
      </body>
      </html>
    `;
    }
    generateBarChart(sortedPatterns, patternTags, patternFrameworks, maxCount) {
        const chartBars = sortedPatterns.map(([pattern, count]) => {
            const percentage = (count / maxCount) * 100;
            const color = this.getPatternColor(pattern);
            const tags = patternTags.get(pattern) || [];
            const workloadTagsList = workloadTags(pattern, tags);
            const framework = patternFrameworks.get(pattern) || '';
            const isNew = this.newPatterns.has(pattern);
            // Create workload and framework badges
            const badges = [];
            if (workloadTagsList.includes('ML')) {
                badges.push('<span class="badge ml">ML</span>');
            }
            if (workloadTagsList.includes('HPC'))
                badges.push('<span class="badge hpc">HPC</span>');
            if (workloadTagsList.includes('Stats'))
                badges.push('<span class="badge stats">Stats</span>');
            if (workloadTagsList.includes('Device/Web'))
                badges.push('<span class="badge device">Device/Web</span>');
            if (framework === 'TensorFlow')
                badges.push('<span class="badge tf">TF</span>');
            if (framework === 'PyTorch')
                badges.push('<span class="badge pytorch">PyTorch</span>');
            return `
        <div class="chart-bar" data-pattern="${pattern}" data-count="${count}" style="cursor: pointer;" onclick="filterByPattern('${pattern}')">
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
      <div class="chart-bars">
        ${chartBars}
      </div>
      <style>
        .chart-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .chart-bar {
          display: flex;
          align-items: center;
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
          width: 250px;
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
      </style>
    `;
    }
    generatePieChart(sortedPatterns, patternTags, patternFrameworks) {
        const total = sortedPatterns.reduce((sum, [, count]) => sum + count, 0);
        const colors = ['#1f77b4', '#d62728', '#2ca02c', '#9467bd', '#ff7f0e', '#8c564b', '#e377c2', '#7f7f7f'];
        const pieSlices = sortedPatterns.slice(0, 8).map(([pattern, count], index) => {
            const percentage = (count / total) * 100;
            const color = colors[index % colors.length];
            const tags = patternTags.get(pattern) || [];
            const workloadTagsList = workloadTags(pattern, tags);
            const framework = patternFrameworks.get(pattern) || '';
            const isNew = this.newPatterns.has(pattern);
            // Create badges
            const badges = [];
            if (workloadTagsList.includes('ML'))
                badges.push('ML');
            if (workloadTagsList.includes('HPC'))
                badges.push('HPC');
            if (workloadTagsList.includes('Stats'))
                badges.push('Stats');
            if (workloadTagsList.includes('Device/Web'))
                badges.push('Device/Web');
            return `
        <div class="pie-slice" onclick="filterByPattern('${pattern}')" style="cursor: pointer;">
          <div class="slice-legend">
            <div class="legend-color" style="background: ${color};"></div>
            <div class="legend-info">
              <div class="legend-pattern">${isNew ? '🆕 ' : ''}${pattern}</div>
              <div class="legend-badges">${badges.join(', ')}</div>
              <div class="legend-stats">${count} (${percentage.toFixed(1)}%)</div>
            </div>
          </div>
        </div>
      `;
        }).join('');
        return `
      <div class="pie-chart">
        <div class="pie-legend">
          ${pieSlices}
        </div>
      </div>
      <style>
        .pie-chart {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pie-legend {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }
        .pie-slice {
          display: flex;
          align-items: center;
          padding: 8px;
          border-radius: 6px;
          background: var(--vscode-list-hoverBackground, #f0f0f0);
          transition: all 0.2s ease;
        }
        .pie-slice:hover {
          background: var(--vscode-list-activeSelectionBackground, #e6e6e6);
          transform: scale(1.02);
        }
        .slice-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .legend-info {
          flex: 1;
        }
        .legend-pattern {
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .legend-badges {
          font-size: 9px;
          color: var(--vscode-descriptionForeground, #666666);
          margin-bottom: 2px;
        }
        .legend-stats {
          font-size: 11px;
          font-weight: 600;
          color: var(--vscode-editor-foreground, #333333);
        }
      </style>
    `;
    }
    generateTimelineChart(patterns) {
        // Group patterns by date
        const dateGroups = new Map();
        patterns.forEach(p => {
            const date = new Date(p.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!dateGroups.has(date)) {
                dateGroups.set(date, new Map());
            }
            const patternMap = dateGroups.get(date);
            const pattern = p.pattern || 'unknown';
            patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
        });
        const sortedDates = Array.from(dateGroups.keys()).sort();
        const allPatterns = new Set();
        patterns.forEach(p => allPatterns.add(p.pattern || 'unknown'));
        const timelineRows = sortedDates.map(date => {
            const patternMap = dateGroups.get(date) || new Map();
            const dateTotal = Array.from(patternMap.values()).reduce((sum, count) => sum + count, 0);
            const patternBars = Array.from(allPatterns).slice(0, 10).map(pattern => {
                const count = patternMap.get(pattern) || 0;
                const maxCount = Math.max(...Array.from(patternMap.values()));
                const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const isNew = this.newPatterns.has(pattern);
                return `
          <div class="timeline-bar" style="width: ${width}%; background: ${this.getPatternColor(pattern)};"
               title="${pattern}: ${count}" onclick="filterByPattern('${pattern}')"
               style="cursor: pointer;">
          </div>
        `;
            }).join('');
            return `
        <div class="timeline-row">
          <div class="timeline-date">${date}</div>
          <div class="timeline-bars">${patternBars}</div>
          <div class="timeline-total">${dateTotal}</div>
        </div>
      `;
        }).join('');
        return `
      <div class="timeline-chart">
        <div class="timeline-header">
          <div class="timeline-date-header">Date</div>
          <div class="timeline-patterns-header">Patterns (Top 10)</div>
          <div class="timeline-total-header">Total</div>
        </div>
        ${timelineRows}
      </div>
      <style>
        .timeline-chart {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .timeline-header {
          display: flex;
          font-weight: 600;
          font-size: 12px;
          padding: 8px 4px;
          background: var(--vscode-editor-background, #ffffff);
          border-bottom: 2px solid var(--vscode-panel-border, #e1e1e1);
        }
        .timeline-date-header { width: 100px; }
        .timeline-patterns-header { flex: 1; }
        .timeline-total-header { width: 50px; text-align: right; }
        .timeline-row {
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          background: var(--vscode-list-hoverBackground, #f0f0f0);
        }
        .timeline-row:hover {
          background: var(--vscode-list-activeSelectionBackground, #e6e6e6);
        }
        .timeline-date {
          width: 100px;
          font-size: 11px;
          font-weight: 500;
        }
        .timeline-bars {
          flex: 1;
          display: flex;
          gap: 2px;
          height: 16px;
          align-items: center;
        }
        .timeline-bar {
          height: 12px;
          border-radius: 2px;
          transition: all 0.2s ease;
        }
        .timeline-bar:hover {
          transform: scaleY(1.2);
        }
        .timeline-total {
          width: 50px;
          text-align: right;
          font-size: 11px;
          font-weight: 600;
        }
      </style>
    `;
    }
    generateHeatmap(patterns) {
        // Create workload vs framework heatmap
        const workloadTypes = ['ML', 'HPC', 'Stats', 'Device/Web'];
        const frameworks = ['TensorFlow', 'PyTorch', 'Custom', 'Other'];
        const heatmapData = new Map();
        // Initialize heatmap data
        workloadTypes.forEach(workload => {
            heatmapData.set(workload, new Map());
            frameworks.forEach(framework => {
                heatmapData.get(workload).set(framework, 0);
            });
        });
        // Populate heatmap data
        patterns.forEach(p => {
            const tags = workloadTags(p.pattern, p.tags || []);
            const framework = this.detectFramework(p.pattern);
            tags.forEach(workload => {
                if (workloadTypes.includes(workload)) {
                    const frameworkCategory = frameworks.includes(framework) ? framework : 'Other';
                    const current = heatmapData.get(workload).get(frameworkCategory) || 0;
                    heatmapData.get(workload).set(frameworkCategory, current + 1);
                }
            });
        });
        const maxValue = Math.max(...Array.from(heatmapData.values()).flatMap(workloadMap => Array.from(workloadMap.values())));
        const heatmapRows = workloadTypes.map(workload => {
            const workloadMap = heatmapData.get(workload);
            const cells = frameworks.map(framework => {
                const value = workloadMap.get(framework) || 0;
                const intensity = maxValue > 0 ? (value / maxValue) : 0;
                const color = `rgba(31, 119, 180, ${intensity})`; // Blue with varying intensity
                return `
          <div class="heatmap-cell" style="background: ${color};"
               title="${workload} - ${framework}: ${value} patterns"
               onclick="filterByWorkload('${workload}')"
               style="cursor: pointer;">
            <span class="heatmap-value">${value > 0 ? value : ''}</span>
          </div>
        `;
            }).join('');
            return `
        <div class="heatmap-row">
          <div class="heatmap-label">${workload}</div>
          ${cells}
        </div>
      `;
        }).join('');
        const headerRow = frameworks.map(framework => `<div class="heatmap-header">${framework}</div>`).join('');
        return `
      <div class="heatmap-chart">
        <div class="heatmap-grid">
          <div class="heatmap-row">
            <div class="heatmap-label"></div>
            ${headerRow}
          </div>
          ${heatmapRows}
        </div>
      </div>
      <style>
        .heatmap-chart {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .heatmap-grid {
          display: grid;
          grid-template-columns: 80px repeat(4, 1fr);
          gap: 2px;
        }
        .heatmap-row {
          display: contents;
        }
        .heatmap-label {
          font-size: 11px;
          font-weight: 600;
          padding: 8px 4px;
          display: flex;
          align-items: center;
          background: var(--vscode-editor-background, #ffffff);
        }
        .heatmap-header {
          font-size: 11px;
          font-weight: 600;
          padding: 8px 4px;
          text-align: center;
          background: var(--vscode-editor-background, #ffffff);
        }
        .heatmap-cell {
          aspect-ratio: 1;
          min-height: 40px;
          border: 1px solid var(--vscode-panel-border, #e1e1e1);
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.2s ease;
        }
        .heatmap-cell:hover {
          transform: scale(1.1);
          border-color: var(--vscode-focusBorder, #007fd4);
          z-index: 1;
        }
        .heatmap-value {
          font-size: 9px;
          font-weight: 600;
          color: white;
          text-shadow: 0 0 2px rgba(0,0,0,0.5);
        }
      </style>
    `;
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
    async getChildren(element) {
        const goalieDir = this.getGoalieDir();
        if (element || !goalieDir) {
            return [];
        }
        const patterns = await this.loadPatternMetrics();
        if (patterns.length === 0) {
            return [];
        }
        // Apply current filter
        const filteredPatterns = this.filterPatterns(patterns);
        const paginatedPatterns = this.getPaginatedResults(filteredPatterns);
        // Create root level items
        if (!element) {
            const items = [];
            // Add filter status item with enhanced display
            const filterLabels = this.currentFilters.map(f => f.label).join(', ');
            const filterItem = new vscode.TreeItem(`Filters: ${filterLabels || 'All Patterns'}`, vscode.TreeItemCollapsibleState.None);
            filterItem.iconPath = new vscode.ThemeIcon('filter');
            filterItem.description = `${filteredPatterns.length} of ${patterns.length} patterns`;
            if (this.activePreset) {
                const preset = this.filterPresets.find(p => p.id === this.activePreset);
                filterItem.tooltip = `Active preset: ${preset?.name}\nFilters: ${filterLabels}`;
            }
            else {
                filterItem.tooltip = `Active filters: ${filterLabels || 'None'}`;
            }
            filterItem.contextValue = 'patternFilter';
            items.push(filterItem);
            // Add filter presets item
            const presetsItem = new vscode.TreeItem('🎯 Filter Presets', vscode.TreeItemCollapsibleState.Collapsed);
            presetsItem.contextValue = 'filterPresets';
            presetsItem.description = `${this.filterPresets.length} presets available`;
            items.push(presetsItem);
            // Add quick filters item
            const quickFiltersItem = new vscode.TreeItem('⚡ Quick Filters', vscode.TreeItemCollapsibleState.Collapsed);
            quickFiltersItem.contextValue = 'quickFilters';
            items.push(quickFiltersItem);
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
            // Add chart items with different chart types
            const chartTypes = [
                { type: 'bar', label: '📊 Bar Chart', description: 'Horizontal bar chart' },
                { type: 'pie', label: '🥧 Pie Chart', description: 'Pie chart distribution' },
                { type: 'timeline', label: '📈 Timeline', description: 'Timeline view' },
                { type: 'heatmap', label: '🔥 Heatmap', description: 'Workload vs Framework heatmap' }
            ];
            chartTypes.forEach(chart => {
                const chartItem = new vscode.TreeItem(chart.label, vscode.TreeItemCollapsibleState.None);
                chartItem.tooltip = chart.description;
                chartItem.command = {
                    command: 'goalieDashboard.showPatternChart',
                    title: `Show ${chart.description}`,
                    arguments: [filteredPatterns, chart.type]
                };
                items.push(chartItem);
            });
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
        if (element.contextValue === 'filterPresets') {
            return this.filterPresets.map(preset => {
                const item = new vscode.TreeItem(preset.name, vscode.TreeItemCollapsibleState.None);
                item.tooltip = preset.description;
                item.description = this.activePreset === preset.id ? '✅ Active' : 'Click to apply';
                item.command = {
                    command: 'goalieDashboard.applyFilterPreset',
                    title: `Apply ${preset.name}`,
                    arguments: [preset.id]
                };
                return item;
            });
        }
        if (element.contextValue === 'quickFilters') {
            const quickFilters = [
                { type: 'circle', label: '🔵 Circle', options: ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker'] },
                { type: 'run-kind', label: '⚡ Run Kind', options: ['analysis', 'assessment', 'innovation', 'exploration', 'coordination'] },
                { type: 'workload', label: '💼 Workload', options: ['ML', 'HPC', 'Stats', 'Device/Web'] },
                { type: 'framework', label: '🔧 Framework', options: ['TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn'] },
                { type: 'gate', label: '🚪 Gate', options: ['deploy', 'test-first', 'autocommit', 'health-check'] },
                { type: 'date-range', label: '📅 Date Range', options: ['last-7days', 'last-30days', 'custom'] }
            ];
            return quickFilters.map(filter => {
                const item = new vscode.TreeItem(filter.label, vscode.TreeItemCollapsibleState.Collapsed);
                item.description = `${filter.options.length} options`;
                item.contextValue = `quickFilter_${filter.type}`;
                return item;
            });
        }
        if (element.contextValue === 'exportControls') {
            return [
                this.createCommandItem('Export as CSV', 'goalieDashboard.exportPatternMetricsCSV'),
                this.createCommandItem('Export as JSON', 'goalieDashboard.exportPatternMetricsJSON'),
                this.createCommandItem('Print Report', 'goalieDashboard.printPatternMetricsReport'),
                this.createCommandItem('Export Chart Data', 'goalieDashboard.exportChartData')
            ];
        }
        if (element.contextValue === 'pagination') {
            const patterns = await this.loadPatternMetrics();
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
        // Handle quick filter sub-items
        if (element.contextValue && element.contextValue.startsWith('quickFilter_')) {
            const filterType = element.contextValue.replace('quickFilter_', '');
            const quickFilter = {
                circle: { options: ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker'] },
                'run-kind': { options: ['analysis', 'assessment', 'innovation', 'exploration', 'coordination'] },
                workload: { options: ['ML', 'HPC', 'Stats', 'Device/Web'] },
                framework: { options: ['TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn'] },
                gate: { options: ['deploy', 'test-first', 'autocommit', 'health-check'] },
                'date-range': { options: ['last-7days', 'last-30days', 'custom'] }
            }[filterType];
            if (quickFilter) {
                return quickFilter.options.map(option => {
                    const item = new vscode.TreeItem(option, vscode.TreeItemCollapsibleState.None);
                    item.command = {
                        command: `goalieDashboard.quickFilterBy${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`,
                        title: `Filter by ${option}`,
                        arguments: [option]
                    };
                    return item;
                });
            }
        }
        return [];
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
        const tfLike = !!env?.tfLike;
        const torchLike = !!env?.torchLike;
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
        const clusterLike = !!env?.clusterLike;
        const workstationLike = !!env?.workstationLike;
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
    workspaceRoot;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    currentLens = 'ALL';
    latestGovernanceJson;
    latestCodeFixProposals;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    setGovernanceJson(json) {
        this.latestGovernanceJson = json;
        this.latestCodeFixProposals = Array.isArray(json?.codeFixProposals) ? json.codeFixProposals : undefined;
        this.refresh();
    }
    getCodeFixProposals() {
        return this.latestCodeFixProposals ?? [];
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
    async getChildren(element) {
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
            catch {
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
            catch {
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
            catch {
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
                catch {
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
                catch {
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
                    catch {
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
            const tagsArr = envHintsByKey.get(`${a.pattern}|${a.circle}|${a.depth}`)?.tags || [];
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
            if (a.isGap !== b.isGap)
                return a.isGap ? -1 : 1;
            const ac = a.codAvg ?? 0;
            const bc = b.codAvg ?? 0;
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
    }
}
class DepthLadderTimelineProvider {
    workspaceRoot;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
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
            catch {
                // ignore malformed lines
            }
        }
        events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        return events.map(ev => {
            const label = `${ev.timestamp || 'unknown'} · depth ${ev.depth}`;
            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            item.description = `run=${ev.run ?? ''} iter=${ev.iteration ?? ''} circle=${ev.circle ?? ''}`;
            return item;
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
        catch {
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
import { GoalieGapsProvider } from './goalieGapsProvider';
import { ProcessFlowMetricsProvider } from './processFlowMetricsProvider';
async function openKanbanItem(item) {
    if (!item.payload)
        return;
    const filePath = item.payload.filePath;
    if (filePath && fs.existsSync(filePath)) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
    }
    else {
        vscode.window.showInformationMessage(`No file associated with this item or file not found: ${filePath}`);
    }
}
async function moveKanbanItem(item) {
    if (!item.payload || !item.section)
        return;
    const options = ['NOW', 'NEXT', 'LATER', 'DONE']; // DONE is valid target
    const target = await vscode.window.showQuickPick(options.filter(o => o !== item.section), {
        placeHolder: `Move "${item.label}" to...`
    });
    if (target) {
        const goalieDir = getGoalieDir(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
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
}
export function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Goalie Debug');
    outputChannel.appendLine('Goalie Extension Activated');
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    outputChannel.appendLine(`Workspace Root: ${root}`);
    const extensionVersion = context.extension.packageJSON?.version;
    const extensionName = context.extension.packageJSON?.name;
    const vscodeVersion = vscode.version;
    const telemetry = new GoalieTelemetry(outputChannel, root);
    context.subscriptions.push({ dispose: () => telemetry.dispose() });
    outputChannel.appendLine('Initializing Providers...');
    const kanbanProvider = new GoalieKanbanProvider(root, outputChannel);
    const patternMetricsProvider = new PatternMetricsProvider(root, context);
    const governanceEconomicsProvider = new GovernanceEconomicsProvider(root);
    const depthTimelineProvider = new DepthLadderTimelineProvider(root);
    const sessionStats = new Map();
    const gapsProvider = new GoalieGapsProvider(root, outputChannel, sessionStats);
    const dtCalibrationProvider = new DtCalibrationProvider(root, outputChannel);
    const processFlowMetricsProvider = new ProcessFlowMetricsProvider(root);
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
        const govGaps = Array.isArray(governanceJson?.topEconomicGaps)
            ? governanceJson.topEconomicGaps
            : [];
        const retroGaps = Array.isArray(retroJson?.topEconomicGaps)
            ? retroJson.topEconomicGaps
            : [];
        const observabilityBuckets = Array.isArray(governanceJson?.observabilityActions)
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
                const bc = String(b.circle ?? '<none>');
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
            const pattern = String(row.pattern ?? '<unknown>');
            const circle = String(row.circle ?? '<none>');
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
            const ai = a.totalImpact ?? a.cod ?? 0;
            const bi = b.totalImpact ?? b.cod ?? 0;
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
            const pattern = String(row.pattern ?? '<unknown>');
            const circle = String(row.circle ?? '<none>');
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
            const ac = a.cod ?? 0;
            const bc = b.cod ?? 0;
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
        const governanceSummary = governanceJson?.governanceSummary;
        const relentless = governanceJson?.relentlessExecution;
        const retroBaseline = retroJson?.baselineComparison;
        const govBaseline = governanceJson?.baselineComparison;
        const governanceSummaryHtml = governanceSummary
            ? `<p><strong>Governance:</strong> total=${governanceSummary.total ?? 'n/a'}, ok=${governanceSummary.ok ?? 'n/a'}, failed=${governanceSummary.failed ?? 'n/a'}</p>`
            : '';
        const relentlessHtml = relentless
            ? `<p><strong>Relentless Execution:</strong> pctActionsDone=${relentless.pctActionsDone ?? 'n/a'}%, avgCycleTimeSec=${relentless.avgCycleTimeSec ?? 'n/a'}</p>`
            : '';
        const retroBaselineDetailHtml = retroBaseline
            ? (() => {
                const base = typeof retroBaseline.baselineScore === 'number'
                    ? retroBaseline.baselineScore.toFixed(2)
                    : retroBaseline.baselineScore ?? 'n/a';
                const curr = typeof retroBaseline.currentScore === 'number'
                    ? retroBaseline.currentScore.toFixed(2)
                    : retroBaseline.currentScore ?? 'n/a';
                const deltaVal = typeof retroBaseline.delta === 'number'
                    ? retroBaseline.delta.toFixed(2)
                    : retroBaseline.delta ?? 'n/a';
                const deltaPctVal = typeof retroBaseline.deltaPct === 'number'
                    ? `${retroBaseline.deltaPct.toFixed(1)}%`
                    : retroBaseline.deltaPct ?? 'n/a';
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
                    ? `, baselineTs=${retroBaseline.baselineTimestamp ?? 'n/a'}, currentTs=${retroBaseline.currentTimestamp ?? 'n/a'}`
                    : '';
                return `<h2>Retro Baseline Comparison</h2>
  <p><strong>Score:</strong> baseline=${base}, current=${curr}, delta=${deltaHtml}, regression=${hasRegression ? 'yes' : 'no'}, improvement=${hasImprovement ? 'yes' : 'no'}${tsPart}</p>`;
            })()
            : '';
        const retroRegressionRows = (retroBaseline?.topRegressions ?? []).map((row) => {
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
        const retroImprovementRows = (retroBaseline?.topImprovements ?? []).map((row) => {
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
        const governanceRegressionRows = (govBaseline?.topRegressions ?? []).map((row) => {
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
        const governanceImprovementRows = (govBaseline?.topImprovements ?? []).map((row) => {
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
        const insightsSummary = retroJson?.insightsSummary;
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
        const goalieDirJson = governanceJson?.goalieDir || retroJson?.goalieDir || '';
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
        catch {
            return undefined;
        }
    }
    async function runAfJson(subcommand) {
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
            exec(`"${afScript}" ${subcommand} --json`, { cwd: root }, (error, stdout, stderr) => {
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
    }
    async function refreshLiveGapsPanelIfOpen() {
        if (!enableRealtimeDashboard || !liveGapsPanel) {
            return;
        }
        const [governanceJson, retroJson] = await Promise.all([
            runAfJson('governance-agent'),
            runAfJson('retro-coach'),
        ]);
        if (!governanceJson && !retroJson) {
            liveGapsPanel.webview.html = '<html><body><p>Failed to load governance and retro JSON output. Check Goalie CLI logs.</p></body></html>';
            return;
        }
        liveGapsPanel.webview.html = renderLiveGapsHtml(governanceJson ?? {}, retroJson ?? {});
    }
    outputChannel.appendLine('Registering Tree Data Providers...');
    let streamClient;
    const startStreamClient = () => {
        if (!enableRealtimeDashboard) {
            return;
        }
        const goalieDir = getGoalieDir(root);
        const socketOverride = vscode.workspace.getConfiguration('goalie').get('streamSocketPath');
        const socketPath = resolveStreamSocketPath(goalieDir, socketOverride);
        if (!socketPath) {
            outputChannel.appendLine('[Stream] No socket path available; skipping stream client.');
            return;
        }
        if (!streamClient) {
            streamClient = new StreamClient({
                socketPath,
                telemetry,
                output: outputChannel,
                onEvent: payload => {
                    if (payload?.type === 'governance-json' && payload.data) {
                        governanceEconomicsProvider.setGovernanceJson(payload.data);
                        gapsProvider.refresh();
                    }
                    if (payload?.type === 'retro-json' && payload.data) {
                        // Future: refresh retro views if needed
                    }
                    if (payload?.type === 'dt-dashboard-summary' && payload.data) {
                        try {
                            const msg = payload.data;
                            dtCalibrationProvider.handleSummaryMessage(msg);
                        }
                        catch (err) {
                            outputChannel.appendLine(`[DT] Error handling dt-dashboard-summary event: ${err?.message ?? String(err)}`);
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
        outputChannel.appendLine(`[UX-TRACKING] Expanded Gap Item: ${e.element.label}`);
        const item = e.element;
        const key = `${item.gapContext.pattern}|${item.gapContext.circle}|${item.gapContext.depth}`;
        const stats = sessionStats.get(key) || {};
        stats.expands = (stats.expands ?? 0) + 1;
        sessionStats.set(key, stats);
        telemetry.log('goalie.gapExpanded', {
            pattern: item.gapContext.pattern,
            circle: item.gapContext.circle,
            depth: item.gapContext.depth.toString(),
            lens: context.workspaceState.get('goalie.currentLens') ?? 'ALL',
            source: 'tree'
        });
    }));
    // Register other providers
    context.subscriptions.push(vscode.window.registerTreeDataProvider('patternMetricsView', patternMetricsProvider), vscode.window.registerTreeDataProvider('governanceEconomicsView', governanceEconomicsProvider), vscode.window.registerTreeDataProvider('depthLadderTimelineView', depthTimelineProvider), vscode.window.registerTreeDataProvider('processFlowMetricsView', processFlowMetricsProvider));
    outputChannel.appendLine('Tree Data Providers Registered.');
    context.subscriptions.push(vscode.commands.registerCommand('goalieDashboard.refreshKanban', () => kanbanProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.refreshPatternMetrics', () => patternMetricsProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.exportPatternMetricsCSV', () => patternMetricsProvider.exportData('csv')), vscode.commands.registerCommand('goalieDashboard.exportPatternMetricsJSON', () => patternMetricsProvider.exportData('json')), vscode.commands.registerCommand('goalieDashboard.printPatternMetricsReport', () => patternMetricsProvider.printReport()), 
    // Enhanced pattern metrics commands
    vscode.commands.registerCommand('goalieDashboard.showPatternChart', (patterns, chartType) => patternMetricsProvider.showPatternChart(patterns, chartType)), vscode.commands.registerCommand('goalieDashboard.applyFilterPreset', (presetId) => patternMetricsProvider.applyFilterPreset(presetId)), vscode.commands.registerCommand('goalieDashboard.quickFilterByCircle', (circle) => patternMetricsProvider.quickFilterByCircle(circle)), vscode.commands.registerCommand('goalieDashboard.quickFilterByRunKind', (runKind) => patternMetricsProvider.quickFilterByRunKind(runKind)), vscode.commands.registerCommand('goalieDashboard.quickFilterByWorkload', (workload) => patternMetricsProvider.quickFilterByWorkload(workload)), vscode.commands.registerCommand('goalieDashboard.quickFilterByFramework', (framework) => patternMetricsProvider.quickFilterByFramework(framework)), vscode.commands.registerCommand('goalieDashboard.quickFilterByDateRange', (range) => patternMetricsProvider.quickFilterByDateRange(range)), vscode.commands.registerCommand('goalieDashboard.quickFilterByGate', (gate) => patternMetricsProvider.quickFilterByGate(gate)), vscode.commands.registerCommand('goalieDashboard.clearFilters', () => patternMetricsProvider.clearFilters()), vscode.commands.registerCommand('goalieDashboard.exportChartData', (format) => patternMetricsProvider.exportChartData(format)), vscode.commands.registerCommand('goalieDashboard.patternMetricsPreviousPage', () => patternMetricsProvider.previousPage()), vscode.commands.registerCommand('goalieDashboard.patternMetricsNextPage', () => patternMetricsProvider.nextPage()), vscode.commands.registerCommand('goalieDashboard.patternMetricsSetPageSize', () => {
        vscode.window.showInputBox({
            prompt: 'Enter page size (10-200):',
            value: patternMetricsProvider['pageSize'].toString(),
            validateInput: (value) => {
                const num = parseInt(value);
                return !isNaN(num) || num < 10 || num > 200 ? 'Page size must be between 10 and 200' : null;
            }
        }).then(value => {
            if (value) {
                patternMetricsProvider.setPageSize(parseInt(value));
            }
        });
    }), vscode.commands.registerCommand('goalieDashboard.refreshGovernanceEconomics', () => governanceEconomicsProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.refreshDepthLadderTimeline', () => depthTimelineProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.refreshGoalieGaps', () => gapsProvider.refresh()), vscode.commands.registerCommand('goalieDashboard.openKanbanItem', openKanbanItem), vscode.commands.registerCommand('goalieDashboard.moveKanbanItem', moveKanbanItem), vscode.commands.registerCommand('goalieDashboard.filterAll', () => {
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
    }), vscode.commands.registerCommand('goalie.openLiveGapsPanel', async () => {
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
        await refreshLiveGapsPanelIfOpen();
    }), vscode.commands.registerCommand('goalie.showDtDashboard', async () => {
        await dtCalibrationProvider.openDashboardHtml();
    }), vscode.commands.registerCommand('goalie.runDtE2eCheck', () => {
        dtCalibrationProvider.runDtE2eCheck();
    }), vscode.commands.registerCommand('goalie.runGovernanceAudit', async () => {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running Governance Audit (JSON)...',
            cancellable: false,
        }, async () => {
            try {
                const governanceJson = await runAfJson('governance-agent');
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
                const message = err?.message || String(err);
                outputChannel.appendLine(`[GovernanceAudit] Error running governance-agent: ${message}`);
                vscode.window.showErrorMessage(`Governance Audit Failed: ${message}`);
            }
        });
    }), vscode.commands.registerCommand('goalie.runRetroCoach', async () => {
        await vscode.commands.executeCommand('goalie.runRetro');
    }), vscode.commands.registerCommand('goalie.runRetro', async () => {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running Retro Coach (JSON)...',
            cancellable: false,
        }, async () => {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting Retro Coach (JSON) ---');
            try {
                const retroJson = await runAfJson('retro-coach');
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
                    catch {
                        // best-effort logging only
                    }
                }
                await refreshLiveGapsPanelIfOpen();
            }
            catch (err) {
                const message = err?.message || String(err);
                outputChannel.appendLine(`[RetroCoach] Error running retro-coach: ${message}`);
                vscode.window.showErrorMessage(`Retro Coach Failed: ${message}`);
            }
            finally {
                outputChannel.appendLine('--- Retro Coach Completed ---');
            }
        });
    }), vscode.commands.registerCommand('goalie.runWsjf', async () => {
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
        }, async () => {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting WSJF Analysis ---');
            return new Promise((resolve, reject) => {
                exec(`"${afScript}" wsjf`, { cwd: root }, (error, stdout, stderr) => {
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
        });
    }), vscode.commands.registerCommand('goalie.runProdCycle', async () => {
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
        }, async () => {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting Production Cycle ---');
            return new Promise((resolve, reject) => {
                exec(`"${afScript}" prod-cycle`, { cwd: root }, (error, stdout, stderr) => {
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
        });
    }), vscode.commands.registerCommand('goalie.startFederation', async () => {
        if (!root) {
            vscode.window.showErrorMessage('No workspace open.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Starting Federation...',
            cancellable: false,
        }, async () => {
            outputChannel.show(true);
            outputChannel.appendLine('\n--- Starting Federation ---');
            return new Promise((resolve, reject) => {
                exec('npx agentic-flow federation start', { cwd: root }, (error, stdout, stderr) => {
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
        });
    }));
    async function applyCodeFixProposalInternal(proposal, options) {
        const logPrefix = options?.logPrefix ?? '[CodeFix]';
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
            await vscode.commands.executeCommand('goalieDashboard.viewCodeFixProposal', proposal);
            return 'skipped';
        }
        const patternLabel = proposal.pattern ? String(proposal.pattern) : 'unknown-pattern';
        const needsApproval = proposal.approvalRequired === true;
        const approver = proposal.approverRole ? String(proposal.approverRole) : 'governance owner';
        const approvalLabel = needsApproval ? `Requires approval (${approver})` : 'Auto-approvable fix';
        if (!options?.skipConfirmation) {
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
            const choice = await vscode.window.showWarningMessage('Apply Goalie code fix proposal?', {
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
            const doc = await vscode.workspace.openTextDocument(absolutePath);
            const editor = await vscode.window.showTextDocument(doc, { preview: false });
            const lastLine = doc.lineCount > 0 ? doc.lineCount - 1 : 0;
            const endPosition = doc.lineAt(lastLine).range.end;
            const header = `\n\n// --- Goalie Code Fix: ${patternLabel} ---\n`;
            const body = snippet.endsWith('\n') ? snippet : `${snippet}\n`;
            const success = await editor.edit(editBuilder => {
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
            const msg = err?.message || String(err);
            vscode.window.showErrorMessage('Failed to apply Goalie code fix proposal. See Output for details.');
            outputChannel.appendLine(`${logPrefix} Apply failed with error: ${msg}`);
            return 'error';
        }
    }
    context.subscriptions.push(vscode.commands.registerCommand('goalieDashboard.viewCodeFixProposal', async (proposal) => {
        if (!proposal) {
            vscode.window.showErrorMessage('No code fix proposal provided.');
            return;
        }
        const snippet = (typeof proposal.codeSnippet === 'string' && proposal.codeSnippet) ||
            (typeof proposal.configSnippet === 'string' && proposal.configSnippet) ||
            (typeof proposal.testSnippet === 'string' && proposal.testSnippet) ||
            '';
        const doc = await vscode.workspace.openTextDocument({
            language: 'markdown',
            content: snippet || (proposal.description || 'No snippet available for this proposal.'),
        });
        await vscode.window.showTextDocument(doc, { preview: true });
    }), vscode.commands.registerCommand('goalieDashboard.viewAllCodeFixProposals', async () => {
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
        const doc = await vscode.workspace.openTextDocument({
            language: 'markdown',
            content: markdownLines.join('\n'),
        });
        await vscode.window.showTextDocument(doc, { preview: true });
    }), vscode.commands.registerCommand('goalieDashboard.applyCodeFixProposal', async (proposal) => {
        const result = await applyCodeFixProposalInternal(proposal);
        if (result === 'applied') {
            telemetry.log('goalie.quickFix.applied', {
                pattern: proposal?.pattern ?? 'unknown',
                fixType: proposal?.codeSnippet ? 'code' : proposal?.configSnippet ? 'config' : 'test',
                filePath: proposal?.filePath ?? '',
                mode: proposal?.mode ?? 'dry-run',
                source: 'proposalList'
            });
        }
    }), vscode.commands.registerCommand('goalieDashboard.applySafeCodeFixesBatch', async () => {
        const config = vscode.workspace.getConfiguration('goalie');
        const enabled = config.get('autoApplyFixes.enabled', false);
        if (!enabled) {
            vscode.window.showInformationMessage('Goalie auto-apply of governance code fixes is disabled. Enable it in settings (goalie.autoApplyFixes.enabled).');
            return;
        }
        outputChannel.show(true);
        outputChannel.appendLine('\n[CodeFix][AUTO] Starting batch apply of safe governance code fixes...');
        const governanceJson = await runAfJson('governance-agent');
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
            const choice = await vscode.window.showWarningMessage(`Apply ${autoEligible.length} auto-eligible Goalie code fixes now?`, {
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
            const result = await applyCodeFixProposalInternal(proposal, {
                skipConfirmation: true,
                logPrefix: '[CodeFix][AUTO]',
            });
            if (result === 'applied') {
                applied += 1;
                telemetry.log('goalie.quickFix.applied', {
                    pattern: proposal?.pattern ?? 'unknown',
                    fixType: proposal?.codeSnippet ? 'code' : proposal?.configSnippet ? 'config' : 'test',
                    filePath: proposal?.filePath ?? '',
                    mode: proposal?.mode ?? 'apply',
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
    }));
}
export function deactivate() { }
//# sourceMappingURL=extension.js.map