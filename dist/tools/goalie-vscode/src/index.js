/**
 * Goalie VS Code Extension - Main Entry Point
 *
 * This module provides exports for the Goalie extension components:
 * - OAuth authentication across multiple domains
 * - Alert management with threshold monitoring
 * - Virtual scrolling for large datasets
 * - File watching with debouncing
 * - Integration utilities
 */
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
// OAuth Provider
export { GoalieOAuthProvider, registerOAuthCommands, } from "./oauthProvider";
// Alert Manager
export { AlertManager } from "./alertManager";
// Virtual Scroll Provider
export { VirtualScrollProvider, JsonlVirtualDataProvider, registerVirtualScrollCommands, createPaginationControls, } from "./virtualScrollProvider";
// Enhanced File Watcher
export { EnhancedFileWatcher } from "./enhancedFileWatcher";
// File Watcher Service
export { FileWatcherService, } from "./fileWatcherService";
// Health Provider
export { GoalieHealthProvider } from "./healthProvider";
// DT Calibration Provider
export { DtCalibrationProvider } from "./dtCalibrationProvider";
// Stream Client
export { StreamClient } from "./streamClient";
/**
 * Get extension configuration from VS Code settings
 */
export function getExtensionConfig() {
    const config = vscode.workspace.getConfiguration("goalie");
    return {
        enableOAuth: config.get("oauth.enabled", true),
        enableAlerts: config.get("alerts.enabled", true),
        enableVirtualScroll: config.get("virtualScroll.enabled", true),
        enableFileWatching: config.get("fileWatcher.enabled", true),
        enableTelemetry: config.get("telemetry.enabled", false),
        oauthDomain: config.get("oauth.domain", "rooz.live"),
        directoryPath: config.get("directoryPath", null),
        alertNotificationCooldown: config.get("alerts.notificationCooldown", 300000),
        fileWatcherDebounceDelay: config.get("fileWatcher.debounceDelay", 300),
        patternMetricsPageSize: config.get("patternMetrics.pageSize", 50),
        patternMetricsAutoRefresh: config.get("patternMetrics.autoRefresh", true),
    };
}
/**
 * Get the Goalie directory path
 */
export function getGoalieDirectory(workspaceRoot) {
    const config = vscode.workspace.getConfiguration("goalie");
    const customPath = config.get("directoryPath", null);
    if (customPath) {
        return path.isAbsolute(customPath)
            ? customPath
            : path.join(workspaceRoot, customPath);
    }
    return path.join(workspaceRoot, ".goalie");
}
/**
 * Check if Goalie directory exists and is valid
 */
export function isGoalieDirectoryValid(goalieDir) {
    if (!fs.existsSync(goalieDir)) {
        return false;
    }
    const stat = fs.statSync(goalieDir);
    return stat.isDirectory();
}
/**
 * Initialize Goalie directory with default files if needed
 */
export async function initializeGoalieDirectory(goalieDir) {
    if (!fs.existsSync(goalieDir)) {
        fs.mkdirSync(goalieDir, { recursive: true });
    }
    // Create default KANBAN_BOARD.yaml if it doesn't exist
    const kanbanPath = path.join(goalieDir, "KANBAN_BOARD.yaml");
    if (!fs.existsSync(kanbanPath)) {
        const defaultKanban = `NOW: []\nNEXT: []\nLATER: []\n`;
        fs.writeFileSync(kanbanPath, defaultKanban, "utf8");
    }
    // Create default pattern_metrics.jsonl if it doesn't exist
    const metricsPath = path.join(goalieDir, "pattern_metrics.jsonl");
    if (!fs.existsSync(metricsPath)) {
        fs.writeFileSync(metricsPath, "", "utf8");
    }
    // Create hooks directory if it doesn't exist
    const hooksDir = path.join(goalieDir, "hooks");
    if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
    }
}
/**
 * Extension version information
 */
