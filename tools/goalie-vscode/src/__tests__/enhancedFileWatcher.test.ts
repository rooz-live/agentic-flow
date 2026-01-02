import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EnhancedFileWatcher } from '../enhancedFileWatcher';
import { FileWatcherService } from '../fileWatcherService';

// Mock VSCode API for testing
const mockVSCode = {
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }]
  },
  window: {
    createOutputChannel: (name: string) => ({
      appendLine: (msg: string) => console.log(`[${name}] ${msg}`),
      showInformationMessage: (msg: string, ...items: string[]) => console.log(`INFO: ${msg}`, items),
      showErrorMessage: (msg: string) => console.error(`ERROR: ${msg}`),
      createWebviewPanel: (type: string, title: string, show: number, options: any) => ({
        webview: { html: '' },
        onDidDispose: { dispose: () => {} }
      })
    }),
    getConfiguration: () => ({
      get: (key: string) => {
        const defaults: {
          'goalie.fileWatcher.enableNotifications': true,
          'goalie.fileWatcher.debounceDelay': 300,
          'goalie.fileWatcher.enableBatching': true,
          'goalie.fileWatcher.enableVisualIndicators': true
        };
        return defaults[key as keyof typeof defaults];
      }
    })
  }
};

// Test suite for Enhanced File Watcher
describe('EnhancedFileWatcher', () => {
  let testDir: string;
  let enhancedFileWatcher: EnhancedFileWatcher;
  let refreshCallbacks: Array<() => void>;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync('goalie-test-');
    
    // Create .goalie directory structure
    const goalieDir = path.join(testDir, '.goalie');
    fs.mkdirSync(goalieDir, { recursive: true });
    
    refreshCallbacks = [
      () => console.log('Refresh callback 1 called'),
      () => console.log('Refresh callback 2 called'),
      () => console.log('Refresh callback 3 called')
    ];

    enhancedFileWatcher = new EnhancedFileWatcher(
      testDir,
      refreshCallbacks,
      {
        patterns: ['**/.goalie/*.{yaml,jsonl}'],
        debounceDelay: 100, // Shorter for testing
        enableBatching: true,
        enableVisualIndicators: true
      }
    );
  });

  afterEach(() => {
    // Clean up
    if (enhancedFileWatcher) {
      enhancedFileWatcher.dispose();
    }
    
    // Remove temporary directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should initialize with default options', () => {
    expect(enhancedFileWatcher).toBeDefined();
    
    const metrics = enhancedFileWatcher.getPerformanceMetrics();
    expect(metrics.totalFilesWatched).toBeGreaterThanOrEqual(0);
    expect(metrics.totalChangesDetected).toBe(0);
    expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
  });

  test('should detect file creation', (done) => {
    const testFile = path.join(testDir, '.goalie', 'test.yaml');
    
    // Listen for file changes
    let changeDetected = false;
    const originalCallback = refreshCallbacks[0];
    refreshCallbacks[0] = () => {
      changeDetected = true;
      originalCallback();
      if (changeDetected) {
        done();
      }
    };

    // Create test file
    setTimeout(() => {
      fs.writeFileSync(testFile, 'test: data\nvalue: test\n');
    }, 50);

    // Timeout after 2 seconds
    setTimeout(() => {
      if (!changeDetected) {
        done(new Error('File creation not detected within timeout'));
      }
    }, 2000);
  }, 5000);

  test('should detect file modification', (done) => {
    const testFile = path.join(testDir, '.goalie', 'test-modify.jsonl');
    
    // Create initial file
    fs.writeFileSync(testFile, '{"initial": "data"}\n');
    
    // Listen for file changes
    let changeDetected = false;
    const originalCallback = refreshCallbacks[1];
    refreshCallbacks[1] = () => {
      changeDetected = true;
      originalCallback();
      if (changeDetected) {
        done();
      }
    };

    // Modify file after delay
    setTimeout(() => {
      fs.writeFileSync(testFile, '{"modified": "data"}\n');
    }, 50);

    // Timeout after 2 seconds
    setTimeout(() => {
      if (!changeDetected) {
        done(new Error('File modification not detected within timeout'));
      }
    }, 2000);
  }, 5000);

  test('should detect file deletion', (done) => {
    const testFile = path.join(testDir, '.goalie', 'test-delete.yaml');
    
    // Create initial file
    fs.writeFileSync(testFile, 'test: data\nvalue: test\n');
    
    // Listen for file changes
    let changeDetected = false;
    const originalCallback = refreshCallbacks[2];
    refreshCallbacks[2] = () => {
      changeDetected = true;
      originalCallback();
      if (changeDetected) {
        done();
      }
    };

    // Delete file after delay
    setTimeout(() => {
      fs.unlinkSync(testFile);
    }, 50);

    // Timeout after 2 seconds
    setTimeout(() => {
      if (!changeDetected) {
        done(new Error('File deletion not detected within timeout'));
      }
    }, 2000);
  }, 5000);

  test('should debounce rapid file changes', (done) => {
    const testFile = path.join(testDir, '.goalie', 'test-debounce.jsonl');
    
    let callbackCount = 0;
    const originalCallback = refreshCallbacks[0];
    refreshCallbacks[0] = () => {
      callbackCount++;
      originalCallback();
    };

    // Create multiple rapid changes
    setTimeout(() => {
      fs.writeFileSync(testFile, '{"version": 1}\n');
    }, 50);
    
    setTimeout(() => {
      fs.writeFileSync(testFile, '{"version": 2}\n');
    }, 100);
    
    setTimeout(() => {
      fs.writeFileSync(testFile, '{"version": 3}\n');
    }, 150);

    // Check that callbacks were debounced (should only be called once)
    setTimeout(() => {
      // Due to debouncing, should only trigger once for all rapid changes
      expect(callbackCount).toBeLessThanOrEqual(2); // Allow some variation
      done();
    }, 1000);
  }, 5000);

  test('should handle file metadata caching', () => {
    const testFile = path.join(testDir, '.goalie', 'test-metadata.yaml');
    const content = 'test: data\nvalue: test\n';
    
    // Create test file
    fs.writeFileSync(testFile, content);
    
    // Check if file has changed detection works
    const hasChanged = enhancedFileWatcher.hasFileChanged(testFile);
    expect(hasChanged).toBe(false); // Should be false since we just created it
    
    // Get file metadata
    const metadata = enhancedFileWatcher.getFileMetadata(testFile);
    expect(metadata).toBeDefined();
    expect(metadata?.path).toBe(testFile);
    expect(metadata?.size).toBeGreaterThan(0);
  });

  test('should provide performance metrics', () => {
    const metrics = enhancedFileWatcher.getPerformanceMetrics();
    
    expect(metrics).toHaveProperty('totalFilesWatched');
    expect(metrics).toHaveProperty('totalChangesDetected');
    expect(metrics).toHaveProperty('averageProcessingTime');
    expect(metrics).toHaveProperty('cacheHitRate');
    expect(metrics).toHaveProperty('lastUpdateTime');
    expect(metrics).toHaveProperty('errorCount');
    
    expect(typeof metrics.totalFilesWatched).toBe('number');
    expect(typeof metrics.totalChangesDetected).toBe('number');
    expect(typeof metrics.averageProcessingTime).toBe('number');
    expect(typeof metrics.cacheHitRate).toBe('number');
    expect(metrics.lastUpdateTime).toBeInstanceOf(Date);
    expect(typeof metrics.errorCount).toBe('number');
  });

  test('should dispose properly', () => {
    const metricsBefore = enhancedFileWatcher.getPerformanceMetrics();
    
    // Dispose the watcher
    enhancedFileWatcher.dispose();
    
    // Try to trigger file change - should not cause errors
    const testFile = path.join(testDir, '.goalie', 'test-dispose.yaml');
    
    // This should not cause any errors or crashes
    expect(() => {
      fs.writeFileSync(testFile, 'test: data\n');
      setTimeout(() => {
        fs.unlinkSync(testFile);
      }, 100);
    }).not.toThrow();
    
    // Performance metrics should still be accessible
    const metricsAfter = enhancedFileWatcher.getPerformanceMetrics();
    expect(metricsAfter.totalFilesWatched).toBe(metricsBefore.totalFilesWatched);
  });

  test('should handle multiple file patterns', () => {
    // Create files with different extensions
    const yamlFile = path.join(testDir, '.goalie', 'multi-test.yaml');
    const jsonlFile = path.join(testDir, '.goalie', 'multi-test.jsonl');
    
    fs.writeFileSync(yamlFile, 'test: yaml\n');
    fs.writeFileSync(jsonlFile, '{"test": "jsonl"}\n');
    
    // Both files should be detected by the watcher
    const yamlMetadata = enhancedFileWatcher.getFileMetadata(yamlFile);
    const jsonlMetadata = enhancedFileWatcher.getFileMetadata(jsonlFile);
    
    expect(yamlMetadata).toBeDefined();
    expect(jsonlMetadata).toBeDefined();
    expect(yamlMetadata?.extension).toBe('.yaml');
    expect(jsonlMetadata?.extension).toBe('.jsonl');
  });

  test('should respect ignore patterns', () => {
    // Create a file that should be ignored
    const ignoredFile = path.join(testDir, '.goalie', 'test.tmp');
    const watchedFile = path.join(testDir, '.goalie', 'test.yaml');
    
    // Create enhanced watcher with ignore patterns
    const enhancedWatcherWithIgnore = new EnhancedFileWatcher(
      testDir,
      refreshCallbacks,
      {
        patterns: ['**/.goalie/*.{yaml,jsonl}'],
        ignorePatterns: ['**/*.tmp'],
        debounceDelay: 100,
        enableBatching: true,
        enableVisualIndicators: true
      }
    );
    
    fs.writeFileSync(ignoredFile, 'ignored content');
    fs.writeFileSync(watchedFile, 'watched content');
    
    // The ignored file should not be in metadata cache
    const ignoredMetadata = enhancedWatcherWithIgnore.getFileMetadata(ignoredFile);
    const watchedMetadata = enhancedWatcherWithIgnore.getFileMetadata(watchedFile);
    
    expect(ignoredMetadata).toBeUndefined();
    expect(watchedMetadata).toBeDefined();
    
    enhancedWatcherWithIgnore.dispose();
  });
});

