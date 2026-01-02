import * as vscode from 'vscode';
/**
 * VirtualScrollProvider - Handles large datasets with efficient pagination
 *
 * This provider implements virtual scrolling for VS Code tree views,
 * allowing efficient display of thousands of items without memory issues.
 */
export class VirtualScrollProvider {
    dataProvider;
    cache = new Map();
    loadTimes = [];
    cacheHits = 0;
    cacheMisses = 0;
    currentPage = 0;
    totalCount = 0;
    isLoading = false;
    loadQueue = [];
    disposables = [];
    _onDidUpdateData = new vscode.EventEmitter();
    onDidUpdateData = this._onDidUpdateData.event;
    _onDidUpdateMetrics = new vscode.EventEmitter();
    onDidUpdateMetrics = this._onDidUpdateMetrics.event;
    config;
    constructor(dataProvider, config) {
        this.dataProvider = dataProvider;
        this.config = {
            pageSize: config?.pageSize ?? 50,
            preloadBuffer: config?.preloadBuffer ?? 10,
            scrollDebounceMs: config?.scrollDebounceMs ?? 150,
            maxCacheSize: config?.maxCacheSize ?? 500,
            enablePerfLogging: config?.enablePerfLogging ?? false,
        };
    }
    /**
     * Initialize the virtual scroll provider
     */
    async initialize() {
        this.totalCount = await this.dataProvider.getTotalCount();
        await this.loadPage(0);
        this.emitMetrics();
    }
    /**
     * Get the current data slice
     */
    async getCurrentSlice() {
        const startIndex = this.currentPage * this.config.pageSize;
        const endIndex = Math.min(startIndex + this.config.pageSize, this.totalCount);
        const items = await this.getItemsForRange(startIndex, endIndex);
        return {
            items,
            startIndex,
            endIndex,
            totalCount: this.totalCount,
            hasMore: endIndex < this.totalCount,
            hasPrevious: startIndex > 0,
        };
    }
    /**
     * Navigate to a specific page
     */
    async goToPage(page) {
        const maxPage = Math.ceil(this.totalCount / this.config.pageSize) - 1;
        this.currentPage = Math.max(0, Math.min(page, maxPage));
        const slice = await this.getCurrentSlice();
        this._onDidUpdateData.fire(slice);
        // Preload adjacent pages
        this.preloadAdjacentPages();
        return slice;
    }
    /**
     * Go to next page
     */
    async nextPage() {
        const maxPage = Math.ceil(this.totalCount / this.config.pageSize) - 1;
        if (this.currentPage >= maxPage) {
            return null;
        }
        return this.goToPage(this.currentPage + 1);
    }
    /**
     * Go to previous page
     */
    async previousPage() {
        if (this.currentPage <= 0) {
            return null;
        }
        return this.goToPage(this.currentPage - 1);
    }
    /**
     * Go to first page
     */
    async firstPage() {
        return this.goToPage(0);
    }
    /**
     * Go to last page
     */
    async lastPage() {
        const maxPage = Math.ceil(this.totalCount / this.config.pageSize) - 1;
        return this.goToPage(maxPage);
    }
    /**
     * Jump to a specific item by index
     */
    async goToIndex(index) {
        const page = Math.floor(index / this.config.pageSize);
        return this.goToPage(page);
    }
    /**
     * Search and jump to an item
     */
    async findAndGoTo(predicate) {
        // First check cache
        for (const [index, entry] of this.cache.entries()) {
            if (predicate(entry.data)) {
                return { found: true, slice: await this.goToIndex(index) };
            }
        }
        // Linear search through all data (could be optimized with indexing)
        const batchSize = this.config.pageSize * 2;
        for (let start = 0; start < this.totalCount; start += batchSize) {
            const end = Math.min(start + batchSize, this.totalCount);
            const items = await this.dataProvider.loadRange(start, end);
            for (let i = 0; i < items.length; i++) {
                if (predicate(items[i])) {
                    // Cache these items
                    for (let j = 0; j < items.length; j++) {
                        this.cacheItem(start + j, items[j]);
                    }
                    return { found: true, slice: await this.goToIndex(start + i) };
                }
            }
        }
        return { found: false, slice: null };
    }
    /**
     * Refresh data from source
     */
    async refresh() {
        this.cache.clear();
        this.totalCount = await this.dataProvider.getTotalCount();
        return this.goToPage(this.currentPage);
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.emitMetrics();
    }
    /**
     * Get current page info
     */
    getPageInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: Math.ceil(this.totalCount / this.config.pageSize),
            pageSize: this.config.pageSize,
        };
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        const totalAccesses = this.cacheHits + this.cacheMisses;
        const avgLoadTime = this.loadTimes.length > 0
            ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length
            : 0;
        return {
            totalItems: this.totalCount,
            loadedItems: this.cache.size,
            cacheHitRate: totalAccesses > 0 ? this.cacheHits / totalAccesses : 0,
            avgLoadTimeMs: avgLoadTime,
            memoryUsageEstimate: this.estimateMemoryUsage(),
            lastLoadTime: this.loadTimes[this.loadTimes.length - 1] ?? 0,
        };
    }
    /**
     * Load a specific page
     */
    async loadPage(page) {
        const startIndex = page * this.config.pageSize;
        const endIndex = Math.min(startIndex + this.config.pageSize, this.totalCount);
        await this.getItemsForRange(startIndex, endIndex);
    }
    /**
     * Get items for a specific range, using cache when possible
     */
    async getItemsForRange(startIndex, endIndex) {
        const items = [];
        const missingRanges = [];
        let currentMissingStart = null;
        // Find cached and missing items
        for (let i = startIndex; i < endIndex; i++) {
            const cached = this.cache.get(i);
            if (cached) {
                this.cacheHits++;
                cached.accessCount++;
                cached.lastAccessedAt = Date.now();
                items[i - startIndex] = cached.data;
                if (currentMissingStart !== null) {
                    missingRanges.push({ start: currentMissingStart, end: i });
                    currentMissingStart = null;
                }
            }
            else {
                this.cacheMisses++;
                if (currentMissingStart === null) {
                    currentMissingStart = i;
                }
            }
        }
        if (currentMissingStart !== null) {
            missingRanges.push({ start: currentMissingStart, end: endIndex });
        }
        // Load missing ranges
        for (const range of missingRanges) {
            const startTime = performance.now();
            const loadedItems = await this.dataProvider.loadRange(range.start, range.end);
            const loadTime = performance.now() - startTime;
            this.loadTimes.push(loadTime);
            // Keep only last 100 load times for averaging
            if (this.loadTimes.length > 100) {
                this.loadTimes.shift();
            }
            if (this.config.enablePerfLogging) {
                console.log(`[VirtualScroll] Loaded ${loadedItems.length} items in ${loadTime.toFixed(2)}ms`);
            }
            // Cache and add to result
            for (let i = 0; i < loadedItems.length; i++) {
                const index = range.start + i;
                this.cacheItem(index, loadedItems[i]);
                items[index - startIndex] = loadedItems[i];
            }
        }
        this.enforceCacheLimit();
        return items;
    }
    /**
     * Cache a single item
     */
    cacheItem(index, item) {
        this.cache.set(index, {
            data: item,
            loadedAt: Date.now(),
            accessCount: 1,
            lastAccessedAt: Date.now(),
        });
    }
    /**
     * Preload adjacent pages for smoother scrolling
     */
    async preloadAdjacentPages() {
        const pagesToPreload = [];
        // Preload next page
        if ((this.currentPage + 1) * this.config.pageSize < this.totalCount) {
            pagesToPreload.push(this.currentPage + 1);
        }
        // Preload previous page
        if (this.currentPage > 0) {
            pagesToPreload.push(this.currentPage - 1);
        }
        // Load in background
        for (const page of pagesToPreload) {
            const startIndex = page * this.config.pageSize;
            const endIndex = Math.min(startIndex + this.config.pageSize, this.totalCount);
            // Check if already cached
            let allCached = true;
            for (let i = startIndex; i < endIndex; i++) {
                if (!this.cache.has(i)) {
                    allCached = false;
                    break;
                }
            }
            if (!allCached) {
                // Don't await - run in background
                this.getItemsForRange(startIndex, endIndex).catch(err => {
                    console.warn('[VirtualScroll] Preload failed:', err);
                });
            }
        }
    }
    /**
     * Enforce cache size limit using LRU eviction
     */
    enforceCacheLimit() {
        if (this.cache.size <= this.config.maxCacheSize) {
            return;
        }
        // Sort by last accessed time (LRU)
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
        // Remove oldest entries
        const toRemove = entries.slice(0, this.cache.size - this.config.maxCacheSize);
        for (const [key] of toRemove) {
            this.cache.delete(key);
        }
        if (this.config.enablePerfLogging) {
            console.log(`[VirtualScroll] Evicted ${toRemove.length} cache entries`);
        }
    }
    /**
     * Estimate memory usage of cache
     */
    estimateMemoryUsage() {
        // Rough estimate: assume each item is ~1KB on average
        return this.cache.size * 1024;
    }
    /**
     * Emit metrics update
     */
    emitMetrics() {
        this._onDidUpdateMetrics.fire(this.getMetrics());
    }
    /**
     * Dispose resources
     */
    dispose() {
        this._onDidUpdateData.dispose();
        this._onDidUpdateMetrics.dispose();
        this.cache.clear();
        this.loadQueue = [];
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
/**
 * Create tree items with virtual scroll pagination controls
 */
export function createPaginationControls(pageInfo, slice) {
    const items = [];
    // Header with pagination info
    const headerItem = new vscode.TreeItem(`Page ${pageInfo.currentPage + 1} of ${pageInfo.totalPages}`, vscode.TreeItemCollapsibleState.None);
    headerItem.description = `Showing ${slice.startIndex + 1}-${slice.endIndex} of ${slice.totalCount}`;
    headerItem.iconPath = new vscode.ThemeIcon('list-ordered');
    headerItem.contextValue = 'paginationHeader';
    items.push(headerItem);
    // Navigation controls
    if (slice.hasPrevious) {
        const prevItem = new vscode.TreeItem('◀ Previous Page', vscode.TreeItemCollapsibleState.None);
        prevItem.command = {
            command: 'goalie.virtualScroll.previousPage',
            title: 'Previous Page',
        };
        prevItem.iconPath = new vscode.ThemeIcon('arrow-left');
        prevItem.contextValue = 'paginationPrev';
        items.push(prevItem);
    }
    if (slice.hasMore) {
        const nextItem = new vscode.TreeItem('Next Page ▶', vscode.TreeItemCollapsibleState.None);
        nextItem.command = {
            command: 'goalie.virtualScroll.nextPage',
            title: 'Next Page',
        };
        nextItem.iconPath = new vscode.ThemeIcon('arrow-right');
        nextItem.contextValue = 'paginationNext';
        items.push(nextItem);
    }
    return items;
}
/**
 * JSONL file data provider for virtual scrolling
 * Efficiently handles large JSONL files by reading only needed lines
 */
export class JsonlVirtualDataProvider {
    filePath;
    idExtractor;
    fs;
    lineIndex = [];
    totalLines = 0;
    fileContent = null;
    indexBuilt = false;
    constructor(filePath, idExtractor, fs) {
        this.filePath = filePath;
        this.idExtractor = idExtractor;
        this.fs = fs;
    }
    /**
     * Build index of line positions for efficient random access
     */
    async buildIndex() {
        if (this.indexBuilt)
            return;
        const content = await this.fs.promises.readFile(this.filePath, 'utf8');
        this.fileContent = content;
        this.lineIndex = [];
        let position = 0;
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\n') {
                if (position < i) {
                    this.lineIndex.push(position);
                }
                position = i + 1;
            }
        }
        // Don't forget the last line if it doesn't end with newline
        if (position < content.length) {
            this.lineIndex.push(position);
        }
        this.totalLines = this.lineIndex.length;
        this.indexBuilt = true;
    }
    async getTotalCount() {
        await this.buildIndex();
        return this.totalLines;
    }
    async loadRange(startIndex, endIndex) {
        await this.buildIndex();
        if (!this.fileContent) {
            return [];
        }
        const items = [];
        const safeEnd = Math.min(endIndex, this.totalLines);
        for (let i = startIndex; i < safeEnd; i++) {
            const lineStart = this.lineIndex[i];
            const lineEnd = i + 1 < this.lineIndex.length
                ? this.lineIndex[i + 1] - 1
                : this.fileContent.length;
            const line = this.fileContent.substring(lineStart, lineEnd).trim();
            if (line) {
                try {
                    const parsed = JSON.parse(line);
                    items.push(parsed);
                }
                catch (e) {
                    // Skip malformed lines
                    console.warn(`[JsonlVirtualDataProvider] Failed to parse line ${i}:`, e);
                }
            }
        }
        return items;
    }
    getItemId(item) {
        return this.idExtractor(item);
    }
    /**
     * Clear cached file content to free memory
     */
    clearCache() {
        this.fileContent = null;
        this.lineIndex = [];
        this.indexBuilt = false;
        this.totalLines = 0;
    }
}
/**
 * Register virtual scroll commands
 */
