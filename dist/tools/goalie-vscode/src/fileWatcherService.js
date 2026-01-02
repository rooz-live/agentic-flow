import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
/**
 * Centralized file watcher service with enhanced capabilities
 */
export class FileWatcherService {
    workspaceRoot;
    options;
    watchers = [];
    fileMetadataCache = new Map();
    performanceMetrics = {
        totalFilesWatched: 0,
        totalChangesDetected: 0,
        averageProcessingTime: 0,
        cacheHitRate: 0,
        lastUpdateTime: new Date(),
        errorCount: 0
    };
    processingTimes = [];
    cacheHits = 0;
    cacheMisses = 0;
    debounceTimers = new Map();
    isDisposed = false;
    _onDidChangeFile = new vscode.EventEmitter();
    onDidChangeFile = this._onDidChangeFile.event;
    _onDidDetectNewFiles = new vscode.EventEmitter();
    onDidDetectNewFiles = this._onDidDetectNewFiles.event;
    constructor(workspaceRoot, options) {
        this.workspaceRoot = workspaceRoot;
        this.options = options;
        this.initializeWatchers();
        this.initializeFileCache();
    }
    /**
     * Initialize file system watchers for all patterns
     */
    initializeWatchers() {
        for (const pattern of this.options.patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.workspaceRoot || '', pattern), this.options.recursive !== false);
            watcher.onDidCreate((uri) => this.handleFileCreate(uri));
            watcher.onDidChange((uri) => this.handleFileChange(uri));
            watcher.onDidDelete((uri) => this.handleFileDelete(uri));
            this.watchers.push(watcher);
        }
    }
    /**
     * Initialize file metadata cache
     */
    initializeFileCache() {
        if (!this.workspaceRoot || !this.options.trackMetadata) {
            return;
        }
        try {
            const startTime = Date.now();
            let filesProcessed = 0;
            for (const pattern of this.options.patterns) {
                const glob = require('glob');
                const files = glob.sync(pattern, {
                    cwd: this.workspaceRoot,
                    ignore: this.options.ignorePatterns || []
                });
                for (const filePath of files) {
                    const fullPath = path.join(this.workspaceRoot, filePath);
                    this.updateFileMetadataCache(fullPath);
                    filesProcessed++;
                }
            }
            const processingTime = Date.now() - startTime;
            this.updatePerformanceMetrics(processingTime, filesProcessed);
            console.log(`[FileWatcherService] Initialized cache with ${filesProcessed} files in ${processingTime}ms`);
        }
        catch (error) {
            console.error('[FileWatcherService] Failed to initialize file cache:', error);
            this.performanceMetrics.errorCount++;
        }
    }
    /**
     * Handle file creation events
     */
    handleFileCreate(uri) {
        if (this.isDisposed)
            return;
        const filePath = uri.fsPath;
        if (this.shouldIgnoreFile(filePath))
            return;
        this.debounceFileChange(filePath, 'created', () => {
            const event = this.createFileChangeEvent(filePath, 'created');
            if (event) {
                this._onDidChangeFile.fire([event]);
                this._onDidDetectNewFiles.fire([event]);
            }
        });
    }
    /**
     * Handle file change events
     */
    handleFileChange(uri) {
        if (this.isDisposed)
            return;
        const filePath = uri.fsPath;
        if (this.shouldIgnoreFile(filePath))
            return;
        this.debounceFileChange(filePath, 'changed', () => {
            const event = this.createFileChangeEvent(filePath, 'changed');
            if (event) {
                this._onDidChangeFile.fire([event]);
            }
        });
    }
    /**
     * Handle file deletion events
     */
    handleFileDelete(uri) {
        if (this.isDisposed)
            return;
        const filePath = uri.fsPath;
        if (this.shouldIgnoreFile(filePath))
            return;
        // Remove from cache
        this.fileMetadataCache.delete(filePath);
        const event = {
            path: filePath,
            relativePath: this.getRelativePath(filePath),
            type: 'deleted',
            size: 0,
            mtime: new Date(),
            extension: path.extname(filePath)
        };
        this._onDidChangeFile.fire([event]);
    }
    /**
     * Debounce file changes to prevent excessive processing
     */
    debounceFileChange(filePath, changeType, callback) {
        const key = `${filePath}:${changeType}`;
        // Clear existing timer for this file
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // Set new timer
        const timer = setTimeout(() => {
            callback();
            this.debounceTimers.delete(key);
        }, this.options.debounceDelay || 300);
        this.debounceTimers.set(key, timer);
    }
    /**
     * Create a file change event
     */
    createFileChangeEvent(filePath, type) {
        try {
            const stats = fs.statSync(filePath);
            const event = {
                path: filePath,
                relativePath: this.getRelativePath(filePath),
                type,
                size: stats.size,
                mtime: stats.mtime,
                extension: path.extname(filePath)
            };
            // Update metadata cache if tracking is enabled
            if (this.options.trackMetadata) {
                this.updateFileMetadataCache(filePath);
            }
            return event;
        }
        catch (error) {
            console.error(`[FileWatcherService] Failed to create event for ${filePath}:`, error);
            this.performanceMetrics.errorCount++;
            return null;
        }
    }
    /**
     * Update file metadata cache
     */
    updateFileMetadataCache(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const metadata = {
                path: filePath,
                size: stats.size,
                mtime: stats.mtime,
                atime: stats.atime,
                ctime: stats.ctime
            };
            this.fileMetadataCache.set(filePath, metadata);
        }
        catch (error) {
            console.error(`[FileWatcherService] Failed to update metadata for ${filePath}:`, error);
        }
    }
    /**
     * Check if a file should be ignored
     */
    shouldIgnoreFile(filePath) {
        if (!this.options.ignorePatterns) {
            return false;
        }
        const relativePath = this.getRelativePath(filePath);
        return this.options.ignorePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(relativePath) || regex.test(filePath);
        });
    }
    /**
     * Get relative path from workspace root
     */
    getRelativePath(filePath) {
        if (!this.workspaceRoot) {
            return filePath;
        }
        return path.relative(this.workspaceRoot, filePath);
    }
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(processingTime, filesProcessed) {
        this.processingTimes.push(processingTime);
        // Keep only last 100 processing times for average calculation
        if (this.processingTimes.length > 100) {
            this.processingTimes.shift();
        }
        this.performanceMetrics.averageProcessingTime =
            this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
        this.performanceMetrics.totalFilesWatched = this.fileMetadataCache.size;
        this.performanceMetrics.lastUpdateTime = new Date();
        if (filesProcessed > 0) {
            this.performanceMetrics.totalChangesDetected += filesProcessed;
        }
        // Update cache hit rate
        const totalCacheOperations = this.cacheHits + this.cacheMisses;
        this.performanceMetrics.cacheHitRate = totalCacheOperations > 0
            ? (this.cacheHits / totalCacheOperations) * 100
            : 0;
    }
    /**
     * Check if a file has changed since last check
     */
    hasFileChanged(filePath) {
        if (!this.options.trackMetadata) {
            return true; // If not tracking metadata, assume changed
        }
        const cachedMetadata = this.fileMetadataCache.get(filePath);
        if (!cachedMetadata) {
            this.cacheMisses++;
            return true; // File not in cache, assume new/changed
        }
        try {
            const currentStats = fs.statSync(filePath);
            const hasChanged = currentStats.mtime.getTime() !== cachedMetadata.mtime.getTime() ||
                currentStats.size !== cachedMetadata.size;
            if (hasChanged) {
                this.cacheMisses++;
                this.updateFileMetadataCache(filePath);
            }
            else {
                this.cacheHits++;
            }
            return hasChanged;
        }
        catch (error) {
            console.error(`[FileWatcherService] Failed to check file change for ${filePath}:`, error);
            this.performanceMetrics.errorCount++;
            return true;
        }
    }
    /**
     * Get file metadata from cache
     */
    getFileMetadata(filePath) {
        if (!this.options.trackMetadata) {
            return undefined;
        }
        const metadata = this.fileMetadataCache.get(filePath);
        if (metadata) {
            this.cacheHits++;
        }
        else {
            this.cacheMisses++;
        }
        return metadata;
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    /**
     * Get all cached file metadata
     */
    getAllFileMetadata() {
        return Array.from(this.fileMetadataCache.values());
    }
    /**
     * Clear file metadata cache
     */
    clearCache() {
        this.fileMetadataCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        console.log('[FileWatcherService] Cache cleared');
    }
    /**
     * Refresh file cache
     */
    refreshCache() {
        this.clearCache();
        this.initializeFileCache();
    }
    /**
     * Add new file pattern to watch
     */
    addPattern(pattern) {
        if (this.options.patterns.includes(pattern)) {
            return; // Pattern already being watched
        }
        this.options.patterns.push(pattern);
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.workspaceRoot || '', pattern), this.options.recursive !== false);
        watcher.onDidCreate((uri) => this.handleFileCreate(uri));
        watcher.onDidChange((uri) => this.handleFileChange(uri));
        watcher.onDidDelete((uri) => this.handleFileDelete(uri));
        this.watchers.push(watcher);
        // Initialize cache for new pattern
        if (this.options.trackMetadata) {
            this.initializePatternCache(pattern);
        }
    }
    /**
     * Initialize cache for a specific pattern
     */
    initializePatternCache(pattern) {
        if (!this.workspaceRoot || !this.options.trackMetadata) {
            return;
        }
        try {
            const glob = require('glob');
            const files = glob.sync(pattern, {
                cwd: this.workspaceRoot,
                ignore: this.options.ignorePatterns || []
            });
            for (const filePath of files) {
                const fullPath = path.join(this.workspaceRoot, filePath);
                this.updateFileMetadataCache(fullPath);
            }
        }
        catch (error) {
            console.error(`[FileWatcherService] Failed to initialize cache for pattern ${pattern}:`, error);
        }
    }
    /**
     * Remove file pattern from watching
     */
    removePattern(pattern) {
        const index = this.options.patterns.indexOf(pattern);
        if (index === -1) {
            return; // Pattern not found
        }
        this.options.patterns.splice(index, 1);
        // Note: VSCode doesn't provide a way to dispose specific watchers,
        // so we'll need to recreate all watchers
        this.recreateWatchers();
    }
    /**
     * Recreate all file system watchers
     */
    recreateWatchers() {
        // Dispose existing watchers
        this.watchers.forEach(watcher => watcher.dispose());
        this.watchers = [];
        // Recreate watchers with updated patterns
        this.initializeWatchers();
    }
    /**
     * Dispose of the file watcher service
     */
    dispose() {
        this.isDisposed = true;
        // Clear all debounce timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        // Dispose file system watchers
        this.watchers.forEach(watcher => watcher.dispose());
        this.watchers = [];
        // Clear cache
        this.fileMetadataCache.clear();
        // Dispose event emitters
        this._onDidChangeFile.dispose();
        this._onDidDetectNewFiles.dispose();
        console.log('[FileWatcherService] Disposed');
    }
}
//# sourceMappingURL=fileWatcherService.js.map