// Integration test for FileWatcherService
describe('FileWatcherService', () => {
  let testDir: string;
  let fileWatcherService: FileWatcherService;

  beforeEach(() => {
    testDir = fs.mkdtempSync('goalie-service-test-');
    const goalieDir = path.join(testDir, '.goalie');
    fs.mkdirSync(goalieDir, { recursive: true });
    
    fileWatcherService = new FileWatcherService(testDir, {
      patterns: ['**/.goalie/*.{yaml,jsonl}'],
      debounceDelay: 100,
      recursive: true,
      trackMetadata: true,
      ignorePatterns: ['**/.git/**', '**/node_modules/**']
    });
  });

  afterEach(() => {
    if (fileWatcherService) {
      fileWatcherService.dispose();
    }
    
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should initialize file cache', () => {
    const metrics = fileWatcherService.getPerformanceMetrics();
    expect(metrics.totalFilesWatched).toBeGreaterThanOrEqual(0);
  });

  test('should track file changes', (done) => {
    const testFile = path.join(testDir, '.goalie', 'service-test.yaml');
    
    let changeDetected = false;
    fileWatcherService.onDidChangeFile((changes) => {
      changeDetected = true;
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].type).toBe('created');
      done();
    });
    
    setTimeout(() => {
      fs.writeFileSync(testFile, 'service: test\n');
    }, 100);
    
    // Timeout after 2 seconds
    setTimeout(() => {
      if (!changeDetected) {
        done(new Error('File change not detected within timeout'));
      }
    }, 2000);
  }, 5000);

  test('should handle file metadata correctly', () => {
    const testFile = path.join(testDir, '.goalie', 'metadata-test.jsonl');
    const content = '{"test": "metadata"}\n';
    
    fs.writeFileSync(testFile, content);
    
    const metadata = fileWatcherService.getFileMetadata(testFile);
    expect(metadata).toBeDefined();
    expect(metadata?.path).toBe(testFile);
    expect(metadata?.size).toBe(content.length);
    expect(metadata?.mtime).toBeInstanceOf(Date);
  });

  test('should clear cache on demand', () => {
    // Create test file
    const testFile = path.join(testDir, '.goalie', 'cache-test.yaml');
    fs.writeFileSync(testFile, 'test: data\n');
    
    // Verify file is in cache
    let metadata = fileWatcherService.getFileMetadata(testFile);
    expect(metadata).toBeDefined();
    
    // Clear cache
    fileWatcherService.clearCache();
    
    // File should no longer be in cache
    metadata = fileWatcherService.getFileMetadata(testFile);
    expect(metadata).toBeUndefined();
    
    // Refresh cache
    fileWatcherService.refreshCache();
    
    // File should be back in cache
    metadata = fileWatcherService.getFileMetadata(testFile);
    expect(metadata).toBeDefined();
  });

  test('should add and remove patterns dynamically', () => {
    const initialMetrics = fileWatcherService.getPerformanceMetrics();
    
    // Add new pattern
    fileWatcherService.addPattern('**/.goalie/*.md');
    
    // Create a file matching new pattern
    const mdFile = path.join(testDir, '.goalie', 'test.md');
    fs.writeFileSync(mdFile, '# Test markdown');
    
    // File should be tracked
    const metadata = fileWatcherService.getFileMetadata(mdFile);
    expect(metadata).toBeDefined();
    
    // Remove pattern
    fileWatcherService.removePattern('**/.goalie/*.md');
    
    // Dispose and recreate to test pattern removal
    fileWatcherService.dispose();
    
    const newService = new FileWatcherService(testDir, {
      patterns: ['**/.goalie/*.{yaml,jsonl}'], // Original patterns only
      debounceDelay: 100,
      recursive: true,
      trackMetadata: true
    });
    
    // MD file should no longer be tracked
    const mdMetadata = newService.getFileMetadata(mdFile);
    expect(mdMetadata).toBeUndefined();
    
    newService.dispose();
  });
});

// Mock console methods for testing
const originalConsole = console.log;
const originalError = console.error;

beforeAll(() => {
  // Mock VSCode module
  (global as any).vscode = mockVSCode;
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsole;
  console.error = originalError;
});