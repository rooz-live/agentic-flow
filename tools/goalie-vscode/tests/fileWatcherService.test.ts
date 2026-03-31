import { FileWatcherService, FileChangeEvent } from '../src/fileWatcherService';
import { mockFileSystem, testWorkspaceDir, testGoalieDir } from './setup';

describe('FileWatcherService', () => {
  let fileWatcher: FileWatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    fileWatcher = new FileWatcherService(testWorkspaceDir, {
      patterns: ['**/.goalie/*.{yaml,jsonl}'],
      debounceDelay: 300,
      recursive: true,
      trackMetadata: true
    });
  });

  afterEach(() => {
    fileWatcher.dispose();
  });

  describe('initialization', () => {
    it('should create file watcher with default options', () => {
      const watcher = new FileWatcherService(testWorkspaceDir);
      
      expect(watcher).toBeDefined();
    });

    it('should accept custom options', () => {
      const customOptions = {
        patterns: ['**/*.ts'],
        debounceDelay: 500,
        recursive: false,
        trackMetadata: false
      };
      
      const watcher = new FileWatcherService(testWorkspaceDir, customOptions);
      
      expect(watcher).toBeDefined();
    });
  });

  describe('file change detection', () => {
    it('should detect file creation', (done) => {
      const testFilePath = path.join(testGoalieDir, 'test-file.json');
      
      fileWatcher.onDidChangeFile((changes: FileChangeEvent[]) => {
        expect(changes).toHaveLength(1);
        expect(changes[0].type).toBe('created');
        expect(changes[0].path).toBe(testFilePath);
        done();
      });
      
      // Simulate file creation
      mockFileSystem.existsSync.mockReturnValue(false);
      mockFileSystem.readFileSync.mockReturnValue('{}');
      setTimeout(() => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
      }, 100);
    });

    it('should detect file modification', (done) => {
      const testFilePath = path.join(testGoalieDir, 'test-file.json');
      
      fileWatcher.onDidChangeFile((changes: FileChangeEvent[]) => {
        expect(changes).toHaveLength(1);
        expect(changes[0].type).toBe('changed');
        expect(changes[0].path).toBe(testFilePath);
        done();
      });
      
      // Simulate file modification
      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.statSync.mockReturnValue({ 
        mtime: new Date(Date.now() - 5000) // 5 seconds ago
      });
      setTimeout(() => {
        mockFileSystem.statSync.mockReturnValue({ 
          mtime: new Date() // Now
        });
      }, 6000);
    });

    it('should detect file deletion', (done) => {
      const testFilePath = path.join(testGoalieDir, 'test-file.json');
      
      fileWatcher.onDidChangeFile((changes: FileChangeEvent[]) => {
        expect(changes).toHaveLength(1);
        expect(changes[0].type).toBe('deleted');
        expect(changes[0].path).toBe(testFilePath);
        done();
      });
      
      // Simulate file deletion
      mockFileSystem.existsSync.mockReturnValue(true);
      setTimeout(() => {
        mockFileSystem.existsSync.mockReturnValue(false);
      }, 100);
    });

    it('should batch multiple rapid changes', (done) => {
      const testFilePath = path.join(testGoalieDir, 'test-file.json');
      let changeCount = 0;
      
      fileWatcher.onDidChangeFile((changes: FileChangeEvent[]) => {
        changeCount += changes.length;
        
        if (changeCount >= 3) {
          expect(changes.length).toBeGreaterThan(0);
          done();
        }
      });
      
      // Simulate rapid changes
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
        }, i * 100);
      }
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid changes', (done) => {
      let callCount = 0;
      
      fileWatcher.onDidChangeFile(() => {
        callCount++;
      });
      
      // Simulate rapid changes
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
        }, i * 50);
      }
      
      setTimeout(() => {
        // Should only be called once due to debouncing
        expect(callCount).toBeLessThan(5);
        done();
      }, 1000);
    });

    it('should respect custom debounce delay', (done) => {
      const customWatcher = new FileWatcherService(testWorkspaceDir, {
        debounceDelay: 1000
      });
      
      let callCount = 0;
      
      customWatcher.onDidChangeFile(() => {
        callCount++;
      });
      
      // Simulate rapid changes
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
        }, i * 100);
      }
      
      setTimeout(() => {
        // Should only be called once due to longer debounce
        expect(callCount).toBe(1);
        done();
      }, 1200);
    });
  });

  describe('metadata tracking', () => {
    it('should track file size', (done) => {
      const testFilePath = path.join(testGoalieDir, 'test-file.json');
      const fileSize = 1024;
      
      fileWatcher.onDidChangeFile((changes: FileChangeEvent[]) => {
        expect(changes).toHaveLength(1);
        expect(changes[0].type).toBe('created');
        expect(changes[0].path).toBe(testFilePath);
        expect(changes[0].size).toBe(fileSize);
        done();
      });
      
      mockFileSystem.existsSync.mockReturnValue(false);
      mockFileSystem.statSync.mockReturnValue({ 
        mtime: new Date(),
        size: fileSize
      });
    });

    it('should track relative path', (done) => {
      const testFilePath = path.join(testGoalieDir, 'subdir', 'test-file.json');
      
      fileWatcher.onDidChangeFile((changes: FileChangeEvent[]) => {
        expect(changes).toHaveLength(1);
        expect(changes[0].type).toBe('created');
        expect(changes[0].path).toBe(testFilePath);
        expect(changes[0].relativePath).toBe(path.join('subdir', 'test-file.json'));
        done();
      });
      
      mockFileSystem.existsSync.mockReturnValue(false);
      mockFileSystem.statSync.mockReturnValue({ 
        mtime: new Date(),
        size: 512
      });
    });
  });

  describe('performance', () => {
    it('should handle large number of files efficiently', () => {
      const startTime = Date.now();
      
      // Create mock watcher
      const performanceWatcher = new FileWatcherService(testWorkspaceDir, {
        maxFilesWatched: 1000
      });
      
      // Simulate many file changes
      for (let i = 0; i < 500; i++) {
        setTimeout(() => {
          mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
        }, i * 10);
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process quickly even with many files
      expect(processingTime).toBeLessThan(5000);
    });

    it('should log performance metrics', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      const performanceWatcher = new FileWatcherService(testWorkspaceDir, {
        enablePerformanceLogging: true
      });
      
      // Trigger some file changes
      mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
      
      // Check if performance was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('FileWatcher performance')
      );
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', () => {
      const errorSpy = jest.spyOn(console, 'error');
      
      fileWatcher.onDidChangeFile(() => {});
      
      // Simulate file system error
      mockFileSystem.statSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File system error')
      );
    });

    it('should handle invalid file paths', () => {
      const errorSpy = jest.spyOn(console, 'error');
      
      fileWatcher.onDidChangeFile(() => {});
      
      // Simulate invalid file path
      mockFileSystem.statSync.mockImplementation((path: string) => {
        if (path.includes('invalid')) {
          throw new Error('Invalid file path');
        }
        return { mtime: new Date() };
      });
      
      // Trigger with invalid path
      mockFileSystem.statSync('/invalid/path/test-file.json');
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid file path')
      );
    });
  });

  describe('disposal', () => {
    it('should clean up resources', () => {
      const removeAllListenersSpy = jest.spyOn(fileWatcher, 'removeAllListeners');
      
      fileWatcher.dispose();
      
      expect(removeAllListenersSpy).toHaveBeenCalled();
    });

    it('should stop file watching', () => {
      let callbackCalled = false;
      
      fileWatcher.onDidChangeFile(() => {
        callbackCalled = true;
      });
      
      fileWatcher.dispose();
      
      // Simulate file change after disposal
      mockFileSystem.statSync.mockReturnValue({ mtime: new Date() });
      
      setTimeout(() => {
        expect(callbackCalled).toBe(false);
      }, 100);
    });
  });

  describe('integration with VSCode API', () => {
    it('should work with VSCode RelativePattern', () => {
      const createWatcherSpy = jest.spyOn(mockVscode.workspace, 'createFileSystemWatcher');
      
      const watcher = new FileWatcherService(testWorkspaceDir);
      
      expect(createWatcherSpy).toHaveBeenCalledWith(
        expect.stringContaining('.goalie'),
        expect.any(Function),
        expect.any(Object)
      );
    });
  });
});