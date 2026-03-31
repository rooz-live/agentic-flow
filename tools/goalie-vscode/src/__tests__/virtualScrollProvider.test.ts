import {
  VirtualScrollProvider,
  JsonlVirtualDataProvider,
  VirtualScrollConfig,
  VirtualScrollMetrics,
  DataSlice,
  VirtualDataProvider,
  createPaginationControls,
} from '../virtualScrollProvider';

// Mock VS Code API
const mockEventEmitter = {
  event: jest.fn(),
  fire: jest.fn(),
  dispose: jest.fn(),
};

jest.mock('vscode', () => ({
  EventEmitter: jest.fn(() => mockEventEmitter),
  window: {
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    showInformationMessage: jest.fn(),
    createWebviewPanel: jest.fn(() => ({
      webview: { html: '' },
      dispose: jest.fn(),
      onDidDispose: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn((command: string, callback: () => void) => ({
      dispose: jest.fn(),
    })),
  },
  TreeItem: jest.fn().mockImplementation((label, collapsibleState) => ({
    label,
    collapsibleState,
    description: '',
    iconPath: null,
    contextValue: '',
    command: null,
  })),
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: jest.fn(),
}), { virtual: true });

// Mock fs
const mockFs = {
  promises: {
    readFile: jest.fn(),
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
};

// Test data
interface TestItem {
  id: string;
  name: string;
  value: number;
  timestamp: string;
}

const generateTestItems = (count: number): TestItem[] => {
  const items: TestItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      name: `Test Item ${i}`,
      value: i * 10,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
    });
  }
  return items;
};

// Mock data provider implementation
class MockDataProvider implements VirtualDataProvider<TestItem> {
  private items: TestItem[];

  constructor(itemCount: number = 100) {
    this.items = generateTestItems(itemCount);
  }

  async getTotalCount(): Promise<number> {
    return this.items.length;
  }

  async loadRange(startIndex: number, endIndex: number): Promise<TestItem[]> {
    return this.items.slice(startIndex, endIndex);
  }

  getItemId(item: TestItem): string {
    return item.id;
  }

  getItems(): TestItem[] {
    return this.items;
  }
}

describe('VirtualScrollProvider', () => {
  let dataProvider: MockDataProvider;
  let virtualProvider: VirtualScrollProvider<TestItem>;

  beforeEach(() => {
    jest.clearAllMocks();
    dataProvider = new MockDataProvider(100);
  });

  afterEach(() => {
    if (virtualProvider) {
      virtualProvider.dispose();
    }
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      virtualProvider = new VirtualScrollProvider(dataProvider);
      expect(virtualProvider).toBeDefined();
    });

    it('should create with custom config', () => {
      const config: Partial<VirtualScrollConfig> = {
        pageSize: 25,
        preloadBuffer: 5,
        maxCacheSize: 200,
      };
      virtualProvider = new VirtualScrollProvider(dataProvider, config);
      expect(virtualProvider).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize and load first page', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();

      const pageInfo = virtualProvider.getPageInfo();
      expect(pageInfo.currentPage).toBe(0);
      expect(pageInfo.totalPages).toBe(10);
      expect(pageInfo.pageSize).toBe(10);
    });

    it('should emit metrics after initialization', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider);
      await virtualProvider.initialize();

      const metrics = virtualProvider.getMetrics();
      expect(metrics.totalItems).toBe(100);
      expect(metrics.loadedItems).toBeGreaterThan(0);
    });
  });

  describe('getCurrentSlice', () => {
    beforeEach(async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
    });

    it('should return correct slice for first page', async () => {
      const slice = await virtualProvider.getCurrentSlice();

      expect(slice.startIndex).toBe(0);
      expect(slice.endIndex).toBe(10);
      expect(slice.items).toHaveLength(10);
      expect(slice.totalCount).toBe(100);
      expect(slice.hasPrevious).toBe(false);
      expect(slice.hasMore).toBe(true);
    });

    it('should return items with correct data', async () => {
      const slice = await virtualProvider.getCurrentSlice();
      const expectedItems = dataProvider.getItems().slice(0, 10);

      expect(slice.items).toEqual(expectedItems);
    });
  });

  describe('goToPage', () => {
    beforeEach(async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
    });

    it('should navigate to specified page', async () => {
      const slice = await virtualProvider.goToPage(3);

      expect(slice.startIndex).toBe(30);
      expect(slice.endIndex).toBe(40);
      expect(slice.hasPrevious).toBe(true);
      expect(slice.hasMore).toBe(true);
    });

    it('should clamp to first page when negative', async () => {
      const slice = await virtualProvider.goToPage(-5);

      expect(slice.startIndex).toBe(0);
      const pageInfo = virtualProvider.getPageInfo();
      expect(pageInfo.currentPage).toBe(0);
    });

    it('should clamp to last page when exceeds total', async () => {
      const slice = await virtualProvider.goToPage(100);

      const pageInfo = virtualProvider.getPageInfo();
      expect(pageInfo.currentPage).toBe(9); // Last page (0-indexed)
    });

    it('should return correct slice for last page', async () => {
      const slice = await virtualProvider.goToPage(9);

      expect(slice.startIndex).toBe(90);
      expect(slice.endIndex).toBe(100);
      expect(slice.hasPrevious).toBe(true);
      expect(slice.hasMore).toBe(false);
    });
  });

  describe('nextPage', () => {
    beforeEach(async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
    });

    it('should advance to next page', async () => {
      const slice = await virtualProvider.nextPage();

      expect(slice).not.toBeNull();
      expect(slice!.startIndex).toBe(10);
      expect(slice!.endIndex).toBe(20);
    });

    it('should return null on last page', async () => {
      await virtualProvider.goToPage(9);
      const slice = await virtualProvider.nextPage();

      expect(slice).toBeNull();
    });
  });

  describe('previousPage', () => {
    beforeEach(async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
    });

    it('should go to previous page', async () => {
      await virtualProvider.goToPage(5);
      const slice = await virtualProvider.previousPage();

      expect(slice).not.toBeNull();
      expect(slice!.startIndex).toBe(40);
    });

    it('should return null on first page', async () => {
      const slice = await virtualProvider.previousPage();

      expect(slice).toBeNull();
    });
  });

  describe('firstPage and lastPage', () => {
    beforeEach(async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
    });

    it('should navigate to first page', async () => {
      await virtualProvider.goToPage(5);
      const slice = await virtualProvider.firstPage();

      expect(slice.startIndex).toBe(0);
      expect(slice.hasPrevious).toBe(false);
    });

    it('should navigate to last page', async () => {
      const slice = await virtualProvider.lastPage();

      expect(slice.endIndex).toBe(100);
      expect(slice.hasMore).toBe(false);
    });
  });

  describe('goToIndex', () => {
    beforeEach(async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
    });

    it('should navigate to page containing index', async () => {
      const slice = await virtualProvider.goToIndex(55);

      expect(slice.startIndex).toBe(50);
      expect(slice.endIndex).toBe(60);
    });

    it('should handle index at page boundary', async () => {
      const slice = await virtualProvider.goToIndex(30);

      expect(slice.startIndex).toBe(30);
    });

    it('should handle index 0', async () => {
      await virtualProvider.goToPage(5);
      const slice = await virtualProvider.goToIndex(0);

      expect(slice.startIndex).toBe(0);
    });
  });

  describe('findAndGoTo', () => {
    beforeEach(async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
    });

    it('should find item and navigate to its page', async () => {
      const result = await virtualProvider.findAndGoTo(
        (item) => item.id === 'item-45'
      );

      expect(result.found).toBe(true);
      expect(result.slice).not.toBeNull();
      expect(result.slice!.startIndex).toBe(40);
    });

    it('should return not found for non-existent item', async () => {
      const result = await virtualProvider.findAndGoTo(
        (item) => item.id === 'non-existent'
      );

      expect(result.found).toBe(false);
      expect(result.slice).toBeNull();
    });

    it('should find item in cache first', async () => {
      // Load page containing item first
      await virtualProvider.goToPage(2);

      // Now search for item that should be cached
      const result = await virtualProvider.findAndGoTo(
        (item) => item.id === 'item-25'
      );

      expect(result.found).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should reload data', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();
      await virtualProvider.goToPage(3);

      const slice = await virtualProvider.refresh();

      expect(slice.items).toHaveLength(10);
    });

    it('should clear cache on refresh', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();

      const metricsBefore = virtualProvider.getMetrics();
      await virtualProvider.refresh();
      const metricsAfter = virtualProvider.getMetrics();

      // Cache should be rebuilt
      expect(metricsAfter.loadedItems).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();

      virtualProvider.updateConfig({ pageSize: 25 });

      const pageInfo = virtualProvider.getPageInfo();
      expect(pageInfo.pageSize).toBe(25);
    });
  });

  describe('getPageInfo', () => {
    it('should return correct page information', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 20 });
      await virtualProvider.initialize();

      const pageInfo = virtualProvider.getPageInfo();

      expect(pageInfo.currentPage).toBe(0);
      expect(pageInfo.totalPages).toBe(5);
      expect(pageInfo.pageSize).toBe(20);
    });
  });

  describe('getMetrics', () => {
    it('should return performance metrics', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();

      const metrics = virtualProvider.getMetrics();

      expect(metrics.totalItems).toBe(100);
      expect(metrics.loadedItems).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.avgLoadTimeMs).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsageEstimate).toBeGreaterThan(0);
    });

    it('should track cache hit rate', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();

      // Access same page twice to create cache hits
      await virtualProvider.getCurrentSlice();
      await virtualProvider.getCurrentSlice();

      const metrics = virtualProvider.getMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should cache loaded items', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, { pageSize: 10 });
      await virtualProvider.initialize();

      const metrics = virtualProvider.getMetrics();
      expect(metrics.loadedItems).toBeGreaterThanOrEqual(10);
    });

    it('should evict items when cache limit exceeded', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider, {
        pageSize: 10,
        maxCacheSize: 20,
      });
      await virtualProvider.initialize();

      // Load multiple pages to exceed cache
      await virtualProvider.goToPage(0);
      await virtualProvider.goToPage(1);
      await virtualProvider.goToPage(2);
      await virtualProvider.goToPage(3);

      const metrics = virtualProvider.getMetrics();
      expect(metrics.loadedItems).toBeLessThanOrEqual(20);
    });
  });

  describe('dispose', () => {
    it('should dispose resources', async () => {
      virtualProvider = new VirtualScrollProvider(dataProvider);
      await virtualProvider.initialize();

      expect(() => virtualProvider.dispose()).not.toThrow();
    });
  });
});

