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
export { GoalieOAuthProvider, registerOAuthCommands, OAuthDomain, GoalieAuthSession, } from "./oauthProvider";
export { AlertManager } from "./alertManager";
export { VirtualScrollProvider, JsonlVirtualDataProvider, registerVirtualScrollCommands, VirtualScrollConfig, VirtualScrollMetrics, DataSlice, VirtualDataProvider, createPaginationControls, } from "./virtualScrollProvider";
export { EnhancedFileWatcher } from "./enhancedFileWatcher";
export { FileWatcherService, FileChangeEvent, FileWatcherOptions, } from "./fileWatcherService";
export { GoalieHealthProvider } from "./healthProvider";
export { DtCalibrationProvider } from "./dtCalibrationProvider";
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
export declare function getExtensionConfig(): GoalieExtensionConfig;
/**
 * Get the Goalie directory path
 */
export declare function getGoalieDirectory(workspaceRoot: string): string;
/**
 * Check if Goalie directory exists and is valid
 */
export declare function isGoalieDirectoryValid(goalieDir: string): boolean;
/**
 * Initialize Goalie directory with default files if needed
 */
export declare function initializeGoalieDirectory(goalieDir: string): Promise<void>;
/**
 * Extension version information
 */
export declare const EXTENSION_VERSION = "0.2.0";
export declare const EXTENSION_NAME = "goalie-dashboard";
export declare const EXTENSION_PUBLISHER = "goalie";
/**
 * Supported OAuth domains
 */
export declare const SUPPORTED_OAUTH_DOMAINS: readonly ["720.chat", "artchat.art", "chatfans.fans", "decisioncall.com", "rooz.live"];
/**
 * Default WIP limits for Kanban sections
 */
export declare const DEFAULT_WIP_LIMITS: Record<string, number>;
/**
 * Pattern severity thresholds
 */
export declare const SEVERITY_THRESHOLDS: {
    critical: {
        wsjfScore: number;
        costOfDelay: number;
    };
    warning: {
        wsjfScore: number;
        costOfDelay: number;
    };
    info: {
        wsjfScore: number;
        costOfDelay: number;
    };
};
/**
 * Create a diagnostic collection for Goalie
 */
export declare function createDiagnosticCollection(): vscode.DiagnosticCollection;
/**
 * Log levels for the extension
 */
export declare enum LogLevel {
    debug = 0,
    info = 1,
    warning = 2,
    error = 3
}
/**
 * Logger utility for the extension
 */
export declare class GoalieLogger {
    private outputChannel;
    private logLevel;
    constructor(name?: string, level?: LogLevel);
    setLevel(level: LogLevel): void;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, err?: Error, ...args: unknown[]): void;
    private log;
    show(): void;
    dispose(): void;
}
export declare function getLogger(): GoalieLogger;
/**
 * Utility function to debounce function calls
 */
export declare function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Utility function to throttle function calls
 */
export declare function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Format bytes to human-readable string
 */
export declare function formatBytes(bytes: number): string;
/**
 * Format duration in milliseconds to human-readable string
 */
export declare function formatDuration(ms: number): string;
/**
 * Parse JSONL file content
 */
export declare function parseJsonl<T>(content: string): T[];
/**
 * Write JSONL content
 */
export declare function toJsonl<T>(items: T[]): string;
/**
 * Deep clone an object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Safe JSON parse with default value
 */
export declare function safeJsonParse<T>(json: string, defaultValue: T): T;
export { activate, deactivate } from "./extension_enhanced_final";
//# sourceMappingURL=index.d.ts.map