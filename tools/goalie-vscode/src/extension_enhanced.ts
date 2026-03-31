import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { StreamClient } from './streamClient';
import { resolveStreamSocketPath } from './streamUtils';
import { GoalieTelemetry } from './telemetry';
import { DtCalibrationProvider } from './dtCalibrationProvider';
import type { DtDashboardSummaryReadyMessage } from './types/dtCalibration';
import type { KanbanSection } from './extension';
import { WSJFCalculator, type WSJFResult, type BatchRecommendation } from '../federation/wsjf_calculator.js';
import { MultiDimensionalAnalytics, type AnalyticsSummary } from '../federation/multi_dimensional_analytics.js';
import { RiskAwareBatchingSystem, type BatchExecutionPlan, type BatchExecutionResult } from '../federation/risk_aware_batching.js';

/**
 * Enhanced VS Code Extension with Real-time Kanban Boards
 * 
 * Features:
 * - Real-time Kanban board updates via WebSocket
 * - Interactive pattern metrics visualization with charts
 * - Batch code-fix application with configurable approval workflows
 * - WSJF-based economic prioritization integration
 * - Multi-dimensional analytics dashboard
 * - Risk-aware batching with approval workflows
 */

interface EnhancedKanbanEntry extends KanbanEntry {
  /** WSJF score for prioritization */
  wsjfScore?: number;
  /** Risk level (1-10) */
  riskLevel?: number;
  /** Batch recommendation */
  batchRecommendation?: BatchRecommendation;
  /** Estimated duration in hours */
  estimatedDuration?: number;
  /** Resource requirements */
  resourceRequirements?: {
    cpu?: number;
    memory?: number;
    storage?: number;
  };
  /** Approval status */
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  /** Dependencies */
  dependencies?: string[];
  /** Last updated timestamp */
  lastUpdated?: string;
}

interface PatternMetricsData {
  pattern: string;
  category: string;
  count: number;
  codAvg: number;
  wsjfAvg?: number;
  trend: 'improving' | 'degrading' | 'stable';
  riskLevel: number;
  lastUpdated: string;
}

interface BatchExecutionState {
  /** Currently executing batch plans */
  activePlans: Map<string, BatchExecutionPlan>;
  /** Execution history */
  history: BatchExecutionResult[];
  /** Approval queue */
  approvalQueue: Array<{
    id: string;
    planId: string;
    item: EnhancedKanbanEntry;
    requestedBy: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
}

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: any[];
  title: string;
  description: string;
}

interface VisualizationPanel {
  /** Panel identifier */
  id: string;
  /** Panel title */
  title: string;
  /** Chart data */
  charts: ChartData[];
  /** Last updated */
  lastUpdated: string;
}

class GoalieKanbanProviderEnhanced implements vscode.TreeDataProvider<EnhancedKanbanEntry> {
  private _onDidChangeTreeData: vscode.EventEmitter<EnhancedKanbanEntry | undefined>;
  private readonly WIP_LIMITS = { NOW: 5, NEXT: 8, LATER: 15 };
  
  constructor(
    private readonly workspaceRoot: string | undefined,
    private readonly logger: vscode.OutputChannel
  ) {
    this._onDidChangeTreeData = new vscode.EventEmitter<EnhancedKanbanEntry | undefined>();
  }

  readonly onDidChangeTreeData: vscode.Event<EnhancedKanbanEntry | undefined> = this._onDidChangeTreeData.event;