describe('JsonlVirtualDataProvider', () => {
  const testFilePath = '/test/pattern_metrics.jsonl';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildIndex', () => {
    it('should build line index from JSONL content', async () => {
      const testContent = [
        '{"id":"1","name":"Item 1"}',
        '{"id":"2","name":"Item 2"}',
        '{"id":"3","name":"Item 3"}',
      ].join('\n');

      mockFs.promises.readFile.mockResolvedValue(testContent);

      const provider = new JsonlVirtualDataProvider<{ id: string; name: string }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      await provider.buildIndex();
      const count = await provider.getTotalCount();

      expect(count).toBe(3);
    });

    it('should handle empty file', async () => {
      mockFs.promises.readFile.mockResolvedValue('');

      const provider = new JsonlVirtualDataProvider<{ id: string }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      await provider.buildIndex();
      const count = await provider.getTotalCount();

      expect(count).toBe(0);
    });

    it('should handle file without trailing newline', async () => {
      const testContent = '{"id":"1"}\n{"id":"2"}\n{"id":"3"}';

      mockFs.promises.readFile.mockResolvedValue(testContent);

      const provider = new JsonlVirtualDataProvider<{ id: string }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      await provider.buildIndex();
      const count = await provider.getTotalCount();

      expect(count).toBe(3);
    });
  });

  describe('getTotalCount', () => {
    it('should return total line count', async () => {
      const lines = Array.from({ length: 50 }, (_, i) =>
        JSON.stringify({ id: `item-${i}` })
      );
      mockFs.promises.readFile.mockResolvedValue(lines.join('\n'));

      const provider = new JsonlVirtualDataProvider<{ id: string }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      const count = await provider.getTotalCount();
      expect(count).toBe(50);
    });
  });

  describe('loadRange', () => {
    it('should load items for specified range', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        value: i * 10,
      }));
      const content = items.map(item => JSON.stringify(item)).join('\n');
      mockFs.promises.readFile.mockResolvedValue(content);

      const provider = new JsonlVirtualDataProvider<{ id: string; value: number }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      const loadedItems = await provider.loadRange(10, 20);

      expect(loadedItems).toHaveLength(10);
      expect(loadedItems[0].id).toBe('item-10');
      expect(loadedItems[9].id).toBe('item-19');
    });

    it('should handle range exceeding total items', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: `item-${i}` }));
      const content = items.map(item => JSON.stringify(item)).join('\n');
      mockFs.promises.readFile.mockResolvedValue(content);

      const provider = new JsonlVirtualDataProvider<{ id: string }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      const loadedItems = await provider.loadRange(5, 20);

      expect(loadedItems).toHaveLength(5);
    });

    it('should skip malformed JSON lines', async () => {
      const content = [
        '{"id":"1"}',
        'not valid json',
        '{"id":"3"}',
      ].join('\n');
      mockFs.promises.readFile.mockResolvedValue(content);

      const provider = new JsonlVirtualDataProvider<{ id: string }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      const loadedItems = await provider.loadRange(0, 3);

      expect(loadedItems).toHaveLength(2);
      expect(loadedItems[0].id).toBe('1');
      expect(loadedItems[1].id).toBe('3');
    });
  });

  describe('getItemId', () => {
    it('should return item ID using extractor function', () => {
      const provider = new JsonlVirtualDataProvider<{ id: string; name: string }>(
        testFilePath,
        (item) => `${item.id}-${item.name}`,
        mockFs as any
      );

      const id = provider.getItemId({ id: 'test', name: 'item' });
      expect(id).toBe('test-item');
    });
  });

  describe('clearCache', () => {
    it('should clear cached content', async () => {
      const content = '{"id":"1"}\n{"id":"2"}';
      mockFs.promises.readFile.mockResolvedValue(content);

      const provider = new JsonlVirtualDataProvider<{ id: string }>(
        testFilePath,
        (item) => item.id,
        mockFs as any
      );

      await provider.buildIndex();
      expect(await provider.getTotalCount()).toBe(2);

      provider.clearCache();

      // After clearing, buildIndex should need to be called again
      mockFs.promises.readFile.mockResolvedValue('{"id":"1"}');
      const count = await provider.getTotalCount();
      expect(count).toBe(1);
    });
  });
});

