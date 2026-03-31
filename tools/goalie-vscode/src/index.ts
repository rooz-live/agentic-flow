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
export {
  GoalieOAuthProvider,
  registerOAuthCommands,
  OAuthDomain,
  GoalieAuthSession,
} from "./oauthProvider";

// Alert Manager
export { AlertManager } from "./alertManager";

// Virtual Scroll Provider
export {
  VirtualScrollProvider,
  JsonlVirtualDataProvider,
  registerVirtualScrollCommands,
  VirtualScrollConfig,
  VirtualScrollMetrics,
  DataSlice,
  VirtualDataProvider,
  createPaginationControls,
} from "./virtualScrollProvider";

// Enhanced File Watcher
export { EnhancedFileWatcher } from "./enhancedFileWatcher";

// File Watcher Service
export {
  FileWatcherService,
  FileChangeEvent,
  FileWatcherOptions,
} from "./fileWatcherService";

// Health Provider
export { GoalieHealthProvider } from "./healthProvider";

// DT Calibration Provider
export { DtCalibrationProvider } from "./dtCalibrationProvider";

// Stream Client
export { StreamClient } from "./streamClient";

/**
 * Extension configuration interface
 */
export interface GoalieExtensionConfig {
  enableOAuth: boolean;
  enableAlerts: boolean;
  enableVirtualScroll: boolean;
  enableFileWatching: boolean;
  enableTelemetry: boolean;
  oauthDomain: string;
  directoryPath: string | null;
  alertNotificationCooldown: number;
  fileWatcherDebounceDelay: number;
  patternMetricsPageSize: number;
  patternMetricsAutoRefresh: boolean;
}

/**
 * Get extension configuration from VS Code settings
 */
export function getExtensionConfig(): GoalieExtensionConfig {
  const config = vscode.workspace.getConfiguration("goalie");

  return {
    enableOAuth: config.get("oauth.enabled", true),
    enableAlerts: config.get("alerts.enabled", true),
    enableVirtualScroll: config.get("virtualScroll.enabled", true),
    enableFileWatching: config.get("fileWatcher.enabled", true),
    enableTelemetry: config.get("telemetry.enabled", false),
    oauthDomain: config.get("oauth.domain", "rooz.live"),
    directoryPath: config.get("directoryPath", null),
    alertNotificationCooldown: config.get(
      "alerts.notificationCooldown",
      300000,
    ),
    fileWatcherDebounceDelay: config.get("fileWatcher.debounceDelay", 300),
    patternMetricsPageSize: config.get("patternMetrics.pageSize", 50),
    patternMetricsAutoRefresh: config.get("patternMetrics.autoRefresh", true),
  };
}

/**
 * Get the Goalie directory path
 */
export function getGoalieDirectory(workspaceRoot: string): string {
  const config = vscode.workspace.getConfiguration("goalie");
  const customPath = config.get<string | null>("directoryPath", null);

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
export function isGoalieDirectoryValid(goalieDir: string): boolean {
  if (!fs.existsSync(goalieDir)) {
    return false;
  }

  const stat = fs.statSync(goalieDir);
  return stat.isDirectory();
}

/**
 * Initialize Goalie directory with default files if needed
 */
export async function initializeGoalieDirectory(
  goalieDir: string,
): Promise<void> {
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
] as const;

/**
 * Default WIP limits for Kanban sections
 */
export const DEFAULT_WIP_LIMITS: Record<string, number> = {
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
export function createDiagnosticCollection(): vscode.DiagnosticCollection {
  return vscode.languages.createDiagnosticCollection("goalie");
}

/**
 * Log levels for the extension
 */
export enum LogLevel {
  debug = 0,
  info = 1,
  warning = 2,
  error = 3,
}

/**
 * Logger utility for the extension
 */
export class GoalieLogger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel;

  constructor(
    name: string = "Goalie Dashboard",
    level: LogLevel = LogLevel.info,
  ) {
    this.outputChannel = vscode.window.createOutputChannel(name);
    this.logLevel = level;
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.debug) {
      this.log("DEBUG", message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.info) {
      this.log("INFO", message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.warning) {
      this.log("WARN", message, ...args);
    }
  }

  error(message: string, err?: Error, ...args: unknown[]): void {
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

  private log(level: string, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : "";
    this.outputChannel.appendLine(
      `[${timestamp}] [${level}] ${message}${formattedArgs}`,
    );
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

/**
 * Create a shared logger instance
 */
let sharedLogger: GoalieLogger | null = null;

export function getLogger(): GoalieLogger {
  if (!sharedLogger) {
    sharedLogger = new GoalieLogger();
  }
  return sharedLogger;
}

/**
 * Utility function to debounce function calls
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
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
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
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
export function formatBytes(bytes: number): string {
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
export function formatDuration(ms: number): string {
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
export function parseJsonl<T>(content: string): T[] {
  const results: T[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) {
      try {
        results.push(JSON.parse(trimmed) as T);
      } catch {
        // Skip malformed lines
      }
    }
  }

  return results;
}

/**
 * Write JSONL content
 */
export function toJsonl<T>(items: T[]): string {
  return items.map((item) => JSON.stringify(item)).join("\n") + "\n";
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safe JSON parse with default value
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// Re-export the activate and deactivate functions from the main extension
export { activate, deactivate } from "./extension_enhanced_final";