  getTreeItem(element: EnhancedKanbanEntry): vscode.TreeItem {
    const item = new EnhancedKanbanItem(
      element.title || 'Untitled',
      element.section || 'NOW',
      vscode.TreeItemCollapsibleState.None
    );
    
    // Add WSJF and risk information to tooltip
    if (element.wsjfScore !== undefined) {
      item.tooltip = `WSJF Score: ${element.wsjfScore.toFixed(2)}\nRisk Level: ${element.riskLevel || 'N/A'}\nEstimated Duration: ${element.estimatedDuration || 0}h`;
    }
    
    // Add context menu actions
    item.contextValue = element;
    item.contextValue = element;
    
    // Add icons based on status
    if (element.approvalStatus === 'approved') {
      item.iconPath = new vscode.ThemeIcon('check');
    } else if (element.approvalStatus === 'rejected') {
      item.iconPath = new vscode.ThemeIcon('x');
    } else if (element.riskLevel && element.riskLevel >= 8) {
      item.iconPath = new vscode.ThemeIcon('warning');
    } else if (element.wsjfScore && element.wsjfScore > 15) {
      item.iconPath = new vscode.ThemeIcon('star');
    }
    
    // Add resource requirements to description
    if (element.resourceRequirements) {
      const resources = [];
      if (element.resourceRequirements.cpu) resources.push(`CPU: ${element.resourceRequirements.cpu} cores`);
      if (element.resourceRequirements.memory) resources.push(`Memory: ${element.resourceRequirements.memory}GB`);
      if (element.resourceRequirements.storage) resources.push(`Storage: ${element.resourceRequirements.storage}GB`);
      if (element.resourceRequirements.network) resources.push(`Network: ${element.resourceRequirements.network}Mbps`);
      
      item.description = `${element.summary || ''}\n\nResource Requirements:\n${resources.join('\n')}`;
    }
    
    return item;
  }

  getChildren(element?: EnhancedKanbanEntry): vscode.TreeItem[] {
    if (!element) {
      return this.getRootItems();
    }
    
    return [];
  }

  private getRootItems(): vscode.TreeItem[] {
    const goalieDir = this.getGoalieDir();
    const kanbanDoc = this.loadKanbanDoc(goalieDir);
    
    if (!kanbanDoc) {
      return [new vscode.TreeItem('No Kanban board found', vscode.TreeItemCollapsibleState.None)];
    }
    
    const rootItems: vscode.TreeItem[] = [];
    
    for (const section of ['NOW', 'NEXT', 'LATER'] as KanbanSection[]) {
      const items = kanbanDoc[section] || [];
      const sectionItem = new vscode.TreeItem(
        `${section} (${items.length})`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      
      // Check WIP limits
      const wipLimit = this.WIP_LIMITS[section];
      const isOverLimit = items.length > wipLimit;
      if (isOverLimit) {
        sectionItem.iconPath = new vscode.ThemeIcon('warning');
        sectionItem.description = `WIP limit exceeded (${items.length}/${wipLimit})`;
      }
      
      rootItems.push(sectionItem);
      
      // Add child items
      for (const item of items.slice(0, 10)) { // Limit to 10 items for performance
        const childItem = this.getTreeItem(item);
        childItem.parent = sectionItem;
        rootItems.push(childItem);
      }
    }
    
    return rootItems;
  }

  private loadKanbanDoc(goalieDir: string): any {
    const kanbanPath = path.join(goalieDir, 'KANBAN_BOARD.yaml');
    if (!fs.existsSync(kanbanPath)) {
      return { NOW: [], NEXT: [], LATER: [] };
    }
    
    try {
      const raw = fs.readFileSync(kanbanPath, 'utf8');
      return yaml.parse(raw) || {};
    } catch {
      this.logger.appendLine(`[Kanban] Failed to load board: ${kanbanPath}`);
      return { NOW: [], NEXT: [], LATER: [] };
    }
  }

  private getGoalieDir(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return path.join(workspaceFolders[0].uri.fsPath, '.goalie');
    }
    return '.goalie';
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Move Kanban item between sections
   */
  async moveKanbanEntry(
    element: EnhancedKanbanEntry,
    targetSection: KanbanSection
  ): Promise<void> {
    const goalieDir = this.getGoalieDir();
    const kanbanDoc = this.loadKanbanDoc(goalieDir);
    
    if (!kanbanDoc || !element.section) {
      return;
    }
    
    // Remove from source section
    const sourceItems = kanbanDoc[element.section] || [];
    const sourceIndex = this.indexOfEntry(sourceItems, element);
    
    if (sourceIndex === -1) {
      this.logger.appendLine(`[Kanban] Item not found in source section: ${element.title || 'Untitled'}`);
      return;
    }
    
    const [moved] = sourceItems.splice(sourceIndex, 1);
    moved.updatedAt = new Date().toISOString();
    moved.lastUpdated = new Date().toISOString();
    
    // Add to target section
    if (!kanbanDoc[targetSection]) {
      kanbanDoc[targetSection] = [];
    }
    kanbanDoc[targetSection].push(moved[0]);
    
    // Update metadata
    if (moved[0].wsjfScore !== undefined) {
      moved[0].wsjfScore = moved[0].wsjfScore;
      moved[0].riskLevel = moved[0].riskLevel;
      moved[0].estimatedDuration = moved[0].estimatedDuration;
      moved[0].lastUpdated = new Date().toISOString();
    }
    
    // Save updated document
    this.saveKanbanDoc(goalieDir, kanbanDoc);
    
    // Fire event for real-time update
    this._onDidChangeTreeData.fire();
    
    this.logger.appendLine(`[Kanban] Moved "${moved[0].title || 'Untitled'}" from ${element.section} to ${targetSection}`);
  }

  /**
   * Add new Kanban item
   */
  async addKanbanItem(
    section: KanbanSection,
    title: string,
    summary?: string,
    filePath?: string,
    wsjfScore?: number,
    riskLevel?: number = 5
  ): Promise<void> {
    const goalieDir = this.getGoalieDir();
    const kanbanDoc = this.loadKanbanDoc(goalieDir);
    
    if (!kanbanDoc) {
      kanbanDoc[section] = [];
    }
    
    const newItem: EnhancedKanbanEntry = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title,
      summary,
      filePath,
      section,
      wsjfScore,
      riskLevel,
      estimatedDuration: riskLevel > 7 ? 8 : riskLevel > 5 ? 6 : 4, // Higher risk = longer duration
      lastUpdated: new Date().toISOString()
    };
    
    kanbanDoc[section].push(newItem);
    this.saveKanbanDoc(goalieDir, kanbanDoc);
    
    // Fire event for real-time update
    this._onDidChangeTreeData.fire();
    
    this.logger.appendLine(`[Kanban] Added "${title}" to ${section}`);
  }