describe('createPaginationControls', () => {
  it('should create pagination header item', () => {
    const pageInfo = { currentPage: 0, totalPages: 10, pageSize: 50 };
    const slice: DataSlice<unknown> = {
      items: [],
      startIndex: 0,
      endIndex: 50,
      totalCount: 500,
      hasMore: true,
      hasPrevious: false,
    };

    const items = createPaginationControls(pageInfo, slice);

    expect(items[0].label).toBe('Page 1 of 10');
    expect(items[0].description).toBe('Showing 1-50 of 500');
  });

  it('should include previous button when hasPrevious', () => {
    const pageInfo = { currentPage: 5, totalPages: 10, pageSize: 50 };
    const slice: DataSlice<unknown> = {
      items: [],
      startIndex: 250,
      endIndex: 300,
      totalCount: 500,
      hasMore: true,
      hasPrevious: true,
    };

    const items = createPaginationControls(pageInfo, slice);
    const prevItem = items.find(i => i.label === '◀ Previous Page');

    expect(prevItem).toBeDefined();
    expect(prevItem?.command?.command).toBe('goalie.virtualScroll.previousPage');
  });

  it('should not include previous button on first page', () => {
    const pageInfo = { currentPage: 0, totalPages: 10, pageSize: 50 };
    const slice: DataSlice<unknown> = {
      items: [],
      startIndex: 0,
      endIndex: 50,
      totalCount: 500,
      hasMore: true,
      hasPrevious: false,
    };

    const items = createPaginationControls(pageInfo, slice);
    const prevItem = items.find(i => i.label === '◀ Previous Page');

    expect(prevItem).toBeUndefined();
  });

  it('should include next button when hasMore', () => {
    const pageInfo = { currentPage: 5, totalPages: 10, pageSize: 50 };
    const slice: DataSlice<unknown> = {
      items: [],
      startIndex: 250,
      endIndex: 300,
      totalCount: 500,
      hasMore: true,
      hasPrevious: true,
    };

    const items = createPaginationControls(pageInfo, slice);
    const nextItem = items.find(i => i.label === 'Next Page ▶');

    expect(nextItem).toBeDefined();
    expect(nextItem?.command?.command).toBe('goalie.virtualScroll.nextPage');
  });

  it('should not include next button on last page', () => {
    const pageInfo = { currentPage: 9, totalPages: 10, pageSize: 50 };
    const slice: DataSlice<unknown> = {
      items: [],
      startIndex: 450,
      endIndex: 500,
      totalCount: 500,
      hasMore: false,
      hasPrevious: true,
    };

    const items = createPaginationControls(pageInfo, slice);
    const nextItem = items.find(i => i.label === 'Next Page ▶');

    expect(nextItem).toBeUndefined();
  });
});

describe('Performance', () => {
  describe('with large datasets', () => {
    it('should handle 10000 items efficiently', async () => {
      const largeDataProvider = new MockDataProvider(10000);
      const virtualProvider = new VirtualScrollProvider(largeDataProvider, {
        pageSize: 100,
        maxCacheSize: 500,
      });

      const startTime = performance.now();
      await virtualProvider.initialize();
      const initTime = performance.now() - startTime;

      expect(initTime).toBeLessThan(1000); // Should initialize in under 1 second

      const pageInfo = virtualProvider.getPageInfo();
      expect(pageInfo.totalPages).toBe(100);

      virtualProvider.dispose();
    });

    it('should navigate pages quickly', async () => {
      const largeDataProvider = new MockDataProvider(1000);
      const virtualProvider = new VirtualScrollProvider(largeDataProvider, {
        pageSize: 50,
      });

      await virtualProvider.initialize();

      const startTime = performance.now();
      for (let i = 0; i < 10; i++) {
        await virtualProvider.nextPage();
      }
      const navTime = performance.now() - startTime;

      expect(navTime).toBeLessThan(500); // 10 page navigations in under 500ms

      virtualProvider.dispose();
    });
  });
});