export function registerVirtualScrollCommands(context, providers) {
    context.subscriptions.push(vscode.commands.registerCommand('goalie.virtualScroll.nextPage', async (providerId) => {
        const provider = providerId ? providers.get(providerId) : providers.values().next().value;
        if (provider) {
            await provider.nextPage();
        }
    }), vscode.commands.registerCommand('goalie.virtualScroll.previousPage', async (providerId) => {
        const provider = providerId ? providers.get(providerId) : providers.values().next().value;
        if (provider) {
            await provider.previousPage();
        }
    }), vscode.commands.registerCommand('goalie.virtualScroll.goToPage', async (providerId) => {
        const provider = providerId ? providers.get(providerId) : providers.values().next().value;
        if (provider) {
            const pageInfo = provider.getPageInfo();
            const input = await vscode.window.showInputBox({
                prompt: `Enter page number (1-${pageInfo.totalPages})`,
                validateInput: (value) => {
                    const num = parseInt(value, 10);
                    if (isNaN(num) || num < 1 || num > pageInfo.totalPages) {
                        return `Please enter a number between 1 and ${pageInfo.totalPages}`;
                    }
                    return null;
                },
            });
            if (input) {
                await provider.goToPage(parseInt(input, 10) - 1);
            }
        }
    }), vscode.commands.registerCommand('goalie.virtualScroll.setPageSize', async (providerId) => {
        const provider = providerId ? providers.get(providerId) : providers.values().next().value;
        if (provider) {
            const options = [25, 50, 100, 200, 500];
            const selected = await vscode.window.showQuickPick(options.map(n => ({ label: `${n} items per page`, value: n })), { placeHolder: 'Select page size' });
            if (selected) {
                provider.updateConfig({ pageSize: selected.value });
                await provider.refresh();
            }
        }
    }), vscode.commands.registerCommand('goalie.virtualScroll.showMetrics', async (providerId) => {
        const provider = providerId ? providers.get(providerId) : providers.values().next().value;
        if (provider) {
            const metrics = provider.getMetrics();
            const message = [
                `Total Items: ${metrics.totalItems}`,
                `Loaded Items: ${metrics.loadedItems}`,
                `Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
                `Avg Load Time: ${metrics.avgLoadTimeMs.toFixed(2)}ms`,
                `Est. Memory: ${(metrics.memoryUsageEstimate / 1024).toFixed(1)}KB`,
            ].join('\n');
            vscode.window.showInformationMessage(message, { modal: true });
        }
    }));
}
//# sourceMappingURL=virtualScrollProvider.js.map