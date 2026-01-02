import * as vscode from 'vscode';
/**
 * Configuration for virtual scrolling behavior
 */
export interface VirtualScrollConfig {
    /** Number of items to load per page */
    pageSize: number;
    /** Number of items to preload ahead of current view */
    preloadBuffer: number;
    /** Debounce delay for scroll events in milliseconds */
    scrollDebounceMs: number;
    /** Maximum items to keep in memory cache */
    maxCacheSize: number;
    /** Enable performance logging */
    enablePerfLogging: boolean;
}
/**
 * Represents a slice of data in the virtual scroll
 */
export interface DataSlice<T> {
    items: T[];
    startIndex: number;
    endIndex: number;
    totalCount: number;
    hasMore: boolean;
    hasPrevious: boolean;
}
/**
 * Performance metrics for virtual scrolling
 */
export interface VirtualScrollMetrics {
    totalItems: number;
    loadedItems: number;
    cacheHitRate: number;
    avgLoadTimeMs: number;
    memoryUsageEstimate: number;
    lastLoadTime: number;
}
/**
 * Data provider interface for virtual scrolling
 */
export interface VirtualDataProvider<T> {
    /** Get total count of items */
    getTotalCount(): Promise<number>;
    /** Load items for a specific range */
    loadRange(startIndex: number, endIndex: number): Promise<T[]>;
    /** Get unique identifier for an item */
    getItemId(item: T): string;
    /** Optional: Transform item for display */
    transformItem?(item: T): vscode.TreeItem;
}
/**
 * VirtualScrollProvider - Handles large datasets with efficient pagination
 *
 * This provider implements virtual scrolling for VS Code tree views,
 * allowing efficient display of thousands of items without memory issues.
 */
export declare class VirtualScrollProvider<T> implements vscode.Disposable {
    private readonly dataProvider;
    private cache;
    private loadTimes;
    private cacheHits;
    private cacheMisses;
    private currentPage;
    private totalCount;
    private isLoading;
    private loadQueue;
    private disposables;
    private _onDidUpdateData;
    readonly onDidUpdateData: vscode.Event<DataSlice<T>>;
    private _onDidUpdateMetrics;
    readonly onDidUpdateMetrics: vscode.Event<VirtualScrollMetrics>;
    private config;
    constructor(dataProvider: VirtualDataProvider<T>, config?: Partial<VirtualScrollConfig>);
    /**
     * Initialize the virtual scroll provider
     */
    initialize(): Promise<void>;
    /**
     * Get the current data slice
     */
    getCurrentSlice(): Promise<DataSlice<T>>;
    /**
     * Navigate to a specific page
     */
    goToPage(page: number): Promise<DataSlice<T>>;
    /**
     * Go to next page
     */
    nextPage(): Promise<DataSlice<T> | null>;
    /**
     * Go to previous page
     */
    previousPage(): Promise<DataSlice<T> | null>;
    /**
     * Go to first page
     */
    firstPage(): Promise<DataSlice<T>>;
    /**
     * Go to last page
     */
    lastPage(): Promise<DataSlice<T>>;
    /**
     * Jump to a specific item by index
     */
    goToIndex(index: number): Promise<DataSlice<T>>;
    /**
     * Search and jump to an item
     */
    findAndGoTo(predicate: (item: T) => boolean): Promise<{
        found: boolean;
        slice: DataSlice<T> | null;
    }>;
    /**
     * Refresh data from source
     */
    refresh(): Promise<DataSlice<T>>;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<VirtualScrollConfig>): void;
    /**
     * Get current page info
     */
    getPageInfo(): {
        currentPage: number;
        totalPages: number;
        pageSize: number;
    };
    /**
     * Get performance metrics
     */
    getMetrics(): VirtualScrollMetrics;
    /**
     * Load a specific page
     */
    private loadPage;
    /**
     * Get items for a specific range, using cache when possible
     */
    private getItemsForRange;
    /**
     * Cache a single item
     */
    private cacheItem;
    /**
     * Preload adjacent pages for smoother scrolling
     */
    private preloadAdjacentPages;
    /**
     * Enforce cache size limit using LRU eviction
     */
    private enforceCacheLimit;
    /**
     * Estimate memory usage of cache
     */
    private estimateMemoryUsage;
    /**
     * Emit metrics update
     */
    private emitMetrics;
    /**
     * Dispose resources
     */
    dispose(): void;
}
/**
 * Create tree items with virtual scroll pagination controls
 */
export declare function createPaginationControls(pageInfo: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
}, slice: DataSlice<unknown>): vscode.TreeItem[];
/**
 * JSONL file data provider for virtual scrolling
 * Efficiently handles large JSONL files by reading only needed lines
 */
export declare class JsonlVirtualDataProvider<T> implements VirtualDataProvider<T> {
    private readonly filePath;
    private readonly idExtractor;
    private readonly fs;
    private lineIndex;
    private totalLines;
    private fileContent;
    private indexBuilt;
    constructor(filePath: string, idExtractor: (item: T) => string, fs: typeof import('fs'));
    /**
     * Build index of line positions for efficient random access
     */
    buildIndex(): Promise<void>;
    getTotalCount(): Promise<number>;
    loadRange(startIndex: number, endIndex: number): Promise<T[]>;
    getItemId(item: T): string;
    /**
     * Clear cached file content to free memory
     */
    clearCache(): void;
}
/**
 * Register virtual scroll commands
 */
export declare function registerVirtualScrollCommands(context: vscode.ExtensionContext, providers: Map<string, VirtualScrollProvider<unknown>>): void;
//# sourceMappingURL=virtualScrollProvider.d.ts.map