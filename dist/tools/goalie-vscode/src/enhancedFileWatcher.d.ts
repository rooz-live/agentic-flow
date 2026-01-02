/**
 * Enhanced file watcher with debouncing and update queuing
 */
export declare class EnhancedFileWatcher {
    private readonly workspaceRoot;
    private readonly refreshCallbacks;
    private readonly options;
    private fileWatcherService;
    private updateQueue;
    private isProcessingQueue;
    private updateTimer;
    private readonly defaultDebounceDelay;
    private readonly batchUpdateDelay;
    constructor(workspaceRoot: string | undefined, refreshCallbacks: Array<() => void>, options?: {
        patterns?: string[];
        debounceDelay?: number;
        enableBatching?: boolean;
        enableVisualIndicators?: boolean;
    });
    /**
     * Set up event handlers for the file watcher service
     */
    private setupEventHandlers;
    /**
     * Handle file changes with intelligent debouncing and batching
     */
    private handleFileChanges;
    /**
     * Schedule immediate update with debouncing
     */
    private scheduleImmediateUpdate;
    /**
     * Schedule batched update for multiple rapid changes
     */
    private scheduleBatchedUpdate;
    /**
     * Process the update queue to prevent lost updates
     */
    private processUpdateQueue;
    /**
     * Show visual indicators for new files
     */
    private showNewFileNotifications;
    /**
     * Show detailed information about new files
     */
    private showNewFileDetails;
    /**
     * Generate HTML for new files details view
     */
    private generateNewFilesHtml;
    /**
     * Get human-readable time ago string
     */
    private getTimeAgo;
    /**
     * Get performance metrics from the file watcher service
     */
    getPerformanceMetrics(): import("./fileWatcherService").FileWatcherMetrics;
    /**
     * Check if a file has changed since last check
     */
    hasFileChanged(filePath: string): boolean;
    /**
     * Get file metadata from cache
     */
    getFileMetadata(filePath: string): import("./fileWatcherService").FileMetadata | undefined;
    /**
     * Dispose of the enhanced file watcher
     */
    dispose(): void;
}
//# sourceMappingURL=enhancedFileWatcher.d.ts.map