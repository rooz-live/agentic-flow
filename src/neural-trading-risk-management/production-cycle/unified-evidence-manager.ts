/**
 * Unified Evidence Manager Architecture
 * 
 * Centralized emitter control with consistent naming convention mapping,
 * performance-optimized configuration, and async processing capabilities
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Worker } from 'worker_threads';

import {
  EvidenceSchema,
  RevenueAttributionConfig,
  PromptIntentCoverage,
  CirclePerspectiveTelemetry,
  SecurityAuditGapDetection,
  MicroLedgerBaseline
} from './unified-cli-evidence-emitter';

export interface EvidenceManagerConfig {
  storage: {
    evidenceDir: string;
    maxEvidenceFiles: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
  processing: {
    batchSize: number;
    maxConcurrency: number;
    queueTimeout: number;
    retryAttempts: number;
  };
  naming: {
    convention: 'timestamp' | 'uuid' | 'sequential';
    prefix: string;
    includeSession: boolean;
    includeCorrelation: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    cacheSize: number;
    indexEnabled: boolean;
    asyncProcessing: boolean;
    workerPoolSize: number;
  };
}

export interface EvidenceMetadata {
  id: string;
  filename: string;
  path: string;
  size: number;
  checksum: string;
  timestamp: Date;
  type: string;
  source: string;
  version: string;
  tags: string[];
  indexed: boolean;
  compressed: boolean;
  encrypted: boolean;
}

export interface EvidenceQuery {
  type?: string;
  source?: string;
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  quality?: { min: number; max: number };
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'quality' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface EvidenceIndex {
  byType: Map<string, Set<string>>;
  bySource: Map<string, Set<string>>;
  byDate: Map<string, Set<string>>;
  byTag: Map<string, Set<string>>;
  byQuality: Map<string, Set<string>>;
  metadata: Map<string, EvidenceMetadata>;
}

export class UnifiedEvidenceManager extends EventEmitter {
  private config: EvidenceManagerConfig;
  private evidenceIndex: EvidenceIndex;
  private processingQueue: EvidenceSchema[] = [];
  private workers: Worker[] = [];
  private isProcessing: boolean = false;
  private sessionId: string;
  private correlationId: string | null = null;
  private evidenceCounter: number = 0;

  constructor(config?: Partial<EvidenceManagerConfig>) {
    super();
    
    this.config = this.initializeConfig(config);
    this.evidenceIndex = this.initializeIndex();
    this.sessionId = this.generateSessionId();
    
    this.setupWorkerPool();
    this.setupEventHandlers();
  }

  private initializeConfig(config?: Partial<EvidenceManagerConfig>): EvidenceManagerConfig {
    return {
      storage: {
        evidenceDir: path.join(process.cwd(), '.evidence'),
        maxEvidenceFiles: 10000,
        compressionEnabled: true,
        encryptionEnabled: false
      },
      processing: {
        batchSize: 50,
        maxConcurrency: 5,
        queueTimeout: 30000,
        retryAttempts: 3
      },
      naming: {
        convention: 'timestamp',
        prefix: 'evidence',
        includeSession: true,
        includeCorrelation: true
      },
      performance: {
        cacheEnabled: true,
        cacheSize: 1000,
        indexEnabled: true,
        asyncProcessing: true,
        workerPoolSize: 4
      },
      ...config
    };
  }

  private initializeIndex(): EvidenceIndex {
    return {
      byType: new Map(),
      bySource: new Map(),
      byDate: new Map(),
      byTag: new Map(),
      byQuality: new Map(),
      metadata: new Map()
    };
  }

  private setupWorkerPool(): void {
    if (!this.config.performance.asyncProcessing) {
      return;
    }

    for (let i = 0; i < this.config.performance.workerPoolSize; i++) {
      const worker = new Worker(
        path.join(__dirname, 'evidence-worker.js'),
        {
          workerData: {
            config: this.config,
            workerId: i
          }
        }
      );

      worker.on('message', this.handleWorkerMessage.bind(this));
      worker.on('error', this.handleWorkerError.bind(this));
      worker.on('exit', this.handleWorkerExit.bind(this));

      this.workers.push(worker);
    }

    console.log(`[UNIFIED-EVIDENCE-MANAGER] Initialized worker pool with ${this.workers.length} workers`);
  }

  private setupEventHandlers(): void {
    // Handle evidence emission requests
    this.on('evidence_emit_request', this.handleEvidenceEmitRequest.bind(this));
    
    // Handle batch processing
    this.on('batch_process_request', this.handleBatchProcessRequest.bind(this));
    
    // Handle index rebuild
    this.on('index_rebuild_request', this.handleIndexRebuildRequest.bind(this));
    
    // Handle cleanup requests
    this.on('cleanup_request', this.handleCleanupRequest.bind(this));
  }

  /**
   * Emit evidence with centralized control
   */
  public async emitEvidence(evidence: EvidenceSchema): Promise<string> {
    console.log(`[UNIFIED-EVIDENCE-MANAGER] Emitting evidence: ${evidence.id}`);
    
    try {
      // Apply naming convention
      const filename = this.generateFilename(evidence);
      
      // Add metadata
      const metadata = this.createMetadata(evidence, filename);
      
      // Store evidence
      const filePath = await this.storeEvidence(evidence, filename, metadata);
      
      // Update index
      this.updateIndex(evidence, metadata);
      
      // Add to processing queue if async processing is enabled
      if (this.config.performance.asyncProcessing) {
        this.addToProcessingQueue(evidence);
      }
      
      this.emit('evidence_emitted', { evidence, metadata, filePath });
      
      return evidence.id;
      
    } catch (error) {
      console.error(`[UNIFIED-EVIDENCE-MANAGER] Failed to emit evidence ${evidence.id}:`, error);
      this.emit('evidence_emit_failed', { evidence, error });
      throw error;
    }
  }

  /**
   * Emit multiple evidence items in batch
   */
  public async emitEvidenceBatch(evidenceList: EvidenceSchema[]): Promise<string[]> {
    console.log(`[UNIFIED-EVIDENCE-MANAGER] Emitting evidence batch: ${evidenceList.length} items`);
    
    const results: string[] = [];
    
    for (const evidence of evidenceList) {
      try {
        const id = await this.emitEvidence(evidence);
        results.push(id);
      } catch (error) {
        console.error(`[UNIFIED-EVIDENCE-MANAGER] Failed to emit evidence in batch:`, error);
        // Continue with other items in batch
      }
    }
    
    this.emit('batch_emit_completed', { count: evidenceList.length, successful: results.length });
    
    return results;
  }

  /**
   * Query evidence
   */
  public async queryEvidence(query: EvidenceQuery): Promise<EvidenceSchema[]> {
    console.log('[UNIFIED-EVIDENCE-MANAGER] Querying evidence');
    
    const evidenceIds = this.searchIndex(query);
    const evidence: EvidenceSchema[] = [];
    
    for (const id of evidenceIds) {
      try {
        const evidenceData = await this.loadEvidence(id);
        if (evidenceData) {
          evidence.push(evidenceData);
        }
      } catch (error) {
        console.error(`[UNIFIED-EVIDENCE-MANAGER] Failed to load evidence ${id}:`, error);
      }
    }
    
    return evidence;
  }

  /**
   * Get evidence by ID
   */
  public async getEvidence(id: string): Promise<EvidenceSchema | null> {
    const metadata = this.evidenceIndex.metadata.get(id);
    if (!metadata) {
      return null;
    }

    try {
      return await this.loadEvidence(id);
    } catch (error) {
      console.error(`[UNIFIED-EVIDENCE-MANAGER] Failed to get evidence ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete evidence
   */
  public async deleteEvidence(id: string): Promise<boolean> {
    console.log(`[UNIFIED-EVIDENCE-MANAGER] Deleting evidence: ${id}`);
    
    const metadata = this.evidenceIndex.metadata.get(id);
    if (!metadata) {
      return false;
    }

    try {
      // Delete file
      await fs.unlink(metadata.path);
      
      // Remove from index
      this.removeFromIndex(id);
      
      this.emit('evidence_deleted', { id, metadata });
      
      return true;
    } catch (error) {
      console.error(`[UNIFIED-EVIDENCE-MANAGER] Failed to delete evidence ${id}:`, error);
      return false;
    }
  }

  /**
   * Rebuild evidence index
   */
  public async rebuildIndex(): Promise<void> {
    console.log('[UNIFIED-EVIDENCE-MANAGER] Rebuilding evidence index');
    
    this.evidenceIndex = this.initializeIndex();
    
    try {
      const files = await fs.readdir(this.config.storage.evidenceDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.storage.evidenceDir, file);
          const metadata = await this.loadMetadata(filePath);
          
          if (metadata) {
            this.evidenceIndex.metadata.set(metadata.id, metadata);
            this.updateIndexMappings(metadata);
          }
        }
      }
      
      this.emit('index_rebuilt', { totalFiles: files.length, indexed: this.evidenceIndex.metadata.size });
      
    } catch (error) {
      console.error('[UNIFIED-EVIDENCE-MANAGER] Failed to rebuild index:', error);
      throw error;
    }
  }

  /**
   * Clean up old evidence
   */
  public async cleanup(maxAge: number = 2592000000): Promise<number> { // 30 days default
    console.log('[UNIFIED-EVIDENCE-MANAGER] Cleaning up old evidence');
    
    const cutoffDate = new Date(Date.now() - maxAge);
    let deletedCount = 0;
    
    for (const [id, metadata] of this.evidenceIndex.metadata) {
      if (metadata.timestamp < cutoffDate) {
        if (await this.deleteEvidence(id)) {
          deletedCount++;
        }
      }
    }
    
    this.emit('cleanup_completed', { deletedCount, cutoffDate });
    
    return deletedCount;
  }

  /**
   * Get manager statistics
   */
  public getStatistics(): {
    totalEvidence: number;
    indexSize: number;
    queueSize: number;
    workerCount: number;
    storageUsage: number;
    lastActivity: Date | null;
  } {
    return {
      totalEvidence: this.evidenceIndex.metadata.size,
      indexSize: this.calculateIndexSize(),
      queueSize: this.processingQueue.length,
      workerCount: this.workers.length,
      storageUsage: this.calculateStorageUsage(),
      lastActivity: this.getLastActivity()
    };
  }

  /**
   * Set correlation ID for evidence chaining
   */
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Clear correlation ID
   */
  public clearCorrelationId(): void {
    this.correlationId = null;
  }

  /**
   * Shutdown evidence manager
   */
  public async shutdown(): Promise<void> {
    console.log('[UNIFIED-EVIDENCE-MANAGER] Shutting down');
    
    // Process remaining queue
    await this.processQueue();
    
    // Terminate workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    this.workers = [];
    this.isProcessing = false;
    
    this.emit('shutdown_completed');
  }

  private async handleEvidenceEmitRequest(data: { evidence: EvidenceSchema }): Promise<void> {
    await this.emitEvidence(data.evidence);
  }

  private async handleBatchProcessRequest(data: { evidenceList: EvidenceSchema[] }): Promise<void> {
    await this.emitEvidenceBatch(data.evidenceList);
  }

  private async handleIndexRebuildRequest(): Promise<void> {
    await this.rebuildIndex();
  }

  private async handleCleanupRequest(data: { maxAge?: number }): Promise<void> {
    await this.cleanup(data.maxAge);
  }

  private handleWorkerMessage(message: any): void {
    switch (message.type) {
      case 'evidence_processed':
        this.emit('worker_evidence_processed', message.data);
        break;
      case 'error':
        this.emit('worker_error', message.data);
        break;
      default:
        console.warn(`[UNIFIED-EVIDENCE-MANAGER] Unknown worker message type: ${message.type}`);
    }
  }

  private handleWorkerError(error: Error): void {
    console.error('[UNIFIED-EVIDENCE-MANAGER] Worker error:', error);
    this.emit('worker_error', { error });
  }

  private handleWorkerExit(code: number): void {
    console.log(`[UNIFIED-EVIDENCE-MANAGER] Worker exited with code: ${code}`);
    this.emit('worker_exit', { code });
  }

  private generateFilename(evidence: EvidenceSchema): string {
    const timestamp = evidence.timestamp.toISOString().replace(/[:.]/g, '-');
    const session = this.config.naming.includeSession ? `-${this.sessionId}` : '';
    const correlation = this.config.naming.includeCorrelation && this.correlationId ? `-${this.correlationId}` : '';
    
    let filename: string;
    
    switch (this.config.naming.convention) {
      case 'timestamp':
        filename = `${this.config.naming.prefix}-${timestamp}${session}${correlation}.json`;
        break;
      case 'uuid':
        filename = `${this.config.naming.prefix}-${evidence.id}${session}${correlation}.json`;
        break;
      case 'sequential':
        filename = `${this.config.naming.prefix}-${String(this.evidenceCounter++).padStart(6, '0')}${session}${correlation}.json`;
        break;
      default:
        filename = `${this.config.naming.prefix}-${evidence.id}.json`;
    }
    
    return filename;
  }

  private createMetadata(evidence: EvidenceSchema, filename: string): EvidenceMetadata {
    return {
      id: evidence.id,
      filename,
      path: path.join(this.config.storage.evidenceDir, filename),
      size: 0, // Will be set after storage
      checksum: '', // Will be set after storage
      timestamp: evidence.timestamp,
      type: evidence.type,
      source: evidence.source,
      version: evidence.version,
      tags: this.extractTags(evidence),
      indexed: false,
      compressed: this.config.storage.compressionEnabled,
      encrypted: this.config.storage.encryptionEnabled
    };
  }

  private async storeEvidence(
    evidence: EvidenceSchema,
    filename: string,
    metadata: EvidenceMetadata
  ): Promise<string> {
    const filePath = metadata.path;
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Serialize evidence
    let evidenceData = JSON.stringify(evidence, null, 2);
    
    // Compress if enabled
    if (this.config.storage.compressionEnabled) {
      evidenceData = await this.compressData(evidenceData);
    }
    
    // Encrypt if enabled
    if (this.config.storage.encryptionEnabled) {
      evidenceData = await this.encryptData(evidenceData);
    }
    
    // Write to file
    await fs.writeFile(filePath, evidenceData, 'utf-8');
    
    // Update metadata
    const stats = await fs.stat(filePath);
    metadata.size = stats.size;
    metadata.checksum = await this.calculateChecksum(filePath);
    
    return filePath;
  }

  private async loadEvidence(id: string): Promise<EvidenceSchema | null> {
    const metadata = this.evidenceIndex.metadata.get(id);
    if (!metadata) {
      return null;
    }

    try {
      let data = await fs.readFile(metadata.path, 'utf-8');
      
      // Decrypt if needed
      if (metadata.encrypted) {
        data = await this.decryptData(data);
      }
      
      // Decompress if needed
      if (metadata.compressed) {
        data = await this.decompressData(data);
      }
      
      return JSON.parse(data) as EvidenceSchema;
    } catch (error) {
      console.error(`[UNIFIED-EVIDENCE-MANAGER] Failed to load evidence ${id}:`, error);
      return null;
    }
  }

  private async loadMetadata(filePath: string): Promise<EvidenceMetadata | null> {
    try {
      const metadataPath = filePath.replace('.json', '.meta.json');
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data) as EvidenceMetadata;
    } catch (error) {
      // Try to extract from filename if metadata file doesn't exist
      return this.extractMetadataFromPath(filePath);
    }
  }

  private updateIndex(evidence: EvidenceSchema, metadata: EvidenceMetadata): void {
    // Add to main metadata map
    this.evidenceIndex.metadata.set(evidence.id, metadata);
    
    // Update mappings
    this.updateIndexMappings(metadata);
    
    // Mark as indexed
    metadata.indexed = true;
  }

  private updateIndexMappings(metadata: EvidenceMetadata): void {
    // Update type mapping
    if (!this.evidenceIndex.byType.has(metadata.type)) {
      this.evidenceIndex.byType.set(metadata.type, new Set());
    }
    this.evidenceIndex.byType.get(metadata.type)!.add(metadata.id);
    
    // Update source mapping
    if (!this.evidenceIndex.bySource.has(metadata.source)) {
      this.evidenceIndex.bySource.set(metadata.source, new Set());
    }
    this.evidenceIndex.bySource.get(metadata.source)!.add(metadata.id);
    
    // Update date mapping
    const dateKey = metadata.timestamp.toISOString().substring(0, 10); // YYYY-MM-DD
    if (!this.evidenceIndex.byDate.has(dateKey)) {
      this.evidenceIndex.byDate.set(dateKey, new Set());
    }
    this.evidenceIndex.byDate.get(dateKey)!.add(metadata.id);
    
    // Update tag mappings
    for (const tag of metadata.tags) {
      if (!this.evidenceIndex.byTag.has(tag)) {
        this.evidenceIndex.byTag.set(tag, new Set());
      }
      this.evidenceIndex.byTag.get(tag)!.add(metadata.id);
    }
    
    // Update quality mapping
    const qualityKey = this.getQualityKey(metadata);
    if (!this.evidenceIndex.byQuality.has(qualityKey)) {
      this.evidenceIndex.byQuality.set(qualityKey, new Set());
    }
    this.evidenceIndex.byQuality.get(qualityKey)!.add(metadata.id);
  }

  private removeFromIndex(id: string): void {
    const metadata = this.evidenceIndex.metadata.get(id);
    if (!metadata) {
      return;
    }

    // Remove from type mapping
    this.evidenceIndex.byType.get(metadata.type)?.delete(id);
    
    // Remove from source mapping
    this.evidenceIndex.bySource.get(metadata.source)?.delete(id);
    
    // Remove from date mapping
    const dateKey = metadata.timestamp.toISOString().substring(0, 10);
    this.evidenceIndex.byDate.get(dateKey)?.delete(id);
    
    // Remove from tag mappings
    for (const tag of metadata.tags) {
      this.evidenceIndex.byTag.get(tag)?.delete(id);
    }
    
    // Remove from quality mapping
    const qualityKey = this.getQualityKey(metadata);
    this.evidenceIndex.byQuality.get(qualityKey)?.delete(id);
    
    // Remove from main metadata map
    this.evidenceIndex.metadata.delete(id);
  }

  private searchIndex(query: EvidenceQuery): string[] {
    let candidates = new Set<string>();
    
    // Filter by type
    if (query.type) {
      const typeMatches = this.evidenceIndex.byType.get(query.type);
      if (typeMatches) {
        candidates = new Set([...candidates, ...typeMatches]);
      } else {
        return [];
      }
    } else {
      candidates = new Set(this.evidenceIndex.metadata.keys());
    }
    
    // Filter by source
    if (query.source) {
      const sourceMatches = this.evidenceIndex.bySource.get(query.source);
      if (sourceMatches) {
        candidates = new Set([...candidates].filter(id => sourceMatches.has(id)));
      } else {
        return [];
      }
    }
    
    // Filter by date range
    if (query.dateRange) {
      candidates = new Set([...candidates].filter(id => {
        const metadata = this.evidenceIndex.metadata.get(id);
        return metadata && 
          metadata.timestamp >= query.dateRange!.start && 
          metadata.timestamp <= query.dateRange!.end;
      }));
    }
    
    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      candidates = new Set([...candidates].filter(id => {
        const metadata = this.evidenceIndex.metadata.get(id);
        return metadata && query.tags!.some(tag => metadata.tags.includes(tag));
      }));
    }
    
    // Filter by quality
    if (query.quality) {
      candidates = new Set([...candidates].filter(id => {
        const metadata = this.evidenceIndex.metadata.get(id);
        return metadata && 
          metadata.timestamp >= query.dateRange!.start && 
          metadata.timestamp <= query.dateRange!.end;
      }));
    }
    
    // Convert to array and sort
    let result = Array.from(candidates);
    
    if (query.sortBy) {
      result.sort((a, b) => {
        const metadataA = this.evidenceIndex.metadata.get(a)!;
        const metadataB = this.evidenceIndex.metadata.get(b)!;
        
        let comparison = 0;
        
        switch (query.sortBy) {
          case 'timestamp':
            comparison = metadataA.timestamp.getTime() - metadataB.timestamp.getTime();
            break;
          case 'quality':
            comparison = this.getQualityScore(metadataA) - this.getQualityScore(metadataB);
            break;
          case 'type':
            comparison = metadataA.type.localeCompare(metadataB.type);
            break;
        }
        
        return query.sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    // Apply limit and offset
    if (query.offset) {
      result = result.slice(query.offset);
    }
    
    if (query.limit) {
      result = result.slice(0, query.limit);
    }
    
    return result;
  }

  private addToProcessingQueue(evidence: EvidenceSchema): void {
    this.processingQueue.push(evidence);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const batch = this.processingQueue.splice(0, this.config.processing.batchSize);
      
      if (this.config.performance.asyncProcessing && this.workers.length > 0) {
        await this.processBatchWithWorkers(batch);
      } else {
        await this.processBatchSync(batch);
      }
      
    } finally {
      this.isProcessing = false;
      
      // Continue processing if more items in queue
      if (this.processingQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  private async processBatchWithWorkers(batch: EvidenceSchema[]): Promise<void> {
    const promises = batch.map(evidence => {
      return new Promise<void>((resolve, reject) => {
        const worker = this.workers[Math.floor(Math.random() * this.workers.length)];
        
        const timeout = setTimeout(() => {
          reject(new Error('Processing timeout'));
        }, this.config.processing.queueTimeout);
        
        worker.once('message', (message) => {
          clearTimeout(timeout);
          if (message.type === 'evidence_processed') {
            resolve();
          } else {
            reject(new Error(message.data.error));
          }
        });
        
        worker.postMessage({
          type: 'process_evidence',
          data: evidence
        });
      });
    });
    
    await Promise.all(promises);
  }

  private async processBatchSync(batch: EvidenceSchema[]): Promise<void> {
    for (const evidence of batch) {
      // Process evidence synchronously
      await this.processEvidenceSync(evidence);
    }
  }

  private async processEvidenceSync(evidence: EvidenceSchema): Promise<void> {
    // Placeholder for synchronous evidence processing
    console.log(`[UNIFIED-EVIDENCE-MANAGER] Processing evidence: ${evidence.id}`);
  }

  private extractTags(evidence: EvidenceSchema): string[] {
    const tags: string[] = [];
    
    // Extract tags from evidence type
    tags.push(`type:${evidence.type}`);
    
    // Extract tags from source
    tags.push(`source:${evidence.source}`);
    
    // Extract tags from metadata
    if (evidence.metadata.environment) {
      tags.push(`env:${evidence.metadata.environment}`);
    }
    
    if (evidence.metadata.nodeId) {
      tags.push(`node:${evidence.metadata.nodeId}`);
    }
    
    // Extract tags from quality
    if (evidence.quality.completeness > 0.8) {
      tags.push('quality:high');
    } else if (evidence.quality.completeness > 0.6) {
      tags.push('quality:medium');
    } else {
      tags.push('quality:low');
    }
    
    return tags;
  }

  private getQualityKey(metadata: EvidenceMetadata): string {
    // Generate quality key for indexing
    if (metadata.timestamp > new Date(Date.now() - 86400000)) { // Last 24 hours
      return 'recent';
    } else if (metadata.timestamp > new Date(Date.now() - 604800000)) { // Last 7 days
      return 'week';
    } else {
      return 'older';
    }
  }

  private getQualityScore(metadata: EvidenceMetadata): number {
    // Calculate quality score for sorting
    let score = 0.5; // Base score
    
    if (metadata.indexed) {
      score += 0.2;
    }
    
    if (!metadata.compressed) {
      score += 0.1;
    }
    
    if (!metadata.encrypted) {
      score += 0.1;
    }
    
    // Add recency factor
    const age = Date.now() - metadata.timestamp.getTime();
    if (age < 86400000) { // Less than 24 hours
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  private extractMetadataFromPath(filePath: string): EvidenceMetadata | null {
    try {
      const filename = path.basename(filePath);
      const parts = filename.replace('.json', '').split('-');
      
      return {
        id: parts[1] || 'unknown',
        filename,
        path: filePath,
        size: 0,
        checksum: '',
        timestamp: new Date(),
        type: 'unknown',
        source: 'unknown',
        version: '1.0.0',
        tags: [],
        indexed: false,
        compressed: this.config.storage.compressionEnabled,
        encrypted: this.config.storage.encryptionEnabled
      };
    } catch (error) {
      return null;
    }
  }

  private calculateIndexSize(): number {
    let size = 0;
    
    for (const map of [this.evidenceIndex.byType, this.evidenceIndex.bySource, 
                       this.evidenceIndex.byDate, this.evidenceIndex.byTag, 
                       this.evidenceIndex.byQuality]) {
      for (const set of map.values()) {
        size += set.size;
      }
    }
    
    return size;
  }

  private calculateStorageUsage(): number {
    let totalSize = 0;
    
    for (const metadata of this.evidenceIndex.metadata.values()) {
      totalSize += metadata.size;
    }
    
    return totalSize;
  }

  private getLastActivity(): Date | null {
    let lastActivity: Date | null = null;
    
    for (const metadata of this.evidenceIndex.metadata.values()) {
      if (!lastActivity || metadata.timestamp > lastActivity) {
        lastActivity = metadata.timestamp;
      }
    }
    
    return lastActivity;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Placeholder methods for compression, encryption, and checksum
  private async compressData(data: string): Promise<string> {
    // Placeholder implementation
    return data;
  }

  private async decompressData(data: string): Promise<string> {
    // Placeholder implementation
    return data;
  }

  private async encryptData(data: string): Promise<string> {
    // Placeholder implementation
    return data;
  }

  private async decryptData(data: string): Promise<string> {
    // Placeholder implementation
    return data;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    // Placeholder implementation
    return 'checksum';
  }
}

export default UnifiedEvidenceManager;