export const EXTENSION_VERSION = "0.2.0";
export const EXTENSION_NAME = "goalie-dashboard";
export const EXTENSION_PUBLISHER = "goalie";
/**
 * Supported OAuth domains
 */
export const SUPPORTED_OAUTH_DOMAINS = [
    "720.chat",
    "artchat.art",
    "chatfans.fans",
    "decisioncall.com",
    "rooz.live",
];
/**
 * Default WIP limits for Kanban sections
 */
export const DEFAULT_WIP_LIMITS = {
    NOW: 5,
    NEXT: 10,
    LATER: Infinity,
};
/**
 * Pattern severity thresholds
 */
export const SEVERITY_THRESHOLDS = {
    critical: {
        wsjfScore: 20,
        costOfDelay: 0.5,
    },
    warning: {
        wsjfScore: 15,
        costOfDelay: 2,
    },
    info: {
        wsjfScore: 10,
        costOfDelay: 5,
    },
};
/**
 * Create a diagnostic collection for Goalie
 */
export function createDiagnosticCollection() {
    return vscode.languages.createDiagnosticCollection("goalie");
}
/**
 * Log levels for the extension
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["debug"] = 0] = "debug";
    LogLevel[LogLevel["info"] = 1] = "info";
    LogLevel[LogLevel["warning"] = 2] = "warning";
    LogLevel[LogLevel["error"] = 3] = "error";
})(LogLevel || (LogLevel = {}));
/**
 * Logger utility for the extension
 */
export class GoalieLogger {
    outputChannel;
    logLevel;
    constructor(name = "Goalie Dashboard", level = LogLevel.info) {
        this.outputChannel = vscode.window.createOutputChannel(name);
        this.logLevel = level;
    }
    setLevel(level) {
        this.logLevel = level;
    }
    debug(message, ...args) {
        if (this.logLevel <= LogLevel.debug) {
            this.log("DEBUG", message, ...args);
        }
    }
    info(message, ...args) {
        if (this.logLevel <= LogLevel.info) {
            this.log("INFO", message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.logLevel <= LogLevel.warning) {
            this.log("WARN", message, ...args);
        }
    }
    error(message, err, ...args) {
        if (this.logLevel <= LogLevel.error) {
            this.log("ERROR", message, ...args);
            if (err) {
                this.outputChannel.appendLine(`  ${err.message}`);
                if (err.stack) {
                    this.outputChannel.appendLine(`  ${err.stack}`);
                }
            }
        }
    }
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : "";
        this.outputChannel.appendLine(`[${timestamp}] [${level}] ${message}${formattedArgs}`);
    }
    show() {
        this.outputChannel.show();
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
/**
 * Create a shared logger instance
 */
let sharedLogger = null;
export function getLogger() {
    if (!sharedLogger) {
        sharedLogger = new GoalieLogger();
    }
    return sharedLogger;
}
/**
 * Utility function to debounce function calls
 */
export function debounce(func, wait) {
    let timeout = null;
    return (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
/**
 * Utility function to throttle function calls
 */
export function throttle(func, limit) {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}
/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0) {
        return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    if (ms < 3600000) {
        return `${(ms / 60000).toFixed(1)}m`;
    }
    return `${(ms / 3600000).toFixed(1)}h`;
}
/**
 * Parse JSONL file content
 */
export function parseJsonl(content) {
    const results = [];
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) {
            try {
                results.push(JSON.parse(trimmed));
            }
            catch {
                // Skip malformed lines
            }
        }
    }
    return results;
}
/**
 * Write JSONL content
 */
export function toJsonl(items) {
    return items.map((item) => JSON.stringify(item)).join("\n") + "\n";
}
/**
 * Deep clone an object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Safe JSON parse with default value
 */
export function safeJsonParse(json, defaultValue) {
    try {
        return JSON.parse(json);
    }
    catch {
        return defaultValue;
    }
}
// Re-export the activate and deactivate functions from the main extension
export { activate, deactivate } from "./extension_enhanced_final";
//# sourceMappingURL=index.js.map