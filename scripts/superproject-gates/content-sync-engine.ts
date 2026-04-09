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
import * as crypto from 'crypto';

import {
  SyncOperation,
  WPContent,
  FlarumDiscussion
} from './types.js';
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
  errors: Array<{ id: string; error: string }>;
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
export class ContentSyncEngine extends EventEmitter {
  private wordpress: WordPressClient;
  private flarum: FlarumClient;
  private pendingOps: Map<string, SyncOperation>;
  private contentIndex: Map<string, InternalContent>;
  private isProcessing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  // Configuration
  private batchSize: number = 50;
  private syncIntervalMs: number = 5 * 60 * 1000; // 5 minutes
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;

  constructor(wordpress: WordPressClient, flarum: FlarumClient) {
    super();
    this.wordpress = wordpress;
    this.flarum = flarum;
    this.pendingOps = new Map();
    this.contentIndex = new Map();
  }

  // ==================== Queue Management ====================

  /**
   * Queue a sync operation
   */
  async queueSync(
    operation: Omit<SyncOperation, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    const id = crypto.randomUUID();
    
    const syncOp: SyncOperation = {
      ...operation,
      id,
      status: 'pending',
      createdAt: new Date()
    };

    this.pendingOps.set(id, syncOp);
    this.emit('operationQueued', { id, type: operation.type, source: operation.source });
    
    return id;
  }

  /**
   * Process the operation queue
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    this.emit('processingStarted');

    let processed = 0;
    let failed = 0;

    try {
      const ops = Array.from(this.pendingOps.values())
        .filter(op => op.status === 'pending')
        .slice(0, this.batchSize);

      for (const op of ops) {
        try {
          await this.processOperation(op);
          processed++;
        } catch (error) {
          failed++;
          op.status = 'failed';
          op.error = error instanceof Error ? error.message : 'Unknown error';
          this.emit('operationFailed', { id: op.id, error: op.error });
        }
      }
    } finally {
      this.isProcessing = false;
      this.emit('processingCompleted', { processed, failed });
    }

    return { processed, failed };
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'in_progress';
    this.emit('operationStarted', { id: operation.id });

    try {
      switch (operation.type) {
        case 'create':
          await this.handleCreate(operation);
          break;
        case 'update':
          await this.handleUpdate(operation);
          break;
        case 'delete':
          await this.handleDelete(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      operation.status = 'completed';
      operation.completedAt = new Date();
      this.emit('operationCompleted', { id: operation.id });
    } catch (error) {
      if (error instanceof Error && error.message.includes('conflict')) {
        operation.status = 'conflict';
        this.emit('operationConflict', { id: operation.id });
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle create operation
   */
  private async handleCreate(operation: SyncOperation): Promise<void> {
    const { target, entityType, payload } = operation;

    if (target === 'wordpress') {
      const wpContent = this.mapInternalToWP(payload as InternalContent);
      await this.wordpress.createContent(entityType, wpContent);
    } else if (target === 'flarum') {
      const flarumData = this.mapInternalToFlarum(payload as InternalContent);
      await this.flarum.createDiscussion(flarumData);
    }
  }

  /**
   * Handle update operation
   */
  private async handleUpdate(operation: SyncOperation): Promise<void> {
    const { target, entityType, entityId, payload } = operation;

    // Check for conflicts before update
    if (await this.checkForConflict(operation)) {
      throw new Error('conflict detected');
    }

    if (target === 'wordpress') {
      const wpContent = this.mapInternalToWP(payload as InternalContent);
      await this.wordpress.updateContent(entityType, parseInt(entityId), wpContent);
    } else if (target === 'flarum') {
      const flarumData = this.mapInternalToFlarum(payload as InternalContent);
      await this.flarum.updateDiscussion(entityId, { title: flarumData.title });
    }
  }

  /**
   * Handle delete operation
   */
  private async handleDelete(operation: SyncOperation): Promise<void> {
    const { target, entityType, entityId } = operation;

    if (target === 'wordpress') {
      await this.wordpress.deleteContent(entityType, parseInt(entityId), true);
    } else if (target === 'flarum') {
      await this.flarum.deleteDiscussion(entityId);
    }
  }

  /**
   * Get operation status
   */
  async getOperationStatus(opId: string): Promise<SyncOperation | null> {
    return this.pendingOps.get(opId) || null;
  }

  /**
   * Cancel a pending operation
   */
  cancelOperation(opId: string): boolean {
    const op = this.pendingOps.get(opId);
    if (op && op.status === 'pending') {
      this.pendingOps.delete(opId);
      this.emit('operationCancelled', { id: opId });
      return true;
    }
    return false;
  }

  // ==================== Conflict Resolution ====================

