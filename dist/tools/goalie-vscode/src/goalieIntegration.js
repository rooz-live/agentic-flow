import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { GoalieOAuthProvider, registerOAuthCommands, } from "./oauthProvider";
import { AlertManager } from "./alertManager";
import { VirtualScrollProvider, JsonlVirtualDataProvider, registerVirtualScrollCommands, } from "./virtualScrollProvider";
import { EnhancedFileWatcher } from "./enhancedFileWatcher";
/**
 * GoalieIntegration - Main integration class for the Goalie VS Code Extension
 *
 * This class coordinates all the major components of the Goalie extension:
 * - OAuth authentication across multiple domains
 * - Alert management with threshold monitoring
 * - Virtual scrolling for large datasets
 * - File watching with debouncing
 * - State synchronization
 */
export class GoalieIntegration {
    context;
    state;
    config;
    disposables = [];
    // Core providers
    oauthProvider = null;
    alertManager = null;
    fileWatcher = null;
    virtualScrollProviders = new Map();
    // Event emitters
    _onDidChangeState = new vscode.EventEmitter();
    onDidChangeState = this._onDidChangeState.event;
    _onDidEmitEvent = new vscode.EventEmitter();
    onDidEmitEvent = this._onDidEmitEvent.event;
    // Refresh callbacks for providers
    refreshCallbacks = [];
    // Output channel for logging
    outputChannel;
    constructor(context, config) {
        this.context = context;
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
        this.config = {
            workspaceRoot,
            enableOAuth: config?.enableOAuth ?? true,
            enableAlerts: config?.enableAlerts ?? true,
            enableVirtualScroll: config?.enableVirtualScroll ?? true,
            enableFileWatching: config?.enableFileWatching ?? true,
            enableTelemetry: config?.enableTelemetry ?? false,
            goalieDirectory: config?.goalieDirectory ?? path.join(workspaceRoot, ".goalie"),
        };
        this.state = {
            initialized: false,
            oauthConnected: false,
            alertsActive: false,
            fileWatcherActive: false,
            lastSyncTime: null,
            activeProviders: [],
            errors: [],
        };
        this.outputChannel =
            vscode.window.createOutputChannel("Goalie Integration");
        this.disposables.push(this.outputChannel);
    }
    /**
     * Initialize all integration components
     */
    async initialize() {
        this.log("Initializing Goalie Integration...");
        try {
            // Initialize OAuth provider
            if (this.config.enableOAuth) {
                await this.initializeOAuth();
            }
            // Initialize Alert Manager
            if (this.config.enableAlerts) {
                await this.initializeAlerts();
            }
            // Initialize Virtual Scroll providers
            if (this.config.enableVirtualScroll) {
                await this.initializeVirtualScroll();
            }
            // Initialize File Watcher
            if (this.config.enableFileWatching) {
                await this.initializeFileWatcher();
            }
            // Set up periodic sync
            this.setupPeriodicSync();
            // Register commands
            this.registerCommands();
            this.state.initialized = true;
            this.updateState();
            this.emitEvent("provider:ready", {
                providers: this.state.activeProviders,
            });
            this.log("Goalie Integration initialized successfully");
        }
        catch (error) {
            this.logError("Failed to initialize Goalie Integration", error);
            this.state.errors.push(`Initialization failed: ${error}`);
            this.updateState();
            throw error;
        }
    }
    /**
     * Initialize OAuth provider
     */
    async initializeOAuth() {
        this.log("Initializing OAuth provider...");
        this.oauthProvider = new GoalieOAuthProvider(this.context);
        this.disposables.push(this.oauthProvider);
        // Register OAuth commands
        registerOAuthCommands(this.context, this.oauthProvider);
        // Listen for session changes
        this.oauthProvider.onDidChangeSession(({ domain, session }) => {
            if (session) {
                this.state.oauthConnected = true;
                this.emitEvent("oauth:login", { domain, user: session.userInfo });
                this.log(`OAuth: Logged in to ${domain}`);
            }
            else {
                this.state.oauthConnected = false;
                this.emitEvent("oauth:logout", { domain });
                this.log(`OAuth: Logged out from ${domain}`);
            }
            this.updateState();
        });
        // Check existing session
        const isAuthenticated = await this.oauthProvider.isAuthenticated();
        this.state.oauthConnected = isAuthenticated;
        this.state.activeProviders.push("oauth");
        this.log(`OAuth initialized. Authenticated: ${isAuthenticated}`);
    }
    /**
     * Initialize Alert Manager
     */
    async initializeAlerts() {
        this.log("Initializing Alert Manager...");
        this.alertManager = new AlertManager();
        this.state.alertsActive = true;
        this.state.activeProviders.push("alerts");
        // Set up alert monitoring
        this.setupAlertMonitoring();
        this.log("Alert Manager initialized");
    }
    /**
     * Initialize Virtual Scroll providers
     */
    async initializeVirtualScroll() {
        this.log("Initializing Virtual Scroll providers...");
        // Pattern Metrics Virtual Scroll Provider
        const patternMetricsPath = path.join(this.config.goalieDirectory, "pattern_metrics.jsonl");
        if (fs.existsSync(patternMetricsPath)) {
            const dataProvider = new JsonlVirtualDataProvider(patternMetricsPath, (item) => `${item.timestamp}-${item.pattern}`, fs);
            const virtualProvider = new VirtualScrollProvider(dataProvider, {
                pageSize: 50,
                preloadBuffer: 10,
                maxCacheSize: 500,
                enablePerfLogging: this.config.enableTelemetry,
            });
            await virtualProvider.initialize();
            this.virtualScrollProviders.set("patternMetrics", virtualProvider);
            this.disposables.push(virtualProvider);
            this.log(`Virtual Scroll initialized for pattern_metrics.jsonl (${await dataProvider.getTotalCount()} items)`);
        }
        // Register virtual scroll commands (cast to unknown map for generic compatibility)
        registerVirtualScrollCommands(this.context, this.virtualScrollProviders);
        this.state.activeProviders.push("virtualScroll");
    }
    /**
     * Initialize File Watcher
     */
    async initializeFileWatcher() {
        this.log("Initializing File Watcher...");
        const config = vscode.workspace.getConfiguration("goalie");
        this.fileWatcher = new EnhancedFileWatcher(this.config.workspaceRoot, this.refreshCallbacks, {
            patterns: ["**/.goalie/*.{yaml,yml,jsonl,json}"],
            debounceDelay: config.get("fileWatcher.debounceDelay", 300),
            enableBatching: config.get("fileWatcher.enableBatching", true),
            enableVisualIndicators: config.get("fileWatcher.enableVisualIndicators", true),
        });
        this.disposables.push(this.fileWatcher);
        this.state.fileWatcherActive = true;
        this.state.activeProviders.push("fileWatcher");
        this.log("File Watcher initialized");
    }
    /**
     * Set up periodic alert monitoring
     */
    setupAlertMonitoring() {
        if (!this.alertManager)
            return;
        // Monitor metrics every 30 seconds
        const monitorInterval = setInterval(async () => {
            try {
                const metrics = await this.collectMetrics();
                // AlertManager expects specific metric categories, we'll use 'pattern' for generic metrics
                const alerts = this.alertManager.evaluateMetrics(metrics, "pattern");
                for (const alert of alerts) {
                    if (alert.severity !== "info") {
                        await this.alertManager.sendNotification(alert);
                        this.emitEvent("alert:triggered", alert);
                    }
                }
            }
            catch (error) {
                this.logError("Alert monitoring error", error);
            }
        }, 30000);
        this.disposables.push({ dispose: () => clearInterval(monitorInterval) });
    }
    /**
     * Collect current metrics from various sources
     */
    async collectMetrics() {
        const metrics = {};
        try {
            // Collect from pattern_metrics.jsonl
            const patternPath = path.join(this.config.goalieDirectory, "pattern_metrics.jsonl");
            if (fs.existsSync(patternPath)) {
                const content = fs.readFileSync(patternPath, "utf8");
                const lines = content.split("\n").filter(Boolean);
                if (lines.length > 0) {
                    const lastLine = lines[lines.length - 1];
                    try {
                        const data = JSON.parse(lastLine);
                        metrics.wsjf_score = data.economic?.wsjf_score ?? 0;
                        metrics.cost_of_delay = data.economic?.cost_of_delay ?? 0;
                        metrics.depth = data.depth ?? 0;
                    }
                    catch {
                        // Skip malformed data
                    }
                }
                metrics.total_patterns = lines.length;
            }
            // Collect from process_flow_metrics.json
            const processPath = path.join(this.config.goalieDirectory, "process_flow_metrics.json");
            if (fs.existsSync(processPath)) {
                const data = JSON.parse(fs.readFileSync(processPath, "utf8"));
                metrics.cycle_time = data.cycle_time ?? 0;
                metrics.throughput = data.throughput ?? 0;
                metrics.wip = data.wip ?? 0;
            }
            // Collect from learning_metrics.json
            const learningPath = path.join(this.config.goalieDirectory, "learning_metrics.json");
            if (fs.existsSync(learningPath)) {
                const data = JSON.parse(fs.readFileSync(learningPath, "utf8"));
                metrics.pattern_efficiency = data.pattern_efficiency ?? 0;
                metrics.learning_velocity = data.learning_velocity ?? 0;
            }
        }
        catch (error) {
            this.logError("Failed to collect metrics", error);
        }
        return metrics;
    }
    /**
     * Set up periodic data synchronization
     */
    setupPeriodicSync() {
        // Sync every 5 minutes
        const syncInterval = setInterval(async () => {
            await this.syncData();
        }, 5 * 60 * 1000);
        this.disposables.push({ dispose: () => clearInterval(syncInterval) });
    }
    /**
     * Synchronize data across providers
     */
    async syncData() {
        this.log("Starting data sync...");
        this.emitEvent("sync:started");
        try {
            // Refresh virtual scroll providers
            for (const [name, provider] of this.virtualScrollProviders) {
                await provider.refresh();
                this.log(`Refreshed virtual scroll provider: ${name}`);
            }
            // Trigger refresh callbacks
            for (const callback of this.refreshCallbacks) {
                try {
                    callback();
                }
                catch (error) {
                    this.logError("Refresh callback error", error);
                }
            }
            this.state.lastSyncTime = new Date();
            this.updateState();
            this.emitEvent("sync:completed");
            this.log("Data sync completed");
        }
        catch (error) {
            this.logError("Data sync failed", error);
            throw error;
        }
    }
    /**
     * Register integration commands
     */
    registerCommands() {
        this.context.subscriptions.push(vscode.commands.registerCommand("goalie.integration.sync", async () => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing Goalie data...",
                cancellable: false,
            }, async () => {
                await this.syncData();
                vscode.window.showInformationMessage("Goalie data synchronized");
            });
        }), vscode.commands.registerCommand("goalie.integration.status", () => {
            this.showStatusPanel();
        }), vscode.commands.registerCommand("goalie.integration.resetState", async () => {
            const confirm = await vscode.window.showWarningMessage("Reset Goalie integration state? This will clear caches and re-initialize.", { modal: true }, "Reset");
            if (confirm === "Reset") {
                await this.reset();
                vscode.window.showInformationMessage("Goalie integration reset");
            }
        }), vscode.commands.registerCommand("goalie.integration.showLogs", () => {
            this.outputChannel.show();
        }), vscode.commands.registerCommand("goalie.integration.exportMetrics", async () => {
            await this.exportMetrics();
        }));
    }
    /**
     * Show status panel with current integration state
     */
    showStatusPanel() {
        const panel = vscode.window.createWebviewPanel("goalieStatus", "Goalie Integration Status", vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = this.getStatusHtml();
    }
    /**
     * Generate HTML for status panel
     */
    getStatusHtml() {
        const state = this.state;
        const metrics = this.getIntegrationMetrics();
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Goalie Integration Status</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .status-card {
      background: var(--vscode-sideBar-background);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .status-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .status-green { background: #10b981; }
    .status-yellow { background: #f59e0b; }
    .status-red { background: #ef4444; }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .metric-item {
      background: var(--vscode-input-background);
      padding: 12px;
      border-radius: 4px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: var(--vscode-textLink-foreground);
    }
    .metric-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    h2 { margin-top: 0; }
    .provider-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .provider-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Goalie Integration Status</h1>

  <div class="status-card">
    <div class="status-header">
      <div class="status-indicator ${state.initialized ? "status-green" : "status-red"}"></div>
      <h2>Integration Status</h2>
    </div>
    <p>Initialized: ${state.initialized ? "✅ Yes" : "❌ No"}</p>
    <p>Last Sync: ${state.lastSyncTime ? state.lastSyncTime.toLocaleString() : "Never"}</p>
    <p>Errors: ${state.errors.length > 0 ? state.errors.join(", ") : "None"}</p>
  </div>

  <div class="status-card">
    <h2>Active Providers</h2>
    <div class="provider-list">
      ${state.activeProviders.map((p) => `<span class="provider-badge">${p}</span>`).join("")}
    </div>
  </div>

  <div class="status-card">
    <h2>Component Status</h2>
    <div class="metric-grid">
      <div class="metric-item">
        <div class="metric-value">${state.oauthConnected ? "✅" : "❌"}</div>
        <div class="metric-label">OAuth Connected</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">${state.alertsActive ? "✅" : "❌"}</div>
        <div class="metric-label">Alerts Active</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">${state.fileWatcherActive ? "✅" : "❌"}</div>
        <div class="metric-label">File Watcher</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">${this.virtualScrollProviders.size}</div>
        <div class="metric-label">Virtual Scroll Providers</div>
      </div>
    </div>
  </div>

  <div class="status-card">
    <h2>Performance Metrics</h2>
    <div class="metric-grid">
      <div class="metric-item">
        <div class="metric-value">${metrics.totalCachedItems}</div>
        <div class="metric-label">Cached Items</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">${(metrics.cacheHitRate * 100).toFixed(1)}%</div>
        <div class="metric-label">Cache Hit Rate</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">${metrics.avgLoadTime.toFixed(2)}ms</div>
        <div class="metric-label">Avg Load Time</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">${(metrics.memoryUsage / 1024).toFixed(1)}KB</div>
        <div class="metric-label">Memory Usage</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
    }
    /**
     * Get aggregated integration metrics
     */
    getIntegrationMetrics() {
        let totalCachedItems = 0;
        let totalHitRate = 0;
        let totalLoadTime = 0;
        let totalMemory = 0;
        let providerCount = 0;
        for (const provider of this.virtualScrollProviders.values()) {
            const metrics = provider.getMetrics();
            totalCachedItems += metrics.loadedItems;
            totalHitRate += metrics.cacheHitRate;
            totalLoadTime += metrics.avgLoadTimeMs;
            totalMemory += metrics.memoryUsageEstimate;
            providerCount++;
        }
        return {
            totalCachedItems,
            cacheHitRate: providerCount > 0 ? totalHitRate / providerCount : 0,
            avgLoadTime: providerCount > 0 ? totalLoadTime / providerCount : 0,
            memoryUsage: totalMemory,
        };
    }
    /**
     * Export metrics to a file
     */
    async exportMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            state: this.state,
            integrationMetrics: this.getIntegrationMetrics(),
            collectedMetrics: await this.collectMetrics(),
            virtualScrollMetrics: Object.fromEntries(Array.from(this.virtualScrollProviders.entries()).map(([providerName, provider]) => [providerName, provider.getMetrics()])),
        };
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(this.config.workspaceRoot, "goalie-metrics-export.json")),
            filters: { "JSON Files": ["json"] },
        });
        if (uri) {
            fs.writeFileSync(uri.fsPath, JSON.stringify(metrics, null, 2));
            vscode.window.showInformationMessage(`Metrics exported to ${uri.fsPath}`);
        }
    }
    /**
     * Reset the integration state
     */
    async reset() {
        this.log("Resetting integration state...");
        // Clear virtual scroll caches
        for (const provider of this.virtualScrollProviders.values()) {
            await provider.refresh();
        }
        // Reset state
        this.state.errors = [];
        this.state.lastSyncTime = null;
        this.updateState();
        // Re-initialize
        await this.syncData();
        this.log("Integration reset complete");
    }
    /**
     * Register a refresh callback
     */
    addRefreshCallback(callback) {
        this.refreshCallbacks.push(callback);
        return {
            dispose: () => {
                const index = this.refreshCallbacks.indexOf(callback);
                if (index >= 0) {
                    this.refreshCallbacks.splice(index, 1);
                }
            },
        };
    }
    /**
     * Get OAuth provider
     */
    getOAuthProvider() {
        return this.oauthProvider;
    }
    /**
     * Get Alert Manager
     */
    getAlertManager() {
        return this.alertManager;
    }
    /**
     * Get Virtual Scroll provider by name
     */
    getVirtualScrollProvider(name) {
        return this.virtualScrollProviders.get(name);
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Make authenticated API request
     */
    async authenticatedRequest(url, options, domain) {
        if (!this.oauthProvider) {
            throw new Error("OAuth provider not initialized");
        }
        return this.oauthProvider.authenticatedRequest(url, options, domain);
    }
    /**
     * Update and emit state changes
     */
    updateState() {
        this._onDidChangeState.fire(this.state);
    }
    /**
     * Emit an integration event
     */
    emitEvent(type, data) {
        this._onDidEmitEvent.fire({
            type,
            timestamp: new Date(),
            data,
            source: "GoalieIntegration",
        });
    }
    /**
     * Log a message
     */
    log(message) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }
    /**
     * Log an error
     */
    logError(message, error) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`  ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`  ${error.stack}`);
            }
        }
        else {
            this.outputChannel.appendLine(`  ${String(error)}`);
        }
    }
    /**
     * Dispose all resources
     */
    dispose() {
        this._onDidChangeState.dispose();
        this._onDidEmitEvent.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.virtualScrollProviders.clear();
        this.refreshCallbacks = [];
    }
}
/**
 * Factory function to create and initialize Goalie Integration
 */
export async function createGoalieIntegration(context, config) {
    const integration = new GoalieIntegration(context, config);
    await integration.initialize();
    return integration;
}
//# sourceMappingURL=goalieIntegration.js.map