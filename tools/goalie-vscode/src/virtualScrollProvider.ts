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
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  loadedAt: number;
  accessCount: number;
  lastAccessedAt: number;
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
export class VirtualScrollProvider<T> implements vscode.Disposable {
  private cache: Map<number, CacheEntry<T>> = new Map();
  private loadTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private currentPage = 0;
  private totalCount = 0;
  private isLoading = false;
  private loadQueue: Array<{ startIndex: number; endIndex: number; resolve: (items: T[]) => void }> = [];
  private disposables: vscode.Disposable[] = [];

  private _onDidUpdateData = new vscode.EventEmitter<DataSlice<T>>();
  readonly onDidUpdateData = this._onDidUpdateData.event;

  private _onDidUpdateMetrics = new vscode.EventEmitter<VirtualScrollMetrics>();
  readonly onDidUpdateMetrics = this._onDidUpdateMetrics.event;

  private config: VirtualScrollConfig;

  constructor(
    private readonly dataProvider: VirtualDataProvider<T>,
    config?: Partial<VirtualScrollConfig>
  ) {
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
  public async initialize(): Promise<void> {
    this.totalCount = await this.dataProvider.getTotalCount();
    await this.loadPage(0);
    this.emitMetrics();
  }

  /**
   * Get the current data slice
   */
  public async getCurrentSlice(): Promise<DataSlice<T>> {
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
  public async goToPage(page: number): Promise<DataSlice<T>> {
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
  public async nextPage(): Promise<DataSlice<T> | null> {
    const maxPage = Math.ceil(this.totalCount / this.config.pageSize) - 1;
    if (this.currentPage >= maxPage) {
      return null;
    }
    return this.goToPage(this.currentPage + 1);
  }

  /**
   * Go to previous page
   */
  public async previousPage(): Promise<DataSlice<T> | null> {
    if (this.currentPage <= 0) {
      return null;
    }
    return this.goToPage(this.currentPage - 1);
  }

  /**
   * Go to first page
   */
  public async firstPage(): Promise<DataSlice<T>> {
    return this.goToPage(0);
  }

  /**
   * Go to last page
   */
  public async lastPage(): Promise<DataSlice<T>> {
    const maxPage = Math.ceil(this.totalCount / this.config.pageSize) - 1;
    return this.goToPage(maxPage);
  }

  /**
   * Jump to a specific item by index
   */
  public async goToIndex(index: number): Promise<DataSlice<T>> {
    const page = Math.floor(index / this.config.pageSize);
    return this.goToPage(page);
  }

  /**
   * Search and jump to an item
   */
  public async findAndGoTo(predicate: (item: T) => boolean): Promise<{ found: boolean; slice: DataSlice<T> | null }> {
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
  public async refresh(): Promise<DataSlice<T>> {
    this.cache.clear();
    this.totalCount = await this.dataProvider.getTotalCount();
    return this.goToPage(this.currentPage);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<VirtualScrollConfig>): void {
    this.config = { ...this.config, ...config };
    this.emitMetrics();
  }

  /**
   * Get current page info
   */
  public getPageInfo(): { currentPage: number; totalPages: number; pageSize: number } {
    return {
      currentPage: this.currentPage,
      totalPages: Math.ceil(this.totalCount / this.config.pageSize),
      pageSize: this.config.pageSize,
    };
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): VirtualScrollMetrics {
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
  private async loadPage(page: number): Promise<void> {
    const startIndex = page * this.config.pageSize;
    const endIndex = Math.min(startIndex + this.config.pageSize, this.totalCount);
    await this.getItemsForRange(startIndex, endIndex);
  }

  /**
   * Get items for a specific range, using cache when possible
   */
  private async getItemsForRange(startIndex: number, endIndex: number): Promise<T[]> {
    const items: T[] = [];
    const missingRanges: Array<{ start: number; end: number }> = [];
    let currentMissingStart: number | null = null;

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
      } else {
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
  private cacheItem(index: number, item: T): void {
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
  private async preloadAdjacentPages(): Promise<void> {
    const pagesToPreload: number[] = [];

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
  private enforceCacheLimit(): void {
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
  private estimateMemoryUsage(): number {
    // Rough estimate: assume each item is ~1KB on average
    return this.cache.size * 1024;
  }

  /**
   * Emit metrics update
   */
  private emitMetrics(): void {
    this._onDidUpdateMetrics.fire(this.getMetrics());
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
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
export function createPaginationControls(
  pageInfo: { currentPage: number; totalPages: number; pageSize: number },
  slice: DataSlice<unknown>
): vscode.TreeItem[] {
  const items: vscode.TreeItem[] = [];

  // Header with pagination info
  const headerItem = new vscode.TreeItem(
    `Page ${pageInfo.currentPage + 1} of ${pageInfo.totalPages}`,
    vscode.TreeItemCollapsibleState.None
  );
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
export class JsonlVirtualDataProvider<T> implements VirtualDataProvider<T> {
  private lineIndex: number[] = [];
  private totalLines = 0;
  private fileContent: string | null = null;
  private indexBuilt = false;

  constructor(
    private readonly filePath: string,
    private readonly idExtractor: (item: T) => string,
    private readonly fs: typeof import('fs')
  ) {}

  /**
   * Build index of line positions for efficient random access
   */
  public async buildIndex(): Promise<void> {
    if (this.indexBuilt) return;

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

  async getTotalCount(): Promise<number> {
    await this.buildIndex();
    return this.totalLines;
  }

  async loadRange(startIndex: number, endIndex: number): Promise<T[]> {
    await this.buildIndex();

    if (!this.fileContent) {
      return [];
    }

    const items: T[] = [];
    const safeEnd = Math.min(endIndex, this.totalLines);

    for (let i = startIndex; i < safeEnd; i++) {
      const lineStart = this.lineIndex[i];
      const lineEnd = i + 1 < this.lineIndex.length
        ? this.lineIndex[i + 1] - 1
        : this.fileContent.length;

      const line = this.fileContent.substring(lineStart, lineEnd).trim();

      if (line) {
        try {
          const parsed = JSON.parse(line) as T;
          items.push(parsed);
        } catch (e) {
          // Skip malformed lines
          console.warn(`[JsonlVirtualDataProvider] Failed to parse line ${i}:`, e);
        }
      }
    }

    return items;
  }

  getItemId(item: T): string {
    return this.idExtractor(item);
  }

  /**
   * Clear cached file content to free memory
   */
  public clearCache(): void {
    this.fileContent = null;
    this.lineIndex = [];
    this.indexBuilt = false;
    this.totalLines = 0;
  }
}

/**
 * Register virtual scroll commands
 */
export function registerVirtualScrollCommands(
  context: vscode.ExtensionContext,
  providers: Map<string, VirtualScrollProvider<unknown>>
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('goalie.virtualScroll.nextPage', async (providerId?: string) => {
      const provider = providerId ? providers.get(providerId) : providers.values().next().value;
      if (provider) {
        await provider.nextPage();
      }
    }),

    vscode.commands.registerCommand('goalie.virtualScroll.previousPage', async (providerId?: string) => {
      const provider = providerId ? providers.get(providerId) : providers.values().next().value;
      if (provider) {
        await provider.previousPage();
      }
    }),

    vscode.commands.registerCommand('goalie.virtualScroll.goToPage', async (providerId?: string) => {
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
    }),

    vscode.commands.registerCommand('goalie.virtualScroll.setPageSize', async (providerId?: string) => {
      const provider = providerId ? providers.get(providerId) : providers.values().next().value;
      if (provider) {
        const options = [25, 50, 100, 200, 500];
        const selected = await vscode.window.showQuickPick(
          options.map(n => ({ label: `${n} items per page`, value: n })),
          { placeHolder: 'Select page size' }
        );

        if (selected) {
          provider.updateConfig({ pageSize: selected.value });
          await provider.refresh();
        }
      }
    }),

    vscode.commands.registerCommand('goalie.virtualScroll.showMetrics', async (providerId?: string) => {
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
    })
  );
}