  /**
   * Check if there's a conflict between source and target
   */
  private async checkForConflict(operation: SyncOperation): Promise<boolean> {
    const { source, target, entityType, entityId, payload } = operation;

    try {
      let targetContent: any;

      if (target === 'wordpress') {
        targetContent = await this.wordpress.getContent(entityType, parseInt(entityId));
      } else if (target === 'flarum') {
        targetContent = await this.flarum.getDiscussion(entityId);
      }

      if (!targetContent) {
        return false;
      }

      // Compare modification times
      const targetModified = target === 'wordpress'
        ? new Date(targetContent.modifiedAt)
        : new Date(targetContent.attributes?.lastPostedAt || 0);

      const sourceModified = new Date((payload as InternalContent).modifiedAt);

      // If target was modified after source, there's a potential conflict
      return targetModified > sourceModified;
    } catch {
      return false;
    }
  }

  /**
   * Detect if there's a conflict between two content versions
   */
  detectConflict(source: any, target: any): boolean {
    // Simple hash-based conflict detection
    const sourceHash = this.computeContentHash(source);
    const targetHash = this.computeContentHash(target);
    
    return sourceHash !== targetHash;
  }

  /**
   * Resolve a conflict using the specified strategy
   */
  async resolveConflict(
    operation: SyncOperation,
    strategy: SyncOperation['conflictResolution']
  ): Promise<SyncOperation> {
    operation.conflictResolution = strategy;

    switch (strategy) {
      case 'source_wins':
        // Re-process with source data overwriting target
        operation.status = 'pending';
        await this.processOperation(operation);
        break;

      case 'target_wins':
        // Mark as completed without changes
        operation.status = 'completed';
        operation.completedAt = new Date();
        break;

      case 'merge':
        // Merge content from both sources
        const merged = await this.mergeContent(operation);
        operation.payload = merged;
        operation.status = 'pending';
        await this.processOperation(operation);
        break;

      case 'manual':
        // Leave in conflict state for manual resolution
        operation.status = 'conflict';
        break;
    }

    this.emit('conflictResolved', {
      id: operation.id,
      strategy
    });

    return operation;
  }

  /**
   * Merge content from source and target
   */
  private async mergeContent(operation: SyncOperation): Promise<InternalContent> {
    const { target, entityType, entityId, payload } = operation;
    const sourceContent = payload as InternalContent;

    let targetContent: InternalContent;

    if (target === 'wordpress') {
      const wpContent = await this.wordpress.getContent(entityType, parseInt(entityId));
      targetContent = this.mapWPToInternal(wpContent);
    } else {
      const flarumContent = await this.flarum.getDiscussion(entityId);
      targetContent = this.mapFlarumToInternal(flarumContent);
    }

    // Simple merge: use newer title/content, combine tags
    const merged: InternalContent = {
      ...sourceContent,
      title: sourceContent.modifiedAt > targetContent.modifiedAt
        ? sourceContent.title
        : targetContent.title,
      content: sourceContent.modifiedAt > targetContent.modifiedAt
        ? sourceContent.content
        : targetContent.content,
      tags: [...new Set([...sourceContent.tags, ...targetContent.tags])],
      modifiedAt: new Date()
    };

    return merged;
  }