  /**
   * Update Kanban item
   */
  async updateKanbanEntry(
    element: EnhancedKanbanEntry,
    updates: Partial<EnhancedKanbanEntry>
  ): Promise<void> {
    const goalieDir = this.getGoalieDir();
    const kanbanDoc = this.loadKanbanDoc(goalieDir);
    
    if (!kanbanDoc || !element.section) {
      return;
    }
    
    const items = kanbanDoc[element.section] || [];
    const index = this.indexOfEntry(items, element);
    
    if (index === -1) {
      this.logger.appendLine(`[Kanban] Item not found: ${element.title || 'Untitled'}`);
      return;
    }
    
    // Update item with new data
    const updatedItem = { ...items[index], ...updates, lastUpdated: new Date().toISOString() };
    kanbanDoc[element.section][index] = updatedItem;
    
    this.saveKanbanDoc(goalieDir, kanbanDoc);
    
    // Fire event for real-time update
    this._onDidChangeTreeData.fire();
    
    this.logger.appendLine(`[Kanban] Updated "${element.title || 'Untitled'}" in ${element.section}`);
  }

  /**
   * Delete Kanban item
   */
  async deleteKanbanEntry(element: EnhancedKanbanEntry): Promise<void> {
    const goalieDir = this.getGoalieDir();
    const kanbanDoc = this.loadKanbanDoc(goalieDir);
    
    if (!kanbanDoc || !element.section) {
      return;
    }
    
    const items = kanbanDoc[element.section] || [];
    const index = this.indexOfEntry(items, element);
    
    if (index === -1) {
      this.logger.appendLine(`[Kanban] Item not found: ${element.title || 'Untitled'}`);
      return;
    }
    
    items.splice(index, 1);
    this.saveKanbanDoc(goalieDir, kanbanDoc);
    
    // Fire event for real-time update
    this._onDidChangeTreeData.fire();
    
    this.logger.appendLine(`[Kanban] Deleted "${element.title || 'Untitled'}" from ${element.section}`);
  }

  private saveKanbanDoc(goalieDir: string, doc: any): void {
    const kanbanPath = path.join(goalieDir, 'KANBAN_BOARD.yaml');
    try {
      const serialized = yaml.stringify(doc, { indent: 2 });
      fs.writeFileSync(kanbanPath, serialized, 'utf8');
    } catch (error) {
      this.logger.appendLine(`[Kanban] Failed to save board: ${error.message}`);
    }
  }

