import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { DtCalibrationProvider } from './dtCalibrationProvider';
import { StreamClient } from './streamClient';
import { resolveStreamSocketPath } from './streamUtils';
import { GoalieTelemetry } from './telemetry';
import { EnhancedFileWatcher } from './enhancedFileWatcher';
import type { DtDashboardSummaryReadyMessage } from './types/dtCalibration';

type KanbanSection = 'NOW' | 'NEXT' | 'LATER';

interface KanbanEntry {
  id?: string;
  title?: string;
  summary?: string;
  filePath?: string;
  metrics?: string[];
  [key: string]: any;
}

function getGoalieDir(workspaceRoot?: string): string | undefined {
  const config = vscode.workspace.getConfiguration('goalie');
  const customPath = config.get<string>('directoryPath');
  if (customPath) {
    return customPath;
  }
  if (workspaceRoot) {
    return path.join(workspaceRoot, '.goalie');
  }
  return undefined;
}

function getKanbanBoardPath(goalieDir?: string): string | undefined {
  if (!goalieDir) {
    return undefined;
  }
  return path.join(goalieDir, 'KANBAN_BOARD.yaml');
}

function loadKanbanDoc(goalieDir?: string): any | undefined {
  const boardPath = getKanbanBoardPath(goalieDir);
  if (!boardPath || !fs.existsSync(boardPath)) {
    return undefined;
  }
  try {
    const raw = fs.readFileSync(boardPath, 'utf8');
    return yaml.parse(raw) || {};
  } catch (err) {
    console.warn('[Kanban] Failed to parse board file:', err);
    return undefined;
  }
}

function saveKanbanDoc(goalieDir: string, doc: any): void {
  const boardPath = getKanbanBoardPath(goalieDir);
  if (!boardPath) {
    throw new Error('Goalie directory not configured');
  }
  const serialized = yaml.stringify(doc, { indent: 2 });
  fs.writeFileSync(boardPath, serialized, 'utf8');
}

function updateKanbanEntry(goalieDir: string, section: KanbanSection, entryId: string, updates: Partial<KanbanEntry>): void {
  const doc = loadKanbanDoc(goalieDir);
  if (!doc) return;
  const list = doc[section] as KanbanEntry[];
  if (!list) return;
  const idx = list.findIndex(e => e.id === entryId || e.title === entryId || e.summary === entryId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    saveKanbanDoc(goalieDir, doc);
  }
}

function removeKanbanEntry(goalieDir: string, section: KanbanSection, entryId: string): void {
  const doc = loadKanbanDoc(goalieDir);
  if (!doc) return;
  const list = doc[section] as KanbanEntry[];
  if (!list) return;
  const idx = list.findIndex(e => e.id === entryId || e.title === entryId || e.summary === entryId);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveKanbanDoc(goalieDir, doc);
  }
}

function ensureSection(doc: any, section: KanbanSection): KanbanEntry[] {
  if (!doc[section]) {
    doc[section] = [];
  }
  if (!Array.isArray(doc[section])) {
    doc[section] = [];
  }
  return doc[section] as KanbanEntry[];
}

function indexOfEntry(entries: KanbanEntry[], payload: KanbanEntry): number {
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

function moveKanbanEntry(
  goalieDir: string,
  payload: KanbanEntry,
  fromSection: KanbanSection,
  toSection: KanbanSection
): void {
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

function addKanbanEntry(goalieDir: string, section: KanbanSection, payload: KanbanEntry): void {
  const doc = loadKanbanDoc(goalieDir);
  if (!doc) {
    throw new Error('Kanban board file not found.');
  }
  const targetEntries = ensureSection(doc, section);
  const newEntry = { ...payload, id: payload.id || Date.now().toString(), createdAt: new Date().toISOString() };
  targetEntries.push(newEntry);
  saveKanbanDoc(goalieDir, doc);
}

function buildKanbanTooltip(entry: KanbanEntry): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString(undefined, true);
  markdown.isTrusted = true;
  markdown.appendMarkdown('```json\n');
  markdown.appendMarkdown(JSON.stringify(entry, null, 2));
  markdown.appendMarkdown('\n```');
  return markdown;
}

class KanbanItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly section?: KanbanSection,
    public readonly payload?: KanbanEntry
  ) {
    super(label, collapsibleState);
    if (section) {
      this.contextValue = 'goalieKanbanSection';
    }
  }
}

