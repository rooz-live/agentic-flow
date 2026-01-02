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
exports.GoalieIntegration = void 0;
exports.createGoalieIntegration = createGoalieIntegration;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const oauthProvider_1 = require("./oauthProvider");
const alertManager_1 = require("./alertManager");
const virtualScrollProvider_1 = require("./virtualScrollProvider");
const enhancedFileWatcher_1 = require("./enhancedFileWatcher");
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
class GoalieIntegration {
    constructor(context, config) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.context = context;
        this.disposables = [];
        // Core providers
        this.oauthProvider = null;
        this.alertManager = null;
        this.fileWatcher = null;
        this.virtualScrollProviders = new Map();
        // Event emitters
        this._onDidChangeState = new vscode.EventEmitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._onDidEmitEvent = new vscode.EventEmitter();
        this.onDidEmitEvent = this._onDidEmitEvent.event;
        // Refresh callbacks for providers
        this.refreshCallbacks = [];
        const workspaceRoot = ((_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath) || "";
        this.config = {
            workspaceRoot,
            enableOAuth: (_c = config === null || config === void 0 ? void 0 : config.enableOAuth) !== null && _c !== void 0 ? _c : true,
            enableAlerts: (_d = config === null || config === void 0 ? void 0 : config.enableAlerts) !== null && _d !== void 0 ? _d : true,
            enableVirtualScroll: (_e = config === null || config === void 0 ? void 0 : config.enableVirtualScroll) !== null && _e !== void 0 ? _e : true,
            enableFileWatching: (_f = config === null || config === void 0 ? void 0 : config.enableFileWatching) !== null && _f !== void 0 ? _f : true,
            enableTelemetry: (_g = config === null || config === void 0 ? void 0 : config.enableTelemetry) !== null && _g !== void 0 ? _g : false,
            goalieDirectory: (_h = config === null || config === void 0 ? void 0 : config.goalieDirectory) !== null && _h !== void 0 ? _h : path.join(workspaceRoot, ".goalie"),
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
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Initializing Goalie Integration...");
            try {
                // Initialize OAuth provider
                if (this.config.enableOAuth) {
                    yield this.initializeOAuth();
                }
                // Initialize Alert Manager
                if (this.config.enableAlerts) {
                    yield this.initializeAlerts();
                }
                // Initialize Virtual Scroll providers
                if (this.config.enableVirtualScroll) {
                    yield this.initializeVirtualScroll();
                }
                // Initialize File Watcher
                if (this.config.enableFileWatching) {
                    yield this.initializeFileWatcher();
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
        });
    }
    /**
     * Initialize OAuth provider
     */
    initializeOAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Initializing OAuth provider...");
            this.oauthProvider = new oauthProvider_1.GoalieOAuthProvider(this.context);
            this.disposables.push(this.oauthProvider);
            // Register OAuth commands
            (0, oauthProvider_1.registerOAuthCommands)(this.context, this.oauthProvider);
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
            const isAuthenticated = yield this.oauthProvider.isAuthenticated();
            this.state.oauthConnected = isAuthenticated;
            this.state.activeProviders.push("oauth");
            this.log(`OAuth initialized. Authenticated: ${isAuthenticated}`);
        });
    }
    /**
     * Initialize Alert Manager
     */
    initializeAlerts() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Initializing Alert Manager...");
            this.alertManager = new alertManager_1.AlertManager();
            this.state.alertsActive = true;
            this.state.activeProviders.push("alerts");
            // Set up alert monitoring
            this.setupAlertMonitoring();
            this.log("Alert Manager initialized");
        });
    }
    /**
     * Initialize Virtual Scroll providers
     */
    initializeVirtualScroll() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Initializing Virtual Scroll providers...");
            // Pattern Metrics Virtual Scroll Provider
            const patternMetricsPath = path.join(this.config.goalieDirectory, "pattern_metrics.jsonl");
            if (fs.existsSync(patternMetricsPath)) {
                const dataProvider = new virtualScrollProvider_1.JsonlVirtualDataProvider(patternMetricsPath, (item) => `${item.timestamp}-${item.pattern}`, fs);
                const virtualProvider = new virtualScrollProvider_1.VirtualScrollProvider(dataProvider, {
                    pageSize: 50,
                    preloadBuffer: 10,
                    maxCacheSize: 500,
                    enablePerfLogging: this.config.enableTelemetry,
                });
                yield virtualProvider.initialize();
                this.virtualScrollProviders.set("patternMetrics", virtualProvider);
                this.disposables.push(virtualProvider);
                this.log(`Virtual Scroll initialized for pattern_metrics.jsonl (${yield dataProvider.getTotalCount()} items)`);
            }
            // Register virtual scroll commands (cast to unknown map for generic compatibility)
            (0, virtualScrollProvider_1.registerVirtualScrollCommands)(this.context, this.virtualScrollProviders);
            this.state.activeProviders.push("virtualScroll");
        });
    }
    /**
     * Initialize File Watcher
     */
    initializeFileWatcher() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Initializing File Watcher...");
            const config = vscode.workspace.getConfiguration("goalie");
            this.fileWatcher = new enhancedFileWatcher_1.EnhancedFileWatcher(this.config.workspaceRoot, this.refreshCallbacks, {
                patterns: ["**/.goalie/*.{yaml,yml,jsonl,json}"],
                debounceDelay: config.get("fileWatcher.debounceDelay", 300),
                enableBatching: config.get("fileWatcher.enableBatching", true),
                enableVisualIndicators: config.get("fileWatcher.enableVisualIndicators", true),
            });
            this.disposables.push(this.fileWatcher);
            this.state.fileWatcherActive = true;
            this.state.activeProviders.push("fileWatcher");
            this.log("File Watcher initialized");
        });
    }
    /**
     * Set up periodic alert monitoring
     */
    setupAlertMonitoring() {
        if (!this.alertManager)
            return;
        // Monitor metrics every 30 seconds
        const monitorInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const metrics = yield this.collectMetrics();
                // AlertManager expects specific metric categories, we'll use 'pattern' for generic metrics
                const alerts = this.alertManager.evaluateMetrics(metrics, "pattern");
                for (const alert of alerts) {
                    if (alert.severity !== "info") {
                        yield this.alertManager.sendNotification(alert);
                        this.emitEvent("alert:triggered", alert);
                    }
                }
            }
            catch (error) {
                this.logError("Alert monitoring error", error);
            }
        }), 30000);
        this.disposables.push({ dispose: () => clearInterval(monitorInterval) });
    }
    /**
     * Collect current metrics from various sources
     */
    collectMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
                            metrics.wsjf_score = (_b = (_a = data.economic) === null || _a === void 0 ? void 0 : _a.wsjf_score) !== null && _b !== void 0 ? _b : 0;
                            metrics.cost_of_delay = (_d = (_c = data.economic) === null || _c === void 0 ? void 0 : _c.cost_of_delay) !== null && _d !== void 0 ? _d : 0;
                            metrics.depth = (_e = data.depth) !== null && _e !== void 0 ? _e : 0;
                        }
                        catch (_l) {
                            // Skip malformed data
                        }
                    }
                    metrics.total_patterns = lines.length;
                }
                // Collect from process_flow_metrics.json
                const processPath = path.join(this.config.goalieDirectory, "process_flow_metrics.json");
                if (fs.existsSync(processPath)) {
                    const data = JSON.parse(fs.readFileSync(processPath, "utf8"));
                    metrics.cycle_time = (_f = data.cycle_time) !== null && _f !== void 0 ? _f : 0;
                    metrics.throughput = (_g = data.throughput) !== null && _g !== void 0 ? _g : 0;
                    metrics.wip = (_h = data.wip) !== null && _h !== void 0 ? _h : 0;
                }
                // Collect from learning_metrics.json
                const learningPath = path.join(this.config.goalieDirectory, "learning_metrics.json");
                if (fs.existsSync(learningPath)) {
                    const data = JSON.parse(fs.readFileSync(learningPath, "utf8"));
                    metrics.pattern_efficiency = (_j = data.pattern_efficiency) !== null && _j !== void 0 ? _j : 0;
                    metrics.learning_velocity = (_k = data.learning_velocity) !== null && _k !== void 0 ? _k : 0;
                }
            }
            catch (error) {
                this.logError("Failed to collect metrics", error);
            }
            return metrics;
        });
    }
    /**
     * Set up periodic data synchronization
     */
    setupPeriodicSync() {
        // Sync every 5 minutes
        const syncInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.syncData();
        }), 5 * 60 * 1000);
        this.disposables.push({ dispose: () => clearInterval(syncInterval) });
    }
    /**
     * Synchronize data across providers
     */
    syncData() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Starting data sync...");
            this.emitEvent("sync:started");
            try {
                // Refresh virtual scroll providers
                for (const [name, provider] of this.virtualScrollProviders) {
                    yield provider.refresh();
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
        });
    }
    /**
     * Register integration commands
     */
    registerCommands() {
        this.context.subscriptions.push(vscode.commands.registerCommand("goalie.integration.sync", () => __awaiter(this, void 0, void 0, function* () {
            yield vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing Goalie data...",
                cancellable: false,
            }, () => __awaiter(this, void 0, void 0, function* () {
                yield this.syncData();
                vscode.window.showInformationMessage("Goalie data synchronized");
            }));
        })), vscode.commands.registerCommand("goalie.integration.status", () => {
            this.showStatusPanel();
        }), vscode.commands.registerCommand("goalie.integration.resetState", () => __awaiter(this, void 0, void 0, function* () {
            const confirm = yield vscode.window.showWarningMessage("Reset Goalie integration state? This will clear caches and re-initialize.", { modal: true }, "Reset");
            if (confirm === "Reset") {
                yield this.reset();
                vscode.window.showInformationMessage("Goalie integration reset");
            }
        })), vscode.commands.registerCommand("goalie.integration.showLogs", () => {
            this.outputChannel.show();
        }), vscode.commands.registerCommand("goalie.integration.exportMetrics", () => __awaiter(this, void 0, void 0, function* () {
            yield this.exportMetrics();
        })));
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
    exportMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const metrics = {
                timestamp: new Date().toISOString(),
                state: this.state,
                integrationMetrics: this.getIntegrationMetrics(),
                collectedMetrics: yield this.collectMetrics(),
                virtualScrollMetrics: Object.fromEntries(Array.from(this.virtualScrollProviders.entries()).map(([providerName, provider]) => [providerName, provider.getMetrics()])),
            };
            const uri = yield vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(this.config.workspaceRoot, "goalie-metrics-export.json")),
                filters: { "JSON Files": ["json"] },
            });
            if (uri) {
                fs.writeFileSync(uri.fsPath, JSON.stringify(metrics, null, 2));
                vscode.window.showInformationMessage(`Metrics exported to ${uri.fsPath}`);
            }
        });
    }
    /**
     * Reset the integration state
     */
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Resetting integration state...");
            // Clear virtual scroll caches
            for (const provider of this.virtualScrollProviders.values()) {
                yield provider.refresh();
            }
            // Reset state
            this.state.errors = [];
            this.state.lastSyncTime = null;
            this.updateState();
            // Re-initialize
            yield this.syncData();
            this.log("Integration reset complete");
        });
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
        return Object.assign({}, this.state);
    }
    /**
     * Make authenticated API request
     */
    authenticatedRequest(url, options, domain) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.oauthProvider) {
                throw new Error("OAuth provider not initialized");
            }
            return this.oauthProvider.authenticatedRequest(url, options, domain);
        });
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
exports.GoalieIntegration = GoalieIntegration;
/**
 * Factory function to create and initialize Goalie Integration
 */
function createGoalieIntegration(context, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const integration = new GoalieIntegration(context, config);
        yield integration.initialize();
        return integration;
    });
}
//# sourceMappingURL=goalieIntegration.js.map