import * as vscode from 'vscode';
import * as path from 'path';
import { mockVscode, testWorkspaceDir, testGoalieDir, mockFileSystem } from './setup';

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Large Dataset Handling', () => {
    it('should handle 1000+ pattern metrics efficiently', async () => {
      // Create mock large dataset
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        timestamp: `2025-12-10T${String(i).padStart(2, '0')}:00:00Z`,
        pattern: `test_pattern_${i}`,
        circle: ['ui', 'core'][i % 2],
        depth: Math.floor(Math.random() * 5) + 1,
        run_kind: ['feature', 'bugfix'][i % 2],
        gate: ['implement', 'fix'][i % 2],
        tags: [`tag_${i}`, 'performance'],
        economic: {
          wsjf_score: Math.random() * 25,
          cost_of_delay: Math.random() * 5,
          job_duration: Math.floor(Math.random() * 10) + 1,
          user_business_value: Math.floor(Math.random() * 30) + 1
        },
        action_completed: Math.random() > 0.5
      }));
      
      mockFileSystem.readFileSync.mockReturnValue(largeDataset.map(p => JSON.stringify(p)).join('\n'));
      
      const startTime = Date.now();
      
      // Create provider and load data
      const provider = new (await import('../src/extension')).PatternMetricsProvider(testWorkspaceDir);
      const items = await provider.getChildren();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process 1000 items efficiently
      expect(processingTime).toBeLessThan(2000); // Less than 2 seconds
      expect(items).toHaveLength(50); // Should be paginated
    });

    it('should implement virtual scrolling', async () => {
      // Create provider with small page size
      const provider = new (await import('../src/extension')).PatternMetricsProvider(testWorkspaceDir, {
        pageSize: 50
      });
      
      const startTime = Date.now();
      const items = await provider.getChildren();
      const endTime = Date.now();
      
      // Should load quickly with virtual scrolling
      expect(endTime - startTime).toBeLessThan(500);
      expect(items).toHaveLength(50);
    });

    it('should handle memory usage efficiently', async () => {
      // Mock memory usage monitoring
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create provider and load data
      const provider = new (await import('../src/extension')).PatternMetricsProvider(testWorkspaceDir);
      
      // Load large dataset
      for (let i = 0; i < 100; i++) {
        await provider.getChildren();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('File Watching Performance', () => {
    it('should handle rapid file changes without performance degradation', async () => {
      const fileChangeEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
      
      const fileWatcher = new (await import('../src/fileWatcherService')).FileWatcherService(testWorkspaceDir, {
        patterns: ['**/.goalie/*.{yaml,jsonl}'],
        debounceDelay: 100, // Short debounce for testing
        enableBatching: true,
        enablePerformanceLogging: true
      });
      
      fileWatcher.onDidChangeFile(fileChangeEmitter.event);
      
      let changeCount = 0;
      const startTime = Date.now();
      
      // Simulate rapid file changes
      const changeInterval = setInterval(() => {
        mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
        changeCount++;
        
        // Check performance every 100 changes
        if (changeCount % 100 === 0) {
          const endTime = Date.now();
          const processingTime = endTime - startTime;
          
          // Should process 100 changes quickly
          expect(processingTime).toBeLessThan(1000); // Less than 1 second
          
          startTime = Date.now();
        }
      }, 10);
      
      // Stop after 1000 changes
      setTimeout(() => {
        clearInterval(changeInterval);
        
        const totalChanges = changeCount;
        const totalTime = Date.now() - startTime;
        
        // Average time per change should be reasonable
        expect(totalTime / totalChanges).toBeLessThan(5); // Less than 5ms per change
      }, 12000);
    });

    it('should batch file changes efficiently', async () => {
      const batchedChanges: vscode.FileChangeEvent[] = [];
      
      const fileWatcher = new (await import('../src/fileWatcherService')).FileWatcherService(testWorkspaceDir, {
        patterns: ['**/.goalie/*.{yaml,jsonl}'],
        debounceDelay: 1000, // Long debounce for batching
        enableBatching: true,
        batchSize: 50
      });
      
      fileWatcher.onDidChangeFile((changes: vscode.FileChangeEvent[]) => {
        batchedChanges.push(...changes);
      });
      
      // Simulate many rapid changes
      const changeInterval = setInterval(() => {
        for (let i = 0; i < 10; i++) {
          mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
        }
      }, 50);
      
      setTimeout(() => {
        clearInterval(changeInterval);
        
        // Should have batched all changes
        expect(batchedChanges.length).toBeGreaterThan(90); // Most changes should be batched
      }, 6000);
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on disposal', async () => {
      let disposedProviders = 0;
      
      // Create multiple providers
      for (let i = 0; i < 10; i++) {
        const provider = new (await import('../src/extension')).PatternMetricsProvider(testWorkspaceDir);
        
        // Track disposal
        const originalDispose = provider.dispose;
        provider.dispose = jest.fn(() => {
          disposedProviders++;
        });
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Check memory before and after cleanup
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Dispose all providers
      for (let i = 0; i < 10; i++) {
        provider.dispose();
      }
      
      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryFreed = initialMemory - finalMemory;
      
      // Should free significant memory
      expect(memoryFreed).toBeGreaterThan(0);
      expect(disposedProviders).toBe(10);
    });
  });

  describe('UI Rendering Performance', () => {
    it('should render large tree views efficiently', async () => {
      const provider = new (await import('../src/extension')).PatternMetricsProvider(testWorkspaceDir);

      // Mock large dataset
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        timestamp: `2025-12-10T${String(i).padStart(2, '0')}:00:00Z`,
        pattern: `test_pattern_${i}`,
        circle: ['ui', 'core'][i % 2],
        depth: Math.floor(Math.random() * 5) + 1,
        run_kind: ['feature', 'bugfix'][i % 2],
        gate: ['implement', 'fix'][i % 2],
        tags: [`tag_${i}`, 'performance'],
        economic: {
          wsjf_score: Math.random() * 25,
          cost_of_delay: Math.random() * 5,
          job_duration: Math.floor(Math.random() * 10) + 1,
          user_business_value: Math.floor(Math.random() * 30) + 1
        }
      }));
      
      mockFileSystem.readFileSync.mockReturnValue(largeDataset.map(p => JSON.stringify(p)).join('\n'));
      
      const startTime = Date.now();
      
      // Get children (renders tree)
      const items = await provider.getChildren();
      
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly even with large dataset
      expect(renderTime).toBeLessThan(1000); // Less than 1 second
      expect(items).toHaveLength(50); // Should be paginated
    });

    it('should handle complex tooltips efficiently', async () => {
      const provider = new (await import('../src/extension')).PatternMetricsProvider(testWorkspaceDir);

      // Mock data with complex tooltips
      const complexDataset = Array(100).fill(null).map((_, i) => ({
        timestamp: `2025-12-10T${String(i).padStart(2, '0')}:00:00Z`,
        pattern: `complex_pattern_${i}`,
        circle: ['ui', 'core', 'testing'][i % 3],
        depth: Math.floor(Math.random() * 5) + 1,
        run_kind: ['feature', 'bugfix', 'refactor'][i % 3],
        gate: ['implement', 'fix', 'refactor'][i % 3],
        tags: [`tag_${i}`, 'complex', 'tooltip-heavy'],
        economic: {
          wsjf_score: Math.random() * 30,
          cost_of_delay: Math.random() * 10,
          job_duration: Math.floor(Math.random() * 15) + 1,
          user_business_value: Math.floor(Math.random() * 40) + 1,
          complex_data: {
            nested_object: {
              deep_property: `value_${i}`,
              array_data: Array(20).fill(null).map((_, j) => `item_${j}`)
            }
          }
        }
      }));
      
      mockFileSystem.readFileSync.mockReturnValue(complexDataset.map(p => JSON.stringify(p)).join('\n'));
      
      const startTime = Date.now();
      
      // Get tree item (calculates tooltip)
      const items = await provider.getChildren();
      const complexItem = items.find(item => item.label.includes('complex_pattern_'));
      
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      // Should handle complex tooltips efficiently
      expect(renderTime).toBeLessThan(100); // Less than 100ms per item
      expect(complexItem).toBeDefined();
    });
  });
});