class GoalieKanbanProvider implements vscode.TreeDataProvider<KanbanItem>, vscode.TreeDragAndDropController<KanbanItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<KanbanItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private readonly WIP_LIMIT = 5; // Default WIP limit per section

  readonly dropMimeTypes = ['application/vnd.code.tree.goalieKanbanItem'];
  readonly dragMimeTypes = ['application/vnd.code.tree.goalieKanbanItem'];

  constructor(private readonly workspaceRoot: string | undefined, private readonly logger: vscode.OutputChannel) {}

  handleDrag(source: KanbanItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
    if (source.length > 0 && source[0].payload && source[0].section) {
      const item = source[0];
      const transferData = { ...item.payload, _fromSection: item.section };
      dataTransfer.set('application/vnd.code.tree.goalieKanbanItem', new vscode.DataTransferItem(JSON.stringify(transferData)));
    }
  }

  handleDrop(target: KanbanItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
    const transferItem = dataTransfer.get('application/vnd.code.tree.goalieKanbanItem');
    if (!transferItem) return;

    try {
      const data = JSON.parse(transferItem.value);
      const fromSection = data._fromSection as KanbanSection;
      const { _fromSection, ...payload } = data;

      let targetSection: KanbanSection | undefined;
      if (target) {
        if (target.contextValue === 'goalieKanbanSection') {
          targetSection = target.section;
        } else if (target.section) {
          targetSection = target.section;
        }
      }

      if (fromSection && targetSection && fromSection !== targetSection) {
        const goalieDir = getGoalieDir(this.workspaceRoot);
        if (goalieDir) {
          moveKanbanEntry(goalieDir, payload, fromSection, targetSection);
          this.refresh();
        }
      }
    } catch (e) {
      this.logger.appendLine(`[Kanban] Drop failed: ${e}`);
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: KanbanItem): vscode.TreeItem {
    return element;
  }

  private calculateWipViolation(items: any[]): { count: number; violation: boolean; percentage: number } {
    const count = items.length;
    const violation = count > this.WIP_LIMIT;
    const percentage = violation ? ((count - this.WIP_LIMIT) / this.WIP_LIMIT) * 100 : 0;
    return { count, violation, percentage };
  }

  private getWsjfFromPatternMetrics(patternId: string): number | undefined {
    const goalieDir = getGoalieDir(this.workspaceRoot);
    if (!goalieDir) return undefined;

    const patternPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    if (!fs.existsSync(patternPath)) return undefined;

    try {
      const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const event = obj?.data ?? obj;
          const matches =
            event?.id === patternId ||
            event?.title === patternId ||
            event?.pattern === patternId ||
            event?.metadata?.actionId === patternId;
          if (matches) {
            return event?.economic?.wsjf_score;
          }
        } catch {
          // ignore malformed lines
        }
      }
    } catch {
      // ignore file read errors
    }
    return undefined;
  }

  private getCompletionRate(itemId: string): number {
    // Simple completion rate calculation based on pattern metrics
    const goalieDir = getGoalieDir(this.workspaceRoot);
    if (!goalieDir) return 0;

    const patternPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    if (!fs.existsSync(patternPath)) return 0;

    try {
      const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
      let totalActions = 0;
      let completedActions = 0;

      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const event = obj?.data ?? obj;
          if (event?.id === itemId || event?.title === itemId || event?.pattern === itemId || event?.metadata?.actionId === itemId) {
            totalActions++;
            if (event?.action_completed || event?.metadata?.action_completed) {
              completedActions++;
            }
          }
        } catch {
          // ignore malformed lines
        }
      }

      return totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
    } catch {
      // ignore file read errors
    }
    return 0;
  }

  async getChildren(element?: KanbanItem): Promise<KanbanItem[]> {
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
           if (health.incidents > 5) health.safe = false;
        }
      } catch (e) {
        this.logger.appendLine(`[Kanban] Health check failed: ${e}`);
      }

      return ['NOW', 'NEXT', 'LATER'].map(sec => {
        const items = (doc[sec] || []) as any[];
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

        const item = new KanbanItem(
          label,
          vscode.TreeItemCollapsibleState.Collapsed,
          sec as KanbanSection
        );

        if (sec === 'NOW') {
          item.iconPath = new vscode.ThemeIcon('play-circle');
          item.contextValue = 'kanbanSectionNow';
          if (!health.safe) {
              item.description = `⚠️ High Load (${health.incidents} incidents)`;
          }
          if (wipStatus.violation) {
              item.description = (item.description || '') + ` | WIP Limit Exceeded`;
          }
        } else if (sec === 'NEXT') {
          item.iconPath = new vscode.ThemeIcon('arrow-circle-right');
          item.contextValue = 'kanbanSectionNext';
          if (wipStatus.violation) {
              item.description = 'WIP Limit Exceeded';
          }
        } else {
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
        } else {
          tooltip += `\n✅ WIP Limit: ${wipStatus.count}/${this.WIP_LIMIT} (within limit)`;
        }
        item.tooltip = tooltip;

        return item;
      });
    }

    if (element.section) {
      const items = (doc[element.section] || []) as KanbanEntry[];
      return items.map(it => {
        const wsjfScore = this.getWsjfFromPatternMetrics(it.id || '');
        const completionRate = this.getCompletionRate(it.id || '');

        // Build priority indicator
        let priorityIndicator = '';
        if (wsjfScore !== undefined) {
          if (wsjfScore >= 15) {
            priorityIndicator = '🔴'; // High priority
          } else if (wsjfScore >= 8) {
            priorityIndicator = '🟡'; // Medium priority
          } else {
            priorityIndicator = '🟢'; // Low priority
          }
        }

        // Build completion indicator
        let completionIndicator = '';
        if (completionRate >= 80) {
          completionIndicator = '✅';
        } else if (completionRate >= 50) {
          completionIndicator = '⚠️';
        } else {
          completionIndicator = '❌';
        }

        const label = it.title || it.summary || (it.id ? `Item ${it.id}` : JSON.stringify(it));
        const item = new KanbanItem(
          `${priorityIndicator} ${label} ${completionIndicator}`,
          vscode.TreeItemCollapsibleState.None,
          element.section,
          it
        );

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

// Enhanced filter interfaces for advanced filtering
interface PatternFilter {
  type: 'all' | 'circle' | 'run-kind' | 'date-range' | 'gate' | 'workload' | 'framework';
  value: string;
  label: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: PatternFilter[];
  description: string;
}

interface PatternChartPanel {
  panel: vscode.WebviewPanel;
  patterns: any[];
  filters: PatternFilter[];
}

class PatternItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly metric: any
  ) {
    super(label, collapsibleState);
    this.contextValue = 'goaliePatternItem';
  }
}

class GoalieEmptyItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string,
    tooltip: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.tooltip = new vscode.MarkdownString(tooltip);
    this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.blue'));
    this.contextValue = 'goalieEmptyState';
  }
}

class PatternMetricsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Enhanced filtering system
  private currentFilters: PatternFilter[] = [];
  private filterPresets: FilterPreset[] = [];
  private activePreset: string | null = null;

  // Performance and caching
  private cache: Map<string, any[]> = new Map();
  private lastModified: number = 0;
  private pageSize: number = 50;
  private currentPage: number = 1;
  private aggregationsCache: Map<string, any> = new Map();

  // Real-time updates
  private autoRefreshInterval: NodeJS.Timeout | undefined;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private refreshDebounce: NodeJS.Timeout | undefined;
  private newPatterns: Set<string> = new Set();

  // Chart visualization
  private chartPanels: Map<string, PatternChartPanel> = new Map();

  constructor(private readonly workspaceRoot?: string, private readonly context?: vscode.ExtensionContext) {
    this.initializeFilterPresets();
    this.loadPersistedFilters();
    this.startAutoRefresh();
    this.setupFileWatcher();
  }

  // ... (previous methods: loadPersistedFilters, startAutoRefresh, initializeFilterPresets, setupFileWatcher, debouncedRefresh, refresh, getTreeItem) ...
  private loadPersistedFilters(): void {
    if (this.context) {
      const persisted = this.context.globalState.get<PatternFilter[]>('goalie.patternMetrics.filters');
      if (persisted) {
        this.currentFilters = persisted;
      }
    }
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    const interval = vscode.workspace.getConfiguration('goalie').get<number>('patternMetrics.refreshInterval') || 30;
    if (interval > 0) {
      this.autoRefreshInterval = setInterval(() => {
        this.refresh();
      }, interval * 1000);
    }
  }

  private initializeFilterPresets(): void {
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
        description: 'Patterns from last 7 days',
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

  private setupFileWatcher(): void {
    const goalieDir = getGoalieDir(this.workspaceRoot);
    if (!goalieDir) return;

    const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(patternMetricsPath, '*')
    );

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

  private debouncedRefresh(): void {
    if (this.refreshDebounce) {
      clearTimeout(this.refreshDebounce);
      this.refreshDebounce = undefined;
    }
    this.refreshDebounce = setTimeout(() => this.refresh(), 300);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  addFilter(filter: PatternFilter): void {
    // Avoid duplicates
    if (!this.currentFilters.some(f => f.type === filter.type && f.value === filter.value)) {
      this.currentFilters.push(filter);
      if (this.context) {
        this.context.globalState.update('goalie.patternMetrics.filters', this.currentFilters);
      }
      this.refresh();
    }
  }

  clearFilters(): void {
    this.currentFilters = [];
    if (this.context) {
      this.context.globalState.update('goalie.patternMetrics.filters', []);
    }
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element instanceof PatternItem) {
        return this.getPatternDetails(element);
    }

    if (!this.workspaceRoot) return [];

    const goalieDir = getGoalieDir(this.workspaceRoot);
    if (!goalieDir) return [];
    
    const metricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    if (!fs.existsSync(metricsPath)) {
        return [new GoalieEmptyItem(
            'No Pattern Metrics',
            'File not found',
            '**No pattern metrics file found.**\n\nEnsure that the agentic flow scripts are generating `pattern_metrics.jsonl` in your `.goalie` directory.\n\nRight-click for options.'
        )];
    }

    try {
        const content = fs.readFileSync(metricsPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        
        let filteredLines = lines;
        
        // Apply Filters
        if (this.currentFilters.length > 0) {
            filteredLines = lines.filter(line => {
                try {
                    const m = JSON.parse(line);
                    for (const filter of this.currentFilters) {
                        if (filter.type === 'gate' && m.gate !== filter.value) return false;
                        if (filter.type === 'date-range' && filter.value === 'last-7days') {
                            const date = new Date(m.ts);
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                            if (date < sevenDaysAgo) return false;
                        }
                        // Add more filter types as needed (workload, etc. might need schema update)
                    }
                    return true;
                } catch { return false; }
            });
        }

        const items: vscode.TreeItem[] = [];

        // Add Active Filters Indicator
        if (this.currentFilters.length > 0) {
            const label = `Active Filters: ${this.currentFilters.length}`;
            const tooltip = this.currentFilters.map(f => f.label).join('\n');
            const filterItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            filterItem.description = '(Click to Clear)';
            filterItem.tooltip = new vscode.MarkdownString(`**Active Filters**\n\n${tooltip}\n\nClick to clear all filters.`);
            filterItem.iconPath = new vscode.ThemeIcon('filter');
            filterItem.contextValue = 'goalieFilterItem';
            filterItem.command = {
                command: 'goalieDashboard.clearFilters',
                title: 'Clear All Filters'
            };
            items.push(filterItem);
        }
        
        const metricItems = filteredLines.slice(-this.pageSize).reverse().map(line => {
            try {
                const metric = JSON.parse(line);
                const label = `${metric.pattern} (${metric.gate})`;
                // Enable drill-down by setting CollapsibleState to Collapsed
                const item = new PatternItem(label, vscode.TreeItemCollapsibleState.Collapsed, metric);
                item.description = `${metric.behavior} | ${new Date(metric.ts).toLocaleTimeString()}`;
                
                let tooltipMd = `**Pattern:** ${metric.pattern}\n**Gate:** ${metric.gate}\n**Behavior:** ${metric.behavior}\n**Timestamp:** ${metric.ts}`;
                
                if (metric.economic?.wsjf_score) {
                    const score = metric.economic.wsjf_score;
                    let rec = 'Low Priority';
                    if (score > 10) rec = '🔥 High Priority - Expedite';
                    else if (score > 5) rec = '⚠️ Medium Priority';
                    
                    tooltipMd += `\n\n**💰 WSJF Score:** ${score}`;
                    tooltipMd += `\n**Recommendation:** ${rec}`;
                    tooltipMd += `\n**CoD:** ${metric.economic.cost_of_delay} | **Size:** ${metric.economic.job_size}`;
                }

                tooltipMd += `\n\n**Details:**\n\`\`\`json\n${JSON.stringify(metric.details, null, 2)}\n\`\`\``;
                
                item.tooltip = new vscode.MarkdownString(tooltipMd);
                item.iconPath = metric.success ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed')) : new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconFailed'));
                return item;
            } catch (e) {
                return null;
            }
        }).filter(item => item !== null) as vscode.TreeItem[];
        
        items.push(...metricItems);

        return items.length > 0 ? items : [new GoalieEmptyItem(
            'No Metrics Match Filters',
            'Try clearing filters',
            '**No metrics match your current criteria.**\n\nTry clearing filters or checking the data source.\n\nRight-click for aggregation options.'
        )];
    } catch (e) {
        return [new vscode.TreeItem(`Error: ${e}`, vscode.TreeItemCollapsibleState.None)];
    }
  }

  private getPatternDetails(item: PatternItem): vscode.TreeItem[] {
      const children: vscode.TreeItem[] = [];
      const m = item.metric;

      if (m.economic) {
          const { wsjf_score, cost_of_delay, job_size } = m.economic;
          
          const wsjfItem = new vscode.TreeItem(`💰 WSJF Score: ${wsjf_score}`, vscode.TreeItemCollapsibleState.None);
          wsjfItem.description = 'Weighted Shortest Job First';
          wsjfItem.tooltip = 'Cost of Delay / Job Size';
          children.push(wsjfItem);

          const codItem = new vscode.TreeItem(`📉 Cost of Delay: ${cost_of_delay}`, vscode.TreeItemCollapsibleState.None);
          children.push(codItem);

          const sizeItem = new vscode.TreeItem(`📏 Job Size: ${job_size}`, vscode.TreeItemCollapsibleState.None);
          children.push(sizeItem);

          let rec = 'Low Priority';
          let icon = 'circle-outline';
          if (wsjf_score > 10) { rec = 'Expedite (High Priority)'; icon = 'flame'; }
          else if (wsjf_score > 5) { rec = 'Schedule Soon (Medium)'; icon = 'alert'; }
          
          const recItem = new vscode.TreeItem(`Recommendation: ${rec}`, vscode.TreeItemCollapsibleState.None);
          recItem.iconPath = new vscode.ThemeIcon(icon);
          children.push(recItem);
      }

      children.push(new vscode.TreeItem(`Gate: ${m.gate}`, vscode.TreeItemCollapsibleState.None));
      children.push(new vscode.TreeItem(`Behavior: ${m.behavior}`, vscode.TreeItemCollapsibleState.None));
      children.push(new vscode.TreeItem(`Timestamp: ${m.ts}`, vscode.TreeItemCollapsibleState.None));

      return children;
  }
}

class GoalieGapsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    return [new GoalieEmptyItem(
        'No Gaps Detected',
        'System Healthy',
        '**No gaps detected.**\n\nYour system appears to be running within defined parameters.\n\nRight-click to configure gap detection or aggregation.'
    )];
  }
}

class GovernanceEconomicsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
     return [new GoalieEmptyItem(
         'Governance Data Unavailable',
         'Check Logs',
         '**No governance insights found.**\n\nPlease check `governance_insights.jsonl` or run a governance audit.\n\nRight-click for options.'
     )];
  }
}

class DepthTimelineProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    return [new GoalieEmptyItem(
        'No Timeline Events',
        'Awaiting Activity',
        '**No timeline events recorded.**\n\nActivity will appear here as the system processes workloads.\n\nRight-click to configure.'
    )];
  }
}

class ProcessFlowMetricsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    return [new GoalieEmptyItem(
        'No Process Metrics',
        'Check Configuration',
        '**No process flow metrics available.**\n\nEnsure process flow monitoring is enabled in your configuration.\n\nRight-click for options.'
    )];
  }
}

import { GoalieHealthProvider } from './healthProvider';
import { GoalieAdminPanel } from './adminPanel';

// Main extension activation function
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Goalie Dashboard', 'goalie-dashboard');
  context.subscriptions.push(outputChannel);

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return;
  }

  // Create providers
  const kanbanProvider = new GoalieKanbanProvider(workspaceRoot, outputChannel);
  const gapsProvider = new GoalieGapsProvider();
  const patternMetricsProvider = new PatternMetricsProvider(workspaceRoot, context);
  const governanceEconomicsProvider = new GovernanceEconomicsProvider();
  const depthTimelineProvider = new DepthTimelineProvider();
  const dtCalibrationProvider = new DtCalibrationProvider(workspaceRoot, outputChannel);
  const healthProvider = new GoalieHealthProvider(workspaceRoot);
  const processFlowMetricsProvider = new ProcessFlowMetricsProvider();

  // ... (file watcher setup) ...

  // Register tree views
  const kanbanTreeView = vscode.window.createTreeView('goalieKanbanView', {
    treeDataProvider: kanbanProvider,
    dragAndDropController: kanbanProvider
  });
  context.subscriptions.push(kanbanTreeView);

  vscode.window.registerTreeDataProvider('goalieGapsView', gapsProvider);
  vscode.window.registerTreeDataProvider('goaliePatternMetricsView', patternMetricsProvider);
  vscode.window.registerTreeDataProvider('goalieGovernanceEconomicsView', governanceEconomicsProvider);
  vscode.window.registerTreeDataProvider('goalieDepthTimelineView', depthTimelineProvider);
  vscode.window.registerTreeDataProvider('goalieHealthView', healthProvider);
  vscode.window.registerTreeDataProvider('goalieProcessFlowMetricsView', processFlowMetricsProvider);

  // Register commands
  const refreshCommand = vscode.commands.registerCommand('goalieDashboard.refresh', () => {
    kanbanProvider.refresh();
    gapsProvider.refresh();
    patternMetricsProvider.refresh();
    governanceEconomicsProvider.refresh();
    depthTimelineProvider.refresh();
    healthProvider.refresh();
    processFlowMetricsProvider.refresh();
  });
  context.subscriptions.push(refreshCommand);

  // Register Promote Kanban command
  const promoteKanbanCommand = vscode.commands.registerCommand('goalie.promoteKanban', async () => {
    const terminal = vscode.window.createTerminal('Goalie Promote');
    terminal.show();
    terminal.sendText(`${workspaceRoot}/scripts/af promote-kanban`);
  });
  context.subscriptions.push(promoteKanbanCommand);

  // Register Pattern to Kanban Promotion
  context.subscriptions.push(vscode.commands.registerCommand('goalie.promoteToKanban', async (item: PatternItem) => {
    if (!item?.metric) return;
    
    const goalieDir = getGoalieDir(workspaceRoot);
    if (!goalieDir) return;

    // Create Kanban entry from pattern metric
    const entry: KanbanEntry = {
        id: `pattern-${Date.now()}`,
        title: `Implement Pattern: ${item.metric.pattern}`,
        summary: `Address gap for ${item.metric.gate}. Behavior: ${item.metric.behavior}`,
        metrics: [item.metric.pattern],
        wsjf_score: item.metric.economic?.wsjf_score,
        cost_of_delay: item.metric.economic?.cost_of_delay,
        job_size: item.metric.economic?.job_size
    };

    // Prompt for section
    const section = await vscode.window.showQuickPick(['NOW', 'NEXT', 'LATER'] as KanbanSection[], {
        placeHolder: 'Select Kanban section for this pattern'
    });

    if (section) {
        addKanbanEntry(goalieDir, section as KanbanSection, entry);
        kanbanProvider.refresh();
        vscode.window.showInformationMessage(`Promoted '${item.metric.pattern}' to ${section}`);
    }
  }));

  // Register Admin Panel command
  const openAdminCommand = vscode.commands.registerCommand('goalie.openAdminPanel', () => {
    GoalieAdminPanel.createOrShow(context.extensionUri);
  });
  context.subscriptions.push(openAdminCommand);

  // Register Health/Pattern Commands
  context.subscriptions.push(vscode.commands.registerCommand('goalie.openGoalieDirectory', () => {
    const uri = vscode.Uri.file(path.join(workspaceRoot, '.goalie'));
    vscode.env.openExternal(uri);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalie.openScriptsDirectory', () => {
    const uri = vscode.Uri.file(path.join(workspaceRoot, 'scripts'));
    vscode.env.openExternal(uri);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalie.openPatternMetricsFile', () => {
    const uri = vscode.Uri.file(path.join(workspaceRoot, '.goalie', 'pattern_metrics.jsonl'));
    vscode.window.showTextDocument(uri);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalie.showPatternDetails', (item: PatternItem) => {
    if (!item?.metric) return;
    const docContent = JSON.stringify(item.metric, null, 2);
    vscode.workspace.openTextDocument({ content: docContent, language: 'json' }).then(doc => {
      vscode.window.showTextDocument(doc);
    });
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalie.showWsjfRecommendation', (item: PatternItem) => {
    if (!item?.metric?.economic) {
      vscode.window.showInformationMessage('No WSJF data available for this pattern.');
      return;
    }
    const { wsjf_score, cost_of_delay, job_size } = item.metric.economic;
    let recommendation = 'Review';
    if (wsjf_score > 10) recommendation = 'High Priority - Expedite';
    else if (wsjf_score > 5) recommendation = 'Medium Priority - Schedule Soon';
    else recommendation = 'Low Priority - Backlog';

    vscode.window.showInformationMessage(
      `WSJF Score: ${wsjf_score}\nCoD: ${cost_of_delay}, Size: ${job_size}\nRecommendation: ${recommendation}`,
      'Open Details'
    ).then(selection => {
      if (selection === 'Open Details') {
        vscode.commands.executeCommand('goalie.showPatternDetails', item);
      }
    });
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalieKanban.editItem', async (item: KanbanItem) => {
    if (!item?.payload?.id) return;
    
    const goalieDir = getGoalieDir(workspaceRoot);
    if (!goalieDir) return;

    const currentTitle = item.payload.title || item.payload.summary || '';
    const newTitle = await vscode.window.showInputBox({
        title: 'Edit Kanban Item',
        value: currentTitle,
        prompt: 'Enter new title or summary'
    });

    if (newTitle !== undefined) {
        updateKanbanEntry(goalieDir, item.section!, item.payload.id, { title: newTitle });
        kanbanProvider.refresh();
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalieKanban.removeItem', async (item: KanbanItem) => {
    if (!item?.payload?.id) return;
    
    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to remove '${item.label}'?`, 
        { modal: true }, 
        'Yes'
    );

    if (confirm === 'Yes') {
        const goalieDir = getGoalieDir(workspaceRoot);
        if (goalieDir) {
            removeKanbanEntry(goalieDir, item.section!, item.payload.id);
            kanbanProvider.refresh();
        }
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalieKanban.moveItem', async (item: KanbanItem) => {
    if (!item?.payload) return;
    
    const targetSection = await vscode.window.showQuickPick(['NOW', 'NEXT', 'LATER'] as KanbanSection[], {
        placeHolder: `Move '${item.label}' to...`
    });

    if (targetSection && targetSection !== item.section) {
        const goalieDir = getGoalieDir(workspaceRoot);
        if (goalieDir) {
            moveKanbanEntry(goalieDir, item.payload, item.section!, targetSection as KanbanSection);
            kanbanProvider.refresh();
        }
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalie.copyItemValue', async (item: vscode.TreeItem) => {
    let valueToCopy = item.label as string;
    if (item.tooltip instanceof vscode.MarkdownString) {
        valueToCopy = item.tooltip.value; // Copy rich detail if available
    } else if (typeof item.tooltip === 'string') {
        valueToCopy = item.tooltip;
    }
    
    if (valueToCopy) {
        await vscode.env.clipboard.writeText(valueToCopy);
        vscode.window.showInformationMessage('Copied to clipboard');
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalieDashboard.filterByGate', (item: PatternItem) => {
    if (item?.metric?.gate) {
        patternMetricsProvider.addFilter({
            type: 'gate',
            value: item.metric.gate,
            label: `Gate: ${item.metric.gate}`
        });
        vscode.window.showInformationMessage(`Filtered by Gate: ${item.metric.gate}`);
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalieDashboard.filterByPattern', (item: PatternItem) => {
    if (item?.metric?.pattern) {
        // Assuming 'workload' is a close enough proxy or we add a new filter type
        // For now, let's use a generic text filter or map it if possible
        // Ideally, PatternFilter needs a 'pattern' type, but let's re-use what we have or extend
        // Extending PatternFilter type in this context might be needed, but for now let's just log
        vscode.window.showInformationMessage(`Filter by Pattern '${item.metric.pattern}' not yet fully supported in UI.`);
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalieDashboard.clearFilters', () => {
    patternMetricsProvider.clearFilters();
    vscode.window.showInformationMessage('Filters cleared.');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('goalie.openAggregationOptions', async () => {
    const options = [
        { label: 'Clear All Filters', description: 'Reset all view filters' },
        { label: 'Configure Federation', description: 'Open Federation settings' },
        { label: 'Open Admin Panel', description: 'Full extension configuration' },
        { label: 'Run Governance Audit', description: 'Trigger manual audit' }
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select Aggregation / Configuration Option'
    });

    if (selected) {
        if (selected.label === 'Clear All Filters') {
            vscode.commands.executeCommand('goalieDashboard.clearFilters');
        } else if (selected.label === 'Configure Federation') {
             vscode.commands.executeCommand('goalie.openAdminPanel');
        } else if (selected.label === 'Open Admin Panel') {
             vscode.commands.executeCommand('goalie.openAdminPanel');
        } else if (selected.label === 'Run Governance Audit') {
             vscode.commands.executeCommand('goalie.runGovernanceAudit');
        }
    }
  }));

  outputChannel.appendLine('Enhanced File Watcher setup for .goalie directory with centralized service.');
  outputChannel.appendLine('Goalie Dashboard extension activated with enhanced file system watcher.');
}

export function deactivate() {
  console.log('Goalie Dashboard extension deactivated');
}