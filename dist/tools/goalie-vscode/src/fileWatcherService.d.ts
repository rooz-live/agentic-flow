import * as vscode from 'vscode';
/**
 * File change event interface
 */
export interface FileChangeEvent {
    /** File path */
    path: string;
    /** Relative path from workspace root */
    relativePath: string;
    /** File type (created, changed, deleted) */
    type: 'created' | 'changed' | 'deleted';
    /** File size in bytes */
    size: number;
    /** Last modified time */
    mtime: Date;
    /** File extension */
    extension?: string;
}
/**
 * File watcher options interface
 */
export interface FileWatcherOptions {
    /** File patterns to watch */
    patterns: string[];
    /** Debounce delay in milliseconds */
    debounceDelay?: number;
    /** Whether to watch recursively */
    recursive?: boolean;
    /** Whether to track file metadata */
    trackMetadata?: boolean;
    /** Patterns to ignore */
    ignorePatterns?: string[];
}
/**
 * Performance metrics interface
 */
export interface FileWatcherMetrics {
    /** Total files watched */
    totalFilesWatched: number;
    /** Total changes detected */
    totalChangesDetected: number;
    /** Average processing time in milliseconds */
    averageProcessingTime: number;
    /** Cache hit rate */
    cacheHitRate: number;
    /** Last update time */
    lastUpdateTime: Date;
    /** Error count */
    errorCount: number;
}
/**
 * File metadata interface
 */
export interface FileMetadata {
    /** File path */
    path: string;
    /** File size */
    size: number;
    /** Last modified time */
    mtime: Date;
    /** File hash for change detection */
    hash?: string;
    /** Last access time */
    atime?: Date;
    /** Creation time */
    ctime?: Date;
}
/**
 * Centralized file watcher service with enhanced capabilities
 */
export declare class FileWatcherService {
    private readonly workspaceRoot;
    private readonly options;
    private watchers;
    private fileMetadataCache;
    private performanceMetrics;
    private processingTimes;
    private cacheHits;
    private cacheMisses;
    private debounceTimers;
    private isDisposed;
    private readonly _onDidChangeFile;
    readonly onDidChangeFile: vscode.Event<FileChangeEvent[]>;
    private readonly _onDidDetectNewFiles;
    readonly onDidDetectNewFiles: vscode.Event<FileChangeEvent[]>;
    constructor(workspaceRoot: string | undefined, options: FileWatcherOptions);
    /**
     * Initialize file system watchers for all patterns
     */
    private initializeWatchers;
    /**
     * Initialize file metadata cache
     */
    private initializeFileCache;
    /**
     * Handle file creation events
     */
    private handleFileCreate;
    /**
     * Handle file change events
     */
    private handleFileChange;
    /**
     * Handle file deletion events
     */
    private handleFileDelete;
    /**
     * Debounce file changes to prevent excessive processing
     */
    private debounceFileChange;
    /**
     * Create a file change event
     */
    private createFileChangeEvent;
    /**
     * Update file metadata cache
     */
    private updateFileMetadataCache;
    /**
     * Check if a file should be ignored
     */
    private shouldIgnoreFile;
    /**
     * Get relative path from workspace root
     */
    private getRelativePath;
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics;
    /**
     * Check if a file has changed since last check
     */
    hasFileChanged(filePath: string): boolean;
    /**
     * Get file metadata from cache
     */
    getFileMetadata(filePath: string): FileMetadata | undefined;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): FileWatcherMetrics;
    /**
     * Get all cached file metadata
     */
    getAllFileMetadata(): FileMetadata[];
    /**
     * Clear file metadata cache
     */
    clearCache(): void;
    /**
     * Refresh file cache
     */
    refreshCache(): void;
    /**
     * Add new file pattern to watch
     */
    addPattern(pattern: string): void;
    /**
     * Initialize cache for a specific pattern
     */
    private initializePatternCache;
    /**
     * Remove file pattern from watching
     */
    removePattern(pattern: string): void;
    /**
     * Recreate all file system watchers
     */
    private recreateWatchers;
    /**
     * Dispose of the file watcher service
     */
    dispose(): void;
}
//# sourceMappingURL=fileWatcherService.d.ts.map