  private indexOfEntry(entries: EnhancedKanbanEntry[], target: EnhancedKanbanEntry): number {
    if (!entries.length) return -1;
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.id === target.id) return i;
      if (entry.title === target.title && entry.section === target.section) return i;
    }
    
    return -1;
  }
}

class PatternMetricsProviderEnhanced implements vscode.TreeDataProvider<PatternMetricsData> {
  private _onDidChangeTreeData: vscode.EventEmitter<PatternMetricsData | undefined>;
  private readonly analytics: MultiDimensionalAnalytics = new MultiDimensionalAnalytics('');

  constructor(
    private readonly workspaceRoot: string | undefined,
    private readonly logger: vscode.OutputChannel
  ) {
    this._onDidChangeTreeData = new vscode.EventEmitter<PatternMetricsData | undefined>();
  }

  readonly onDidChangeTreeData: vscode.Event<PatternMetricsData | undefined> = this._onDidChangeTreeData.event;

  getTreeItem(element: PatternMetricsData): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${element.pattern} (${element.category})`,
      vscode.TreeItemCollapsibleState.None
    );
    
    // Add trend indicator
    let description = `Count: ${element.count}\nCOD: ${element.codAvg.toFixed(2)}`;
    if (element.wsjfAvg) {
      description += `\nWSJF: ${element.wsjfAvg.toFixed(2)}`;
    }
    if (element.trend !== 'stable') {
      const trendIcon = element.trend === 'improving' ? 'trending-up' : 'trending-down';
      item.iconPath = new vscode.ThemeIcon(trendIcon);
      description += `\nTrend: ${element.trend}`;
    }
    
    // Add risk level indicator
    if (element.riskLevel >= 7) {
      item.iconPath = new vscode.ThemeIcon('warning');
      description += `\nRisk Level: ${element.riskLevel}/10`;
    }
    
    item.tooltip = this.createMetricsTooltip(element);
    item.contextValue = element;
    
    return item;
  }

  private createMetricsTooltip(element: PatternMetricsData): string {
    const tooltip = new vscode.MarkdownString(undefined, true);
    tooltip.appendMarkdown(`# ${element.pattern} Metrics\n\n`);
    tooltip.appendMarkdown(`**Category:** ${element.category}\n`);
    tooltip.appendMarkdown(`**Count:** ${element.count}\n`);
    tooltip.appendMarkdown(`**Average COD:** ${element.codAvg.toFixed(2)}\n`);
    
    if (element.wsjfAvg) {
      tooltip.appendMarkdown(`**Average WSJF:** ${element.wsjfAvg.toFixed(2)}\n`);
    }
    
    tooltip.appendMarkdown(`**Trend:** ${element.trend}\n`);
    tooltip.appendMarkdown(`**Risk Level:** ${element.riskLevel}/10\n`);
    tooltip.appendMarkdown(`**Last Updated:** ${element.lastUpdated}\n`);
    
    return tooltip.value;
  }

  async refresh(): Promise<void> {
    const goalieDir = this.getGoalieDir();
    const patternsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    
    if (!fs.existsSync(patternsPath)) {
      this.logger.appendLine('[PatternMetrics] No pattern metrics found');
      return;
    }
    
    try {
      const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
      const analytics = await this.analytics.generateAnalytics(patterns, [], 30);
      
      // Update pattern data with WSJF scores
      const enhancedPatterns = patterns.map((pattern: any) => ({
        ...pattern,
        wsjfScore: this.analytics.getWsjfFromPattern(pattern.id),
        riskLevel: this.analytics.getRiskLevelFromPattern(pattern.id)
      }));
      
      // Generate metrics data
      const patternCounts = new Map<string, number>();
      for (const pattern of enhancedPatterns) {
        const key = pattern.pattern;
        patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
      }
      
      const metricsData: PatternMetricsData[] = [];
      for (const [pattern, count] of patternCounts.entries()) {
        const patternData = enhancedPatterns.find(p => p.pattern === pattern);
        if (patternData) {
          metricsData.push({
            pattern,
            category: patternData.category,
            count,
            codAvg: patternData.codAvg || 0,
            wsjfAvg: patternData.wsjfScore || 0,
            trend: this.determineTrend(patternData),
            riskLevel: patternData.riskLevel || 0,
            lastUpdated: new Date().toISOString()
          });
        }
      }
      
      this._onDidChangeTreeData.fire();
      this.logger.appendLine(`[PatternMetrics] Refreshed with ${metricsData.length} patterns`);
    } catch (error) {
      this.logger.appendLine(`[PatternMetrics] Failed to refresh: ${error.message}`);
    }
  }

  private determineTrend(patternData: any): 'improving' | 'degrading' | 'stable' {
    // Simplified trend determination
    return 'stable'; // Would need historical data for accurate trend analysis
  }

  private getWsjfFromPattern(patternId: string): number | undefined {
    // This would integrate with WSJF calculator
    return undefined; // Placeholder
  }

  private getRiskLevelFromPattern(patternId: string): number {
    // This would integrate with risk analysis
    return 5; // Placeholder
  }
}

