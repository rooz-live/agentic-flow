/**
 * Content Sync Engine
 *
 * Phase 2 Implementation - Bidirectional Content Synchronization
 *
 * Provides content synchronization including:
 * - Bidirectional sync between WordPress and Flarum
 * - Conflict detection and resolution
 * - Content mapping between platforms
 * - Operation queue management
 * - Webhook handling for real-time sync
 */
import { EventEmitter } from 'events';
import { SyncOperation, WPContent, FlarumDiscussion } from './types.js';
import { WordPressClient } from './wordpress-client.js';
import { FlarumClient } from './flarum-client.js';
/**
 * Internal content representation for cross-platform mapping
 */
interface InternalContent {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    author: {
        id: string;
        name: string;
        email?: string;
    };
    status: 'published' | 'draft' | 'pending' | 'archived';
    tags: string[];
    categories?: string[];
    createdAt: Date;
    modifiedAt: Date;
    metadata: Record<string, any>;
    source: 'wordpress' | 'flarum' | 'internal';
    sourceId: string;
}
/**
 * Sync result statistics
 */
interface SyncResult {
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    failed: number;
    conflicts: number;
    errors: Array<{
        id: string;
        error: string;
    }>;
}
/**
 * Content Sync Engine
 *
 * Implements comprehensive content synchronization including:
 * - Bidirectional sync between WordPress and Flarum
 * - Conflict detection and multiple resolution strategies
 * - Content mapping and transformation
 * - Queue-based operation processing
 */
export declare class ContentSyncEngine extends EventEmitter {
    private wordpress;
    private flarum;
    private pendingOps;
    private contentIndex;
    private isProcessing;
    private syncInterval;
    private batchSize;
    private syncIntervalMs;
    private maxRetries;
    private retryDelayMs;
    constructor(wordpress: WordPressClient, flarum: FlarumClient);
    /**
     * Queue a sync operation
     */
    queueSync(operation: Omit<SyncOperation, 'id' | 'status' | 'createdAt'>): Promise<string>;
    /**
     * Process the operation queue
     */
    processQueue(): Promise<{
        processed: number;
        failed: number;
    }>;
    /**
     * Process a single operation
     */
    private processOperation;
    /**
     * Handle create operation
     */
    private handleCreate;
    /**
     * Handle update operation
     */
    private handleUpdate;
    /**
     * Handle delete operation
     */
    private handleDelete;
    /**
     * Get operation status
     */
    getOperationStatus(opId: string): Promise<SyncOperation | null>;
    /**
     * Cancel a pending operation
     */
    cancelOperation(opId: string): boolean;
    /**
     * Check if there's a conflict between source and target
     */
    private checkForConflict;
    /**
     * Detect if there's a conflict between two content versions
     */
    detectConflict(source: any, target: any): boolean;
    /**
     * Resolve a conflict using the specified strategy
     */
    resolveConflict(operation: SyncOperation, strategy: SyncOperation['conflictResolution']): Promise<SyncOperation>;
    /**
     * Merge content from source and target
     */
    private mergeContent;
    /**
     * Compute a hash for content comparison
     */
    private computeContentHash;
    /**
     * Map WordPress content to internal format
     */
    mapWPToInternal(wpContent: WPContent): InternalContent;
    /**
     * Map internal format to WordPress content
     */
    mapInternalToWP(internal: InternalContent): Partial<WPContent>;
    /**
     * Map Flarum discussion to internal format
     */
    mapFlarumToInternal(discussion: FlarumDiscussion): InternalContent;
    /**
     * Map internal format to Flarum discussion data
     */
    mapInternalToFlarum(internal: InternalContent): {
        title: string;
        content: string;
        tags?: string[];
    };
    /**
     * Map WordPress status to internal status
     */
    private mapWPStatus;
    /**
     * Map internal status to WordPress status
     */
    private mapToWPStatus;
    /**
     * Sync content from WordPress to internal store
     */
    syncFromWordPress(contentType: string): Promise<number>;
    /**
     * Sync content to WordPress
     */
    syncToWordPress(entities: InternalContent[]): Promise<number>;
    /**
     * Sync content from Flarum to internal store
     */
    syncFromFlarum(entityType: string): Promise<number>;
    /**
     * Sync content to Flarum
     */
    syncToFlarum(entities: InternalContent[]): Promise<number>;
    /**
     * Full bidirectional sync
     */
    fullSync(): Promise<SyncResult>;
    /**
     * Start automatic sync interval
     */
    startAutoSync(intervalMs?: number): void;
    /**
     * Stop automatic sync
     */
    stopAutoSync(): void;
    /**
     * Get all indexed content
     */
    getIndexedContent(): InternalContent[];
    /**
     * Get content by ID
     */
    getContent(id: string): InternalContent | null;
    /**
     * Search indexed content
     */
    searchContent(query: string): InternalContent[];
    /**
     * Get pending operations
     */
    getPendingOperations(): SyncOperation[];
    /**
     * Get failed operations
     */
    getFailedOperations(): SyncOperation[];
    /**
     * Get conflict operations
     */
    getConflictOperations(): SyncOperation[];
    /**
     * Clear completed operations
     */
    clearCompletedOperations(): number;
    /**
     * Retry failed operations
     */
    retryFailedOperations(): Promise<{
        retried: number;
        succeeded: number;
    }>;
    /**
     * Get sync statistics
     */
    getStats(): {
        indexedContent: number;
        pendingOps: number;
        failedOps: number;
        conflictOps: number;
        completedOps: number;
    };
    /**
     * Configure sync settings
     */
    configure(options: {
        batchSize?: number;
        syncIntervalMs?: number;
        maxRetries?: number;
        retryDelayMs?: number;
    }): void;
    /**
     * Clear all data
     */
    clearAll(): void;
}
/**
 * Factory function to create content sync engine
 */
export declare function createContentSyncEngine(wordpress: WordPressClient, flarum: FlarumClient): ContentSyncEngine;
export {};
//# sourceMappingURL=content-sync-engine.d.ts.map