  /**
   * Compute a hash for content comparison
   */
  private computeContentHash(content: any): string {
    const normalized = JSON.stringify({
      title: content.title || '',
      content: content.content || '',
      status: content.status || ''
    });
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  // ==================== Content Mapping ====================

  /**
   * Map WordPress content to internal format
   */
  mapWPToInternal(wpContent: WPContent): InternalContent {
    return {
      id: `wp_${wpContent.id}`,
      title: wpContent.title,
      content: wpContent.content,
      excerpt: wpContent.excerpt,
      author: {
        id: `wp_user_${wpContent.author}`,
        name: 'WordPress User', // Would need to fetch user details
        email: undefined
      },
      status: this.mapWPStatus(wpContent.status),
      tags: wpContent.tags.map(t => `wp_tag_${t}`),
      categories: wpContent.categories.map(c => `wp_cat_${c}`),
      createdAt: wpContent.createdAt,
      modifiedAt: wpContent.modifiedAt,
      metadata: {
        ...wpContent.meta,
        featuredMedia: wpContent.featuredMedia,
        type: wpContent.type
      },
      source: 'wordpress',
      sourceId: wpContent.id.toString()
    };
  }

  /**
   * Map internal format to WordPress content
   */
  mapInternalToWP(internal: InternalContent): Partial<WPContent> {
    return {
      title: internal.title,
      content: internal.content,
      excerpt: internal.excerpt,
      status: this.mapToWPStatus(internal.status),
      meta: internal.metadata
    };
  }

  /**
   * Map Flarum discussion to internal format
   */
  mapFlarumToInternal(discussion: FlarumDiscussion): InternalContent {
    return {
      id: `flarum_${discussion.id}`,
      title: discussion.attributes.title,
      content: '', // First post content would need to be fetched separately
      excerpt: undefined,
      author: {
        id: discussion.relationships?.user?.data?.id || 'unknown',
        name: 'Flarum User', // Would need to fetch user details
        email: undefined
      },
      status: discussion.attributes.isLocked ? 'archived' : 'published',
      tags: (discussion.relationships?.tags?.data || []).map(t => t.id),
      categories: undefined,
      createdAt: new Date(discussion.attributes.createdAt),
      modifiedAt: new Date(discussion.attributes.lastPostedAt),
      metadata: {
        slug: discussion.attributes.slug,
        commentCount: discussion.attributes.commentCount,
        participantCount: discussion.attributes.participantCount,
        isSticky: discussion.attributes.isSticky
      },
      source: 'flarum',
      sourceId: discussion.id
    };
  }

  /**
   * Map internal format to Flarum discussion data
   */
  mapInternalToFlarum(internal: InternalContent): {
    title: string;
    content: string;
    tags?: string[];
  } {
    return {
      title: internal.title,
      content: internal.content,
      tags: internal.tags
    };
  }

  /**
   * Map WordPress status to internal status
   */
  private mapWPStatus(wpStatus: WPContent['status']): InternalContent['status'] {
    const mapping: Record<WPContent['status'], InternalContent['status']> = {
      'publish': 'published',
      'draft': 'draft',
      'pending': 'pending',
      'private': 'archived'
    };
    return mapping[wpStatus] || 'draft';
  }

  /**
   * Map internal status to WordPress status
   */
  private mapToWPStatus(status: InternalContent['status']): WPContent['status'] {
    const mapping: Record<InternalContent['status'], WPContent['status']> = {
      'published': 'publish',
      'draft': 'draft',
      'pending': 'pending',
      'archived': 'private'
    };
    return mapping[status] || 'draft';
  }

  // ==================== Bidirectional Sync ====================

  /**
   * Sync content from WordPress to internal store
   */
  async syncFromWordPress(contentType: string): Promise<number> {
    this.emit('syncStarted', { source: 'wordpress', contentType });
    
    let synced = 0;
    let page = 1;
    const perPage = 50;
    let hasMore = true;

    try {
      while (hasMore) {
        const result = await this.wordpress.listContent(contentType, {
          page,
          perPage,
          status: 'any'
        });

        for (const content of result.items) {
          const internal = this.mapWPToInternal(content);
          this.contentIndex.set(internal.id, internal);
          synced++;
        }

        hasMore = result.items.length === perPage;
        page++;
      }

      this.emit('syncCompleted', { source: 'wordpress', contentType, count: synced });
    } catch (error) {
      this.emit('syncError', {
        source: 'wordpress',
        contentType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return synced;
  }

  /**
   * Sync content to WordPress
   */
  async syncToWordPress(entities: InternalContent[]): Promise<number> {
    this.emit('syncStarted', { target: 'wordpress', count: entities.length });
    
    let synced = 0;

    for (const entity of entities) {
      try {
        const wpContent = this.mapInternalToWP(entity);
        
        if (entity.source === 'wordpress' && entity.sourceId) {
          // Update existing
          await this.wordpress.updateContent('post', parseInt(entity.sourceId), wpContent);
        } else {
          // Create new
          await this.wordpress.createContent('post', wpContent);
        }
        
        synced++;
      } catch (error) {
        this.emit('syncItemError', {
          target: 'wordpress',
          entityId: entity.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.emit('syncCompleted', { target: 'wordpress', count: synced });
    return synced;
  }

  /**
   * Sync content from Flarum to internal store
   */
  async syncFromFlarum(entityType: string): Promise<number> {
    if (entityType !== 'discussions') {
      throw new Error('Only discussions sync is supported for Flarum');
    }

    this.emit('syncStarted', { source: 'flarum', entityType });
    
    let synced = 0;
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    try {
      while (hasMore) {
        const result = await this.flarum.listDiscussions({
          page: { offset, limit }
        });

        for (const discussion of result.data) {
          const internal = this.mapFlarumToInternal(discussion);
          this.contentIndex.set(internal.id, internal);
          synced++;
        }

        hasMore = result.data.length === limit;
        offset += limit;
      }

      this.emit('syncCompleted', { source: 'flarum', entityType, count: synced });
    } catch (error) {
      this.emit('syncError', {
        source: 'flarum',
        entityType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return synced;
  }

  /**
   * Sync content to Flarum
   */
  async syncToFlarum(entities: InternalContent[]): Promise<number> {
    this.emit('syncStarted', { target: 'flarum', count: entities.length });
    
    let synced = 0;

    for (const entity of entities) {
      try {
        const flarumData = this.mapInternalToFlarum(entity);
        
        if (entity.source === 'flarum' && entity.sourceId) {
          // Update existing
          await this.flarum.updateDiscussion(entity.sourceId, { title: flarumData.title });
        } else {
          // Create new
          await this.flarum.createDiscussion(flarumData);
        }
        
        synced++;
      } catch (error) {
        this.emit('syncItemError', {
          target: 'flarum',
          entityId: entity.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.emit('syncCompleted', { target: 'flarum', count: synced });
    return synced;
  }

  /**
   * Full bidirectional sync
   */
  async fullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    this.emit('fullSyncStarted');

    try {
      // Sync from WordPress
      const wpCount = await this.syncFromWordPress('post');
      result.processed += wpCount;

      // Sync from Flarum
      const flarumCount = await this.syncFromFlarum('discussions');
      result.processed += flarumCount;

      // Process any pending operations
      const queueResult = await this.processQueue();
      result.processed += queueResult.processed;
      result.failed += queueResult.failed;

    } catch (error) {
      result.errors.push({
        id: 'fullSync',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.emit('fullSyncCompleted', result);
    return result;
  }

  // ==================== Auto-Sync Management ====================

  /**
   * Start automatic sync interval
   */
  startAutoSync(intervalMs?: number): void {
    if (this.syncInterval) {
      this.stopAutoSync();
    }

    const interval = intervalMs || this.syncIntervalMs;
    this.syncInterval = setInterval(() => {
      this.fullSync().catch(err => {
        this.emit('autoSyncError', { error: err.message });
      });
    }, interval);

    this.emit('autoSyncStarted', { intervalMs: interval });
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.emit('autoSyncStopped');
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Get all indexed content
   */
  getIndexedContent(): InternalContent[] {
    return Array.from(this.contentIndex.values());
  }

  /**
   * Get content by ID
   */
  getContent(id: string): InternalContent | null {
    return this.contentIndex.get(id) || null;
  }

  /**
   * Search indexed content
   */
  searchContent(query: string): InternalContent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.contentIndex.values()).filter(content =>
      content.title.toLowerCase().includes(lowerQuery) ||
      content.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.pendingOps.values())
      .filter(op => op.status === 'pending');
  }

  /**
   * Get failed operations
   */
  getFailedOperations(): SyncOperation[] {
    return Array.from(this.pendingOps.values())
      .filter(op => op.status === 'failed');
  }

  /**
   * Get conflict operations
   */
  getConflictOperations(): SyncOperation[] {
    return Array.from(this.pendingOps.values())
      .filter(op => op.status === 'conflict');
  }

  /**
   * Clear completed operations
   */
  clearCompletedOperations(): number {
    let cleared = 0;
    this.pendingOps.forEach((op, id) => {
      if (op.status === 'completed') {
        this.pendingOps.delete(id);
        cleared++;
      }
    });
    return cleared;
  }

  /**
   * Retry failed operations
   */
  async retryFailedOperations(): Promise<{ retried: number; succeeded: number }> {
    const failed = this.getFailedOperations();
    let succeeded = 0;

    for (const op of failed) {
      op.status = 'pending';
      op.error = undefined;
      
      try {
        await this.processOperation(op);
        succeeded++;
      } catch {
        // Leave as failed
      }
    }

    return { retried: failed.length, succeeded };
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    indexedContent: number;
    pendingOps: number;
    failedOps: number;
    conflictOps: number;
    completedOps: number;
  } {
    const ops = Array.from(this.pendingOps.values());
    return {
      indexedContent: this.contentIndex.size,
      pendingOps: ops.filter(o => o.status === 'pending').length,
      failedOps: ops.filter(o => o.status === 'failed').length,
      conflictOps: ops.filter(o => o.status === 'conflict').length,
      completedOps: ops.filter(o => o.status === 'completed').length
    };
  }

  /**
   * Configure sync settings
   */
  configure(options: {
    batchSize?: number;
    syncIntervalMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
  }): void {
    if (options.batchSize) this.batchSize = options.batchSize;
    if (options.syncIntervalMs) this.syncIntervalMs = options.syncIntervalMs;
    if (options.maxRetries) this.maxRetries = options.maxRetries;
    if (options.retryDelayMs) this.retryDelayMs = options.retryDelayMs;
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.stopAutoSync();
    this.pendingOps.clear();
    this.contentIndex.clear();
    this.emit('allDataCleared');
  }
}

/**
 * Factory function to create content sync engine
 */
export function createContentSyncEngine(
  wordpress: WordPressClient,
  flarum: FlarumClient
): ContentSyncEngine {
  return new ContentSyncEngine(wordpress, flarum);
}
