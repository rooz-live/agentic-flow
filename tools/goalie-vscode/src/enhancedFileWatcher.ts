import * as vscode from 'vscode';
import { FileWatcherService, FileChangeEvent, FileWatcherOptions } from './fileWatcherService';

/**
 * Enhanced file watcher with debouncing and update queuing
 */
export class EnhancedFileWatcher {
  private fileWatcherService: FileWatcherService;
  private updateQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  private updateTimer: NodeJS.Timeout | undefined;
  private readonly defaultDebounceDelay = 300;
  private readonly batchUpdateDelay = 1000;

  constructor(
    private readonly workspaceRoot: string | undefined,
    private readonly refreshCallbacks: Array<() => void>,
    private readonly options: {
      patterns?: string[];
      debounceDelay?: number;
      enableBatching?: boolean;
      enableVisualIndicators?: boolean;
    } = {}
  ) {
    const watcherOptions: FileWatcherOptions = {
      patterns: options.patterns || ['**/.goalie/*.{yaml,jsonl}'],
      debounceDelay: options.debounceDelay || this.defaultDebounceDelay,
      recursive: true,
      trackMetadata: true,
      ignorePatterns: ['**/.git/**', '**/node_modules/**', '**/.*.tmp']
    };

    this.fileWatcherService = new FileWatcherService(workspaceRoot, watcherOptions);
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for the file watcher service
   */
  private setupEventHandlers(): void {
    // Handle file changes
    this.fileWatcherService.onDidChangeFile((changes: FileChangeEvent[]) => {
      this.handleFileChanges(changes);
    });

    // Handle new file detection for visual indicators
    if (this.options.enableVisualIndicators !== false) {
      this.fileWatcherService.onDidDetectNewFiles((newFiles: FileChangeEvent[]) => {
        this.showNewFileNotifications(newFiles);
      });
    }
  }

  /**
   * Handle file changes with intelligent debouncing and batching
   */
  private handleFileChanges(changes: FileChangeEvent[]): void {
    // Add refresh callbacks to queue
    for (const callback of this.refreshCallbacks) {
      this.updateQueue.push(callback);
    }

    // Schedule batched update if enabled
    if (this.options.enableBatching) {
      this.scheduleBatchedUpdate();
    } else {
      this.scheduleImmediateUpdate();
    }
  }

  /**
   * Schedule immediate update with debouncing
   */
  private scheduleImmediateUpdate(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    const debounceDelay = this.options.debounceDelay || this.defaultDebounceDelay;
    this.updateTimer = setTimeout(() => {
      this.processUpdateQueue();
    }, debounceDelay);
  }

  /**
   * Schedule batched update for multiple rapid changes
   */
  private scheduleBatchedUpdate(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.processUpdateQueue();
    }, this.batchUpdateDelay);
  }

  /**
   * Process the update queue to prevent lost updates
   */
  private processUpdateQueue(): void {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const callbacksToProcess = [...this.updateQueue];
    this.updateQueue = [];

    try {
      // Execute all refresh callbacks
      for (const callback of callbacksToProcess) {
        try {
          callback();
        } catch (error) {
          console.error('[EnhancedFileWatcher] Error in refresh callback:', error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Show visual indicators for new files
   */
  private showNewFileNotifications(newFiles: FileChangeEvent[]): void {
    if (newFiles.length === 0) {
      return;
    }

    const config = vscode.workspace.getConfiguration('goalie');
    const enableNotifications = config.get<boolean>('fileWatcher.enableNotifications', true);

    if (!enableNotifications) {
      return;
    }

    // Group new files by type
    const yamlFiles = newFiles.filter(f => f.path.endsWith('.yaml') || f.path.endsWith('.yml'));
    const jsonlFiles = newFiles.filter(f => f.path.endsWith('.jsonl'));

    // Show summary notification
    let message = `New files detected: ${newFiles.length} total`;
    if (yamlFiles.length > 0) {
      message += `, ${yamlFiles.length} YAML`;
    }
    if (jsonlFiles.length > 0) {
      message += `, ${jsonlFiles.length} JSONL`;
    }

    vscode.window.showInformationMessage(message, 'View Details').then(selection => {
      if (selection === 'View Details') {
        this.showNewFileDetails(newFiles);
      }
    });
  }

  /**
   * Show detailed information about new files
   */
  private showNewFileDetails(newFiles: FileChangeEvent[]): void {
    const workspaceRoot = this.workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'newFilesDetails',
      'New Files Detected',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    const html = this.generateNewFilesHtml(newFiles, workspaceRoot);
    panel.webview.html = html;

    panel.onDidDispose(() => {
      // Clean up
    });
  }

  /**
   * Generate HTML for new files details view
   */
  private generateNewFilesHtml(newFiles: FileChangeEvent[], workspaceRoot: string): string {
    const rows = newFiles.map(file => {
      const relativePath = file.relativePath;
      const sizeKB = (file.size / 1024).toFixed(2);
      const timeAgo = this.getTimeAgo(file.mtime);
      
      return `
        <tr>
          <td>${file.type}</td>
          <td>${relativePath}</td>
          <td>${sizeKB} KB</td>
          <td>${file.mtime.toLocaleString()}</td>
          <td>${timeAgo}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>New Files Detected</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 16px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 16px;
          }
          th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: var(--vscode-editor-lineHighlightBackground);
            font-weight: 600;
          }
          .new-file {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-terminal-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <h1>New Files Detected</h1>
        <p>Found ${newFiles.length} new files in your .goalie directory</p>
        
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Path</th>
              <th>Size</th>
              <th>Modified</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hours ago`;
    }
  }

  /**
   * Get performance metrics from the file watcher service
   */
  public getPerformanceMetrics() {
    return this.fileWatcherService.getPerformanceMetrics();
  }

  /**
   * Check if a file has changed since last check
   */
  public hasFileChanged(filePath: string): boolean {
    return this.fileWatcherService.hasFileChanged(filePath);
  }

  /**
   * Get file metadata from cache
   */
  public getFileMetadata(filePath: string) {
    return this.fileWatcherService.getFileMetadata(filePath);
  }

  /**
   * Dispose of the enhanced file watcher
   */
  public dispose(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.fileWatcherService.dispose();
    this.updateQueue = [];
    this.isProcessingQueue = false;
  }
}
