"use strict";
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
exports.deactivate = exports.activate = exports.GoalieLogger = exports.LogLevel = exports.SEVERITY_THRESHOLDS = exports.DEFAULT_WIP_LIMITS = exports.SUPPORTED_OAUTH_DOMAINS = exports.EXTENSION_PUBLISHER = exports.EXTENSION_NAME = exports.EXTENSION_VERSION = exports.StreamClient = exports.DtCalibrationProvider = exports.GoalieHealthProvider = exports.FileWatcherService = exports.EnhancedFileWatcher = exports.createPaginationControls = exports.registerVirtualScrollCommands = exports.JsonlVirtualDataProvider = exports.VirtualScrollProvider = exports.AlertManager = exports.registerOAuthCommands = exports.GoalieOAuthProvider = void 0;
exports.getExtensionConfig = getExtensionConfig;
exports.getGoalieDirectory = getGoalieDirectory;
exports.isGoalieDirectoryValid = isGoalieDirectoryValid;
exports.initializeGoalieDirectory = initializeGoalieDirectory;
exports.createDiagnosticCollection = createDiagnosticCollection;
exports.getLogger = getLogger;
exports.debounce = debounce;
exports.throttle = throttle;
exports.formatBytes = formatBytes;
exports.formatDuration = formatDuration;
exports.parseJsonl = parseJsonl;
exports.toJsonl = toJsonl;
exports.deepClone = deepClone;
exports.safeJsonParse = safeJsonParse;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
// OAuth Provider
var oauthProvider_1 = require("./oauthProvider");
Object.defineProperty(exports, "GoalieOAuthProvider", { enumerable: true, get: function () { return oauthProvider_1.GoalieOAuthProvider; } });
Object.defineProperty(exports, "registerOAuthCommands", { enumerable: true, get: function () { return oauthProvider_1.registerOAuthCommands; } });
// Alert Manager
var alertManager_1 = require("./alertManager");
Object.defineProperty(exports, "AlertManager", { enumerable: true, get: function () { return alertManager_1.AlertManager; } });
// Virtual Scroll Provider
var virtualScrollProvider_1 = require("./virtualScrollProvider");
Object.defineProperty(exports, "VirtualScrollProvider", { enumerable: true, get: function () { return virtualScrollProvider_1.VirtualScrollProvider; } });
Object.defineProperty(exports, "JsonlVirtualDataProvider", { enumerable: true, get: function () { return virtualScrollProvider_1.JsonlVirtualDataProvider; } });
Object.defineProperty(exports, "registerVirtualScrollCommands", { enumerable: true, get: function () { return virtualScrollProvider_1.registerVirtualScrollCommands; } });
Object.defineProperty(exports, "createPaginationControls", { enumerable: true, get: function () { return virtualScrollProvider_1.createPaginationControls; } });
// Enhanced File Watcher
var enhancedFileWatcher_1 = require("./enhancedFileWatcher");
Object.defineProperty(exports, "EnhancedFileWatcher", { enumerable: true, get: function () { return enhancedFileWatcher_1.EnhancedFileWatcher; } });
// File Watcher Service
var fileWatcherService_1 = require("./fileWatcherService");
Object.defineProperty(exports, "FileWatcherService", { enumerable: true, get: function () { return fileWatcherService_1.FileWatcherService; } });
// Health Provider
var healthProvider_1 = require("./healthProvider");
Object.defineProperty(exports, "GoalieHealthProvider", { enumerable: true, get: function () { return healthProvider_1.GoalieHealthProvider; } });
// DT Calibration Provider
var dtCalibrationProvider_1 = require("./dtCalibrationProvider");
Object.defineProperty(exports, "DtCalibrationProvider", { enumerable: true, get: function () { return dtCalibrationProvider_1.DtCalibrationProvider; } });
// Stream Client
var streamClient_1 = require("./streamClient");
Object.defineProperty(exports, "StreamClient", { enumerable: true, get: function () { return streamClient_1.StreamClient; } });
/**
 * Get extension configuration from VS Code settings
 */
function getExtensionConfig() {
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
function getGoalieDirectory(workspaceRoot) {
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
function isGoalieDirectoryValid(goalieDir) {
    if (!fs.existsSync(goalieDir)) {
        return false;
    }
    const stat = fs.statSync(goalieDir);
    return stat.isDirectory();
}
/**
 * Initialize Goalie directory with default files if needed
 */
function initializeGoalieDirectory(goalieDir) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
/**
 * Extension version information
 */
exports.EXTENSION_VERSION = "0.2.0";
exports.EXTENSION_NAME = "goalie-dashboard";
exports.EXTENSION_PUBLISHER = "goalie";
/**
 * Supported OAuth domains
 */
exports.SUPPORTED_OAUTH_DOMAINS = [
    "720.chat",
    "artchat.art",
    "chatfans.fans",
    "decisioncall.com",
    "rooz.live",
];
/**
 * Default WIP limits for Kanban sections
 */
exports.DEFAULT_WIP_LIMITS = {
    NOW: 5,
    NEXT: 10,
    LATER: Infinity,
};
/**
 * Pattern severity thresholds
 */
exports.SEVERITY_THRESHOLDS = {
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
function createDiagnosticCollection() {
    return vscode.languages.createDiagnosticCollection("goalie");
}
/**
 * Log levels for the extension
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["debug"] = 0] = "debug";
    LogLevel[LogLevel["info"] = 1] = "info";
    LogLevel[LogLevel["warning"] = 2] = "warning";
    LogLevel[LogLevel["error"] = 3] = "error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger utility for the extension
 */
class GoalieLogger {
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
exports.GoalieLogger = GoalieLogger;
/**
 * Create a shared logger instance
 */
let sharedLogger = null;
function getLogger() {
    if (!sharedLogger) {
        sharedLogger = new GoalieLogger();
    }
    return sharedLogger;
}
/**
 * Utility function to debounce function calls
 */
function debounce(func, wait) {
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
function throttle(func, limit) {
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
function formatBytes(bytes) {
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
function formatDuration(ms) {
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
function parseJsonl(content) {
    const results = [];
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) {
            try {
                results.push(JSON.parse(trimmed));
            }
            catch (_a) {
                // Skip malformed lines
            }
        }
    }
    return results;
}
/**
 * Write JSONL content
 */
function toJsonl(items) {
    return items.map((item) => JSON.stringify(item)).join("\n") + "\n";
}
/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Safe JSON parse with default value
 */
function safeJsonParse(json, defaultValue) {
    try {
        return JSON.parse(json);
    }
    catch (_a) {
        return defaultValue;
    }
}
// Re-export the activate and deactivate functions from the main extension
var extension_enhanced_final_1 = require("./extension_enhanced_final");
Object.defineProperty(exports, "activate", { enumerable: true, get: function () { return extension_enhanced_final_1.activate; } });
Object.defineProperty(exports, "deactivate", { enumerable: true, get: function () { return extension_enhanced_final_1.deactivate; } });
//# sourceMappingURL=index.js.map