class BatchExecutionProvider implements vscode.WebviewViewProvider {
  private readonly _extensionUri: vscode.Uri;
  private readonly _onDidChangeViewData = new vscode.EventEmitter<any>();
  private _executionState: BatchExecutionState = {
    activePlans: new Map(),
    history: [],
    approvalQueue: []
  };

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly logger: vscode.OutputChannel
  ) {
    this._onDidChangeViewData = new vscode.EventEmitter<any>();
  }

  resolveWebviewView(webview: vscode.WebviewPanel): any {
    webview.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    return webview;
  }

  get onDidChangeViewData(): vscode.Event<any> {
    return this._onDidChangeViewData.event;
  }

  async showBatchExecution(planId?: string): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      this._extensionUri,
      'batch-execution',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    
    panel.title = 'Batch Execution';
    panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'batch.svg');
    
    const webview = this.resolveWebviewView(panel);
    
    // Load execution state
    const executionData = {
      activePlans: Array.from(this._executionState.activePlans.entries()),
      history: this._executionState.history,
      approvalQueue: this._executionState.approvalQueue,
      selectedPlanId: planId
    };
    
    webview.html = this.getBatchExecutionHtml(executionData);
    
    panel.webview.onDidReceiveMessage(async (message) => {
      this.handleBatchMessage(message, webview);
    });
    
    panel.onDidDispose(() => {
      this._onDidChangeViewData.fire();
    });
    
    panel.show();
  }

  private handleBatchMessage(message: any, webview: vscode.WebviewPanel): void {
    switch (message.type) {
      case 'executePlan':
        await this.executeBatchPlan(message.planId, webview);
        break;
      case 'approveItem':
        await this.approveBatchItem(message.itemId, message.approved, webview);
        break;
      case 'rejectItem':
        await this.rejectBatchItem(message.itemId, webview);
        break;
      case 'refresh':
        this.refreshBatchView(webview);
        break;
    }
  }

  private async executeBatchPlan(planId: string, webview: vscode.WebviewPanel): Promise<void> {
    const plan = this._executionState.activePlans.get(planId);
    if (!plan) {
      webview.postMessage({ type: 'error', message: 'Plan not found' });
      return;
    }
    
    // Update plan status
    plan.status = 'executing';
    this._executionState.activePlans.set(planId, plan);
    this._onDidChangeViewData.fire();
    
    // Simulate execution (in real implementation, this would call the batching system)
    setTimeout(async () => {
      const result: BatchExecutionResult = {
        planId,
        status: 'completed',
        itemsExecuted: plan.items.length,
        itemsSuccessful: plan.items.length, // Assume all successful for demo
        itemsFailed: 0,
        actualDuration: plan.estimatedDuration * 60 * 60 * 1000, // Convert hours to ms
        errors: []
      };
      
      this._executionState.history.push(result);
      this._executionState.activePlans.delete(planId);
      this._onDidChangeViewData.fire();
      
      webview.postMessage({ type: 'executionComplete', result });
    }, plan.estimatedDuration * 60 * 60 * 1000); // Convert hours to ms
  }

  private async approveBatchItem(itemId: string, approved: boolean, webview: vscode.WebviewPanel): Promise<void> {
    const plan = Array.from(this._executionState.activePlans.values())[0]; // Get first plan for demo
    if (!plan) return;
    
    const item = plan.items.find(item => item.id === itemId);
    if (!item) return;
    
    item.approvalStatus = approved ? 'approved' : 'rejected';
    item.lastUpdated = new Date().toISOString();
    
    this._onDidChangeViewData.fire();
    webview.postMessage({ type: 'itemUpdate', item });
  }

  private async rejectBatchItem(itemId: string, webview: vscode.WebviewPanel): Promise<void> {
    const plan = Array.from(this._executionState.activePlans.values())[0]; // Get first plan for demo
    if (!plan) return;
    
    const item = plan.items.find(item => item.id === itemId);
    if (!item) return;
    
    item.approvalStatus = 'rejected';
    item.lastUpdated = new Date().toISOString();
    
    this._onDidChangeViewData.fire();
    webview.postMessage({ type: 'itemUpdate', item });
  }

  private refreshBatchView(webview: vscode.WebviewPanel): void {
    const executionData = {
      activePlans: Array.from(this._executionState.activePlans.entries()),
      history: this._executionState.history,
      approvalQueue: this._executionState.approvalQueue,
      selectedPlanId: webview.postMessage ? await this.getSelectedPlanId(webview) : undefined
    };
    
    this._onDidChangeViewData.fire();
    webview.html = this.getBatchExecutionHtml(executionData);
  }

  private async getSelectedPlanId(webview: vscode.WebviewPanel): Promise<string | undefined> {
    return webview.postMessage({ type: 'getSelectedPlanId' }) as Promise<string>;
  }

  private getBatchExecutionHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Batch Execution</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .section {
            margin-bottom: 20px;
          }
          .plan {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
          }
          .plan-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .plan-title {
            font-weight: bold;
            color: var(--vscode-foreground);
          }
          .plan-status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          .plan-items {
            max-height: 200px;
            overflow-y: auto;
          }
          .plan-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .item-info {
            flex: 1;
          }
          .item-actions {
            display: flex;
            gap: 8px;
          }
          .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          }
          .btn-approve {
            background: #28a745;
            color: white;
          }
          .btn-reject {
            background: #dc3545;
            color: white;
          }
          .btn-execute {
            background: #007acc1;
            color: white;
          }
          .risk-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-left: 8px;
          }
          .risk-low { background: #28a745; }
          .risk-medium { background: #ffa500; }
          .risk-high { background: #dc3545; }
          .risk-critical { background: #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Batch Execution Dashboard</h1>
          
          <div class="section">
            <h2>Active Plans</h2>
            ${data.activePlans.map(plan => `
              <div class="plan">
                <div class="plan-header">
                  <div class="plan-title">${plan.id}</div>
                  <div class="plan-status status-${plan.status}">${plan.status.toUpperCase()}</div>
                </div>
                <div class="plan-items">
                  ${plan.items.map(item => `
                    <div class="plan-item">
                      <div class="item-info">
                        <div class="item-title">${item.title}</div>
                        <div class="item-details">
                          <div>Duration: ${item.estimatedDuration}h</div>
                          <div>WSJF: ${item.wsjfScore?.toFixed(2) || 'N/A'}</div>
                          <div>Risk: ${item.riskLevel || 'N/A'}/10</div>
                        </div>
                      </div>
                      <div class="item-actions">
                        <button class="btn btn-execute" onclick="executePlan('${plan.id}')">Execute</button>
                      </div>
                      <div class="risk-indicator risk-${item.riskLevel ? item.riskLevel : 'low'}"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="section">
          <h2>Execution History</h2>
          ${data.history.slice(-5).reverse().map(result => `
            <div class="execution-result">
              <h3>Plan: ${result.planId}</h3>
              <div>Status: ${result.status}</div>
              <div>Items: ${result.itemsExecuted}/${result.itemsSuccessful}</div>
              <div>Duration: ${(result.actualDuration / 1000 / 60).toFixed(2)}s</div>
              <div>Errors: ${result.errors.length}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="section">
          <h2>Approval Queue</h2>
          ${data.approvalQueue.map(item => `
            <div class="approval-item">
              <div class="item-info">
                <div class="item-title">${item.item.title}</div>
                <div>Plan: ${item.planId}</div>
                <div>Requested by: ${item.requestedBy}</div>
                <div>Status: ${item.status}</div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function executePlan(planId) {
            vscode.postMessage({ type: 'executePlan', planId });
          }
          
          function approveItem(itemId, approved) {
            vscode.postMessage({ type: 'approveItem', itemId, approved });
          }
          
          function rejectItem(itemId) {
            vscode.postMessage({ type: 'rejectItem', itemId });
          }
          
          // Auto-refresh every 5 seconds
          setInterval(() => {
            vscode.postMessage({ type: 'refresh' });
          }, 5000);
        </script>
      </body>
      </html>
    `;
  }
}

class VisualizationProvider implements vscode.WebviewViewProvider {
  private readonly _extensionUri: vscode.Uri;
  private readonly _onDidChangeViewData = new vscode.EventEmitter<any>();
  private readonly analytics: MultiDimensionalAnalytics = new MultiDimensionalAnalytics('');

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly logger: vscode.OutputChannel
  ) {
    this._onDidChangeViewData = new vscode.EventEmitter<any>();
  }

  get onDidChangeViewData(): vscode.Event<any> {
    return this._onDidChangeViewData.event;
  }

  async showAnalytics(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      this._extensionUri,
      'analytics-dashboard',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    
    panel.title = 'Analytics Dashboard';
    panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'analytics.svg');
    
    const webview = this.resolveWebviewView(panel);
    
    // Load analytics data
    const analytics = await this.analytics.generateAnalytics([], [], 30);
    
    webview.html = this.getAnalyticsHtml(analytics);
    
    panel.webview.onDidReceiveMessage(async (message) => {
      this.handleAnalyticsMessage(message, webview);
    });
    
    panel.onDidDispose(() => {
      this._onDidChangeViewData.fire();
    });
    
    panel.show();
  }

  private handleAnalyticsMessage(message: any, webview: vscode.WebviewPanel): void {
    switch (message.type) {
      case 'refresh':
        this.refreshAnalyticsView(webview);
        break;
    }
  }

  private async refreshAnalyticsView(webview: vscode.WebviewPanel): Promise<void> {
    const analytics = await this.analytics.generateAnalytics([], [], 30);
    webview.html = this.getAnalyticsHtml(analytics);
    }

  private getAnalyticsHtml(analytics: AnalyticsSummary): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analytics Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 1400px;
            margin: 0 auto;
          }
          .dashboard {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .chart-container {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
          }
          .metric-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
          }
          .metric-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-foreground);
          }
          .chart {
            height: 200px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Multi-dimensional Analytics</h1>
          
          <div class="dashboard">
            <div class="chart-container">
              <canvas id="costChart"></canvas>
            </div>
            <div class="chart-container">
              <canvas id="riskChart"></canvas>
            </div>
            <div class="chart-container">
              <canvas id="impactChart"></canvas>
            </div>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-title">Overall Health Score</div>
              <div class="metric-value">${analytics.overallHealthScore}/100</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Total Cost of Delay</div>
              <div class="metric-value">$${analytics.costDimension.totalCostOfDelay.toFixed(2)}</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Potential Savings</div>
              <div class="metric-value">$${analytics.impactDimension.totalEconomicImpact.toFixed(2)}</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Success Rate</div>
              <div class="metric-value">${(analytics.performanceDimension.successRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          // Cost distribution chart
          const costCtx = document.getElementById('costChart').getContext('2d');
          new Chart(costCtx, {
            type: 'pie',
            data: {
              labels: Object.keys(analytics.costDimension.costByCategory),
              datasets: [{
                data: Object.values(analytics.costDimension.costByCategory),
                backgroundColor: ['#007acc1', '#28a745', '#ffa500', '#dc3545', '#ffc107', '#17becf4']
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }
          }).render();
          
          // Risk distribution chart
          const riskCtx = document.getElementById('riskChart').getContext('2d');
          new Chart(riskCtx, {
            type: 'doughnut',
            data: {
              labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
              datasets: [{
                data: [analytics.riskDimension.riskDistribution.low, analytics.riskDimension.riskDistribution.medium, analytics.riskDimension.riskDistribution.high, analytics.riskDimension.riskDistribution.critical],
                backgroundColor: ['#28a745', '#ffc107', '#ff9800', '#dc3545', '#d32f2f']
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }
          }).render();
          
          // Impact trend chart
          const impactCtx = document.getElementById('impactChart').getContext('2d');
          const impactLabels = analytics.impactDimension.impactByWorkload ? Object.keys(analytics.impactDimension.impactByWorkload) : [];
          const impactData = analytics.impactDimension.impactByWorkload ? Object.values(analytics.impactDimension.impactByWorkload) : [];
          
          new Chart(impactCtx, {
            type: 'bar',
            data: {
              labels: impactLabels,
              datasets: [{
                label: 'Economic Impact by Workload',
                data: impactData,
                backgroundColor: '#007acc1'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          }).render();
        </script>
      </body>
      </html>
    `;
  }
}

// Main extension activation
export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = context.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const logger = vscode.window.createOutputChannel('Goalie Enhanced');
  context.subscriptions.push(logger);

  // Initialize providers
  const kanbanProvider = new GoalieKanbanProviderEnhanced(workspaceRoot, logger);
  const patternMetricsProvider = new PatternMetricsProviderEnhanced(workspaceRoot, logger);
  const batchExecutionProvider = new BatchExecutionProvider(context.extensionUri, logger);
  const visualizationProvider = new VisualizationProvider(context.extensionUri, logger);

  // Register tree data providers
  vscode.window.registerTreeDataProvider('goalieKanbanEnhanced', kanbanProvider);
  vscode.window.registerTreeDataProvider('patternMetricsEnhanced', patternMetricsProvider);

  // Register webview providers
  vscode.window.registerWebviewViewProvider('batchExecution', batchExecutionProvider);
  vscode.window.registerWebviewViewProvider('analyticsDashboard', visualizationProvider);

  // Register commands
  const commands = [
    vscode.commands.registerCommand('goalieKanbanEnhanced.refresh', () => kanbanProvider.refresh()),
    vscode.commands.registerCommand('goalieKanbanEnhanced.moveItem', (item: EnhancedKanbanEntry) => {
      const section = item.section || 'NOW';
      const targetSection = item.section === 'NOW' ? 'NEXT' : item.section === 'NEXT' ? 'LATER' : 'NOW';
      kanbanProvider.moveKanbanEntry(item, targetSection);
    }),
    vscode.commands.registerCommand('goalieKanbanEnhanced.addItem', (args: any) => {
      const section = args[0] as KanbanSection || 'NOW';
      const title = args[1] as string || 'New Item';
      kanbanProvider.addKanbanItem(section, title);
    }),
    vscode.commands.registerCommand('goalieKanbanEnhanced.deleteItem', (item: EnhancedKanbanEntry) => {
      kanbanProvider.deleteKanbanEntry(item);
    }),
    vscode.commands.registerCommand('goalieKanbanEnhanced.updateItem', (item: EnhancedKanbanEntry) => {
      kanbanProvider.updateKanbanEntry(item);
    }),
    vscode.commands.registerCommand('patternMetricsEnhanced.refresh', () => patternMetricsProvider.refresh()),
    vscode.commands.registerCommand('batchExecution.show', () => batchExecutionProvider.showBatchExecution()),
    vscode.commands.registerCommand('batchExecution.executePlan', (args: any) => {
      const planId = args[0] as string;
      batchExecutionProvider.executeBatchPlan(planId);
    }),
    vscode.commands.registerCommand('analyticsDashboard.show', () => visualizationProvider.showAnalytics()),
    vscode.commands.registerCommand('analyticsDashboard.refresh', () => visualizationProvider.refreshAnalyticsView()),
  ];

  // Add commands to subscriptions
  context.subscriptions.push(...commands);

  // Initialize stream client for real-time updates
  const streamSocketPath = resolveStreamSocketPath(path.join(workspaceRoot, '.goalie'));
  if (streamSocketPath) {
    const streamClient = new StreamClient({
      socketPath: streamSocketPath,
      telemetry: new GoalieTelemetry(logger),
      output: logger,
      onEvent: (payload) => {
        // Handle real-time updates from governance/retro agents
        if (payload.type === 'kanban-update') {
          kanbanProvider.refresh();
        } else if (payload.type === 'pattern-metrics-update') {
          patternMetricsProvider.refresh();
        } else if (payload.type === 'batch-update') {
          batchExecutionProvider.refreshBatchView();
        }
      }
    });
    
    streamClient.start();
  }

  logger.appendLine('Goalie Enhanced extension activated');
}